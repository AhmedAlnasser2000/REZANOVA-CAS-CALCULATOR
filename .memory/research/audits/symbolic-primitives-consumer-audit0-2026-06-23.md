# SYMBOLIC-PRIMITIVES-CONSUMER-AUDIT0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

All five private Symbolic Primitives now exist and each has exactly one proven production adoption lane:

1. Expansion: Equation polynomial carrier follow-on.
2. Substitution: Equation carrier elimination reduced-equation construction.
3. Factorization: Equation factorable solving and symbolic factor-pattern adapter.
4. Simplification: Symbolic factorization node helpers.
5. Elimination: Equation Polynomial 2x2 resultant projection.

This audit checks whether Calcwiz should now broaden adoption, add app-wide surveillance, or leave the primitives as established but underused.

## Consumer Posture

| Primitive | Current Consumer Strength | Expansion Pressure | Next Move |
| --- | --- | --- | --- |
| Expansion | Good first consumer. | Moderate. Mixed-algebraic and mixed-factor have real duplicated expansion mechanics. | Consumer parity milestone recommended. |
| Substitution | Good first consumer. | Moderate. Carrier follow-on has exact subtree replacement pressure, but stored variables are separate. | Consumer parity milestone recommended after metadata audit. |
| Factorization | Good Equation-first consumer. | Moderate. Older `symbolic-engine/factoring.ts` facade is the next likely target. | Facade parity milestone recommended. |
| Simplification | Good first consumer, highest pressure. | High. Equation parameterized MathJSON arithmetic is the obvious next candidate. | Consumer parity milestone recommended first. |
| Elimination | Good first consumer, narrow by design. | Low. No safe second consumer yet. | No immediate migration; wait for product pressure. |

## App-Wide Surveillance Decision

Do not add a hard primitive-surveillance validator yet.

Reason:

- the primitives are newly established and most have only one proven consumer;
- many local helpers are route semantics, not reusable mechanics;
- a hard import/lint rule would create noisy false positives in Algebra, Equation isolation, inequality, radical, Calculate action, and validation paths;
- the file-size ratchet plus explicit milestone planning is enough enforcement for the next stage.

Near-term governance:

- every new solver/refactor milestone should state which primitive it consumes or why local logic remains semantic;
- consumer expansion should be one primitive and one candidate area at a time;
- only add lightweight reporting after at least two primitives show repeated bypass pressure with proven alternate consumers.

## Recommended Implementation Order

1. `SYMBOLIC-SIMPLIFICATION-CONSUMER-PARITY1`
   - Candidate: `src/lib/equation/parameterized/math-json.ts`.
   - Reason: highest duplication pressure and broadest downstream payoff.

2. `SYMBOLIC-EXPANSION-CONSUMER-PARITY1`
   - Candidate: `src/lib/equation/parameterized/mixed-algebraic.ts`, then possibly `symbolic-engine/mixed-factor`.
   - Reason: clear repeated product/square expansion mechanics.

3. `SYMBOLIC-SUBSTITUTION-CONSUMER-PARITY1`
   - Candidate: carrier-follow-on exact subtree replacement.
   - Reason: close semantic match, but may need replacement-count metadata.

4. `SYMBOLIC-FACTORIZATION-FACADE-PARITY1`
   - Candidate: `src/lib/symbolic-engine/factoring.ts`.
   - Reason: useful reuse, but product/facade output parity must be preserved.

5. Elimination consumer expansion: defer.
   - Reason: current second-candidate pressure is not yet strong enough.

## Audit Artifacts

- `.memory/research/audits/symbolic-expansion-consumer-audit0-2026-06-23.md`
- `.memory/research/audits/symbolic-substitution-consumer-audit0-2026-06-23.md`
- `.memory/research/audits/symbolic-factorization-consumer-audit0-2026-06-23.md`
- `.memory/research/audits/symbolic-simplification-consumer-audit0-2026-06-23.md`
- `.memory/research/audits/symbolic-elimination-consumer-audit0-2026-06-23.md`

## Non-Goals

- no `src/` changes;
- no primitive API change;
- no consumer migration;
- no final-answer readback polishing;
- no app-wide hard validator;
- no solver behavior, Display, History, OOE, app-state, Tauri, or UI change.

## Verification For This Audit

- Source inspection in order: expansion, substitution, factorization, simplification, elimination.
- Required gates: `npm run test:memory-protocol`, `git diff --check`.
