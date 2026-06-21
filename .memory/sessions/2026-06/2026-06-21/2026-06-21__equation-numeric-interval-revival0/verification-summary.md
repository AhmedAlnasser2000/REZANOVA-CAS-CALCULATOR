# EQUATION-NUMERIC-INTERVAL-REVIVAL0 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

- Audit/docs/memory only.
- No source implementation changes.

## Commands Run

- `npm run test:memory-protocol`
- `git diff --check`

## Probe Evidence

- Ran direct `runNumericIntervalSolve(...)` probes with `npx vite-node --script /tmp/calcwiz-numeric-interval-expanded-probe.ts`.
- Ordinary polynomial roots were stable across identical numeric endpoints such as `-2` and `-2.0`.
- Dense/nested periodic cases changed root counts with endpoint shifts and subdivision count:
  - `tan(ln(x)+1)=1` on `[0.01,100]`: 2 roots at 256 subdivisions, 3 roots at 2048.
  - `sin(tan(ln(x)+1))=1` on `[1,100]`: 8 roots at 256 subdivisions, 21 roots at 2048.

## Results

- `npm run test:memory-protocol` passed.
- `git diff --check` passed.
- The recurring Node warning about `NO_COLOR` being ignored while `FORCE_COLOR` is set appeared during memory validation and did not indicate failure.
