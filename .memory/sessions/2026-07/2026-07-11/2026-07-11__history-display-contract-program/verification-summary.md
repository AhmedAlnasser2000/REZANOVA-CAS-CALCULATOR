# HISTORY-DISPLAY-CONTRACT-ROADMAP0 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- Kind: `backend` repository, persistence-schema, and architecture audit.
- Runtime behavior changed: no.
- Result: pass.

## Live Evidence

- `git status --short --branch`: `main...origin/main`, only `?? test-results/`.
- `git log -3`: `bb6fc4ba` is `PRINT-PROFILE-PRODUCER-CLOSEOUT1`.
- Printer inventory: 519 result paths, zero compatibility, 277 migrated, 239 forwarded.
- History replay report: 100 fixtures, 100 hard LaTeX fixtures, zero failures or drift.
- `DisplayOutcome` production references: 137 files; Equation accounts for 31 core and 33 mode files.
- Current field audit found three browser-schema omissions and a broader native Rust projection that drops current versioned replay and workspace fields.
- Existing `DisplayBlock` is presentation/scheduling state and is rejected as the persistence contract.

## Required Gates

- `npm run test:memory-protocol`: passed 21 validator tests and live protocol validation.
- `git diff --check`: passed.
- No runtime, build, or UI gate is required for this documentation-only checkpoint; implementation milestones retain the full verification contract.

## HISTORY-PERSISTENCE-PARITY-CLOSURE1 Gate

- Kind: `backend` persistence contract with `ui` browser restart and warning evidence.
- Runtime behavior changed: yes; durable append failure now reports a non-blocking warning while the row remains in session.
- Mathematical output changed: no.
- Result: pass.

## Parity Evidence

- Exact browser schema parity: 35/35 `HistoryEntry` keys, with future extension passthrough.
- Browser/Calculator Memory exact roundtrip: passed with every current field and an unknown extension.
- Rust file restart: extension-rich History and Calculator Memory values survived `AppState::load`, save, drop, reload, delete, and a second reload.
- Native validation: malformed mode and oversized new append rejected; sparse legacy rows retained; newest 80 rows retained without projection.
- Real Chromium: 2/2 persistence tests passed, covering actual reload and forced localStorage failure with session-row retention.
- Real Tauri: two isolated Linux desktop launches reached `target/debug/calcwiz_desktop`; the second launch loaded and autosaved a preseeded row while retaining `systemReadback`, `equationSeed`, replay version, and unknown extension in both History and Calculator Memory.

## Commands Passed

- Focused/app-state: 53 focused tests; `npm run test:app-state-contracts` passed 57.
- App runtime: `npm run test:app-runtime-contracts` passed 59 logic and 140 UI/runtime tests.
- Rust: `cargo test --lib` passed 50; `cargo check` passed.
- Browser: persistence parity 2/2; workspace canaries 19/19.
- Presentation and replay: `test:history-replay`, `test:display-contracts`, and `test:clipboard-contract` passed.
- Runtime and architecture: `test:workspace-runtime-contracts`, `test:runtime-probes`, `test:ooe-boundaries`, `test:compartments-boundaries`, `test:surface-protocol`, `test:seam-impact-selector`, and `test:app-identity` passed.
- Static: TypeScript, build, lint, file-size, memory-protocol, and `git diff --check` are required final commit gates.

## Observations

- `cargo fmt --check` remains red on pre-existing formatting in untouched `src-tauri/src/ooe/commands.rs`, `src-tauri/src/ooe/hosts.rs`, and older `src-tauri/src/lib.rs` regions. This milestone did not reformat unrelated Rust code; all new Rust lines were aligned to rustfmt output, and Cargo check/tests pass.
- Tauri launches are intentionally terminated by timeout after boot in isolated `.task_tmp/` storage; exit `124` records the harness stop, not an app failure.
