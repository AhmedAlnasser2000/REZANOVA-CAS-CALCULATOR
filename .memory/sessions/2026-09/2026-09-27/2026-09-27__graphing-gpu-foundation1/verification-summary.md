# GRAPHING-GPU-FOUNDATION1 verification

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Checks

- `npm run test:graph-gpu` 42/42:
  - Node semantic parity: 18 real and 17 complex cases over grids, with zero domain disagreements and values within 2e-5 (real) / 5e-5 (complex) relative;
  - pole/log-zero agreement; refusals; policy tests; field-frame contract tests;
  - ratchet tests 11/11.
- Browser driver parity (`e2e/graphing-gpu-parity.spec.ts`, 8 programs, ~9,300 compared pixels):
  - 0 domain and 0 value mismatches on Chrome SwiftShader and on Chrome hardware (ANGLE NVIDIA RTX 5070 Ti);
  - viewport and parameter changes compile 0 new programs;
  - draws are refused synchronously after context loss.
- `test:graph-contracts` 15/15, `test:graph-sampling` 65/65, `test:graph-scene` 11/11, `test:graph-ooe` 51/51, `test:graph-parser` 27/27.
- Settings:
  - `SettingsPage.ui.test.tsx` 5/5 including 'patches Graph GPU rendering from the Graphing category';
  - GraphicsDiagnosticsPanel 3/3;
  - `feature-probe-registry.test.ts` 3/3 (26 keys);
  - `src/lib/app-state` 65/65; `SettingsPanel.ui.test.tsx` 6/6; `src/app/graphing` UI 36/36.
- `cargo test --lib graph_gpu_rendering`: pass.
- Playwright chromium: `graphing-gpu-diagnostics.spec.ts` (now in the Graphing category) pass. A 1440x940 screenshot of Settings → Graphing was inspected: the toggle, the note, and the diagnostics card read clearly with no overflow.
- `npx tsc -b`, scoped ESLint, `npm run test:file-sizes` (SettingsPage 865, runtime-types within its 1340 cap), `npm run test:bundle-size` (eager JS 1987.75 kB, unchanged; the GPU barrel is a lazy chunk), `npm run test:memory-protocol`, and `git diff --check`: all pass.

## Durable memory updated

- `.memory/current-state.md`, `.memory/journal/2026-09/2026-09-27.md`, `.memory/decisions.md`, `.memory/open-questions.md`, and this dossier.
