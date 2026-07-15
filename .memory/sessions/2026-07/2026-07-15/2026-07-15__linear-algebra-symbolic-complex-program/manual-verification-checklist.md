# Linear Algebra Symbolic And Complex Manual Verification Checklist

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

## What Is Achieved Now

- Matrix and Vector accept bounded real-symbolic and exact-complex scalar cells, explicit stored-value substitution, and deterministic replay snapshots.
- Vector symbolic/complex geometry, Matrix symbolic arithmetic, bounded exact systems, and symbolic spectral work are live through the approved undergraduate/practical-engineering limits.
- Matrix/Vector input controls and dark cells are readable; wide matrices and vectors take full rows and keep usable minimum cell widths.
- Characteristic polynomials and degree-1-through-4 univariate roots support arbitrary accepted targets and multivariable symbolic coefficients within the six-parameter ceiling.

## Manual App Steps

1. Open Matrix, select Real and Symbolic, enter `diag(a,b,c,d)`, and run `charpoly(A)`.
2. Copy the result, reopen it from History, and compare the factorized polynomial and selected domain/mode.
3. Enter `[[0,-1],[1,0]]`; run eigenvalues in Real mode, then switch to Complex and run again.
4. Inspect the Complex eigenspaces and verify the workspace did not switch domains automatically.
5. Enter a general symbolic 3 by 3 matrix and run its characteristic polynomial/eigenvalues to exercise the bounded partial-root result.
6. Create a seven-column Matrix and an eight-component Vector; inspect cell color, card width, and horizontal containment.

## Expected Results

- The diagonal characteristic polynomial remains factorized as four linear factors and survives copy and History replay.
- The rotation matrix has no real eigenvalues in Real mode and has the two principal complex roots with eigenspaces in Complex mode.
- A general symbolic cubic preserves and displays its proven characteristic polynomial even when the remaining factor is unresolved.
- Eigenspaces and diagonalization are absent unless roots, multiplicities, conditions, and a complete eigenbasis are proved.
- Matrix/Vector numerals and symbols are light on the dark pads; wide values use full rows and do not collapse into narrow columns.
