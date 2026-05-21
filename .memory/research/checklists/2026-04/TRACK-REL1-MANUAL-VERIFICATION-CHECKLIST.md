# TRACK REL1 Manual Verification Checklist

Date: 2026-04-28

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `REL1` hardens the first Linux preview release path that `REL0` scaffolded.
- `SRC0` adds `.memory/sources/` as the canonical verbatim-source snapshot folder.
- The REL/PILLARS roadmap source is preserved as a byte-identical snapshot:
  - `.memory/sources/2026-04-28__calcwiz-rel-pillars-roadmap.md`
- Snapshot metadata lives in `.memory/sources/INDEX.md`, not inside the snapshot.
- `.memory/research/references/sources.md` remains a legacy/reference source note and points to the new canonical folder.
- The release workflow runs a fuller pre-package gate before building Linux bundles.
- Release docs now separate reusable process guidance from the first-preview checklist.
- `CHANGELOG.md` starts the first public preview release-notes discipline.
- Tauri package metadata now records the MIT license.

## Source Snapshot Verification

Expected SHA-256:

```text
a81a3bb99786fe6fe02bfd76fc612e175b742d51b749e499da62a9cc2c25b58b
```

Expected byte size:

```text
24370
```

## Automation Gate

```bash
sha256sum <local-source>/calcwiz_rel_pillars_roadmap.md .memory/sources/2026-04-28__calcwiz-rel-pillars-roadmap.md
cmp -s <local-source>/calcwiz_rel_pillars_roadmap.md .memory/sources/2026-04-28__calcwiz-rel-pillars-roadmap.md
npm run test:memory-protocol
npm run test:unit
npm run test:ui
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run test:launch-preflight
npm run tauri:build
```

## Local Artifact Proof

`npm run tauri:build` completed locally on Linux and produced:

```text
src-tauri/target/release/bundle/appimage/Calcwiz Desktop_0.1.0_amd64.AppImage  78871032 bytes
src-tauri/target/release/bundle/deb/Calcwiz Desktop_0.1.0_amd64.deb          4732982 bytes
src-tauri/target/release/bundle/rpm/Calcwiz Desktop-0.1.0-1.x86_64.rpm       4733523 bytes
```

## Manual Release Smoke

Before publishing `v0.1.0-preview`:

1. Confirm `ci-linux` passes on GitHub.
2. Confirm `Release Linux` produces at least one Linux artifact.
3. Download the artifact and launch on Linux.
4. Check Calculate, derivative, indefinite integral, safe definite integral, unsafe definite-integral stop, and equation solve smoke.
5. Confirm release wording says early Linux-first preview, not full CAS parity.
6. Confirm README, `LICENSE`, `package.json`, and `src-tauri/Cargo.toml` reflect MIT licensing.

## Pass/Fail

- Source SHA-256 match: passed.
- Source byte-identical `cmp`: passed.
- GitHub workflow YAML parse: passed.
- Memory protocol: passed.
- Unit tests: passed.
- UI tests: passed.
- ESLint: passed.
- Production build: passed.
- Rust cargo check: passed.
- Launch preflight: passed.
- Tauri Linux bundle build: passed.
- Manual smoke: pending after artifact review.
