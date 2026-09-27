# Integration Reconstruction Design 1

Date: 2026-09-26
Milestone: `INTEGRATION-RECONSTRUCTION-DESIGN1`
Status: investigated design; implementation not started. Later-stage algorithms and sequencing remain revisable as evidence develops.

The user explicitly approved this CRITICAL, root-only design investigation after approving reconstruction where needed. The initial no-commit instruction was subsequently superseded by explicit user approval for the design and exact-algebra checkpoints; no push is authorized. This document chooses the first implementation architecture and records later blockers; it does not claim a finished Risch implementation or authorize a new public result schema.

Read with the [blueprint](integration-reconstruction-blueprint.md), [replacement inventory](integration-reconstruction-inventory.md), [first implementation specification](integration-exact-algebra1-spec.md), and [updated roadmap](integration-reconstruction-roadmap.md).

## Decisions ready for the first implementation

1. Implement the first kernel in TypeScript using native `bigint`, with no new runtime dependency. Keep it inside Symbolic Engine's existing integration-private boundary: `src/lib/symbolic-engine/integration/core/`.
2. Build genuinely generic univariate polynomial and rational-function operations over a decidable exact field. Instantiate them over `Q` and over `Q(t)` in the first gate. This tests recursive coefficients with real algorithms rather than a placeholder interface.
3. Do not replace the shared `algebra/polynomial-core` in place. Migrate integration consumers later; Equation, Linear Algebra and unrelated Symbolic Engine consumers retain their current contracts.
4. Start the general rational integrator with input domain `Q(x)`. Its positive mathematical result may require algebraic constants/logarithms. Establish an internal exact output and proof representation before enabling the general route in the application.
5. Keep solver certificates, output conversion checks, and canonical-result validation distinct. Passing a MathJSON serialization/comparison check does not prove that an expression differentiates to the integrand.
6. Preserve worker/capability identity, runtime ownership, current useful fast paths, special-function output, and replay. Route retirement follows replacement evidence, not the creation of a new directory.

## Evidence and execution path

Inspection baseline: `main` at `a8d2c423`, with pre-existing uncommitted Graphing/source-mirror changes and the earlier blueprint capture. The inventory records exact paths and source-backed limits.

The guided indefinite path is:

`useCalculusRuntime.runCalculusAction` → `modes/calculus.runCalculusModeWithOoePilot` → Calculus worker client → `calculus.worker` → `runCalculusCanonicalRuntimeRequest` → workspace engine → `evaluateCalculusIndefiniteIntegral` → `resolveIndefiniteIntegralFromAst` → Symbolic Engine integration facade/dispatch → native antiderivative presentation → Calculus result adapter → canonical runtime outcome → existing OOE commit legality/history.

The worker host remains `calculus-worker-runtime`; fallback remains `calculus-runtime`; capability remains `calculus.evaluate`. `symbolic-engine/orchestrator.ts` and `calculus/engine/eval.ts` are additional consumers of the existing integration layers. Initial product adoption should enter through the guided indefinite path, not silently switch every facade consumer or definite-integral caller at once.

Read-only probes found:

- Existing scalar multiplication of `9007199254740991` by `3` returns `27021597764222972`; the exact result is `27021597764222973`. Both inputs are exactly representable integers. This is a primitive-level finding, not a claim that every app route exposes that result.
- Compute Engine preserves `9007199254740993` as `{num:"9007199254740993"}`. The legacy scalar reader returns `null` for that node.
- A standard-MathJSON proof probe accepts `Rational({num:"9007199254740993"},7)` and preserves the integer in printed LaTeX. This is representative conversion evidence, not an arbitrary-size performance guarantee.
- Raw `bigint` is rejected by the current JSON-compatible result-envelope inspector. `RootOf` is rejected as a custom MathJSON head even though basic serialization accepts the array.
- The existing tower profiler stops `exp(exp(exp(x)))` with `depth-over-cap`.
- The files named primitive/exponential-extension Risch analyzers return derivation-closure/readiness evidence, not general integration reductions.

## Language and dependency choice

