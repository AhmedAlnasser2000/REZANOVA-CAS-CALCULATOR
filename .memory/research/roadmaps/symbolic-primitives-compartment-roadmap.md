# SYMBOLIC-PRIMITIVES-COMPARTMENT-ROADMAP0

Date: 2026-06-22

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live repo inspection

## Purpose

Define the ownership, folder model, adoption rules, and implementation sequence for Calcwiz's reusable Symbolic Primitives before moving code or adding new solver capability.

This roadmap follows `SYMBOLIC-PRIMITIVES-SURFACE-AUDIT0`.

## Core Decision

Symbolic Primitives start as a governed district inside the existing `symbolic-engine` compartment, not as a separate top-level compartment.

Reason:

- `src/lib/compartments/manifest.ts` already declares `symbolic-engine` as a static, shared-compute, no-source-mirrors compartment.
- Current primitive seeds already live in `src/lib/symbolic-engine/`, especially normalization, patterns, rational, radical, power-log, factoring, integration, and limits.
- Making a new top-level compartment now would add governance shape before there is a concrete code boundary that needs it.

Future manifest posture:

```text
id: symbolic-engine
owned path:
  src/lib/symbolic-engine/
private path candidate:
  src/lib/symbolic-engine/primitives/
public seam candidates:
  none for Roadmap0
  primitive-specific facades only after first consumers prove the API shape
```

## Folder Model

When implementation begins, each primitive gets its own folder from day one:

```text
src/lib/symbolic-engine/primitives/
  expansion/
  substitution/
  factorization/
  simplification/
  elimination/
```

Rules:

- No shared `misc.ts`, `utils.ts`, or catch-all primitive file for the five pillars.
- Root `primitives/index.ts` should wait until at least two primitives need a stable import seam.
- Primitive internals stay private first.
- Public facades should expose compact, typed operations only after real consumers exist.

## Naming

Use **Symbolic Primitives**, not operations, transformations, engines, or pillars in source ownership names.

Rationale:

- `operations` is too generic and overlaps UI commands.
- `transformations` overlaps Algebra transform surfaces and user-facing transform workflows.
- `engines` implies execution authority or orchestration.
- `pillars` is useful in discussion but too metaphorical for source paths.
- `Symbolic Primitives` says what they are: reusable symbolic/algebraic building blocks consumed by solvers and transform features.

## Ownership Boundaries

Symbolic Primitives own repeated mechanics, not solver judgment.

They may own:

- bounded expression expansion and canonical sum/product forms;
- structural substitution and back-substitution helpers;
- common-factor, product, and safe algebraic factor-pattern mechanics;
- policy-governed simplification layers;
- bounded resultant and substitution-based elimination mechanics.

They must not own:

- Equation answer-mode semantics;
- OOE launch, cancellation, stale gates, or commit authority;
- Display layout, notation settings, or History schemas;
- workspace routing or runtime shell behavior;
- broad CAS planning, unbounded recursive search, Groebner-first solving, or source-mirror imitation.

Route owners still decide when a primitive is semantically valid.

## Adoption Rule

Future code that needs expansion, substitution, factorization, simplification, or elimination should do one of three things:

1. consume the relevant Symbolic Primitive when it exists;
2. add the primitive first when repeated mechanics are emerging;
3. document why route-local logic must stay local because it encodes route semantics, readback semantics, branch policy, or user-visible stop behavior.

This is a governance rule for implementation planning, not a runtime dependency and not a validator yet.

## Promotion Criteria

Promote a route-local helper into a Symbolic Primitive only when at least one is true:

- the same mechanic appears in two or more product owners;
- a frontier file is growing because it owns reusable mechanics plus route-specific judgment;
- a future solver milestone would otherwise duplicate an existing mechanic;
- a primitive would let several route owners share tests without sharing solver policy.

Do not promote when:

- the code is only local stop wording, source labels, result-card details, or History/Display compatibility;
- the behavior depends on one route's branch policy or answer-mode semantics;
- parity tests cannot prove behavior preservation for first consumers.

