# CANONICAL-RESULT-V3-ANGLE-QUANTITY1

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

- label: backend
- result: pass; standing user approval covers this commit and the remaining approved Linear Algebra program commits
- protected state: concurrent Notebook changes and untracked `test-results/`
- push authority: none

## Implemented Contract

- Added strict `CanonicalResultDocumentV3` validation over the inherited V2 surface plus one `angle-quantity` primary carrying compound presentation, producer-proven magnitude, and `deg`, `rad`, or `grad`.
- Extended canonical document, normalization, consumers, History read models, producer drafts, runtime outcomes, actions, validation routing, and MathJSON leaf collection through version 3.
- Refactored route policy to `defaultVersion + selectorVersions`; the V3 selector registry is deliberately empty at this prerequisite checkpoint.
- Made browser and Rust History treat V1-V3 as current, V4+ as opaque future rows, and canonical-only size fallback as V1-only.
- Updated repository authority policy so V2 remains the default and V3 is approved only for typed angle quantities.

## Verification

- `npm run test:result-contract -- --maxWorkers=4`: 16 files and 105 tests passed.
- `npm run test:canonical-result-v2-enforcement`: 6 validator tests, 26 frozen producer files, 12 focused contract/coverage tests, and 23 display-inversion tests passed; compatibility and legacy reads remain zero.
- Focused V3/V2/History/runtime Vitest checkpoint: 8 files and 80 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml history_ --lib`: 6 passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`: passed.
- `npm run build`: incremental TypeScript and the Vite production build passed.
- `npm run test:compartments-boundaries`: 36 tests passed.
- `npm run test:ooe-boundaries`: 8 tests passed.
- `npm run test:file-sizes`: 10 validator tests passed; 1,889 files are within caps.
- Focused Chromium History evidence: current V3 load/render/copy/replay and opaque V4 preservation passed; screenshots were inspected for the History row and replayed answer card with no visible overflow.
- The first browser retry served a stale pre-build `dist` and therefore hid V3 as future data; rebuilding the current source resolved the evidence issue without a runtime code change.

## Handoff

- Commit this verified prerequisite as `CANONICAL-RESULT-V3-ANGLE-QUANTITY1`.
- Continue directly to `LINEAR-ALGEBRA-CANONICAL-V2-COMPLETION1` under the user's standing approval.
- Do not activate any V3 producer except the approved gradian Vector-angle selector in that next milestone.
- Do not push.