| Option | Assessment for this first gate |
| --- | --- |
| TypeScript + native `bigint` | Selected. Existing mathematical path and browser worker are TypeScript; `tsconfig.app.json` targets ES2022. No FFI, new packaging, or second implementation is required. |
| Existing Compute Engine / `decimal.js` | Keep existing parsing/presentation roles. Do not use opaque simplification, numerical precision, or candidate integration as the new field's equality/proof oracle. |
| Rust/native or Rust/WASM | Possible later acceleration boundary. Current Cargo dependencies do not supply the required exact algebra stack; native-only adoption would need a browser strategy, and WASM adds a build/transport seam. No performance comparison has established a need to choose it now. |
| External CAS integration | Not selected. A foreign answer still needs domain semantics, proof/output conversion, packaging and cancellation integration. No new CAS dependency or source-mirror code reuse is approved by this design. |

`bigint` gives integer arithmetic; rational arithmetic and the algorithms still need implementation. Keep magnitudes out of `number`; safe integer array indices/degrees and timing measurements may remain numbers. Use input/output bit-size checks and work budgets. An individual BigInt multiplication is synchronous, so checks surround it; they do not promise to interrupt it midway. [ECMAScript BigInt semantics](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-bigint-type)

This is an engineering choice grounded in the current execution path, not a claim that TypeScript is fastest for all future algebra. Reconsider only with measured kernel workloads and a reviewed migration boundary.

## Initial mathematical domain and later extension contract

The first kernel supports characteristic-zero exact fields with decidable equality. The first scalar domain is `Q`; genericity is exercised using a formal transcendental indeterminate `t` to construct `Q(t)`, then polynomials/rational functions over it. `t` is an explicitly formal test/domain parameter, not an inferred identity for arbitrary user expressions.

Exact input policy: the first scalar ingress accepts bigint, decimal integer strings, and safe integer JSON numbers. Non-integer machine numbers are not promoted to exact rationals. A later input-adoption gate may interpret a preserved finite decimal lexeme as an exact rational under an explicit policy; it must not reconstruct a rounded value or use rational approximation as proof.

The first general integration domain is `Q(x)`, with `D(x)=1` and `D(Q)=0`. Its elementary primitives may live in algebraic constant extensions with logarithms. Backend rational completion and product display completion are separate gates.

Subsequent parameter support uses a fixed-order tower `Q(p1)(p2)...(pm)` for declared algebraically independent parameters. Equality is exact in that generic field. Every parameter division/pivot contributes an exact nonzero condition. A generic nonzero polynomial is not nonzero at all parameter values. Exceptional specializations must rerun the relevant normalized input/reduction; a singular specialization cannot reuse a generic certificate. Arbitrary parameter relations require a supported quotient field and are not silently ignored.

Algebraic constants require a defining irreducible polynomial, coefficient-field identity, and sufficient embedding/root-selection evidence when individual roots are selected. Algebraic functions require analogous defining relations over their base differential field. A square-free but reducible quotient is an algebra, not automatically a field; handle it with explicit component splitting/unit checks or prove irreducibility before exposing field inversion.

Exponential/logarithmic towers require validated generator dependencies and differential rules. Do not assume `exp(2*x)` independent of `exp(x)`, or treat `log(exp(x))=x` as a global complex identity. Do not treat an arbitrary `x`-independent elementary constant as an independent symbol merely to make equality decidable. Unresolved relations/constants produce `UNDECIDED` or a precise missing-algorithm outcome.

The integration variable's identity is explicit. `y` can be a constant parameter in one request and an algebraic generator satisfying `y^2=x^3-x+1` in another; those requests must have different validated contexts.

## Kernel representation and operations

The following are contracts for implementation, not new public application types:

| Object | Required invariant |
| --- | --- |
| Rational | Reduced `bigint` numerator/denominator; denominator positive; zero is `0/1`; division by zero is an invalid operation, never a value. |
| Exact field | Context identity plus zero/one, exact arithmetic, inversion, equality/zero testing and canonical element construction. Only fields with established equality enter this interface. Unresolved front-end objects remain outside it. |
| Polynomial over K | Active indeterminate and coefficient-domain identity; canonical ascending dense coefficients initially, trailing zero coefficients removed; zero represented consistently. Domain mismatch is rejected. |
| Rational function over K | Coprime numerator/denominator, denominator monic, zero `0/1`, immutable normalized operands. Preserve original denominator exclusions separately from cancellation. |
| Algebraic element, later | Reduced basis coefficients modulo the validated defining polynomial; explicit base field and generator identity. Equality and inversion use the field's algorithms, not output text. |
| Differential extension, later | Ordered base context, defining relation, exact derivative in that context, constant-field evidence and branch/embedding assumptions where needed. |
| Integration decision, later | Typed status, validated input/field context, primitive or obstruction, exact conditions, and proof artifact. No string-only mathematical payload. |

