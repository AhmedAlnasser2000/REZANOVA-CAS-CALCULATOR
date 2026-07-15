# Linear Algebra Symbolic And Complex Program Status

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Program

- Approved milestones:
  - `LINEAR-ALGEBRA-SYMBOLIC-SCALAR-SUBSTRATE1`
  - `VECTOR-SYMBOLIC-EXPRESSIONS1`
  - `MATRIX-SYMBOLIC-ARITHMETIC1`
  - `MATRIX-SYMBOLIC-SYSTEMS1`
  - `MATRIX-SYMBOLIC-SPECTRAL1`
- Commit approval covers each milestone from 8 through 12.
- No push is authorized.

## Active Gate

- milestone: `MATRIX-SYMBOLIC-ARITHMETIC1`
- gate: backend
- status: verified pass
- prerequisite representation: bounded standard MathJSON scalar wires and a Vector-owned symbolic scalar core.
- protected lanes: concurrent Notebook and Statistics source/dossiers plus untracked `test-results/` remain excluded from this gate.

## Milestone 8 Result

- Matrix and Vector accept discriminated `scalar-v1` cell/source operands without numeric shadows.
- Real/Complex and Symbolic/Use Stored Values are per-workspace-instance selectors and replay deterministically.
- Stored Variables remain finite real/exact rational; substitution edits the producer MathJSON tree, protects named operands, preserves source expressions, and records used/protected snapshots.
- Symbolic Matrix/Vector producers remain fail-closed until their owning milestones.
- Visual evidence: `.task_tmp/linear-algebra-symbolic-complex-program/milestone-8/matrix-stored-value-preview.png`.

## Milestone 9 Result

- Symbolic/complex Vector arithmetic, Hermitian products, norms, projections, orthogonality, principal line angles, algebraic cross products, Gram area/volume, distance, parallelism, linear combinations, and bounded Gram-Schmidt execute through the existing Vector worker/OOE/History shell.
- Conditions remain producer-proven V2 supplements and bounded undecidable classifications use standard `Which`; only gradian angles use the approved V3 angle quantity.
- Span and independence remain controlled stops for the shared elimination classifier in Milestone 11.
- Matrix and Vector Domain/Parameters and size controls now use explicit high-contrast text, both workspaces consume the formerly empty workspace column, and their cell pads expand across each value card.
- Visual evidence: `.task_tmp/linear-algebra-symbolic-complex-program/milestone-9/complex-principal-line-angle.png` plus the refreshed Milestone 8 Matrix screenshot.

## Next Gate

- milestone: `MATRIX-SYMBOLIC-SYSTEMS1`
- gate: backend
- status: not started
- existing numeric Matrix execution and all OOE/History ownership remain the compatibility baseline.

## Milestone 10 Result

- Symbolic/complex Matrix add, subtract, multiply, ordinary transpose, adjoint, determinant, inverse, and literal integer powers execute through the existing Matrix worker/OOE/History shell at the approved 8x8, 4x4, and 3x3 ceilings.
- Unknown nonzero determinants remain producer-proven V2 conditions; singular, dimension, exponent, and expression limits stop explicitly.
- `adjoint(A)`, `A^\dagger`, and `A^*` map to the distinct adjoint operation while ordinary transpose remains unchanged.
- Exact complex constants use proof-round-trippable rectangular canonical notation, and formal scalar conjugation uses the equivalent standard scalar conjugate-transpose head required by Compute Engine's star parser.
- Matrix/Vector cell text is explicitly light on dark pads; cells keep at least 112px width and scroll inside the value card when dimensions grow.
- Visual evidence: `.task_tmp/linear-algebra-symbolic-complex-program/milestone-10/complex-adjoint-and-readable-cells.png` plus the refreshed wide Matrix/Vector screenshots from Milestones 8 and 9.
