# Vector/Matrix Readiness Audit

milestone: `VEC-MAT-AUDIT0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Summary

`VEC-MAT-AUDIT0` confirms that the current Matrix and Vector areas are useful numeric product workspaces plus notation helpers. They are not reusable symbolic or exact algebra cores yet.

This means `MATRIX-EXACT0` must stay postponed. A future exact linear algebra milestone first needs a `VEC-MAT-CORE0` boundary that owns exact scalar support, vector/matrix data models, coefficient-domain capability gates, and reusable result envelopes.

## Current Shipped Surface

Matrix behavior:

- Runtime entrypoint: `runMatrixOperation`.
- Data shape: `number[][]`.
- Supported operations: add, subtract, multiply, transpose A/B, determinant A/B, inverse A/B.
- Extra helper: `solveLinearSystem` for numeric square systems.
- Result shape: `MatrixResponse` with optional `resultLatex`, optional `approxText`, warnings, and optional error.
- Formatting: `matrixToLatex` and `scalarToLatex`.

Vector behavior:

- Runtime entrypoint: `runVectorOperation`.
- Data shape: `number[]`.
- Supported operations: dot, cross, norm A/B, angle, add, subtract.
- Result shape: `VectorResponse` with optional `resultLatex`, optional `approxText`, warnings, and optional error.
- Formatting: `vectorToLatex` and `scalarToLatex`.

Notation and UI behavior:

- `linear-algebra-workbench` builds Matrix/Vector notation-pad LaTeX from current numeric values.
- Matrix and Vector workspaces expose notation pads for drafting/copy/reuse.
- Guide copy says notation pads are not full free-form symbolic matrix/vector CAS.
- Virtual keyboard `MatrixVec` support is notation-first.

## Classification

Current Matrix/Vector state:

- `numeric workspace`: yes.
- `notation helper`: yes.
- `shared reusable algebra core`: no.
- `exact rational coefficient engine`: no.
- `symbolic matrix/vector CAS`: no.
- `free-form Calculate matrix evaluator`: no.

## Baseline Tests Added

`src/lib/matrix.test.ts` now records shipped numeric behavior for:

- add, subtract, multiply, transpose;
- determinant and inverse;
- incomplete Matrix A;
- mismatched add/subtract dimensions;
- invalid multiplication dimensions;
- non-square determinant stop;
- singular inverse stop;
- numeric `solveLinearSystem` success and null stops.

`src/lib/vector.test.ts` now records shipped numeric behavior for:

- dot, cross, add, subtract;
- norm and angle;
- incomplete Vector A;
- missing Vector B;
- mismatched dimensions;
- non-3D cross stop;
- zero-vector angle stop.

These tests intentionally do not assert symbolic or exact linear algebra behavior.

## Missing For `VEC-MAT-CORE0`

A reusable core should exist before `MATRIX-EXACT0` reopens. It should define:

- exact scalar support, likely rational/exact scalar first;
- stable matrix/vector value models separate from product UI state;
- operation capability gates by coefficient domain;
- reusable operation APIs for determinant, row echelon, rank, inverse, nullspace, and linear systems;
- result-envelope metadata that distinguishes exact, numeric, unsupported, singular, dimension mismatch, and coefficient-domain blockers;
- readback/formatting that does not imply unsupported symbolic capability;
- focused tests independent from Matrix/Vector UI.

## Decision

`MATRIX-EXACT0` remains deferred. The next linear-algebra milestone, if opened, should be `VEC-MAT-CORE0`, not exact determinant/rank/echelon expansion.

Until then, Matrix and Vector remain product numeric workspaces with notation helpers.
