# Critical CI, Equation Proof, Calculate Root, and Node 24 Repair

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
- Commit plan: four independently verified gates; no push is authorized.
- Gate 1: `CI-EQUATION-CARRIER-V2-PROOF-REPAIR1` (`backend`) is committed as `7f948b33`.
- Gate 2: `CALCULATE-TEXTUAL-NTH-ROOT-SAFETY1` (`backend`) is committed as `5e9c2201`.
- Gate 3: `CI-RUNTIME-READINESS-CANARY-REPAIR1` (`backend`) is implementation- and verification-complete with commit approval received.
- Gate 4 remains pending: Node 24 Actions maintenance.

## Gate 1 Implemented

- Preserved accepted native carrier-root nodes through guarded Equation construction and built single-root or finite-set primary proof from the target plus independently proven roots.
- Added fail-closed handling for missing, incomplete, mismatched, or conflicting carrier proof before a successful result draft can cross the V2 producer boundary.
- Accepted exact producer-tree serialization as proof evidence without parsing presentation LaTeX or entering compiled equality.
- Separated actual lazy Equation module import failures from worker execution and canonical finalization failures.
- Restored the three reproduced nested carrier equations to successful V2 output without changing their existing visible mathematical presentation.

## Gate 2 Implemented

- Added a Calculate-only canonicalization boundary for textual `root(index, radicand)` calls, translating accepted calls into the existing structured nth-root notation before semantic planning.
- Accepted integer indices of at least two and one-letter symbolic indices, including nested textual roots and recursively canonicalizable radicands.
- Rejected invalid indices, arity, empty arguments, and unbalanced grouping with specific planner-owned controlled guidance.
- Removed the math-engine's raw-input fallback after canonicalization failure, so invalid textual roots cannot reach the solver as unstructured text.
- Kept Equation and every non-Calculate workspace outside the textual-root widening; no new solver operator or result schema was added.

## Remaining Program Work

- Gate 4: Node 24 policy, SHA-pinned Actions v7, Dependabot maintenance, and alignment ratchets.
- One Node 24 `npm run test:gate` closeout remains reserved until Gate 4 is complete.

## Gate 3 Implemented

- Replaced only the two CI-sensitive Linear Algebra tests' one-second default completion waits with bounded five-second route waits; production runtime behavior and global test timeouts remain unchanged.
- Stress-ran the Matrix profile and multi-vector routes five consecutive times at four-worker concurrency; both remained green, with the multi-vector route consistently completing just beyond the former one-second boundary.
- Locked the Calculus integral canary to the current canonical `\frac{x^{2}}{2}+C` output and confirmed it in the real browser canary.
- Diagnosed, without repairing, two follow-up issues: stale or decorated MathLive textual-root entry can bypass the new plain-input canonicalizer, and recursive Equation carrier solves repeatedly rebuild and re-prove results with fresh Compute Engine instances, producing heavy bootstrap/type-resolution and garbage-collection cost.
