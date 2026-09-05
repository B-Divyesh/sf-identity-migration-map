use clap::{Parser, Subcommand};
use identity_migration_map::{
    MapError, STARTER_PLAN, ScanOptions, load_plan, run_scan, write_outputs,
};
use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;
use std::time::{SystemTime, UNIX_EPOCH};

const DEMO_PLAN: &str = include_str!("../examples/sample/migration.toml");
const DEMO_CONFIG: &str = include_str!("../examples/sample/config/app.env");
const DEMO_USERS: &str = include_str!("../examples/sample/exports/users.csv");
const DEMO_CHAT: &str = include_str!("../examples/sample/exports/chat.json");

#[derive(Debug, Parser)]
#[command(
    name = "imm",
    version,
    about = "Map identifier dependencies before a rename",
    long_about = "Identity Migration Map scans declared local files and read-only exports for literal old-identifier occurrences. It writes evidence, an owner checklist, and a rollback ledger. Matches require human review and never imply authorization to change a system."
)]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Run the real scanner on bundled sample data in a new temporary directory
    Demo {
        /// Print the result and report location as JSON
        #[arg(long)]
        json: bool,
    },
    /// Write a documented starter migration plan
    Init {
        /// Plan file to create
        #[arg(short, long, default_value = "migration.toml")]
        output: PathBuf,
        /// Replace an existing plan file
        #[arg(long)]
        force: bool,
    },
    /// Scan declared sources and write the complete evidence bundle
    Scan {
        /// TOML migration plan
        #[arg(short, long)]
        plan: PathBuf,
        /// Output directory for manifest.json, report.md, and CSV ledgers
        #[arg(short, long, default_value = "migration-map")]
        out: PathBuf,
        /// Print a compact machine-readable summary to stdout
        #[arg(long)]
        json: bool,
        /// Exit 3 after writing reports when any evidence has no owner
        #[arg(long)]
        fail_on_unowned: bool,
        /// Include raw context without masking likely credentials (unsafe)
        #[arg(long)]
        no_redact: bool,
    },
}

fn main() -> ExitCode {
    match execute(Cli::parse()) {
        Ok(code) => code,
        Err(error) => {
            eprintln!("imm: {error}");
            ExitCode::from(2)
        }
    }
}

fn execute(cli: Cli) -> Result<ExitCode, MapError> {
    match cli.command {
        Command::Demo { json } => run_demo(json),
        Command::Init { output, force } => {
            if output.exists() && !force {
                return Err(MapError::InvalidPlan(format!(
                    "'{}' already exists; pass --force to replace it",
                    output.display()
                )));
            }
            fs::write(&output, STARTER_PLAN)?;
            println!("Created {}", output.display());
            Ok(ExitCode::SUCCESS)
        }
        Command::Scan {
            plan: plan_path,
            out,
            json,
            fail_on_unowned,
            no_redact,
        } => {
            let plan = load_plan(&plan_path)?;
            let base = plan_path
                .parent()
                .unwrap_or_else(|| std::path::Path::new("."));
            let manifest = run_scan(&plan, base, ScanOptions { redact: !no_redact })?;
            write_outputs(&manifest, &out)?;
            if json {
                println!("{}", serde_json::to_string(&manifest.summary)?);
            } else {
                println!(
                    "Mapped {} occurrence(s) across {} file(s).",
                    manifest.summary.occurrences, manifest.summary.files_scanned
                );
                println!("Reports: {}", out.display());
                if manifest.summary.external_sources > 0 {
                    println!("Review required: external SaaS evidence needs human confirmation.");
                }
            }
            if fail_on_unowned && manifest.summary.unowned_occurrences > 0 {
                Ok(ExitCode::from(3))
            } else {
                Ok(ExitCode::SUCCESS)
            }
        }
    }
}

fn run_demo(json: bool) -> Result<ExitCode, MapError> {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let root = std::env::temp_dir().join(format!(
        "identity-migration-map-demo-{}-{nonce}",
        std::process::id()
    ));
    let sample = root.join("sample");
    let output = root.join("migration-map");
    fs::create_dir_all(sample.join("config"))?;
    fs::create_dir_all(sample.join("exports"))?;
    fs::write(sample.join("migration.toml"), DEMO_PLAN)?;
    fs::write(sample.join("config/app.env"), DEMO_CONFIG)?;
    fs::write(sample.join("exports/users.csv"), DEMO_USERS)?;
    fs::write(sample.join("exports/chat.json"), DEMO_CHAT)?;

    let plan = load_plan(&sample.join("migration.toml"))?;
    let manifest = run_scan(&plan, &sample, ScanOptions::default())?;
    write_outputs(&manifest, &output)?;

    if json {
        println!(
            "{}",
            serde_json::to_string(&serde_json::json!({
                "demo": true,
                "sample_data": "bundled",
                "output_directory": output,
                "summary": manifest.summary,
            }))?
        );
    } else {
        println!("Demo — bundled sample data; none of your files were read.");
        println!(
            "Mapped {} occurrence(s) across {} file(s).",
            manifest.summary.occurrences, manifest.summary.files_scanned
        );
        println!("Reports: {}", output.display());
        println!("Review required: external SaaS evidence needs human confirmation.");
    }
    Ok(ExitCode::SUCCESS)
}
