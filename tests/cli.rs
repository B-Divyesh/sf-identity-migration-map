use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_dir(label: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let path = std::env::temp_dir().join(format!("imm-{label}-{}-{nonce}", std::process::id()));
    fs::create_dir_all(&path).unwrap();
    path
}

#[test]
fn documented_scan_finds_every_occurrence_and_outputs_ledgers() {
    let root = temp_dir("scan");
    fs::create_dir(root.join("config")).unwrap();
    fs::write(
        root.join("config/app.env"),
        "OWNER=alice\npassword=hunter22\nalias=alice\n",
    )
    .unwrap();
    fs::write(
        root.join("users.csv"),
        "id,email\nalice,alice@example.test\n",
    )
    .unwrap();
    fs::write(
        root.join("migration.toml"),
        r#"
version = 1
name = "Rename alice"
[[mappings]]
from = "alice"
to = "alice.ops"
rollback = "Restore the snapshot"
[[sources]]
path = "config"
kind = "config"
owner = "platform"
[[sources]]
path = "users.csv"
kind = "database-export"
owner = "data"
"#,
    )
    .unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_imm"))
        .args(["scan", "--plan", "migration.toml", "--out", "out", "--json"])
        .current_dir(&root)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let summary: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(summary["occurrences"], 4);
    let manifest = fs::read_to_string(root.join("out/manifest.json")).unwrap();
    assert_eq!(manifest.matches("\"identifier\": \"alice\"").count(), 6); // evidence + rollback rows
    assert!(manifest.contains("\"owner_checklist\""));
    for name in ["report.md", "hits.csv", "rollback-ledger.csv"] {
        assert!(root.join("out").join(name).exists());
    }
    let report = fs::read_to_string(root.join("out/report.md")).unwrap();
    assert!(report.contains("## Owner checklist"));
    assert!(report.contains("## Rollback ledger"));
    let _ = fs::remove_dir_all(root);
}

#[test]
fn unowned_mode_writes_reports_then_exits_three() {
    let root = temp_dir("unowned");
    fs::write(root.join("input.txt"), "old-user\n").unwrap();
    fs::write(
        root.join("migration.toml"),
        r#"
version = 1
name = "Unowned"
[[mappings]]
from = "old-user"
to = "new-user"
[[sources]]
path = "input.txt"
"#,
    )
    .unwrap();
    let status = Command::new(env!("CARGO_BIN_EXE_imm"))
        .args([
            "scan",
            "--plan",
            "migration.toml",
            "--out",
            "out",
            "--fail-on-unowned",
        ])
        .current_dir(&root)
        .status()
        .unwrap();
    assert_eq!(status.code(), Some(3));
    assert!(root.join("out/report.md").exists());
    let _ = fs::remove_dir_all(root);
}

#[test]
fn init_refuses_to_overwrite() {
    let root = temp_dir("init");
    let status = Command::new(env!("CARGO_BIN_EXE_imm"))
        .args(["init"])
        .current_dir(&root)
        .status()
        .unwrap();
    assert!(status.success());
    let second = Command::new(env!("CARGO_BIN_EXE_imm"))
        .args(["init"])
        .current_dir(&root)
        .status()
        .unwrap();
    assert_eq!(second.code(), Some(2));
    let _ = fs::remove_dir_all(root);
}

#[test]
fn committed_sample_finds_all_seven_declared_occurrences() {
    let output_dir = temp_dir("committed-sample");
    let plan = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("examples/sample/migration.toml");
    let output = Command::new(env!("CARGO_BIN_EXE_imm"))
        .args(["scan", "--plan"])
        .arg(plan)
        .args(["--out"])
        .arg(&output_dir)
        .arg("--json")
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let summary: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(summary["occurrences"], 7);
    assert_eq!(summary["external_sources"], 1);
    let _ = fs::remove_dir_all(output_dir);
}

#[test]
fn demo_uses_bundled_data_and_writes_a_complete_temporary_bundle() {
    let output = Command::new(env!("CARGO_BIN_EXE_imm"))
        .args(["demo", "--json"])
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let result: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["demo"], true);
    assert_eq!(result["sample_data"], "bundled");
    assert_eq!(result["summary"]["occurrences"], 7);
    assert_eq!(result["summary"]["files_scanned"], 3);
    assert_eq!(result["summary"]["external_sources"], 1);
    let output_dir = PathBuf::from(result["output_directory"].as_str().unwrap());
    for name in [
        "manifest.json",
        "report.md",
        "hits.csv",
        "rollback-ledger.csv",
    ] {
        assert!(output_dir.join(name).is_file(), "missing {name}");
    }
    let demo_root = output_dir.parent().unwrap();
    assert!(demo_root.starts_with(std::env::temp_dir()));
    let _ = fs::remove_dir_all(demo_root);
}
