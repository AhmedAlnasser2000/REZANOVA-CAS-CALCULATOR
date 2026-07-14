# CANONICAL-RESULT-V2-CONSUMER-HISTORY1

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

- kind: backend
- result: pass
- production producer posture: all 57 frozen routes remain V1; no production V2 selector is enabled
- protected state: concurrent Notebook pagination work and untracked `test-results/` were excluded

## Implemented

- Added one normalized read authority with `sourceVersion`, preserved `rawDocument`, version-neutral presentation, and version-neutral mathematical/domain semantics.
- Migrated Display, History, clipboard, print hygiene, diagnostics, Equation presentation readers, History replay fixtures, MathJSON coverage, and Surface Protocol DTOs to the normalized authority.
- Enabled validated V2 runtime outcomes while retaining V1/V1-action and V2/V2-action pairing.
- Made V2 a current visible History version, kept versions above 2 opaque and outside current retention, retained V1 canonical-only oversized fallback, and made oversized V2 writes fail closed.
- Added dual-version History, runtime, Display, clipboard, diagnostics, Surface Protocol, and replay-fixture evidence without manufacturing V2-only semantics for V1.

## Verification

- `npm run test:result-contract`: 12 files / 75 tests pass; 43 golden plus 100 replay executions retain the 455/432/23/0 V1 baseline.
- `npm run test:history-replay`: 3 files / 6 tests plus the import boundary pass.
- `npm run test:surface-protocol`: boundary validator plus 9 files / 40 tests pass.
- `npm run test:display-contract-inversion`: 401 producer boundaries, 149 native documents, 57 consumer reads, zero compatibility projections, and zero legacy reads.
- Focused History/runtime/Display/clipboard/diagnostics/worker tests pass.
- Incremental TypeScript and Vite production build pass.
- Chromium History persistence: 5/5 pass, including visible V2 load and replay, preserved V1, and opaque V3.
- Chromium nine-workspace V1 History replay matrix: 9/9 pass with current result cards and no observed overflow.
- File-size validation and diff hygiene pass; memory validation is part of the pre-commit checkpoint.

## Recovery Note

- The first V2 browser probe reused the pre-gate `dist/` preview and therefore exercised the old V1-only History policy. The current source was rebuilt with Vite, the V2 probe passed, and the complete five-case History browser file then passed against the rebuilt application.
