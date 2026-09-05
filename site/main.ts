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

const get = <T extends HTMLElement>(id: string): T | null => document.getElementById(id) as T | null;

const sampleValues = {
  oldId: "alice",
  newId: "alice.ops",
  source: "exports/chat.json",
  owner: "collaboration",
  excerpt: `{
  "exported_user": "alice",
  "channel_owner": "alice",
  "home": "/srv/alice",
  "review_note": "confirm alice with the chat owner"
}`,
  external: true
};

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

function setupDemo(): void {
  const form = get<HTMLFormElement>("demo-form");
  const results = get<HTMLDivElement>("demo-results");
  const count = get<HTMLSpanElement>("result-count");
  const error = get<HTMLParagraphElement>("demo-error");
  if (!form || !results || !count || !error) return;

  let currentHits: Hit[] = [];
  const input = <T extends HTMLInputElement | HTMLTextAreaElement>(id: string): T => {
    const element = get<T>(id);
    if (!element) throw new Error(`Missing #${id}`);
    return element;
  };

  const renderHits = (hits: Hit[], oldId: string): void => {
    count.textContent = `${hits.length} ${hits.length === 1 ? "hit" : "hits"}`;
    results.replaceChildren();
    if (hits.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-result";
      const title = document.createElement("h2");
      title.textContent = `No literal “${oldId}” occurrences found`;
      const copy = document.createElement("p");
      copy.textContent = "Check current exports and ask each system owner what the export omits.";
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
      meta.textContent = `${hit.source} · line ${hit.line}, column ${hit.column}`;
      const code = document.createElement("code");
      code.textContent = hit.context;
      const owner = document.createElement("p");
      owner.className = `owner-tag${hit.owner ? "" : " unresolved"}`;
      owner.textContent = hit.owner ? `Owner: ${hit.owner}` : "Owner unresolved";
      item.append(meta, code, owner);
      if (hit.external) {
        const note = document.createElement("p");
        note.className = "external-note";
        note.textContent = "External record — human confirmation required";
        item.append(note);
      }
      list.append(item);
    });
    results.append(list);
  };

  const analyze = (event?: SubmitEvent): void => {
    event?.preventDefault();
    error.textContent = "";
    const oldId = input<HTMLInputElement>("old-id").value;
    const newId = input<HTMLInputElement>("new-id").value;
    const source = input<HTMLInputElement>("source-name").value.trim();
    const owner = input<HTMLInputElement>("owner").value.trim();
    const excerpt = input<HTMLTextAreaElement>("sample").value;
    const external = input<HTMLInputElement>("external").checked;
    if (!oldId || !newId || !source || !excerpt) {
      error.textContent = "Add both identifiers, a source label, and an excerpt.";
      return;
    }
    if (oldId === newId) {
      error.textContent = "Old and new identifiers must be different. Change the new identifier.";
      input<HTMLInputElement>("new-id").focus();
      return;
    }
    currentHits = findHits(excerpt, oldId, newId, source, owner, external);
    renderHits(currentHits, oldId);
  };

  const loadSample = (focus = false): void => {
    input<HTMLInputElement>("old-id").value = sampleValues.oldId;
    input<HTMLInputElement>("new-id").value = sampleValues.newId;
    input<HTMLInputElement>("source-name").value = sampleValues.source;
    input<HTMLInputElement>("owner").value = sampleValues.owner;
    input<HTMLTextAreaElement>("sample").value = sampleValues.excerpt;
    input<HTMLInputElement>("external").checked = sampleValues.external;
    analyze();
    const status = get<HTMLParagraphElement>("demo-status");
    if (status) status.textContent = focus ? "Sample restored. Four hits are ready." : "Four sample hits are ready.";
    if (focus) input<HTMLInputElement>("old-id").focus();
  };

  const download = (name: string, content: string, type: string): void => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };
  const csvCell = (value: unknown): string => `"${String(value ?? "").replaceAll('"', '""')}"`;

  form.addEventListener("submit", analyze);
  get<HTMLButtonElement>("reset-demo")?.addEventListener("click", () => loadSample(true));
  get<HTMLButtonElement>("download-json")?.addEventListener("click", () => {
    download("identity-migration-evidence.json", `${JSON.stringify({ schema_version: 1, safety_notice: "Evidence only; human confirmation required.", evidence: currentHits }, null, 2)}\n`, "application/json");
  });
  get<HTMLButtonElement>("download-csv")?.addEventListener("click", () => {
    const header = "identifier,replacement,source,line,column,owner,external,human_confirmation,context\n";
    const rows = currentHits.map((hit) => [hit.identifier, hit.replacement, hit.source, hit.line, hit.column, hit.owner, hit.external, true, hit.context].map(csvCell).join(",")).join("\n");
    download("identity-migration-evidence.csv", `${header}${rows}${rows ? "\n" : ""}`, "text/csv");
  });
  loadSample();
}