Implement polynomial division and extended Euclid over K; use them for GCD, exact division, rational cancellation and square-free decomposition. Differentiation separates formal polynomial derivative from the later differential-field operation `D(sum a_i*t^i)=sum D(a_i)*t^i + sum i*a_i*t^(i-1)*D(t)`.

The kernel owns a bounded execution context for work/bit-size checks. It does not select workers, start jobs, own history, or decide stale-result commits. Exhaustion propagates as a structured resource stop. Invalid input/domain mismatch and unresolved mathematical prerequisites must not be collapsed into non-elementarity or zero.

## Algorithm dependencies and proof boundaries

The selected rational direction is Hermite reduction followed by Lazard–Rioboo–Trager logarithmic reconstruction using subresultants. Backend output can retain a finite algebraic-root sum with its polynomial and log-argument construction; explicit radicals are not a prerequisite. Verify the differentiated result through exact quotient/trace identities, including square-free/component hypotheses. A named alpha plus a prose definition is insufficient. [Bronstein tutorial, rational integration sections](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf)

Before implementing the rational algorithm, add subresultant/resultant operations and a checked internal root-sum representation. Before product adoption, prove that the representation converts without semantic loss through the output contract. This removes the old roadmap's implicit assumption that rational integration needs only existing partial-fraction display.

