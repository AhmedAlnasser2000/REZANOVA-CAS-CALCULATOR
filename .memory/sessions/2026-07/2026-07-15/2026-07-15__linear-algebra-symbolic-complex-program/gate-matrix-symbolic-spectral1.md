# MATRIX-SYMBOLIC-SPECTRAL1 Gate

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

## Gate

- milestone: `MATRIX-SYMBOLIC-SPECTRAL1`
- type: backend
- status: verified pass
- commit approval: covered by the user's standing approval for Milestones 8 through 12
- push approval: absent

## Implemented Boundary

- Added explicit `charpolyA` and `charpolyB` selectors and activated symbolic/complex characteristic-polynomial, eigenvalue, eigenspace, diagonalization, and spectral-power dispatch through the existing Matrix runtime shell.
- Added one pure Equation polynomial boundary for univariate degree 1 through 4, arbitrary accepted targets, and at most six other algebraic coefficient parameters.
- Preserved proven characteristic polynomials for proved, partial, and unsupported root results. Eigenspaces and diagonalization remain proof-gated.
- Kept Real and Complex spectral domains explicit, V2 as the result default, and Equation/Matrix worker, OOE, History, and replay ownership separate.

## Evidence

- focused final delta: 27/27 tests passed
- OOE boundary: 8/8 passed
- compartment boundary: 36/36 passed
- selector authority: 62 Matrix selectors on V2; 23 Vector selectors with only gradian angle on V3
- Vite production build: 4,354 modules transformed
- file-size validation: 1,977 files and five caps passed
- Chromium: 3/3 passed; factorized charpoly, replay/copy, domain split, eigenspaces, partial cubic, and overflow inspected
- aggregate result-contract/canonical reports: only the concurrent Statistics 466-to-491 count baseline remains; zero Linear Algebra missing or exempt leaves
- aggregate display inversion: only the concurrent Statistics owner hash remains; Matrix hashes accepted, zero compatibility projections, zero legacy reads
- aggregate TypeScript wrapper: blocked only by concurrent incomplete Notebook media-schema fields

## Protected Worktree

- Notebook and Statistics changes and `test-results/` were not staged.
- No push was performed.
