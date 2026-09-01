# Equation Request-Scoped Proof Performance

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- Milestone: `EQUATION-REQUEST-SCOPED-PROOF-PERFORMANCE1`.
- Type: `backend`.
- Mode: `CRITICAL`, root working alone.
- Scope: Gate 2 only. Gate 3 Calculate MathLive textual-root normalization was not started. Gate 4 Node 24/Actions changes remain separately unstaged.

## Implemented

- Added an opaque runtime-only MathJSON proof-verification session at the non-frozen Equation worker boundary.
- Each top-level Equation execution receives one lazily constructed Compute Engine shared by recursive guarded stages and final V2 proof finalization.
- Successful comparison and canonical-printer evidence is cached by exact canonical LaTeX, validated serialized MathJSON, and answer-versus-standard comparison mode.
- Provenance, owner/route registration, source, bounds, private and non-standard operators, and structured-clone safety are rechecked before every cache lookup. Failures are never cached.
- Cache hits return the current producer's source and fresh cloned MathJSON; no runtime session state is serialized or persisted.
- Dedicated worker requests stay isolated. If two main-thread fallback Equation requests overlap, ambient reuse disables itself rather than allowing cross-request proof sharing; correctness remains fail-closed while only the optimization degrades.

## Preserved Boundaries

- No frozen Equation producer, public Canonical Result schema, V1 inventory, MathJSON baseline, solver algorithm, worker topology, stored MathJSON, or visible mathematical result changed.
- The final V2 authority checks still run and near-miss/conflicting evidence still fails.
- Non-Equation workspaces never consume the Equation proof session.
- Direct low-level guarded tests that bypass the public runtime adapter intentionally do not receive the runtime optimization; production Equation execution does.

## Outcome

- The approximately 54-second isolated outer logarithmic wrapper benchmark now has a 5.17-second median, a 90.5% improvement.
- All four benchmark cases exceeded the planned 60% target with byte-identical canonical answers.
- Real-app browser execution completed in approximately 3.0s, 3.0s, 3.0s, and 5.0s and retained the approved cards and readable layout.
