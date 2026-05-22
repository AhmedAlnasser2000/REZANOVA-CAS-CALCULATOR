# AREA-SIMPLIFY0 Pattern Extraction

## Pattern

Form-specific simplification families.

## Why It Matters

Rational cancellation, trig identities, radical simplification, power-log normalization, and calculus readback have different assumptions and user expectations.

## Smallest Bounded Translation

`SIMPLIFY-CORE0` should define form intents such as `canonical`, `readable`, `factored`, `expanded`, `canceled`, `partial-fraction`, and `preserve-constraints`.

## Required Prerequisites

- Stable form-intent vocabulary.
- Existing rational, polynomial, radical, abs, power-log, trig, calculus, and display evidence.
- Tests that prove no new rewrite behavior is introduced.

## Risks

A form-intent layer could become a hidden broad rewrite engine if it starts performing transformations instead of classifying policy.

## Pattern

Equivalence under assumptions.

## Why It Matters

Two expressions can be algebraically equivalent only after excluding denominator zeros, choosing branches, or restricting real domains.

## Smallest Bounded Translation

Add a bounded equivalence policy that records what was checked, what assumptions are required, and why replacement is allowed or blocked.

## Required Prerequisites

- Domain/range facts.
- Rational-function denominator constraints.
- Branch/domain hazard vocabulary.
- Stop reasons for unproven equivalence.

## Risks

Replacing forms without assumptions can hide invalid points or branch changes.

## Pattern

Readability as an explicit output choice.

## Why It Matters

Users need output they can read. A canonical form can be technically convenient but visually worse, especially for logs, arctan pieces, partial fractions, and factored rational expressions.

## Smallest Bounded Translation

Let result surfaces preserve a readable preferred form with metadata that names the canonical/check form when needed.

## Required Prerequisites

- Result detail sections.
- Stable display components.
- Form intent metadata.

## Risks

Readable output can look arbitrary unless the app explains why it was chosen.

## Pattern

Constraint preservation through simplification.

## Why It Matters

Cancellation such as `(x^2-1)/(x-1) -> x+1` is useful only if the excluded point is not silently forgotten when the result is used for solving, integration, or display.

## Smallest Bounded Translation

Carry preserved constraints as first-class simplification policy output, not as ad hoc text attached by each caller.

## Required Prerequisites

- Rational denominator constraints.
- Domain/range core integration.
- Result-envelope notes.

## Risks

Without this, simplification will improve visual output while weakening mathematical honesty.

## Pattern

Stop instead of broad rewrite.

## Why It Matters

Strong CAS systems can simplify aggressively because they own broad assumption infrastructure. Calcwiz should stop when the assumptions or equivalence check are not bounded.

## Smallest Bounded Translation

Define controlled simplification stop reasons that future modes can surface or record internally.

## Required Prerequisites

- Shared stop vocabulary.
- Per-family capability facts.
- Golden tests for shipped behavior.

## Risks

Too many stops may frustrate users; too few stops create fake exactness.
