# HISTORY-CANONICAL-ONLY1

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
- status: verified
- commit: pending under standing approval
- push: not authorized

## Outcome

- Current V1 History rows require a validated canonical result document and carry no legacy result fields.
- Old and malformed V1 rows are removed atomically with one non-blocking count notice.
- Future result versions remain hidden, byte-preserved, and outside V1 clear and retention operations.
- Oversized appends retry once with optional MathJSON removed and `canonical-only-fallback`; canonical structure and LaTeX remain unchanged.

## Evidence

- Focused backend: 70 tests pass.
- Focused UI: 106 tests pass after targeted stale-assertion corrections.
- Replay: all 100 fixtures pass.
- Persistence: eight browser contract tests and four Rust History tests pass.
- Chromium: four persistence journeys pass; inspected History and replay screenshots show original Equation identity, structured two-variable output, validity facts, verification details, and no overflow.
- Static: TypeScript, inversion, lint, memory, file-size, seam, OOE/compartment boundaries, Rust check, and diff hygiene pass. OOE diagnostics may consume only the exact public result-contract facade.
- Resource posture: no full unit/UI/canary suite was repeated; the production assets used by Playwright were generated successfully even though the wrapper lost Vite's final footer.

## Protected Work

- Concurrent Notebook files were not edited or staged.
- Untracked `test-results/` remains untouched.
