# FriCAS-To-Calcwiz Native Prototype Roadmap

status: planning roadmap  
created: 2026-05-01  
source_milestone: `FRICAS-CTX0`  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Purpose

This roadmap translates the `FRICAS-CTX0` findings into Calcwiz-native follow-up milestones.

FriCAS remains context only. The goal is not to inherit FriCAS identity, copy code, or chase feature parity. The goal is to use FriCAS as evidence for which Calcwiz-owned substrates should mature next.

Core-strengthening comes first. Existing Calcwiz cores should be audited, clarified, and strengthened before jumping into advanced fields such as Grobner bases, regular chains, broad asymptotics, or full Risch-style integration, unless a concrete roadmap blocker proves that an advanced field is required.

## End State

By the end of this roadmap, Calcwiz should have:

- explicit capability/readiness facts for major math cores,
- a clear polynomial-core readiness map for future calculus/solving work,
- richer internal integration candidate metadata without new visible math claims,
- at least one bounded Playground-only advanced-symbolic prototype chosen from evidence,
- an honest vector/matrix readiness gate before any exact linear algebra expansion,
- a stronger rule for promoting source-context challenge cases into shipped golden tests only after Calcwiz actually supports them.

## Vector/Matrix Status Check

As of 2026-05-01, Calcwiz already has Matrix and Vector product modes, but they are not reusable algebra cores yet.

Observed state:

- `src/lib/matrix.ts` and `src/lib/vector.ts` are numeric workflow engines over `number[][]` and `number[]`.
- Supported Matrix operations are add, subtract, multiply, transpose, determinant, inverse, and a numeric linear-system helper.
- Supported Vector operations are dot, cross, norm, angle, add, and subtract.
- `src/lib/linear-algebra-workbench.ts` builds notation-pad LaTeX for reuse/copying.
- Guide text explicitly says Matrix/Vector notation pads are drafting surfaces, not full free-form symbolic matrix CAS.
- Tests mainly cover launcher routing, notation generation, keyboard placement, and guide discoverability; there is not yet a stable exact vector/matrix-core regression suite.

Roadmap consequence:

- Treat current Matrix/Vector as useful numeric user workflows, not as reusable symbolic/exact cores.
- Do not open exact linear algebra directly from FriCAS context.
- Insert a vector/matrix audit and core-boundary milestone before any `MATRIX-EXACT0` implementation.

## Milestone Sequence

### 1. `ALG-CAPS0` - Shared Capability Facts

Status: complete as of 2026-05-20. Output lives in `.memory/research/alg-caps0-readiness-matrix.md` and `src/lib/algebra/capability-readiness.ts`.

Goal:

- Add a small, repo-owned capability/readiness vocabulary for current Calcwiz math substrates.

What it achieves:

- Names prerequisites such as polynomial normalization, factorization, cancellation, domain/range checks, derivative backchecks, interval safety, matrix coefficient support, and symbolic/numeric fallback permissions.
- Gives future milestones a shared way to say "ready", "ready with adapter", "blocked", or "defer".
- Prevents calculus, solving, or algebra work from hiding missing prerequisites inside feature-local logic.

Boundaries:

- No new math behavior.
- No FriCAS-style type system.
- No runtime plugin system.
- No broad schema architecture unless a tiny static table is enough.

Likely output:

- One internal capability/readiness module.
- A memory readiness matrix.
- Tests proving future metadata stays small, valid, and separate from runtime kernel capabilities.

### 2. `VEC-MAT-CORE0` - Reusable Numeric Vector/Matrix Core Boundary

Status: complete as of 2026-05-20. Output lives in `src/lib/linear-algebra/matrix-core.ts` and `src/lib/linear-algebra/vector-core.ts`.

Goal:

- Turn current Matrix/Vector numeric workspace logic into two small reusable sibling core boundaries before exact linear algebra work.

What it achieves:

- Keeps current numeric behavior and UI output unchanged.
- Defines reusable matrix and vector value models, validation helpers, and operation envelopes for the existing numeric surface.
- Lets Matrix and Vector modes consume shared core logic rather than owning all math behavior locally.
- Creates the minimum substrate that future exact scalar work can extend.

Boundaries:

- No exact rational matrix engine.
- No symbolic/free-form matrix CAS.
- No new Matrix/Vector operations.
- No rank, nullspace, row echelon, or exact system solving.

Likely output:

