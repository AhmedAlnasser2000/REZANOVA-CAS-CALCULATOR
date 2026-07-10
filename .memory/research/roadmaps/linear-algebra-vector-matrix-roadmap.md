# Linear Algebra Vector And Matrix Roadmap

Status: approved foundation roadmap; dimension contract verified, with capability selection paused for user review.

Date: 2026-07-10

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
  - user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Current Shipped Baseline

- Matrix and Vector are separate user-facing workspaces and separate OOE capabilities: `linearAlgebra.matrix` and `linearAlgebra.vector`.
- They share `linear-algebra-worker-runtime`, exact Matrix/RREF infrastructure, the public `runtime-request.ts` facade, and common Display primitives without merging product identity.
- Matrix supports named values, arbitrary named or inline multi-matrix editor expressions, exact structural readback, systems, spaces, factorizations, QR/least squares, bounded spectral work, and natural MathLive/list-import input.
- Vector supports named values, arbitrary named or inline multi-vector expressions, projection, unit/norm/angle, two-vector Gram-Schmidt, exact 3D cross product, and scalar triple product.
- F-keys intentionally remain shortcuts for the selected two active operands. The main editor is the general expression surface.
- Visual editing advertises matrices up to 8 by 8 and vectors up to length 8, while exact execution limits currently vary by operation and caller.

## Locked Boundaries

- Workspaces are experiences; reusable cores are callable math substrates. New capability must live in a reusable core when another workspace can legitimately consume it.
- Vector must not duplicate Matrix exact elimination, RREF, rank, null-space, or column-space machinery.
- Matrix must not import Equation internals. Characteristic-polynomial solving crosses only a typed Equation-owned polynomial boundary.
- Calculus may later consume symbolic vector/matrix cores, but Calculus-specific logic does not belong in the Vector or Matrix workspace.
- Vector owns vector quantities and proofs. Geometry owns line, plane, construction, and diagram experiences.
- OOE remains traffic control. Capability IDs, request snapshots, cancellation/stale semantics, diagnostics, History tickets, and replay seeds remain workspace-specific.
- Worker splitting is based on measured execution-risk divergence, not the number of features.
- `0` milestones are audit, roadmap, or readiness work only.

## Required Foundation

### `LINEAR-ALGEBRA-DIMENSION-CONTRACT1`

Status: implemented and verified on 2026-07-10.

Centralize what editing supports, what each operation executes exactly, when scalar growth or algorithmic cost requires a smaller cap, and how unsupported dimensions stop. Preserve the 8 by 8 matrix and length-8 vector editing caps, old replay seeds, and current request shapes. Do not silently fall back from proof-grade exact algebra to approximate computation.

This milestone must audit every exact Matrix caller before changing a cap. Its first responsibility is a truthful, reusable contract and consistent controlled errors, not an indiscriminate cap raise.

Verified contract: editor Matrix 1 by 1 through 8 by 8; editor Vector length 1 through 8; exact expression profile through 8; exact elimination/rank/RREF through 6; single-RHS and multi-RHS augmented profiles retain 7 and 12; current spectral V1 remains 2 by 2; exact Matrix powers retain absolute exponent 12; exact scalar growth retains the existing absolute guard of 1,000,000,000. Every profile stops explicitly when exceeded.

After this milestone is verified and committed, pause for user review before selecting the next capability milestone.

## Vector Expansion Arc

### `VECTOR-SCALAR-LINEAR-COMBINATION1`

Status: implemented and verified on 2026-07-10.

Add exact numeric scalar/vector expressions such as `2p-q/3`, `-p`, and `1/2(p+q)`. Preserve rational sidecars through vector addition, subtraction, and scalar multiplication. Symbolic coefficient parameters are deferred until the symbolic substrate exists.

Prerequisites: vector expression AST precedence, exact scalar sidecars, dimension-contract validation, natural readback, and focused parser/runtime/UI tests.

### `VECTOR-SPAN-INDEPENDENCE1`

Status: implemented and verified on 2026-07-10.

Add `span(p,q,r)` and `independent(p,q,r)` with span dimension, a basis selected from the input vectors, pivot facts, and a dependence relation when one exists. Reuse Matrix-owned exact elimination/RREF through a public core seam; do not add a Vector-local elimination engine.

Prerequisites: variadic vector operand parsing, matrix-from-columns representation, exact RREF evidence, stable basis-vector row readback, and controlled dimension/cap errors.

### `VECTOR-GRAM-SCHMIDT-N1`

Generalize `gram(p,q,r,...)` beyond two vectors. Return orthogonal and, when defined, orthonormal bases; identify discarded zero residuals and dependent input vectors; show compact proof rows. Extract or reuse one orthogonalization core with Matrix QR rather than maintaining parallel algorithms.

Prerequisites: exact scalar/vector combinations, variadic operands, shared orthogonalization representation, zero/dependence evidence, exact-versus-decimal policy, and readable row-based cards.

### `VECTOR-GEOMETRIC-MEASURES1`

Add parallel checks, vector distance, parallelogram and triangle area, 3D scalar-triple-product volume, and normal-vector interpretation. Existing cross and scalar triple products are reused rather than reimplemented.

Prerequisites: dimension-contract profiles, exact norms/dot/cross/triple products, radical readback, orientation/sign facts, and explicit ownership wording that keeps geometric construction experiences in Geometry.

### `LINEAR-ALGEBRA-EXACT-DECIMAL-CONTROLS1`

