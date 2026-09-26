# Integration Reconstruction Replacement Inventory

Date: 2026-09-26
Scope: design investigation at `a8d2c423`; no source edits. Paths below are current source evidence, not promises that existing algorithms are correct in arbitrary domains.

## Runtime ownership to retain

| Existing path | Role and disposition |
| --- | --- |
| `src/app/runtime/useCalculusRuntime.ts` | Request snapshots, launch and visible commit/history interaction. Retain. |
| `src/lib/modes/calculus.ts` | Public Calculus runtime request and canonical finalization. Retain. |
| `src/lib/ooe/pilots/calculus-pilot.ts` | `calculus.evaluate`, worker/fallback identities and runtime evidence. Retain. |
| `src/lib/modes/worker-clients/calculus-worker-client.ts` | Isolated execution, parent-side cancellation, fallback. Retain; future live gate must account for fallback budgets. |
| `src/lib/modes/worker-entrypoints/calculus.worker.ts` | Canonical request execution and completed/failed messages. Retain. |
| `src/lib/calculus/workspace/engine.ts` | Guided tool dispatch, substitutions, outcome authority. Adapt only at the owned integration ingress if necessary. |
| `src/lib/calculus/workspace/integrals.ts` | Input parsing, variable normalization, indefinite native authority and other integral modes. Later adapt indefinite ingress without silently widening definite/improper behavior. |

## Mathematical replacement map

| Existing path | Observation | Disposition and replacement |
| --- | --- | --- |
| `src/lib/algebra/polynomial-core/types.ts`, `scalars.ts`, `math-json.ts` | Number-backed rational fields; multiplication precision counterexample; large `{num:string}` scalar unsupported by the reader. | Rebuild integration arithmetic with bigint. Preserve these shared files for other consumers. |
| `src/lib/algebra/polynomial-core/{arithmetic,division,primitive,parser}.ts` | Concrete exact-scalar polynomial implementation, bounded parsing/operations. | Reimplement generic integration polynomial algorithms; reuse mathematical laws/tests as references, not assumptions about safe arithmetic. |
| `src/lib/algebra/rational-function/{arithmetic,factorization,partial-fractions}.ts` | Existing bounded rational manipulation and denominator families. | Retain legacy service; replace integration dependence with canonical rational functions and Hermite/LRT algorithms. |
| `src/lib/symbolic-engine/primitives/coefficient-domain.ts` | Symbolic nodes plus facts, simplifier-dependent operations and controlled parse stops. | Replace as new decision-core coefficient authority. Keep old routes until migrated. |
| `src/lib/symbolic-engine/primitives/symbolic-polynomial/` | Symbolic coefficient polynomial arithmetic and Sylvester/resultant operations. | Adapt algorithmic lessons and regression fixtures; implement against new field arithmetic. Do not import old node simplification as a field oracle. |
| `src/lib/symbolic-engine/primitives/algebraic-root-descriptor.ts` | Roots, constants and trace evidence primarily stored as LaTeX names/definitions. | Rebuild exact internal algebraic/root-sum representation; preserve old readback until replacement adapter is approved. |
| `src/lib/symbolic-engine/integration.ts` | Public facade with multiple consumers. | Retain while migrating consumers intentionally. |
| `src/lib/symbolic-engine/integration/dispatch.ts`, `classifier.ts` | Route ordering, specialized retries and controlled boundaries. | Keep useful fast paths; replace their role as the general completeness path. Retire superseded private routes after evidence. |
| `src/lib/symbolic-engine/integration/risch-norman/` | Bounded ansatz, coefficient solver, Hermite and LRT routes. | Retain as heuristics/specialized positives initially; port justified reductions to generic fields. No negative conclusion from heuristic failure. |
| `src/lib/symbolic-engine/integration/transcendental-field-tower.ts`, `transcendental-tower-normal-form.ts` | Depth-two profile, explicit caps, generator metadata. | Replace with relation-aware recursive differential-field objects; raising caps is insufficient. |
| `src/lib/symbolic-engine/integration/transcendental-primitive-extension-risch.ts`, `transcendental-exponential-extension-risch.ts` | Derivation closure/readiness evidence. | Retain tests/reference; do not count as a general integration decision algorithm. |
| `src/lib/symbolic-engine/integration/transcendental-rde.ts` | Polynomial coefficient/RHS core, degree caps 12/10, exact identities and specific obstructions. | Preserve proven family behavior; rebuild recursive denominator/degree-bound RDE algorithms with new arithmetic. |
| `src/lib/symbolic-engine/integration/transcendental-certificate/` | Existing family-specific non-elementarity and special-function readback. | Retain as explicit family modules, then adapt proof artifacts and output conversion. |
| `src/lib/symbolic-engine/integration/algebraic-genus0/`, `algebraic-genus1/` | Useful radical/elliptic charts; raw-radical second-kind solve attempts can stop on growth or pivot boundaries. | Preserve positive special-function paths; rebuild general algebraic field/reduction authority. General algebraic integration is not equivalent to widening genus-one templates. |
| `src/lib/symbolic-engine/integration/algebraic-function-field-orchestrator.ts` | Coordinates genus-specific routes. | Retain compatibility during migration; replace general algebraic decisions with field algorithms. |
| `src/lib/calculus/engine/verification.ts`, `exact-rational-equivalence.ts` | Current symbolic/numerical backchecks; rational equivalence reuses number-backed polynomials. | Keep for legacy routes; new exact kernel verifier must not depend on these as its final proof oracle. |
| `src/lib/calculus/engine/antiderivative-expression.ts`, `indefinite-presentation.ts` | Native answer authority, structural integration constant and presentation. | Retain/adapt explicit conversion from checked kernel results. |
| `src/lib/calculus/workspace/integration-result-document.ts` | Integration-specific V2/V4 result adapter. | Retain boundary; new semantic structures require their own reviewed contract mapping. |
| `src/lib/result-contract/` | Serialization, provenance, MathJSON and canonical-result validation. | Retain as output firewall. Do not equate serialization correctness with integration correctness. |
| `benchmarks/calculus-corpus/integration/` | Existing source/regression provenance and run/visual ledger. | Retain. Add new kernel-law/certificate cases separately; do not relabel historical results as current or future coverage. |