- Separate reusable numeric matrix and vector core modules.
- Parity tests proving Matrix/Vector mode outputs and stops remain unchanged.
- A decision on whether exact scalar readiness should follow before `MATRIX-EXACT0`.

### 3. `POLY-CORE-AUDIT1` - Polynomial Substrate Readiness

Status: complete as of 2026-05-20. Output lives in `.memory/research/poly-core-readiness-matrix.md`.

Goal:

- Audit and document what the existing polynomial core can safely support before larger solving, Grobner, rational integration, or asymptotic work.

What it achieves:

- Maps current support for parsing/carrier recognition, degree, exact rational coefficients, factor, gcd, cancel, square-free readiness, quotient normalization, and result readback.
- Separates already-shipped behavior from future needs.
- Names blockers for Grobner, rational integration, partial fractions, stronger removable singularities, and exact system solving.

Boundaries:

- Audit and tests first; no broad polynomial algorithm expansion.
- Do not add a Grobner implementation here.
- Do not widen equation solving.

Likely output:

- `.memory/research/poly-core-readiness-matrix.md`.
- Focused regression tests around existing polynomial-core behavior.
- A next-step decision: proceed to `INT-CANDIDATE2` while keeping partial fractions, Grobner/elimination, square-free factorization, resultants, and exact matrix algebra blocked/deferred.

### 4. `INT-CANDIDATE2` - Internal Integration Candidate Metadata

Status: complete as of 2026-05-20. Output lives in `.memory/research/int-candidate2-integration-candidate-metadata.md`.

Goal:

- Strengthen the internal representation of integration attempts so future integration leaps are explainable and dependency-gated.

What it achieves:

- Records candidate method, required assumptions, verification status, domain hazards, and controlled failure class internally.
- Keeps visible `ResultOrigin` and current badges stable.
- Gives future integration milestones a safer base for rational/log/special-case expansion.

Boundaries:

- No new antiderivative families.
- No Risch engine.
- No new visible strategy labels unless separately planned.

Likely output:

- Internal metadata extension around existing symbolic integration candidates.
- Tests showing outputs remain stable while candidate classification gets richer.

### 4.5. `POLY-RAT-CORE0` - Polynomial/Rational Prerequisite Substrate

Status: complete as of 2026-05-20. Output lives in `.memory/research/poly-rat-core0-readiness-matrix.md`.

Goal:

- Promote exact polynomial division/GCD and rational-function normalization into shared Calcwiz-owned substrates before rational integration.

What it achieves:

- Adds shared exact polynomial division with remainder, monic GCD, primitive normalization, and coefficient-array helpers.
- Adds an internal exact one-variable rational-function core that cancels polynomial factors through shared GCD.
- Adds bounded distinct-rational-linear partial-fraction readiness for future integration planning.
- Preserves current rational simplify/factor/LCD and integration behavior.

Boundaries:

- No rational integration adoption.
- No broad partial fractions, repeated-factor decomposition, irreducible quadratic decomposition, square-free factorization, resultants, or Grobner/elimination.
- No visible UI, solver, result-origin, or calculus behavior changes.

### 5. `LIM-SERIES-LAB0` - Bounded Local-Series Playground Prototype

Goal:

- Prototype a bounded series/local-expansion path in Playground for limit cases inspired by FriCAS `limitps` and MRV machinery.

What it achieves:

- Tests whether selected local equivalents can be represented more systematically than one-off rules.
- Uses the FriCAS context corpus as challenge input but not as product parity.
- Identifies whether a future `CALC-SER1` or `CALC-LIM4` should exist.

Boundaries:

- Playground only.
- No stable app behavior changes.
- No general asymptotic/MRV engine.
- No special-function expansion promises.

Likely output:

- Playground record/manifest.
- A small typed corpus derived from existing Calcwiz limit wins plus FriCAS challenge cases.
- Promotion decision: retire, keep researching, or plan a bounded stable series milestone.

### 6. `GROBNER-TINY0` - Tiny Polynomial Elimination Feasibility

Goal:

- Explore a tiny bounded Grobner/normal-form prototype in Playground after polynomial readiness is clear.

What it achieves:

- Tests if Calcwiz can safely support small exact polynomial elimination as a future capability.
- Establishes strict caps: rational coefficients, small variable count, low degree, explicit term order, controlled stops.
- Produces evidence before any stable equation-solving adoption.

Boundaries:

- Playground only.
- No black-box general solver.
- No regular-chain adoption.
- No stable solve behavior changes.

