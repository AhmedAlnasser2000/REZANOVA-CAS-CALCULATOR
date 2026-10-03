# Equation Reconstruction Design 1

Date: 2026-10-03
Milestone: `EQUATION-RECONSTRUCTION-DESIGN1`
Status: design and baseline evidence only. No Equation core exists yet. Later algorithms and sequencing remain revisable as evidence develops.

The user approved this CRITICAL, root-only design gate on 2026-10-03, after deciding to rebuild Equation as a new private core rather than extend the existing route architecture. It is documentation plus a read-only baseline probe. It changes no production, test or configuration source, adds no dependency, and does not authorize a result schema, a workspace, a commit or a push.

Read with the [blueprint](equation-reconstruction-blueprint.md), the [inventory and baseline](equation-reconstruction-inventory.md), the [roadmap](equation-reconstruction-roadmap.md) and the [first implementation specification](equation-exact-algebra1-spec.md).

## Goal

Replace the stage/route/cap architecture of the current Equation engine with a private symbolic core whose capability is limited by mathematics and by real resources, never by shape caps. A practical equation should fail only because:

1. its class has no supported complete procedure yet (`INCOMPLETE_IMPLEMENTATION`) or has none in principle (`UNDECIDED`);
2. it lies outside the declared input language (`UNSUPPORTED`);
3. the shared execution budget ran out or the user stopped it (`RESOURCE_LIMIT`).

It must never fail because a composition was deeper than 3, a polynomial had degree 5, there were three carriers instead of two, or a formula's LaTeX was long.

## Decisions ready for the first implementation

1. **A new private core, not a refactor.** Production code lives under `src/lib/symbolic-engine/equation/core/`. From the first implementation gate, an isolation test modelled on `src/lib/symbolic-engine/integration/core/isolation.test.ts` forbids the core from importing anything outside itself. That rules out the old `src/lib/equation/`, `symbolic-engine/primitives`, Compute Engine, display code and the app. Only named adapter files outside the core may import it. Old code is never ported. Old tests are used only as a source of problem statements with expected answers.
2. **Private exact algebra, deliberately duplicated.** The core gets its own exact algebra in `core/algebra/`, written with conventions compatible with the integration core: bigint rationals, ascending dense coefficients, and checked identities. This is an intentional exception to the AGENTS.md drift guardrails. The two cores evolve independently. A shared exact-arithmetic layer may be extracted later, by a separate approved milestone, once the real overlap is visible. No universal solver AST is introduced.
3. **TypeScript with native `bigint`, no new runtime dependency.** This matches the integration precedent. Rust/WASM is reconsidered only when measured workloads justify a separate boundary.
4. **One resource model, typed so caps cannot be written.** There is one execution context per solve, counting work units and allocation units, shared by lowering, solving, verification and output conversion. The stop-reason type is exactly `work | allocation | cancelled`. No degree, depth, node, branch, candidate, parameter, transformation-count or integer-size stop can be expressed. A ratchet test fails if core production files declare solver constants matching `MAX_*`, `*_LIMIT`, `*_CAP`, `*_DEPTH` or `*_BUDGET`. Budgets are request inputs with generous defaults. A later OOE resource subsystem replaces them.
5. **Termination by design, not by caps.** Every transformation declares a well-founded measure it strictly reduces. Candidates are nesting height of the unsolved target, generator count, degree, radical count, absolute-value count and periodic nesting. Rewrites that reduce no measure, such as trig identities, run only against a visited set keyed by the canonical hash of the relation state. Remaining genuine search uses iterative deepening under the shared budget.
6. **All-or-nothing outcomes.** The result is one of:
   - an exact solution set: explicit roots, RootOf values, periodic families, parametric sets, or an exact reduced form;
   - `EMPTY`, meaning proven to have no solutions;
   - a status without roots: `UNDECIDED`, `INCOMPLETE_IMPLEMENTATION`, `UNSUPPORTED` or `RESOURCE_LIMIT`.

   "Roots found so far" are never shown. An exact reduced form, such as *x = 1 or sin x = x²*, is allowed only when the whole statement is proven equivalent to the original relation under its retained conditions.
7. **Verification by construction.** Every transformation records its equivalence kind (`EQUIVALENT`, `EQUIVALENT_UNDER_CONDITIONS`, `FORWARD_ONLY`, `BRANCH_DECOMPOSITION`), the conditions it added or removed, and its reconstruction map. The checked chain is the proof. A direct substitution check is mandatory only after `FORWARD_ONLY` steps, such as squaring or clearing denominators. If that check is undecidable for a candidate, the candidate is reported as *unconfirmed*, with its derivation. It is never silently dropped. Numerical evaluation is supporting evidence, never proof.
8. **Domains are explicit.** Every request declares ℝ or ℂ. Range facts (eᵘ > 0, |u| ≥ 0), branch semantics and inverse relations are looked up by domain. Symbolic parameters live in ℚ(p₁,…,pₘ). Every division or pivot on a parameter expression produces a case condition. Answers are case trees, never a silently generic formula.
9. **No partial migration of old routes.** The old engine, including all its caps, stays byte-for-byte untouched until the new core is adopted and proven on the corpus. It is then retired by a separate closeout gate.
10. **A new workspace at adoption.** The product surface will be a new "New Equation" workspace with its own worker host, capability ID, OOE shell and replay seed, like New Integration. The old Equation UI is not extended. UI work starts only at the adoption gate.

