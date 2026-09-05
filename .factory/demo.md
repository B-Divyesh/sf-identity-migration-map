# Demo sandbox

## Browser demo

- URL: <https://identity-migration-map.sociobot.in/demo/>
- Entry: select **Try it with sample data** on the first screen.
- Sample: an `alice` to `alice.ops` rename in a realistic external chat export.
- Result: four hits with source lines, an owner, and human-confirmation notices.
- Reset: select **Reset demo** in the persistent demo banner.
- Exit: select **Start for real** to open the install instructions.
- Storage: no demo storage namespace exists because demo state stays in page memory.
- Isolation: demo code does not read or write license keys or other saved data.
- Offline: after one visit, the service worker can reload the populated sample offline.

## CLI demo

Run:

```sh
imm demo
```

The binary writes bundled sample files into a newly created system temporary directory.
It runs the same scanner used for real plans.
It prints the report directory and leaves all four reports there for inspection.
It never reads the current directory or an existing user file.

The committed equivalent lives under `examples/sample/`.
Tests use the bundled copy so an installed binary needs no repository checkout.
