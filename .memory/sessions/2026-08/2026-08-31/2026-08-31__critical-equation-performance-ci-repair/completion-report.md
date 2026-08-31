# Critical Equation Performance and CI Repair Program

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

## Program

- Mode: `CRITICAL`, root working alone.
- Verification policy: targeted deltas only; do not run `npm run test:gate`.
- Commit plan: four independently verified gates; no push is authorized.
- Gate 1: `CI-EQUATION-TRANSFORM-V2-AUTHORITY1` (`backend`) is implementation- and verification-complete, pending selective commit approval.
- Gates 2-4 remain pending in this program. The existing Node 24 work stays unstaged while Gates 1-3 are handled.

## Gate 1 Implemented

- Restored the explicit Equation LCD transform for `\frac1x+\frac1{x+1}=1` as a finalized Canonical Result V2 document with producer-owned primary MathJSON, two typed exclusions, and MathJSON for the transform summary.
- Added a producer-owned canonical-supplement classification. Runtime V2 selection now uses role, normalized canonical value, and exact MathJSON identity; it no longer pairs semantic evidence by presentation count or target-text matching.
- Preserved same-route guarded selections across evidence merges while preventing later diagnostic routes from replacing or enlarging an upstream producer selection.
- Kept constant diagnostic evidence such as `3>0` out of canonical supplement rows without deleting the diagnostic evidence itself.
- Made Equation UI launch and active-revision reconstruction resolve a missing symbolic target before revision ownership is established. Centralized worker, History replay, and golden execution normalization in the non-frozen Equation runtime-request adapter. The fingerprint-frozen Equation mode producer remains byte-identical.
- Realigned the two reviewed AppMain expectations: lazy Calculate variable controls are awaited, and PRL4 expects its current `Same-Base Equality` provenance.

## Preserved Boundaries

- No V1 inventory, frozen-producer fingerprint, Canonical Result schema, MathJSON coverage baseline, display-inversion baseline, solver capability, or visible PRL4 mathematics changed.
- Explicit transforms still rewrite without solving. The LCD result remains a transformed equation and keeps both denominator exclusions.
- The known recursive carrier performance defect remains isolated for Gate 2; Gate 1 does not conceal it with a timeout or validation relaxation.

## Remaining Program Work

- Gate 2: request-scoped Equation proof-verification session and measured carrier performance repair.
- Gate 3: Calculate-only MathLive `root\left(...\right)` canonicalization.
- Gate 4: selective Node 24 and GitHub Actions maintenance closeout.
