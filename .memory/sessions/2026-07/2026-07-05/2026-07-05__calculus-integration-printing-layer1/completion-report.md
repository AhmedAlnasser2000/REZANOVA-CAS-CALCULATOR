# CALCULUS-INTEGRATION-PRINTING-LAYER1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

`CALCULUS-INTEGRATION-PRINTING-LAYER1` adds a Calculus-owned presentation layer between verified indefinite-integration route output and Display output.

Gate labels: `backend` for verified antiderivative presentation and copy/editor canonical LaTeX; `ui` for app-visible answer rows, detail cards, trust cards, overflow/readability, Copy Result, and To Editor behavior.

## Completed

- Added a Calculus integration presentation pass for verified indefinite antiderivatives only.
- Added derivative-backchecked `+C` handling after route composition, with no `+C` for unsupported, error, nonverified, casewise, or certificate-only outputs.
- Threaded `answerRows` through Calculus core evaluation, expression execution, runtime outcome construction, and Calculate mode.
- Normalized readable canonical output for the migrated families: additive textbook power/root outputs, scalar multiples, rational polynomial division/partial fractions, reciprocal radical `3/2` templates, and hyperbolic square table outputs.
- Preserved parseable Copy Result and To Editor LaTeX while using answer rows to keep app-visible output readable and ordered.
- Added `Integration Presentation` detail evidence before the `Trust` card.

## Excluded

- No Equation imports or Equation structured-output reuse.
- No shared Display schema redesign.
- No definite/improper integral widening.
- No solver capability widening and no route-local `+C` string patches.
- Did not stage unrelated Linear Algebra, Equation, Guide, or Limits dirty work.

## Remaining Risk

- The printer is intentionally small and family-scoped; broader symbolic normalization, generic function simplification, and future branch-heavy/casewise integration presentation remain follow-up work.
- Repo-wide `npx tsc -b --pretty false` is blocked by an unrelated current-repo Guide contract-test error in `src/lib/guide/content.contract.test.ts`.
