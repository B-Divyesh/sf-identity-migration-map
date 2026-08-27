type Hit = {
  identifier: string;
  replacement: string;
  source: string;
  line: number;
  column: number;
  context: string;
  owner: string | null;
  external: boolean;
  requires_human_confirmation: true;
};

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
};

const form = byId<HTMLFormElement>("demo-form");
const results = byId<HTMLDivElement>("demo-results");
const count = byId<HTMLSpanElement>("result-count");
const error = byId<HTMLParagraphElement>("demo-error");
let currentHits: Hit[] = [];

function findHits(text: string, oldId: string, newId: string, source: string, owner: string, external: boolean): Hit[] {
  const hits: Hit[] = [];
  text.split(/\r?\n/).forEach((line, lineIndex) => {
    let from = 0;
    while (from <= line.length) {
      const column = line.indexOf(oldId, from);
      if (column === -1) break;
      hits.push({
        identifier: oldId,
        replacement: newId,
        source,
        line: lineIndex + 1,
        column: column + 1,
        context: line,
        owner: owner || null,
        external,
        requires_human_confirmation: true
      });
      from = column + oldId.length;
    }
  });
  return hits;
}

function renderHits(hits: Hit[], oldId: string, source: string, external: boolean): void {
  count.textContent = `${hits.length} ${hits.length === 1 ? "hit" : "hits"}`;
  results.replaceChildren();
  if (hits.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-result";
    const title = document.createElement("h3");
    title.textContent = `No literal “${oldId}” occurrences found`;
    const copy = document.createElement("p");
    copy.textContent = "That is a useful observation, not proof of completeness. Check current exports and ask each external system owner what the export omits.";
    empty.append(title, copy);
    results.append(empty);
    return;
  }
  const list = document.createElement("ol");
  list.className = "hit-list";
  hits.forEach((hit) => {
    const item = document.createElement("li");
    const meta = document.createElement("p");
    meta.className = "hit-meta";
    meta.textContent = `${source} · line ${hit.line}, column ${hit.column}`;
    const code = document.createElement("code");
    code.textContent = hit.context;
    const owner = document.createElement("p");
    owner.className = `owner-tag${hit.owner ? "" : " unresolved"}`;
    owner.textContent = hit.owner ? `Owner: ${hit.owner}` : "Owner unresolved";
    item.append(meta, code, owner);
    if (external) {
      const note = document.createElement("p");
      note.className = "external-note";
      note.textContent = "External record — human confirmation required";
      item.append(note);
    }
    list.append(item);
  });
  results.append(list);
}

function analyze(event?: SubmitEvent): void {
  event?.preventDefault();
  error.textContent = "";
  const oldId = byId<HTMLInputElement>("old-id").value;
  const newId = byId<HTMLInputElement>("new-id").value;
  const source = byId<HTMLInputElement>("source-name").value.trim();
  const owner = byId<HTMLInputElement>("owner").value.trim();
  const sample = byId<HTMLTextAreaElement>("sample").value;
  const external = byId<HTMLInputElement>("external").checked;
  if (!oldId || !newId || !source || !sample) {
    error.textContent = "Add both identifiers, a source label, and an excerpt to map.";
    return;
  }
  if (oldId === newId) {
    error.textContent = "Old and new identifiers must be different.";
    byId<HTMLInputElement>("new-id").focus();
    return;
  }
  currentHits = findHits(sample, oldId, newId, source, owner, external);
  renderHits(currentHits, oldId, source, external);
}

form.addEventListener("submit", analyze);

