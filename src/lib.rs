//! Read-only scanning primitives for Identity Migration Map.
//!
//! The smallest useful API parses a plan and scans it without modifying any
//! declared source:
//!
//! ```
//! use identity_migration_map::Plan;
//!
//! let plan: Plan = toml::from_str(r#"
//! version = 1
//! name = "Example"
//! [[mappings]]
//! from = "alice"
//! to = "alice.ops"
//! [[sources]]
//! path = "config"
//! kind = "config"
//! "#).unwrap();
//! assert_eq!(plan.mappings[0].from, "alice");
//! ```

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::{DirEntry, WalkDir};

const MAX_FILE_BYTES: u64 = 10 * 1024 * 1024;
const SKIPPED_DIRS: &[&str] = &[".git", "node_modules", "target", "dist", ".idea", ".vscode"];

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Plan {
    pub version: u32,
    pub name: String,
    pub mappings: Vec<Mapping>,
    pub sources: Vec<Source>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Mapping {
    pub from: String,
    pub to: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub rollback: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Source {
    pub path: String,
    #[serde(default = "default_source_kind")]
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub owner: Option<String>,
    #[serde(default)]
    pub external: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

fn default_source_kind() -> String {
    "filesystem".to_owned()
}

#[derive(Debug, Clone, Serialize)]
pub struct Evidence {
    pub identifier: String,
    pub replacement: String,
    pub source: String,
    pub source_kind: String,
    pub file: String,
    pub line: usize,
    pub column: usize,
    pub context: String,
    pub owner: Option<String>,
    pub external: bool,
    pub requires_human_confirmation: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct RollbackEntry {
    pub identifier: String,
    pub replacement: String,
    pub source: String,
    pub owner: Option<String>,
    pub step: String,
    pub verification_status: String,
    pub requires_human_confirmation: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ChecklistItem {
    pub mapping: String,
    pub source: String,
    pub owner: Option<String>,
    pub evidence_count: usize,
    pub task: String,
    pub status: String,
    pub requires_human_confirmation: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct Summary {
    pub mappings: usize,
    pub sources: usize,
    pub files_scanned: usize,
    pub occurrences: usize,
    pub unowned_occurrences: usize,
    pub external_sources: usize,
}

#[derive(Debug, Clone, Serialize)]
pub struct Manifest {
    pub schema_version: u32,
    pub generated_at_unix: u64,
    pub plan_name: String,
    pub safety_notice: String,
    pub summary: Summary,
    pub mappings: Vec<Mapping>,
    pub sources: Vec<Source>,
    pub evidence: Vec<Evidence>,
    pub owner_checklist: Vec<ChecklistItem>,
    pub rollback_ledger: Vec<RollbackEntry>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Copy)]
pub struct ScanOptions {
    pub redact: bool,
}

impl Default for ScanOptions {
    fn default() -> Self {
        Self { redact: true }
    }
}

#[derive(Debug)]
pub enum MapError {
    Io(io::Error),
    InvalidPlan(String),
    ParsePlan(toml::de::Error),
    Json(serde_json::Error),
}

impl std::fmt::Display for MapError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(err) => write!(f, "I/O error: {err}"),
            Self::InvalidPlan(message) => write!(f, "invalid plan: {message}"),
            Self::ParsePlan(err) => write!(f, "could not parse plan: {err}"),
            Self::Json(err) => write!(f, "could not encode JSON: {err}"),
        }
    }
}

impl std::error::Error for MapError {}

impl From<io::Error> for MapError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

impl From<toml::de::Error> for MapError {
    fn from(value: toml::de::Error) -> Self {
        Self::ParsePlan(value)
    }
}

impl From<serde_json::Error> for MapError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}

/// Loads and validates a TOML migration plan.
pub fn load_plan(path: &Path) -> Result<Plan, MapError> {
    let raw = fs::read_to_string(path)?;
    let plan: Plan = toml::from_str(&raw)?;
    validate_plan(&plan)?;
    Ok(plan)
}

pub fn validate_plan(plan: &Plan) -> Result<(), MapError> {
    if plan.version != 1 {
        return Err(MapError::InvalidPlan(format!(
            "version must be 1, found {}",
            plan.version
        )));
    }
    if plan.name.trim().is_empty() {
        return Err(MapError::InvalidPlan("name cannot be empty".into()));
    }
    if plan.mappings.is_empty() {
        return Err(MapError::InvalidPlan(
            "at least one [[mappings]] entry is required".into(),
        ));
    }
    if plan.sources.is_empty() {
        return Err(MapError::InvalidPlan(
            "at least one [[sources]] entry is required".into(),
        ));
    }
    let mut seen = BTreeSet::new();
    for mapping in &plan.mappings {
        if mapping.from.is_empty() || mapping.to.is_empty() {
            return Err(MapError::InvalidPlan(
                "mapping from/to cannot be empty".into(),
            ));
        }
        if mapping.from == mapping.to {
            return Err(MapError::InvalidPlan(format!(
                "mapping '{}' has the same from and to value",
                mapping.from
            )));
        }
        if !seen.insert(mapping.from.clone()) {
            return Err(MapError::InvalidPlan(format!(
                "duplicate mapping from '{}'",
                mapping.from
            )));
        }
    }
    for source in &plan.sources {
        if source.path.trim().is_empty() {
            return Err(MapError::InvalidPlan("source path cannot be empty".into()));
        }
    }
    Ok(())
}

/// Scans every declared source path. Paths are resolved relative to `base`.
pub fn run_scan(plan: &Plan, base: &Path, options: ScanOptions) -> Result<Manifest, MapError> {
    validate_plan(plan)?;
    let secret_re = Regex::new(
        r#"(?i)((?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*[\"']?)[^\"'\s,;}]+"#,
    )
    .expect("valid built-in secret regex");
    let bearer_re =
        Regex::new(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]{8,}").expect("valid built-in bearer regex");
    let mut evidence = Vec::new();
    let mut warnings = Vec::new();
    let mut scanned_files = BTreeSet::new();

    for source in &plan.sources {
        let root = base.join(&source.path);
        if !root.exists() {
            return Err(MapError::InvalidPlan(format!(
                "source '{}' does not exist",
                source.path
            )));
        }
        if is_external(source) {
            warnings.push(format!(
                "External source '{}': matches require confirmation by a human system owner.",
                source.path
            ));
        }

        let files = collect_files(&root)?;
        for file in files {
            let metadata = fs::metadata(&file)?;
            if metadata.len() > MAX_FILE_BYTES {
                warnings.push(format!(
                    "Skipped '{}' because it exceeds 10 MiB.",
                    display_path(&file, base)
                ));
                continue;
            }
            let bytes = fs::read(&file)?;
            if bytes.contains(&0) {
                warnings.push(format!(
                    "Skipped binary file '{}'.",
                    display_path(&file, base)
                ));
                continue;
            }
            let Ok(text) = std::str::from_utf8(&bytes) else {
                warnings.push(format!(
                    "Skipped non-UTF-8 file '{}'.",
                    display_path(&file, base)
                ));
                continue;
            };
            scanned_files.insert(file.clone());
            for (line_index, line) in text.lines().enumerate() {
                for mapping in &plan.mappings {
                    for (column, _) in line.match_indices(&mapping.from) {
                        let owner = source
                            .owner
                            .clone()
                            .or_else(|| mapping.owner.clone())
                            .filter(|s| !s.trim().is_empty());
                        let context = if options.redact {
                            redact_context(line, &mapping.from, &secret_re, &bearer_re)
                        } else {
                            line.to_owned()
                        };
                        evidence.push(Evidence {
                            identifier: mapping.from.clone(),
                            replacement: mapping.to.clone(),
                            source: source.path.clone(),
                            source_kind: source.kind.clone(),
                            file: display_path(&file, base),
                            line: line_index + 1,
                            column: column + 1,
                            context,
                            owner,
                            external: is_external(source),
                            requires_human_confirmation: true,
                        });
                    }
                }
            }
        }
    }

    evidence.sort_by(|a, b| {
        (&a.file, a.line, a.column, &a.identifier).cmp(&(&b.file, b.line, b.column, &b.identifier))
    });
    let owner_checklist = build_owner_checklist(plan, &evidence);
    let rollback_ledger = build_rollback_ledger(plan);
    let unowned_occurrences = evidence.iter().filter(|item| item.owner.is_none()).count();
    if unowned_occurrences > 0 {
        warnings.push(format!(
            "{unowned_occurrences} occurrence(s) have no declared owner."
        ));
    }
    if evidence.is_empty() {
        warnings.push("No occurrences found. Confirm that exports are current and all external systems are represented before proceeding.".into());
    }
    let external_sources = plan
        .sources
        .iter()
        .filter(|source| is_external(source))
        .count();
    Ok(Manifest {
        schema_version: 1,
        generated_at_unix: SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs(),
        plan_name: plan.name.clone(),
        safety_notice: "String matches are evidence for human review, never authorization to change an account, path, record, or integration.".into(),
        summary: Summary {
            mappings: plan.mappings.len(),
            sources: plan.sources.len(),
            files_scanned: scanned_files.len(),
            occurrences: evidence.len(),
            unowned_occurrences,
            external_sources,
        },
        mappings: plan.mappings.clone(),
        sources: plan.sources.clone(),
        evidence,
        owner_checklist,
        rollback_ledger,
        warnings,
    })
}

fn collect_files(root: &Path) -> Result<Vec<PathBuf>, MapError> {
    if root.is_symlink() {
        return Err(MapError::InvalidPlan(format!(
            "source '{}' is a symlink; declare its resolved read-only path instead",
            root.display()
        )));
    }
    if root.is_file() {
        return Ok(vec![root.to_owned()]);
    }
    let mut files = Vec::new();
    let walker = WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_entry(allowed_entry);
    for entry in walker {
        let entry = entry.map_err(|err| {
            MapError::InvalidPlan(format!("could not walk '{}': {err}", root.display()))
        })?;
        if entry.file_type().is_file() {
            files.push(entry.into_path());
        }
    }
    files.sort();
    Ok(files)
}

fn allowed_entry(entry: &DirEntry) -> bool {
    if entry.depth() == 0 {
        return true;
    }
    if !entry.file_type().is_dir() {
        return true;
    }
    let name = entry.file_name().to_string_lossy();
    !SKIPPED_DIRS.iter().any(|blocked| *blocked == name)
}

fn display_path(path: &Path, base: &Path) -> String {
    path.strip_prefix(base)
        .unwrap_or(path)
        .to_string_lossy()
        .replace('\\', "/")
}

fn is_external(source: &Source) -> bool {
    source.external || source.kind.eq_ignore_ascii_case("saas-export")
}

fn redact_context(line: &str, identifier: &str, secret_re: &Regex, bearer_re: &Regex) -> String {
    const OPEN: &str = "\u{e000}";
    const CLOSE: &str = "\u{e001}";
    let protected = line.replace(identifier, &format!("{OPEN}{identifier}{CLOSE}"));
    let redacted = secret_re.replace_all(&protected, "${1}[REDACTED]");
    let redacted = bearer_re.replace_all(&redacted, "${1}[REDACTED]");
    redacted.replace(OPEN, "").replace(CLOSE, "")
}

fn build_rollback_ledger(plan: &Plan) -> Vec<RollbackEntry> {
    let mut rows = Vec::new();
    for mapping in &plan.mappings {
        for source in &plan.sources {
            let owner = source
                .owner
                .clone()
                .or_else(|| mapping.owner.clone())
                .filter(|s| !s.trim().is_empty());
            let step = mapping.rollback.clone().unwrap_or_else(|| {
                format!("Restore the verified pre-change backup/export for '{}' and revert '{}' to '{}'.", source.path, mapping.to, mapping.from)
            });
            rows.push(RollbackEntry {
                identifier: mapping.from.clone(),
                replacement: mapping.to.clone(),
                source: source.path.clone(),
                owner,
                step,
                verification_status: "not-tested".into(),
                requires_human_confirmation: true,
            });
        }
    }
    rows
}

fn build_owner_checklist(plan: &Plan, evidence: &[Evidence]) -> Vec<ChecklistItem> {
    let mut items = Vec::new();
    for mapping in &plan.mappings {
        for source in &plan.sources {
            let owner = source
                .owner
                .clone()
                .or_else(|| mapping.owner.clone())
                .filter(|value| !value.trim().is_empty());
            let evidence_count = evidence
                .iter()
                .filter(|item| item.identifier == mapping.from && item.source == source.path)
                .count();
            let task = if evidence_count == 0 {
                format!(
                    "Confirm '{}' is current and that no '{}' dependency is expected.",
                    source.path, mapping.from
                )
            } else {
                format!(
                    "Review {evidence_count} occurrence(s) of '{}' in '{}' and approve or reject each migration action.",
                    mapping.from, source.path
                )
            };
            items.push(ChecklistItem {
                mapping: mapping.from.clone(),
                source: source.path.clone(),
                owner,
                evidence_count,
                task,
                status: "open".into(),
                requires_human_confirmation: true,
            });
        }
    }
    items
}

/// Writes the complete report bundle into `out`.
pub fn write_outputs(manifest: &Manifest, out: &Path) -> Result<(), MapError> {
    fs::create_dir_all(out)?;
    fs::write(
        out.join("manifest.json"),
        format!("{}\n", serde_json::to_string_pretty(manifest)?),
    )?;
    fs::write(out.join("report.md"), render_markdown(manifest))?;
    fs::write(out.join("hits.csv"), render_hits_csv(manifest))?;
    fs::write(
        out.join("rollback-ledger.csv"),
        render_rollback_csv(manifest),
    )?;
    Ok(())
}

fn render_markdown(manifest: &Manifest) -> String {
    let mut out = format!(
        "# Identity migration map: {}\n\n> **Safety boundary:** {}\n\n## Scan summary\n\n- Mappings: {}\n- Sources: {}\n- Files inspected: {}\n- Literal occurrences: {}\n- Unowned occurrences: {}\n- External sources: {}\n\n",
        manifest.plan_name,
        manifest.safety_notice,
        manifest.summary.mappings,
        manifest.summary.sources,
        manifest.summary.files_scanned,
        manifest.summary.occurrences,
        manifest.summary.unowned_occurrences,
        manifest.summary.external_sources
    );
    if !manifest.warnings.is_empty() {
        out.push_str("## Attention needed\n\n");
        for warning in &manifest.warnings {
            out.push_str(&format!("- {warning}\n"));
        }
        out.push('\n');
    }
    out.push_str("## Owner checklist\n\n");
    let mut by_owner: BTreeMap<String, Vec<&ChecklistItem>> = BTreeMap::new();
    for item in &manifest.owner_checklist {
        by_owner
            .entry(item.owner.clone().unwrap_or_else(|| "UNASSIGNED".into()))
            .or_default()
            .push(item);
    }
    for (owner, items) in by_owner {
        out.push_str(&format!("### {owner}\n\n"));
        for item in items {
            out.push_str(&format!("- [ ] {}\n", item.task));
            for hit in manifest
                .evidence
                .iter()
                .filter(|hit| hit.identifier == item.mapping && hit.source == item.source)
            {
                let external = if hit.external {
                    " — external system"
                } else {
                    ""
                };
                out.push_str(&format!(
                    "  - evidence: `{}` line {}, column {}{}\n",
                    hit.file, hit.line, hit.column, external
                ));
            }
        }
        out.push('\n');
    }
    out.push_str("## Rollback ledger\n\n| Owner | Source | Mapping | Rollback step | Status |\n| --- | --- | --- | --- | --- |\n");
    for row in &manifest.rollback_ledger {
        out.push_str(&format!(
            "| {} | `{}` | `{}` → `{}` | {} | {} |\n",
            md_cell(row.owner.as_deref().unwrap_or("UNASSIGNED")),
            md_cell(&row.source),
            md_cell(&row.identifier),
            md_cell(&row.replacement),
            md_cell(&row.step),
            row.verification_status
        ));
    }
    out.push_str("\n## Decision boundary\n\nThis report records literal evidence only. Confirm authorization, semantic meaning, migration order, backup integrity, and external SaaS behavior with human owners before any change.\n");
    out
}

fn md_cell(value: &str) -> String {
    value.replace('|', "\\|").replace('\n', " ")
}

fn csv_cell(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\"\""))
}