function setupRecording(): void {
  const output = get<HTMLElement>("terminal-output");
  const button = get<HTMLButtonElement>("play-recording");
  if (!output || !button) return;
  const transcript = `$ imm demo
Demo — bundled sample data; none of your files were read.
Mapped 7 occurrence(s) across 3 file(s).
Reports: /tmp/identity-migration-map-demo…/migration-map
Review required: external SaaS evidence needs human confirmation.`;
  button.addEventListener("click", () => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      output.textContent = transcript;
      button.textContent = "Replayed";
      return;
    }
    const lines = transcript.split("\n");
    output.textContent = "";
    button.disabled = true;
    let index = 0;
    const timer = window.setInterval(() => {
      output.textContent = lines.slice(0, index + 1).join("\n");
      index += 1;
      if (index === lines.length) {
        clearInterval(timer);
        button.disabled = false;
        button.textContent = "Replay";
      }
    }, 180);
  });
}

function setupClipboard(): void {
  const button = get<HTMLButtonElement>("copy-command");
  if (!button) return;
  const command = "cargo install --git https://github.com/B-Divyesh/sf-identity-migration-map --locked";
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(command);
      button.textContent = "Install command copied";
    } catch {
      button.textContent = "Select the command above";
    }
  });
}

function setupLicense(): void {
  const form = get<HTMLFormElement>("license-form");
  const status = get<HTMLParagraphElement>("license-status");
  const kitButton = get<HTMLButtonElement>("download-kit");
  if (!form || !status || !kitButton) return;

  const slug = "identity-migration-map";
  const licenseKey = `sb_license:${slug}`;
  const verdictKey = `${licenseKey}:verdict`;
  type CachedVerdict = { valid: boolean; checkedAt: number; token: string };
  const cachedVerdict = (token: string): CachedVerdict | null => {
    try {
      const parsed = JSON.parse(localStorage.getItem(verdictKey) || "null") as CachedVerdict | null;
      return parsed?.token === token ? parsed : null;
    } catch { return null; }
  };
  const setAvailable = (available: boolean, message: string): void => {
    kitButton.disabled = !available;
    status.textContent = message;
    status.dataset.state = available ? "valid" : "locked";
  };
  const verifyLicense = async (token: string, force = false): Promise<void> => {
    const cached = cachedVerdict(token);
    if (cached?.valid) setAvailable(true, "Your last verified license is active. The Field Kit is ready.");
    else if (cached) setAvailable(false, "This license is not active. Every free tool remains available.");
    if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return;
    status.textContent = cached?.valid ? "The Field Kit is ready. Checking the license again." : "Checking this license.";
    try {
      const response = await fetch(`https://api.sociobot.in/api/v1/products/${slug}/verify?license=${encodeURIComponent(token)}`);
      if (!response.ok) throw new Error("Verification service unavailable");
      const verdict = await response.json() as { valid: boolean };
      localStorage.setItem(verdictKey, JSON.stringify({ valid: verdict.valid, checkedAt: Date.now(), token } satisfies CachedVerdict));
      if (verdict.valid) setAvailable(true, "License verified. The Field Kit is ready.");
      else setAvailable(false, "This license is not active. Every free tool remains available.");
    } catch {
      if (!cached?.valid) setAvailable(false, "The license service is unavailable. Try again when you are online.");
    }
  };

  const query = new URLSearchParams(location.search);
  const returnedLicense = query.get("license");
  if (returnedLicense) {
    localStorage.setItem(licenseKey, returnedLicense);
    query.delete("license");
    history.replaceState({}, "", `${location.pathname}${query.size ? `?${query}` : ""}${location.hash}`);
  }
  const storedLicense = returnedLicense || localStorage.getItem(licenseKey);
  if (storedLicense) void verifyLicense(storedLicense, Boolean(returnedLicense));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const token = get<HTMLInputElement>("license-token")?.value.trim();
    if (!token) return;
    localStorage.setItem(licenseKey, token);
    void verifyLicense(token, true);
  });
  kitButton.addEventListener("click", () => {
    const kit = `# Identity migration Field Kit

## Owner sign-off

| System | Owner | Export current? | Change approved? |
| --- | --- | --- | --- |
| | | [ ] | [ ] |

## Cutover runbook

- [ ] Freeze dependent writes
- [ ] Verify backup checksum and restore rehearsal
- [ ] Run owner-approved changes in dependency order
- [ ] Validate old and new identifier behavior
- [ ] Announce the result and archive evidence

## Rollback rehearsal

| Source | Restore step | Tested by | Result |
| --- | --- | --- | --- |
| | | | not-tested |
`;
    const url = URL.createObjectURL(new Blob([kit], { type: "text/markdown" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "identity-migration-field-kit.md";
    link.click();
    URL.revokeObjectURL(url);
  });
}

const offlineBanner = get<HTMLElement>("offline-banner");
const updateOnlineState = (): void => {
  if (offlineBanner) offlineBanner.hidden = navigator.onLine;
};
window.addEventListener("online", updateOnlineState);
window.addEventListener("offline", updateOnlineState);
updateOnlineState();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => { void navigator.serviceWorker.register("/service-worker.js"); });
}

setupDemo();
setupRecording();
setupClipboard();
setupLicense();
