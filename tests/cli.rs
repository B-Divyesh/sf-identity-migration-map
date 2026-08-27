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