fn render_hits_csv(manifest: &Manifest) -> String {
    let mut out = "identifier,replacement,source,source_kind,file,line,column,owner,external,human_confirmation,context\n".to_owned();
    for item in &manifest.evidence {
        let cells = [
            csv_cell(&item.identifier),
            csv_cell(&item.replacement),
            csv_cell(&item.source),
            csv_cell(&item.source_kind),
            csv_cell(&item.file),
            item.line.to_string(),
            item.column.to_string(),
            csv_cell(item.owner.as_deref().unwrap_or("")),
            item.external.to_string(),
            item.requires_human_confirmation.to_string(),
            csv_cell(&item.context),
        ];
        out.push_str(&cells.join(","));
        out.push('\n');
    }
    out
}

fn render_rollback_csv(manifest: &Manifest) -> String {
    let mut out = "identifier,replacement,source,owner,rollback_step,verification_status,human_confirmation\n".to_owned();
    for row in &manifest.rollback_ledger {
        let cells = [
            csv_cell(&row.identifier),
            csv_cell(&row.replacement),
            csv_cell(&row.source),
            csv_cell(row.owner.as_deref().unwrap_or("")),
            csv_cell(&row.step),
            csv_cell(&row.verification_status),
            row.requires_human_confirmation.to_string(),
        ];
        out.push_str(&cells.join(","));
        out.push('\n');
    }
    out
}