For transcendental integration, select recursive differential-field reductions with explicit lower-field RDE, logarithmic-derivative and limited-integration obligations. Degree/denominator bounds must be derived, not guessed from the current ansatz caps. Establish the chosen tower's constant-field hypotheses before asserting negative decisions. Bronstein's book provides the intended detailed reference; the publisher overview/table of contents was checked, but full algorithm pseudocode has not been independently audited in this milestone. [Symbolic Integration I](https://link.springer.com/book/10.1007/b138171)

For general algebraic and mixed integration, use the Trager/Bronstein family of exact reductions as the program direction: integral-basis/local analysis, finite-pole reduction, infinity, residues and the logarithmic problem. Mixed fields require algorithms over differential coefficient fields, not simply calling the algebraic and transcendental dispatchers in turn. The primary paper establishes this composition direction; a theorem-by-theorem algorithm dossier, including the principal-divisor/logarithmic subproblem, remains a prerequisite to those later implementation gates. [Bronstein, Integration of elementary functions](https://research.ibm.com/publications/integration-of-elementary-functions)

This milestone does not claim to have resolved every effective constant-field or divisor algorithm for arbitrary mixed inputs. Those open obligations do not block exact rational arithmetic, but they block later completeness claims.

## Proof and output authority

Use three distinct checks:

1. Input lowering establishes the original expression's interpretation in the selected field and retains exclusions/conditions.
2. A verifier checks a positive derivative identity or a valid negative obstruction against that field and input. It can share exact arithmetic with the producer but must reconstruct the identity rather than trust a status label or candidate's assertion.
3. A Calculus-owned adapter builds native result structure and passes existing canonical-result validation. This verifies representation/provenance/printing; it does not replace step 2.

Certificates should carry normalized exact operands and identities sufficient for replay, not a large human-readable trace pretending to be proof. Mutation tests must change a coefficient, sign, field relation or assumption and make verification fail. Rational linear-system inconsistency needs a checked contradictory row/row transformation, not failure of one selected pivot arrangement.

The blueprint's semantic outcomes remain internal: `ELEMENTARY`, `NON_ELEMENTARY`, `INCOMPLETE_IMPLEMENTATION`, `UNSUPPORTED`, `UNDECIDED`, `RESOURCE_LIMIT`. Runtime cancellation and malformed input retain their distinct meanings. A missing implementation or resource stop may allow existing routes to try a positive answer; it must never turn their failure into a negative proof. A verified negative elementary decision may still have a special-function answer.

## Result-contract gap audit

| Need | Current evidence | Design action |
| --- | --- | --- |
| Large rational integers | Standard `{num:string}` MathJSON passes the representative proof probe; raw bigint fails JSON-compatible envelope inspection. | Explicit bigint-to-MathJSON conversion in a later adapter; bounded decimal-string wire for kernel test artifacts. Never cast magnitudes through `Number`. |
| Ordinary elementary primitive | Native antiderivative expression and Calculus V2 adapter exist. | Retain the adapter and add producer-owned answer trees; verify converted values against kernel semantics. |
| General algebraic root/root sum | Legacy root descriptors are LaTeX records; `RootOf` is a custom head in the current allowlist. | Internal exact representation first. A dedicated representation gate must either prove a supported standard encoding end-to-end or propose a new version for explicit approval. Merely changing the operator allowlist is not sufficient. |
| Negative decision/certificate | Specific certificates and text/facts exist; no general integration-decision primary was identified. | Keep exact certificate internal initially. Add semantic result coverage only through reviewed adapters/contracts; no hidden proof semantics in labels. |
| Parameter conditions | Typed supplement math exists; a complete specialization partition is not supplied by it. | Emit validated conditions for supported generic results; build exceptional-case handling explicitly before claiming casewise completeness. |
| Existing special functions | Live V4 supports a bounded named-function expression union. | Preserve existing behavior; it is not a general algebraic-extension payload. |

Governance mismatch: live types/adapters include V4 special functions, whereas current `AGENTS.md` names V2 and only the narrow V3 widening. This design does not alter governance or broaden V4. Reconcile the authority wording in an explicitly reviewed contract/governance task before new versioned output adoption. Stage 1 changes neither schema nor producer.

Two Calculus files, `workspace/result-document.ts` and `workspace/math-values.ts`, are frozen V1 compatibility owners in `canonical-result-v2-enforcement-baseline.json`. Do not edit them incidentally: the required migration of all routes they own would be a much larger scope. Prefer the existing integration-specific adapter when feasible; any unavoidable frozen-file migration must be planned separately.

## Runtime and rollout boundary

Stage 1 is backend-only and not imported by production dispatch. Later, a guided-indefinite ingress lowers a supported request into the new kernel before legacy fallback. A successful new result returns through `antiderivativeExpression` and `integration-result-document.ts`. Keep the existing public Symbolic Engine facade until all its consumers are explicitly migrated.

Budgets must prevent main-thread fallback from receiving unbounded synchronous work. Existing workers support parent-side hard termination; input revision and commit legality stay in OOE. Before live adoption, either provide bounded cooperative work at the existing fallback boundary or return a truthful resource stop there. A callback inside a synchronous loop cannot process a newly queued browser cancellation event by itself.

Retire legacy integration-local arithmetic/reduction routes only after supported-domain replacement tests, positive/negative proof checks, and browser evidence pass. Do not delete shared scalar helpers still used by other workspaces. Maintain a capability ledger distinguishing backend-complete, product-adopted, heuristic-only and deferred domains.

## Acceptance and immediate handoff

2026-09-26 implementation update: `INTEGRATION-EXACT-ALGEBRA1` is now backend-verified with mandatory algorithm-boundary checks and 60 focused tests. It remains private and is included in its subsequently user-approved milestone checkpoint; no integration route has adopted it. The user separately authorized committing this earlier design checkpoint as `3c5a292a`. See the implementation specification and milestone dossier for current contracts/evidence.

The first executable scope is fully specified in [INTEGRATION-EXACT-ALGEBRA1](integration-exact-algebra1-spec.md). It requires no algebraic-number factorization, field-tower recognition, new result schema or production dispatch change. Those are explicit later prerequisites.

Current investigation evidence: 17 existing focused tests passed; three real-app baseline outputs were inspected in Playwright (rational primitive, quadratic-exponential certificate/special function, and elliptic branch/certificate). These verify selected existing behavior, not the future kernel or the entire corpus. The source precision probe is retained as a first-gate regression requirement. No runtime source was modified.

Remaining decisions are bounded to later work: general algebraic-root result semantics, precise constant-extension/dependency algorithms beyond the initial fields, chosen integral-basis/divisor implementations, broad parameter stratification, and performance-driven native acceleration. None may be assumed implemented when the corresponding milestone begins.

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