Unify Matrix and Vector display policy: exact structural answers and proof facts remain primary; decimal rows appear only for genuine numerical approximations and follow the user display setting. Approximation metadata must state precision/tolerance when numerical algorithms are involved.

Prerequisites: one shared display policy, exact sidecars on all participating routes, structured answer rows, Copy Result truth in `exactLatex`, and History parity.

## Symbolic Vector Bridge

### `SYMBOLIC-VECTOR-SUBSTRATE0`

Audit the representation needed for symbolic vector components, assumptions, symbolic dot/norm/cross forms, Jacobians, gradients, and Calculus consumers. This is a readiness milestone after the numeric vector arc, not permission to embed Calculus logic in Vector.

## Matrix Expansion Arc

### `MATRIX-LINEAR-MAP-PROFILE1`

Status: implemented and verified on 2026-07-10.

Add `profile(A)` with domain/codomain dimensions, rank, nullity, kernel, image, pivot columns, one-to-one/onto facts, and invertibility when square. Reuse existing exact space/rank infrastructure and present the rank-nullity theorem as one coherent profile.

### `LINEAR-ALGEBRA-SHELL-SPLIT0`

Status: implemented and verified on 2026-07-10; split gate not met.

Measure Matrix/Vector runtime behavior before changing host topology: dependency weight, cancellation latency, memory pressure, result size, duration distribution, and failure/fallback differences. A feature-count argument is insufficient.

The measured production asset reductions were 1.34% gzip for Matrix-only and 5.00% for Vector-only. Browser P95 lifecycle timing was effectively equal, maximum request/result sizes differed by 1.14x/1.31x, and both capabilities retain the same fallback, cancellation, stale/commit, diagnostics, and History-ticket policies. The audit therefore blocks a topology change under the approved risk-based rule.

### `MATRIX-VECTOR-RUNTIME-SHELL-SPLIT1`

Status: approved next milestone by explicit user topology lock. `LINEAR-ALGEBRA-SHELL-SPLIT0` did not prove current divergence, so the split is a prospective product-containment decision for the approved Matrix numerical and Vector exact/geometric arcs, not a retroactive audit pass.

Proceed only if the audit proves meaningful execution-risk divergence. Preserve `linearAlgebra.matrix` and `linearAlgebra.vector`, request/replay schemas, History behavior, fallback semantics, diagnostics, and shared math cores while giving each workspace its own runtime shell/host lifecycle.

The user explicitly revised the proceed rule after reviewing the audit: future approved runtime-risk divergence is sufficient to lock topology before those features land. Implement this split before any remaining Vector or Matrix expansion; do not leave the audit and split at the end of the numerical feature sequence.

### `MATRIX-CHARPOLY-EQUATION-BOUNDARY1`

Generalize characteristic-polynomial construction and the typed Equation polynomial-solve handoff before widening spectral features. Matrix owns construction/eigenspaces; Equation owns polynomial solving.

### `MATRIX-SPECTRAL-EXPANSION1`

Extend bounded exact eigenvalue, eigenspace, diagonalization, and matrix-power support beyond 2 by 2 where the typed Equation boundary returns usable roots. Irrational, complex, defective, or over-budget cases must stop with honest guidance.

### `MATRIX-SYMMETRIC-POSITIVE-DEFINITE1`

Add symmetry, positive-definite/semidefinite tests, quadratic-form facts, and the real symmetric spectral theorem where prerequisites are satisfied. Avoid claiming numerical definiteness from unstable floating-point signs without tolerance evidence.

### `MATRIX-SVD-PINVERSE-CONDITIONING1`

Add numerical SVD, pseudoinverse, condition number, numerical rank, and pseudoinverse least-squares relationships as an engineering lane. Results must expose tolerance, precision, and approximate status so they are not confused with proof-grade exact algebra.

## Deferred Application Layers

- PCA should consume SVD/covariance cores only after numerical contracts are trustworthy; it is not bundled into the first SVD milestone.
- Markov-chain analysis, regression/design matrices, circuits/networks, and state-space/control should be separate application experiences or guided flows over reusable cores, not hardcoded into Matrix.
- Symbolic matrix entries, Jordan form, broad complex spectral vectors, matrix functions, and unrestricted symbolic linear algebra require separate readiness work.

## Verification Contract

Every implementation milestone must include:

- focused parser/core/runtime/UI tests for supported and controlled-stop cases;
- Playwright inspection of the real answer/error card, facts, proofs, History replay, Copy Result, and overflow/readability for app-visible math;
- `npm run test:compartments-boundaries` and `npm run test:ooe-boundaries` for boundary-sensitive changes;
- `npx tsc -b --pretty false`, `npm run test:file-sizes`, `npm run test:memory-protocol`, and `git diff --check`;
- explicit evidence that capability IDs, request snapshots, replay seeds, cancellation/stale semantics, and diagnostics did not drift unless the milestone intentionally changes them.

## Stop Rules

- Stop when an operation lacks the exact/symbolic representation, fact model, validation, readback, or test substrate it depends on.
- Stop rather than introducing route-local elimination, orthogonalization, polynomial solving, or approximation policy.
- Stop if a requested cap raise creates unbounded scalar growth or a misleading exact-to-decimal fallback.
- Stop before changing worker topology unless the dedicated audit justifies it.
- Stop after `LINEAR-ALGEBRA-DIMENSION-CONTRACT1` for user review and next-move selection.
