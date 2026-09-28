# GRAPHING-GPU-REAL-FIELDS1 verification

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

## Visual (Playwright, Chrome and desktop)

- Harness on the RTX: the circle, strict disk, mixed power, nested log, chained inequality, 1/x, cos-product, heart and tan cases draw correctly, with no false pole lines or near-zero bands.
- In-app mid-gesture and settled screenshots:
  - GPU fields stay sharp while the gesture lane redraws formula curves;
  - the committed scene replaces the lane after settle.
- User scene before and after on the RTX: identical pictures. The GPU fields match the CPU reference.
- Chip placement checked with the Polar-grid suggestion present (no overlap).
- Packaged desktop (WebKitGTK 2.52.6, standalone debug build): `test:desktop-smoke` exit 0.
  - The real chip reads GPU and the screenshot shows the GPU circle `x^2+y^2=9`, which was invisible before the `preserveDrawingBuffer` fix.
  - The complex chip reads GPU with crisp domain colouring, and the Three surface mounts.

## Automated

- Playwright chromium:
  - `graphing-gpu-real-fields` 2/2, `graphing-gpu-complex`, `graphing-gpu-parity`, `graphing-gpu-diagnostics`, `graphing-sampler-correctness` 2/2;
  - `graphing-minimum-visible` ×3: 72 passed, with only the known `:599` failing (identical to HEAD `96ec5542`, measured the same way).
  - Two earlier `:244` focus timeouts did not reproduce in 24 concurrent standalone runs or later repeats, and are treated as environmental.
- `graphing-performance.spec.ts` throttled contract, 3 runs:
  - p95 frame 17 ms (budget 24; 283 ms before the fixes);
  - 0 long tasks (budget 50 ms);
  - first preview 205-253 ms (budget 150 ms; known on `main` since `1a8c1d7b`);
  - the viewport-size variants pass.
- Playwright WebKit is still blocked on host libraries (`libavif16 libwoff1`, an existing open question). The packaged WebKitGTK smoke is the WebKit evidence.
- Unit and UI suites:
  - `test:graph-gpu` 47/47, `test:graph-contracts` 15/15, `test:graph-sampling` 65/65, `test:graph-scene` 11/11, `test:graph-ooe` 51/51, `test:graph-workspace-runtime` 28/28;
  - boundary ratchet (76 files);
  - full UI suite 611 passed / 4 skipped (86 files), including the shared `MathEditor`.
- Checks:
  - `npx tsc -b` clean;
  - scoped ESLint has 0 errors (2 existing warnings in `useGraphWorkspaceController.ts`);
  - `test:file-sizes`, `test:bundle-size`, `test:memory-protocol` and `git diff --check` pass.

## Durable memory updated

- `.memory/current-state.md`, `.memory/journal/2026-09/2026-09-28.md`, `.memory/decisions.md`, `.memory/open-questions.md`, `docs/architecture/graphing/graph-arc-terra-program.md`, and this dossier.