## Evidence and baseline

The [inventory](equation-reconstruction-inventory.md) records 45 cap constants plus 5 runtime-profile budgets and the peel cap. It also records a read-only probe of 50 equations through the app's own entry point, `runEquationMode` in `src/lib/modes/equation/run.ts`, using the symbolic screen, real domain and exact answer mode. Summary:

- 27 exact and correct. One of those, x⁴−10x²+9 = 0, is shown with unsimplified fractions such as 60/−20.
- 13 approximate only, although an exact or RootOf answer exists. Examples: e^{2x}−5e^{x}+6 = 0 fails outright in exact mode; (ln x)³−6(ln x)²+11 ln x−6 = 0 takes 38.6 s to return decimals; x⁵−x−1 = 0 returns a bare decimal; sin(sin(sin(sin x))) = 1/10 shows `arcsin(0.100504)` inside an "exact" family.
- 2 appropriate numeric answers: cos x = x and sin x = x².
- 6 refused or mislabelled although solvable. Examples: sin⁴x−5sin²x+4 = 0 demands an interval; √x+∛x+∜x = 3 is "outside the bounded set"; (x³+1)/(x²−1) = 0 reports a failed numeric search instead of an empty set.
- 2 **false "no roots" answers.** ||x−1|−2| = 3 has roots x = −4 and x = 6, but the engine reports "No validated real numeric roots were found after guarded piecewise branch solving". The four-level nested absolute-value case fails the same way.

These are representative observations through one entry point, not a full audit of every Equation screen.

## Language and dependency choice

| Option | Assessment |
| --- | --- |
| TypeScript + native `bigint` | Selected, for the same reasons as integration: the browser worker is TypeScript, there is no FFI or packaging seam, and the precision of exact integer arithmetic is known. |
| Reuse of the integration core | Not selected now (decision 2). Its isolation test admits only New Integration adapters, and Equation needs substrate it lacks: factorization, root isolation, algebraic numbers and multivariate polynomials. |
| Compute Engine | Not used inside the core. It may remain a parser at the adapter boundary, with exact lowering checked by the core. |
| Rust/WASM | A possible later acceleration boundary for Gröbner, CAD and large factorization, decided by measurement. |

## Native representation

This is summarized here and specified in the [blueprint](equation-reconstruction-blueprint.md#c-representation):

- a hash-consed expression graph, where identical subexpressions share one node;
- a relation problem: relations, domain, targets, assumptions, generators, constraints and obligations;
- transform records, forming a replayable proof log;
- solution-set algebra: finite sets of algebraic numbers, unions, case trees, periodic families over integer lattices, parametric sets, and exact reduced forms.

This representation is Equation-owned. It declares its own conversion boundary at the adapters, and it is not a shared interchange format between workspaces.

## Result-contract gap audit

| Need | Current contract | Action |
| --- | --- | --- |
| RootOf with isolating interval/box | V2 has no RootOf; `RootOf` is a custom MathJSON head | V6 must carry polynomial + isolation data + index semantics |
| Periodic families with k ∈ ℤ | Old engine encodes families in LaTeX/supplement strings | V6 typed family: expression, integer parameters, constraints |
| Parametric sets, free variables | No typed form | V6 typed parameterization |
| Case trees on parameters | Supplement strings | V6 typed conditions per case |
| Six distinct outcomes, "unconfirmed" candidates | Success/error only | V6 outcome taxonomy; no partial-root payload |
| Large exact answers | `CANONICAL_RESULT_MAX_NODES = 10_000`, `EQUATION_SOLVE_RESULT_MAX_CANDIDATES = 2_048` | Structural compactness first; overflow reported as resource, never as invalid |

AGENTS.md requires versioning the canonical-result contract before such semantics are produced. `EQUATION-RESULT-CONTRACT1` (V6) is therefore a gate before adoption, as V5 preceded New Integration.

## Runtime and rollout boundary

Gates 2 and onward are backend-only and have no production caller until adoption. The core owns no worker, job or history. Adapters do. A synchronous BigInt operation cannot be interrupted midway. The worker plus parent-side termination provides Stop, as in New Integration. The old Equation workspace remains the shipped surface throughout.

## Acceptance and immediate handoff

This gate is complete when the five documents, the baseline evidence and durable memory are recorded and the documentation checks pass. The next gate is [`EQUATION-EXACT-ALGEBRA1`](equation-exact-algebra1-spec.md). It needs its own approval.

Open for the user before that gate:

- whether factorization over ℚ and real/complex root isolation join gate 2 or form the following gate;
- the exact scope of V6;
- where the old engine's retirement gate sits.

These are recorded in `.memory/open-questions.md`.

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live
