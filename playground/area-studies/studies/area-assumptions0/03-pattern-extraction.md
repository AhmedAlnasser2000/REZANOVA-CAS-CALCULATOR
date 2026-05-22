# AREA-ASSUMPTIONS0 Pattern Extraction

## Pattern

Scoped fact ledger.

## Why It Matters

Calcwiz needs facts to travel with a request/result without leaking into global session state. A rational cancellation, a radical solve, a definite integral, and a table row should be able to say what exclusions or domain hazards they know.

## Smallest Bounded Translation

Add `ASSUMPTIONS-CORE0` as an internal typed ledger:

- fact id
- kind
- variable/scope
- source operation
- normalized expression when available
- display text
- trust level
- stop reason when blocked

## Required Prerequisites

- Existing `domain-range-core`
- Existing `branch-core`
- Existing `simplify-policy`
- Existing result-envelope/detail-section patterns

## Risks

The ledger can become a fake theorem prover if it accepts facts that are not checked by a bounded source operation.

## Pattern

Preserved exclusions as data, not prose.

## Why It Matters

If `(x^2-1)/(x-1)` becomes `x+1`, the expression still excludes `x=1`. If a rational equation clears denominators, candidate roots must still be validated against the original equation.

## Smallest Bounded Translation

Represent denominator exclusions as a first-class fact family that records expression, variable, excluded value or predicate, and origin.

## Required Prerequisites

- Rational-function denominator constraints
- Equation candidate validation
- Simplify-policy preserved facts

## Risks

Prose-only warnings are easy to lose during replay, history, guide examples, and future graph/table work.

## Pattern

Branch/principal-range facts.

## Why It Matters

Roots, inverse trig, logs, abs branches, and periodic solve families all depend on principal or branch decisions. Users should see honest outputs without Calcwiz pretending a local branch is global truth.

## Smallest Bounded Translation

Represent branch facts with owner family (`root`, `inverse-trig`, `log`, `abs`, `periodic`), principal-range text, and branch-set membership where applicable.

## Required Prerequisites

- `branch-core`
- Existing trig/equation periodic family metadata
- Existing inverse-trig calculus/readback behavior

## Risks

Branch facts are tempting to widen into general piecewise solving. Keep them scoped to existing bounded families.

## Pattern

Trust classes for equivalent/readable forms.

## Why It Matters

Readable result surfaces are valuable, but a pretty form is not always an exact equivalent on the same domain.

## Smallest Bounded Translation

Reuse `simplify-policy` trust levels and connect them to assumption facts:

- exact-normalized
- derivative-verified
- numeric-confidence
- display-only
- blocked

## Required Prerequisites

- `SIMPLIFY-CORE0`
- Antiderivative backcheck metadata
- Existing exact/result-origin discipline

## Risks

Numeric-confidence facts must remain bounded and clearly lower trust than exact proof.

## Pattern

Interval and sample hazards.

## Why It Matters

Definite integrals, limits, tables, and future graphs need to distinguish safe intervals from intervals crossing a pole, log/radical boundary, or branch hazard.

## Smallest Bounded Translation

Add interval facts that can say:

- proven safe
- detected violation
- sampled-no-violation
- unknown

## Required Prerequisites

- `domain-range-core` interval checks
- Definite-integral safety gates
- Table row evaluation boundaries

## Risks

Sampled-no-violation can be mistaken for proof. The trust label must remain explicit.
