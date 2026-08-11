# CI UI Readiness, Canonical Proof, and Watchdog Closeout

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Status

- Gate 5 `CI-UI-LAZY-READINESS-REPAIR1` — UI: complete and verified for commit approval.
- Gate 6 `CANONICAL-PROOF-FORMAL-COMPARISON1` — backend: pending.
- Gate 7 program closeout — backend/UI: pending.

## Gate 5 completed scope

- UI tests now wait for the actual lazy Equation, Calculus, Statistics, Formula Viewer, and stored-value readiness boundaries instead of pre-existing generic controls or fixed timing assumptions.
- Calculus test navigation uses one test-only workspace helper; production lazy loading remains unchanged.
- OOE inventory coverage explicitly includes the tenth Graphing compartment.
- Notebook movement coverage recognizes TipTap's legitimate trailing paragraph while keeping the semantic block as the final managed movable sibling.
- The user included the discovered radical supplement mismatch in Gate 5. Equation runtime V2 now pairs mixed condition/exclusion presentations by producer-owned evidence role: one-to-one rows retain their presentation, while a grouped role row expands to clean evidence-owned canonical rows.
- The pairing code classifies only exact display-label prefixes. It does not parse mathematical LaTeX or reconstruct MathJSON, and unresolved role/count combinations still fail closed.

## Preserved boundaries

- No production eager-loading change.
- No Canonical Result schema, frozen V1 inventory, proof-count, print baseline, or MathJSON baseline change.
- No edits under `node_modules`.
- No push authorization.

## Out-of-scope observation

- One prior Calculus implicit-derivative visual showed stale selected-target detail text. It is not caused by Gate 5 and remains outside this repair.
