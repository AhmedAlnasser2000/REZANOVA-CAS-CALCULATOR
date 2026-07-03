# Calculus Corpus Ledgers

This folder holds source-controlled benchmark ledgers for Calculus work.

It is not runtime data. Application code must not import this folder.

## Lane Layout

- `integration/`: indefinite integration benchmarks.
- `limits/`: reserved for future Limits benchmarks.
- `differentiation/`: reserved for future Differentiation benchmarks.

Each lane owns its own source registry, schema, unique-case ledger, duplicate-case ledger, run-result ledger, and scan-finding ledger. Do not mix lanes in one ledger: a case that is useful for more than one lane should be recorded separately in each lane with lane-specific expectations.

## Current Active Lane

The active corpus is `integration/`.

Initial integration scope is intentionally undergraduate and indefinite-only:

- textbook-style antiderivatives;
- substitution, parts, partial fractions, trigonometric, inverse-trigonometric, exponential/logarithmic, and basic rational/algebraic forms;
- controlled unsupported and boundary rows when a source exposes a useful capability edge.

Definite, improper, multivariable, ODE, and advanced genus-heavy cases stay out of the first integration corpus unless a later milestone explicitly opens that lane or source slice.