## Shared consumers and blast radius

A static scan resolved direct relative TypeScript imports, excluded `*.test.*`/`*.spec.*`, and deduplicated by importing file. This is a direct-import inventory, not a transitive execution count.

| Facade/module | Direct production importers | Groups |
| --- | ---: | --- |
| `algebra/polynomial-core.ts` | 194 | Equation 36; Symbolic Engine 92; Algebra 25; Linear Algebra 24; Modes 7; Calculus 10. |
| `algebra/rational-function-core.ts` | 5 | Algebra 1; Symbolic Engine 3; Calculus 1. |
| `symbolic-engine/primitives/coefficient-domain.ts` | 22 | Symbolic Engine 22. |
| `symbolic-engine/integration.ts` | 3 | Symbolic orchestrator; Calculus engine integration; Calculus engine shared. |
| `calculus/engine/integration.ts` | 2 | Calculus engine eval; Calculus workspace integrals. |

Concrete non-integration scalar consumers include `equation/complex/polynomial.ts`, `equation/polynomial/system.ts`, `linear-algebra/exact-matrix-core.ts`, and `linear-algebra/exact-vector-core.ts`. A migration of their arithmetic is not included in this integration program's first implementation gate.

Frozen compatibility owners `calculus/workspace/result-document.ts` and `calculus/workspace/math-values.ts` must remain byte-identical unless every V1 route they own is explicitly migrated under repository policy. Do not edit them for import cleanup.

The initial source snapshot and complete direct-import list are retained in the design dossier. The conclusions here identify migration boundaries, not a full audit of all 194 consumers.

## Why there is a new private core

`src/lib/symbolic-engine/integration/core/` is beneath the existing Symbolic Engine private integration path in `compartments/manifest.ts`. It requires no new worker, capability, public SDK or top-level compartment. The first gate does not add a public import seam. A later adoption gate may expose an integration-specific method through the existing facade while keeping Calculus adapters in Calculus.

No active code is to be relocated into generated or ignored paths. Temporary probes under `.task_tmp/` are investigation artifacts only.

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live