function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown): string { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

byId<HTMLButtonElement>("download-json").addEventListener("click", () => {
  download("identity-migration-evidence.json", `${JSON.stringify({ schema_version: 1, safety_notice: "Evidence only; human confirmation required.", evidence: currentHits }, null, 2)}\n`, "application/json");
});
byId<HTMLButtonElement>("download-csv").addEventListener("click", () => {
  const header = "identifier,replacement,source,line,column,owner,external,human_confirmation,context\n";
  const rows = currentHits.map((hit) => [hit.identifier, hit.replacement, hit.source, hit.line, hit.column, hit.owner, hit.external, true, hit.context].map(csvCell).join(",")).join("\n");
  download("identity-migration-evidence.csv", `${header}${rows}${rows ? "\n" : ""}`, "text/csv");
});

byId<HTMLButtonElement>("copy-command").addEventListener("click", async (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const command = "cargo install identity-migration-map\nimm init --output migration.toml\nimm scan --plan migration.toml --out migration-map";
  try {
    await navigator.clipboard.writeText(command);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Select commands below";
  }
  window.setTimeout(() => { button.textContent = "Copy commands"; }, 2000);
});

const slug = "identity-migration-map";
const licenseKey = `sb_license:${slug}`;
const verdictKey = `${licenseKey}:verdict`;
const licenseStatus = byId<HTMLParagraphElement>("license-status");
const kitButton = byId<HTMLButtonElement>("download-kit");

type CachedVerdict = { valid: boolean; checkedAt: number; token: string };

function cachedVerdict(token: string): CachedVerdict | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(verdictKey) || "null") as CachedVerdict | null;
    return parsed?.token === token ? parsed : null;
  } catch { return null; }
}

function setUnlocked(unlocked: boolean, message: string): void {
  kitButton.disabled = !unlocked;
  licenseStatus.textContent = message;
  licenseStatus.dataset.state = unlocked ? "valid" : "locked";
}

async function verifyLicense(token: string, force = false): Promise<void> {
  const cached = cachedVerdict(token);
  if (cached?.valid) {
    setUnlocked(true, "Field Kit unlocked from your last verified license.");
  } else if (cached) {
    setUnlocked(false, "License no longer active. You can keep using every free scanning and export tool.");
  }
  if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return;
  licenseStatus.textContent = cached?.valid ? "Field Kit unlocked. Rechecking quietly…" : "Checking this license…";
  try {
    const response = await fetch(`https://api.sociobot.in/api/v1/products/${slug}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error("Verification service unavailable");
    const verdict = await response.json() as { valid: boolean; reason: string };
    localStorage.setItem(verdictKey, JSON.stringify({ valid: verdict.valid, checkedAt: Date.now(), token } satisfies CachedVerdict));
    if (verdict.valid) {
      setUnlocked(true, "License verified. Your Field Kit is ready.");
    } else {
      setUnlocked(false, "License no longer active. You can keep using every free scanning and export tool.");
    }
  } catch {
    if (!cached?.valid) setUnlocked(false, "Couldn’t verify right now. The free tools remain available; try again when online.");
  }
}

const query = new URLSearchParams(location.search);
const returnedLicense = query.get("license");
if (returnedLicense) {
  localStorage.setItem(licenseKey, returnedLicense);
  query.delete("license");
  const clean = `${location.pathname}${query.size ? `?${query}` : ""}${location.hash}`;
  history.replaceState({}, "", clean);
}
const storedLicense = returnedLicense || localStorage.getItem(licenseKey);
if (storedLicense) void verifyLicense(storedLicense, Boolean(returnedLicense));

byId<HTMLFormElement>("license-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const token = byId<HTMLInputElement>("license-token").value.trim();
  if (!token) return;
  localStorage.setItem(licenseKey, token);
  void verifyLicense(token, true);
});

kitButton.addEventListener("click", () => {
  const kit = `# Identity migration field kit\n\n## Owner sign-off\n\n| System | Owner | Export current? | Change approved? |\n| --- | --- | --- | --- |\n| | | [ ] | [ ] |\n\n## Cutover runbook\n\n- [ ] Freeze dependent writes\n- [ ] Verify backup checksum and restore rehearsal\n- [ ] Run owner-approved changes in dependency order\n- [ ] Validate old and new identifier behavior\n- [ ] Announce outcome and archive evidence\n\n## Rollback rehearsal\n\n| Source | Restore step | Tested by | Result |\n| --- | --- | --- | --- |\n| | | | not-tested |\n`;
  download("identity-migration-field-kit.md", kit, "text/markdown");
});

const offlineBanner = byId<HTMLDivElement>("offline-banner");
function updateOnlineState(): void { offlineBanner.hidden = navigator.onLine; }
window.addEventListener("online", updateOnlineState);
window.addEventListener("offline", updateOnlineState);
updateOnlineState();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => { void navigator.serviceWorker.register("/service-worker.js"); });
}

analyze();
