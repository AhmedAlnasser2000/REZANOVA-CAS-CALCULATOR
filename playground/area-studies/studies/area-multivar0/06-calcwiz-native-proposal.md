# AREA-MULTIVAR0 Calcwiz-Native Proposal

## Proposal

Implement `VARIABLE-CORE1` as the first bounded variable-semantics substrate.

The core should be internal only and should not change visible behavior by itself.

## Stable Owner

Recommended owner:

- `src/lib/algebra/` for the math-facing role model and symbol classification

Potential later adapters:

- Equation target selection
- Calculate stored-value use
- Calculus active/bound variable policy
- Table independent variable policy
- future polynomial-system/resultant adoption

## Playground Path

No Playground execution is required before `VARIABLE-CORE1`.

Future `POLY-ELIM2` or polynomial-system prototypes may use Playground after `VARIABLE-CORE1` and `EQUATION-TARGET1` exist.

## Acceptance Criteria

For `VARIABLE-CORE1`:

- symbols can be collected from supported expression/equation inputs
- reserved constants and function names are not treated as solve variables
- variable identifiers are case-sensitive, so `K` and `k` remain distinct
- raw adjacent letters such as `hello` are not silently treated as one coding-style variable; they stay multiplied single-symbol variables where supported or produce an ambiguity/unsupported stop
- classifications are suitable for later reserved-token semantic highlighting, but no highlighting is added here
- variable roles are represented as typed internal metadata
- mode policy can require one active variable, one solve target, or no variable role
- ambiguity and unsupported symbols produce structured stops
- stored-value candidates are represented without performing substitution
- existing Calculate, Equation, Calculus, Table, Matrix, Vector, and Labs behavior remains unchanged

## Non-Goals

- no variable memory implementation
- no solve-target UI
- no visible reserved-token highlighting
- no multi-character named string variables
- no multivariable solving
- no bivariate resultants
- no Grobner bases
- no graphing
- no source-mirror execution or copied source
