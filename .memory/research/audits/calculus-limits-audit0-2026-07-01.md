# CALCULUS-LIMITS-AUDIT0

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

This is an audit/readiness checkpoint only. It records the live Limits shape before implementation resumes and locks the handoff from the paused differentiation track to Limits. It does not change runtime behavior, Display schemas, History, OOE, Tauri, or public Calculus result contracts.

## Source Evidence

- Guided workspace state and evaluators: `src/lib/calculus/workspace/limits.ts`.
- Generated finite/infinite limit previews: `src/lib/calculus/workspace/examples.ts`.
- Finite target parsing: `src/lib/calculus/engine/finite-limit-target.ts`.
- Core finite/infinite evaluation and numeric fallback: `src/lib/calculus/engine/limits.ts`.
- Infinite-target polynomial/rational dominance: `src/lib/calculus/engine/limit-heuristics.ts`.
- Symbolic finite-limit dispatch facade: `src/lib/symbolic-engine/limits.ts` and `src/lib/symbolic-engine/limits/api.ts`.
- Finite-limit rule modules: `known-rules.ts`, `rational-local.ts`, `local-equivalents.ts`, `poles.ts`, and `lhospital.ts` under `src/lib/symbolic-engine/limits/`.
- Regression coverage: `src/lib/calculus/workspace/limits.test.ts`, `src/lib/calculus/engine/finite-limit-target.test.ts`, `src/lib/calculus/engine/limit-heuristics.test.ts`, and `src/lib/symbolic-engine/limits.test.ts`.

## Current Live Shape

- Guided Calculus has `Limits`, `Finite Limit`, and `Infinite Limit` screens.
- Finite Limit keeps the expression body in a `secondary-mathfield`, direction chips in the card, and the target in a separate signed-number input.
- Infinite Limit keeps the expression body in a `secondary-mathfield` and `+\infty` / `-\infty` as target-kind chips.
- Generated previews are built as `\lim_{x\to ...}(body)`, and both finite and infinite evaluation hardcode `x` as the limit variable.
- Finite target parsing accepts numeric targets plus one-sided marks such as `0^+` and `0^-`; symbolic targets such as `a` are rejected.
- Finite symbolic dispatch order is:
  1. direct substitution,
  2. known standard forms,
  3. exact rational local simplification,
  4. local equivalents,
  5. signed pole detection,
  6. one-sided logarithm boundary detection,
  7. capped L'Hospital on quotient forms,
  8. controlled numeric sampling fallback.
- Infinite limits first try polynomial/rational dominance and constants, then controlled numeric sampling.
- Current tests cover common removable singularities, one-sided asymptotes, log boundary behavior, rational dominance at infinity, and local-equivalent product/power cases.

## Strong Coverage Already Present

- `sin(x)/x`, `tan(x)/x`, `(1-cos(x))/x^2`, `(e^x-1)/x`, `ln(1+x)/x`, and `sqrt(1+x)-1` style finite forms.
- Rational cancellation and local-order comparison at finite targets.
- One-sided `1/x`, same-sign two-sided poles such as `1/x^2`, and mismatched two-sided behavior.
- One-sided real log boundary behavior such as `ln(x)` as `x -> 0+`.
- Rational end behavior at infinity through degree and leading-coefficient comparison.
- Controlled numeric fallback with explicit warning/detail sections when symbolic rules miss but sampling stabilizes.

## Main Gaps

- Source UX is still body-plus-controls. Limits have not received the natural-editor source cleanup that derivatives now attempted.
- Limit variable is fixed to `x`; there is no user-selected variable or parsed variable from a full `\lim_{t\to a}` request.
- Finite targets are numeric-only. Symbolic targets such as `a`, expressions such as `\pi/2`, and user-entered full limit requests are not first-class.
- L'Hospital is intentionally narrow: capped quotient-only `0/0` and `infinity/infinity` forms after earlier rules miss.
- Product, power, and exponential indeterminate forms such as `0*infinity`, `infinity-infinity`, `1^infinity`, `0^0`, and `infinity^0` are not normalized into quotient/log forms before L'Hospital.
- There is no squeeze-theorem recognizer or guided educational squeeze workflow.
- Series-driven limit resolution is not connected to the Series workspace yet.
- No Gruntz-style asymptotic dominance algorithm exists for exotic limits at infinity.
- No explicit route/cost preflight evidence exists for Limits comparable to the derivative preflight work.

## Recommended First Limits Sequence

1. `CALCULUS-LIMITS-EDITOR-SOURCE1`: make the main editor the natural limit request source, keep parsed controls/readback derived, and prevent duplicate answer ownership.
2. `CALCULUS-LIMITS-TARGET-VARIABLE1`: parse and preserve single-symbol variables from full limit requests, while keeping old body-plus-control seeds usable.
3. `SYMBOLIC-LIMITS-PREFLIGHT1`: add internal/test-facing route evidence and complexity gates before widening symbolic rules.
4. `SYMBOLIC-LIMITS-LHOSPITAL-HARDEN1`: widen L'Hospital through explicit algebraic/log rewrites for the common indeterminate forms students see.
5. `SYMBOLIC-LIMITS-SERIES-EQUIVALENTS1`: connect bounded Taylor/local-series equivalents to limit resolution after source/variable/preflight contracts are stable.

## Pause Decision For Differentiation

Differentiation should stay in stabilization mode until Matrix/Vector can support symbolic vector/matrix outputs and richer multivariable readback. In particular, Gradient, Jacobian, Hessian, divergence, curl, and Laplacian should not be implemented as display-only scalar lists before the Vector/Matrix foundations are upgraded.