## Sequence

### 0. `SYMBOLIC-PRIMITIVES-COMPARTMENT-ROADMAP0`

Status: this roadmap.

Scope:

- docs/memory only;
- choose folder model and governance;
- no code moves;
- no manifest edit until the first implementation creates `src/lib/symbolic-engine/primitives/`.

### 1. `SYMBOLIC-EXPANSION-PRIMITIVE1`

Status: implemented and committed.

First implementation milestone.

Purpose:

- create bounded MathJSON expansion/canonicalization primitives that produce stable sum/product forms for coefficient maps, factor discovery, and elimination.

Implemented v1 shape:

- private folder: `src/lib/symbolic-engine/primitives/expansion/`;
- API: `expandMathJsonNode(...)` and `expandMathJsonNodeOrOriginal(...)`;
- supported mechanics: `Add`, `Subtract`, `Negate`, `Multiply` / `InvisibleOperator`, and positive integer powers;
- safety caps: `maxPower: 12`, `maxExpandedTerms: 256`, `maxNodeCount: 2000`;
- first consumer: Equation polynomial carrier follow-on only, replacing its local ComputeEngine expansion loop and letting top-level quadratic-carrier equations reach the existing real and narrow Complex follow-on bridges;
- manual QA follow-up: fixed the local double-`i` Complex readback leak, while broader final-answer polishing remains deferred.

Likely first consumers:

- Equation symbolic polynomial coefficient collection;
- Equation symbolic factor patterns;
- Equation carrier elimination;
- Algebra or Symbolic Engine mixed-factor paths if parity is proven.

Non-goals:

- no broad simplification;
- no unchecked ComputeEngine `expand` pass;
- no broad new solver capability unless a caller already has proven behavior and only changes mechanics;
- no final-answer readback polishing/normalization pass; that should be a dedicated later milestone after primitive work has clearer simplification/readback surfaces.

### 2. `SYMBOLIC-SUBSTITUTION-PRIMITIVE1`

Status: implemented and committed.

Purpose:

- promote protected structural substitution and carrier substitution mechanics.

Implemented v1 shape:

- private folder: `src/lib/symbolic-engine/primitives/substitution/`;
- API: `substituteMathJsonSymbols(...)`, `substituteMathJsonSubtree(...)`, and `substituteCarrierPowerBasis(...)`;
- supported mechanics: protected symbol replacement, exact subtree replacement, and carrier power-basis substitution such as reducing `(g(x))^4-5(g(x))^2+4` with `u=(g(x))^2`;
- metadata: `changed`, `usedSubstitutions`, `protectedHits`, and `nodeCount`;
- bounded stops: node-limit, non-integer carrier powers, nonpositive carrier powers, and power-step mismatches;
- first consumer: Equation carrier elimination only, replacing reduced carrier equation construction while preserving Equation-owned carrier detection, stop wording, branch families, facts, and readback.

Likely first consumers:

- Equation special-form roots;
- Calculus parameter substitution;
- variable-memory substitution only where protected-symbol semantics match.

Non-goals:

- no blind replace-all API;
- no periodic/transcendental closure;
- no arbitrary auxiliary-variable inference.
- no stored-variable substitution migration in v1;
- no final-answer readback polishing before all five primitives are established.

### 3. `SYMBOLIC-FACTORIZATION-PRIMITIVE1`

Status: implemented in current working tree; awaiting explicit commit approval.

Purpose:

- promote product decomposition, common factors, safe difference-of-powers, exact-rational factor adapters, and carrier-pattern factor discovery.

Implemented v1 shape:

- private folder: `src/lib/symbolic-engine/primitives/factorization/`;
- API: `explicitProductNodeFromZeroEquation(...)`, `decomposeExplicitProductFactors(...)`, and `discoverSymbolicFactorPattern(...)`;
- supported mechanics: explicit zero-product side extraction, `Multiply` / `InvisibleOperator` flattening, positive-power multiplicity, target-bearing invalid-power stops, common pure/affine selected-carrier factors, safe real difference-of-powers, shared-carrier factor-by-grouping, and grouped affine-carrier quadratics;
- first consumer: Equation factorable solving only, replacing `src/lib/equation/parameterized/product-decomposition.ts` and shrinking `src/lib/equation/parameterized/symbolic-factor-patterns.ts` into an Equation-owned LaTeX/readback adapter;
- preserved owner line: Equation still owns route order, stop wording, detail lines, `exactLatex`, `branchReadback`, branch/domain facts, validation, root construction, and degree-12 boundaries.

Likely first consumers:

- Equation factorable route - implemented;
- Symbolic Engine factoring - deferred parity consumer;
- Algebra exact-rational factorization adapters.

Non-goals:

- no broad symbolic factoring;
- no Cardano/Ferrari;
- no visible implicit roots;
- no fake exact roots.

### 4. `SYMBOLIC-SIMPLIFICATION-PRIMITIVE1`

Purpose:

- compose existing bounded normalization, rational, radical, power-log, and route-safe simplification policies without turning them into one universal reducer.

Likely first consumers:

- Calculate simplify/factor/expand workflow;
- Trigonometry identity simplification;
- Equation readback-prep helpers after parity gates.

Non-goals:

- no theorem prover;
- no assumptions engine rewrite;
- no automatic branch-changing simplification without facts.

### 5. `SYMBOLIC-ELIMINATION-PRIMITIVE1`

Purpose:

- promote bounded resultant and substitution-based elimination mechanics after expansion and substitution primitives exist.

Likely first consumers:

- Equation polynomial systems;
- Equation carrier elimination;
- later algebraic system work.

Non-goals:

- no Groebner-first general CAS;
- no broad multivariable solving;
- no single-equation auxiliary inference outside explicit carrier policies.

## Surveillance And Enforcement

Do not add an app-wide validator yet.

Reason:

- Until primitive APIs exist, a validator would produce noisy false positives.
- Some local code legitimately owns route semantics and should not be generalized.

Near-term enforcement should be human and test-backed:

- milestone plans must state which primitive is consumed or why local logic remains local;
- parity tests must cover first consumers before migration;
- file-size ratchet pressure should trigger extraction only when the mechanic is truly shared.

Possible later tooling:

- a lightweight import/path report once `src/lib/symbolic-engine/primitives/` has at least two real consumers;
- no hard linter until repeated bypasses appear.

## Relationship To Algebra

Algebra remains owner of exact-rational polynomial, rational-function, radical, assumptions, and elimination cores.

Symbolic Primitives may adapt or compose Algebra cores, but should not move Algebra-owned exact-rational domains into Symbolic Engine without a dedicated migration milestone.

## Relationship To Equation

Equation remains owner of solver judgment:

- selected-target routing;
- answer-mode semantics;
- branch/readback/fact presentation choices;
- route-specific stop wording;
- exact-vs-isolate boundaries;
- numeric interval tool behavior.

Symbolic Primitives should reduce duplicated mechanics under those routes without becoming the Equation planner.

## First Implementation Recommendation

Start with:

```text
SYMBOLIC-EXPANSION-PRIMITIVE1
```

Why:

- expansion feeds coefficient maps;
- coefficient maps feed factor discovery;
- factorization and elimination both need canonical expanded forms;
- simplification can later compose expansion and factorization.

The first implementation should be internal and parity-driven.

## Verification Policy

For Roadmap0:

- `npm run test:memory-protocol`
- `git diff --check`

For future implementation milestones:

- `npx tsc -b --pretty false`
- focused primitive tests
- focused consumer parity tests
- `npm run test:compartments-boundaries`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`

## Closeout Criteria

This roadmap is complete when:

- the roadmap artifact is recorded;
- durable memory and the session dossier are updated;
- the Equation frontier manual checklist is added before this new track begins;
- memory protocol and diff-check pass.