pub const STARTER_PLAN: &str = r#"# Identity Migration Map plan — sources are only read, never changed.
version = 1
name = "Rename an identity"

[[mappings]]
from = "old-user"
to = "new-user"
owner = "platform"
rollback = "Restore the verified pre-migration backup and reinstate the old alias"

[[sources]]
path = "./config"
kind = "config"
owner = "platform"
external = false

# Export external systems yourself, then declare the local export:
# [[sources]]
# path = "./exports/chat.json"
# kind = "saas-export"
# owner = "collaboration"
# external = true
"#;

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_plan() -> Plan {
        Plan {
            version: 1,
            name: "Test".into(),
            mappings: vec![Mapping {
                from: "alice".into(),
                to: "alice.ops".into(),
                owner: None,
                rollback: None,
            }],
            sources: vec![Source {
                path: "config.txt".into(),
                kind: "config".into(),
                owner: Some("platform".into()),
                external: false,
                notes: None,
            }],
        }
    }

    #[test]
    fn rejects_duplicate_identifiers() {
        let mut plan = sample_plan();
        plan.mappings.push(plan.mappings[0].clone());
        assert!(
            validate_plan(&plan)
                .unwrap_err()
                .to_string()
                .contains("duplicate")
        );
    }

    #[test]
    fn preserves_identifier_while_redacting_secret() {
        let secret =
            Regex::new(r#"(?i)((?:password|secret)\s*[:=]\s*[\"']?)[^\"'\s,;}]+"#).unwrap();
        let bearer = Regex::new(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]{8,}").unwrap();
        let line = "user=alice password=hunter22 bearer abcdefghi";
        assert_eq!(
            redact_context(line, "alice", &secret, &bearer),
            "user=alice password=[REDACTED] bearer [REDACTED]"
        );
    }
}