Likely output:

- Tiny prototype or feasibility report.
- Corpus from `fricas-reference-corpus.ts` Grobner/elimination cases.
- Decision on whether Grobner belongs mid-term or should stay deferred.

### Completed gate: `VEC-MAT-AUDIT0` - Vector/Matrix Core Readiness Gate

Status: complete as of 2026-05-20. Output lives in `.memory/research/vector-matrix-readiness-audit.md`.

Goal:

- Audit the current Matrix and Vector modes and decide what reusable core boundary must exist before exact linear algebra work is safe.

What it achieves:

- Separates current numeric workspace behavior from future shared algebra-core responsibilities.
- Maps current matrix/vector parsing, formatting, result envelopes, operation coverage, tests, and UI promises.
- Defines whether `VEC-MAT-CORE0` is needed before exact determinant/rank/echelon/inverse work.
- Prevents equation/calculus/polynomial work from depending on Matrix/Vector as if they were already reusable exact cores.

Boundaries:

- Audit and readiness first.
- No exact linear algebra implementation.
- No full matrix category hierarchy.
- No numerical linear algebra overhaul.
- No graphing or tensor expansion.

Likely output:

- `.memory/research/vector-matrix-readiness-audit.md`.
- Focused tests documenting current shipped numeric Matrix/Vector behavior if coverage gaps are found.
- A decision: proceed to `VEC-MAT-CORE0`, postpone exact linear algebra, or keep Matrix/Vector as product-only numeric workspaces for now.

### Deferred follow-on: `MATRIX-EXACT0` - Exact Linear Algebra Readiness

`MATRIX-EXACT0` is postponed until `VEC-MAT-AUDIT0` proves the needed reusable vector/matrix core boundary.

`VEC-MAT-AUDIT0` found that the boundary did not exist yet. `VEC-MAT-CORE0` has now added the reusable numeric Matrix and Vector core boundary, but exact linear algebra still remains deferred.

When reopened, `MATRIX-EXACT0` should establish a bounded exact matrix/linear algebra substrate over rational/exact coefficients, with capability gates for determinant, row echelon, rank, nullspace, inverse, and linear-system solving. It should not inherit FriCAS's broad matrix category hierarchy.

## Recommended Immediate Next Milestone

Choose the next post-`POLY-RAT-CORE0` integration milestone deliberately.

Reason:

- `ALG-CAPS0` is now complete and gives later milestones a shared readiness language.
- `VEC-MAT-CORE0` is now complete and keeps Matrix/Vector core-ready without adding exact linear algebra.
- `POLY-CORE-AUDIT1` is now complete and confirms `polynomial-core` is `ready-with-adapter`, not a full polynomial algebra engine.
- `INT-CANDIDATE2` is complete and records missing polynomial prerequisites as explicit metadata rather than hidden calculus logic.
- `POLY-RAT-CORE0` is complete and provides the first shared rational-function and distinct-linear partial-fraction readiness slice.
- The next natural capability milestone is `INT-RAT1`, but it must stay bounded to the readiness substrate and pause if repeated factors, irreducible quadratics, square-free factorization, or broader rational integration are required.

## Core-First Rule

Before opening an advanced FriCAS-inspired field, prefer strengthening existing Calcwiz cores in this order:

1. shared capability/readiness facts,
2. current vector/matrix reusable core boundary,
3. current polynomial-core readiness,
4. current domain/range and interval-safety facts,
5. current calculus candidate metadata and verification,
6. current result-envelope/detail-note consistency,
7. only then Playground-only advanced prototypes if the blocker remains.

Advanced fields are allowed only when they answer a named blocker, have strict caps, and remain Playground-only until a Calcwiz-native bounded extraction is designed.

## Promotion Rule For FriCAS-Derived Ideas

FriCAS-derived material may move forward only when it is:

1. restated in Calcwiz terms,
2. bounded to a small supported family,
3. backed by a local corpus or test,
4. assigned to an owner layer,
5. equipped with stop reasons,
6. free of runtime dependency or direct code adoption.

## Deferred Until Later

- Full Risch/Liouville integration.
- General MRV/asymptotic limits.
- Regular-chain decomposition.
- Broad assumptions engine.
- Full expression type universe.
- Exact matrix/vector algebra before a reusable vector/matrix core boundary exists.
- External CAS backend integration.
- FriCAS parity as a goal.
