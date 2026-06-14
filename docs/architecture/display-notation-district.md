# Display Notation District

Status: final split record for `DISPLAY-NOTATION-DISTRICT-SPLIT1`.

Purpose: group Display notation, formatting, numeric output, symbolic display normalization, and symbolic-output hygiene behind stable root facades.

## District Shape

- `src/lib/display/notation/format.ts`: number, scalar, matrix, vector, solution, complex solution, and approximate text formatting implementation.
- `src/lib/display/notation/numeric-output.ts`: numeric output settings, digit clamping, decimal/scientific/auto formatting, and approximate literal formatting.
- `src/lib/display/notation/symbolic-display.ts`: display-only symbolic Latex normalization for roots, powers, logs, repeated products, and safe familiar forms.
- `src/lib/display/notation/math-notation.ts`: rendered/plain-text/latex visible text conversion helpers.
- `src/lib/display/notation/math-notation-context.ts`: React notation context and hook.
- `src/lib/display/notation/symbolic-output-hygiene.ts`: internal symbolic fragment detection and DisplayOutcome scan helpers.

## Root Facades

Root files remain stable for shared import paths:

- `format.ts`
- `numeric-output.ts`
- `symbolic-display.ts`
- `math-notation.ts`
- `math-notation-context.ts`
- `symbolic-output-hygiene.ts`

The root facades use explicit type/value reexports so the public surface stays intentional.

## Preserved Contracts

- Canonical exact Latex stays unchanged for copy, To Editor, history, replay, stored output, and solver semantics.
- Symbolic display normalization remains display-only.
- Numeric output settings and formatting thresholds remain unchanged.
- Math notation context and visible text conversion keep current rendered/plain-text/latex behavior.
- Symbolic-output hygiene keeps the same fail-closed internal-fragment detection.

## Consumers

The stable root imports continue to serve AppMain, Settings, MathStatic, NotationText, Engine, Modes, Equation, Trigonometry, Geometry, Calculus, Statistics, Algebra, Numeric, and Linear Algebra.

## Test Gates

- Focused notation tests importing through root facades.
- Symbolic Engine, Engine, Calculate/Equation mode, and AppMain UI/status coverage.
- Lint, build, file-size, memory-protocol, and diff whitespace checks.

## Stop Rules

- Do not change exact Latex, numeric formatting thresholds, notation preference behavior, symbolic display normalization semantics, internal-output hygiene wording, OOE policy, history/replay behavior, solver outputs, schemas, capabilities, stored-value behavior, or reserved-symbol policy in this district.
