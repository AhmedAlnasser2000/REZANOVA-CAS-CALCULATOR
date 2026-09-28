# INTEGRATION-RATIONAL-DECISION1

Date: 2026-09-27
Gate: backend, CRITICAL root-only, explicitly approved implementation.
Status: implemented and backend-verified. The user subsequently authorized its separate milestone commit; no push.

Outcome: **verified automatic rational integration over normalized Q(x) with replayable derivations**. The implementation is private to `src/lib/symbolic-engine/integration/core/`. Product adoption remains separate, and the [roadmap](integration-reconstruction-roadmap.md) remains subject to change when necessary.

## Prerequisites and scope

The [exact algebra](integration-exact-algebra1-spec.md) and [rational representation](integration-rational-representation1-spec.md) foundations supply immutable TypeScript/native BigInt values, owned Q and Q(x) contexts, ring/domain/field capabilities, polynomial division and Bézout identities, square-free decomposition, verified Brown subresultants, quotient units/splits, local-complex root-log primitives, and trace differentiation.

This gate accepts an already normalized rational function owned by a supplied `FormalPrimitiveDomain`. It preserves that input's denominator. It cannot recover exclusions lost before normalization; expression lowering must preserve those in a later gate. No symbolic parameters, dependencies, parser, legacy solver/dispatch changes, worker/OOE changes, public result contracts, or real-branch presentation are included. Concurrent Graphing/Matrix work is independent.

Private entry points:

- `integrateRational(ctx, owner, input)` constructs an immutable decision and verifies every stage before returning it.
- `verifyRationalDecision(ctx, owner, input, decision)` replays supplied certificates against an explicit input, without invoking Hermite or LRT producers.
- `encodeRationalDecision(ctx, owner, decision)` and `decodeRationalDecision(ctx, owner, expectedInput, wire)` save and replay the complete derivation.

An owned normalized Q(x) input always has an elementary local-complex primitive mathematically. The implementation either returns a fully verified primitive or throws an existing typed algebra error. Resource exhaustion is not mathematical failure, and there is no `NON_ELEMENTARY` outcome.

## Deterministic Hermite reduction

`hermite-reduction.ts` performs polynomial division, integrates the quotient coefficient by coefficient with constant zero, and square-free-decomposes the monic denominator into powers `V_i^i`. For each power `W`, it computes a Bézout inverse of `D/W` modulo `W`, then retains the polynomial quotient/remainder giving the separated proper numerator. Verification reconstructs the original proper fraction from those separated fractions.

For `H/V^k`, a Bézout witness for `V'` and `V` gives the unique `T`, reduced modulo `V`, satisfying `-(k-1) T V' = H mod V`. Checked exact division constructs

```
Hnext = (H + (k-1) T V' - T' V) / V.
H/V^k = (T/V^(k-1))' + Hnext/V^(k-1).
```

Every step records the exponent, `T`, and `Hnext`; the previous numerator is the preceding step's result, so the complete intermediate chain is retained. The verifier checks exponent ordering, reduced/proper degrees, and the displayed polynomial identity rather than regenerating `T`. It also replays separation Bézout/division evidence and square-free reconstruction, assembles rational part and residual, verifies residual square-freeness and properness, and checks `input = rationalPart' + residual`. Fraction ownership guarantees coprime normalized numerator/denominator. A zero residual is `0/1` and has no LRT certificate.

## Residues, specialization and indexed LRT selection

`lrt-reduction.ts` constructs `B=A-z D'` directly in Q[z][x] and retains the verified Brown certificate for `Res_x(D,B)`. The resultant must have degree `deg(D)` and its square-free decomposition retains the leading scalar and all multiplicities.

Each residue group has a **flat preorder partition tree**. Nodes carry their square-free quotient algebra and a descending coefficient-analysis sequence for B. Zero lowers the specialized degree, a unit fixes it, and a nonunit supplies a verified coprime factor/complement split. Children are visited factor first. The verifier consumes an explicit pending-modulus stack, checks every unit/split witness, and requires exact node and component coverage. The flat representation avoids recursive tree traversal or unbounded call-stack depth.

On a leaf with residue multiplicity `i < deg(D)`, selection uses the original Brown certificate's **indexed `S_i`**, retaining original input degrees, indices, actual degrees, and scaling. Every lower indexed subresultant must vanish modulo the component, `S_i` must have degree i, and its leading coefficient must have a checked quotient inverse. The normalized argument is monic. For `i = deg(D)`, the argument is D and B must vanish identically on the component. An unexpected selection or unit condition fails verification.

`monic-division.ts` is the supporting ring primitive. It uses no field inversion and verifies `a=q*b+r`, monicity and `deg(r)<deg(b)`. Ordinary field division remains unchanged. The LRT verifier uses saved monic-division evidence to prove that the selected argument divides both specialized inputs, including over reducible quotient algebras.

Each component contributes exactly one root-log term, with weight `z mod q`. Multiplicity controls GCD degree; it never multiplies the logarithmic weight. Factor reconstruction, partition order and term references prove full coverage without missing or duplicated components.

Mathematical reference: [Bronstein's tutorial, sections 1.2–1.3](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf). No external implementation is adopted.

## Final proof and retained conditions

The formal primitive combines the Hermite rational part with generated root-log terms. Its existing derivative machinery proves each term by the trace of `w * G_x * G^-1` over Q(x)[z]/q, using checked inverse/Bézout witnesses and multiplication-basis columns with independent Newton-sum verification. The final exact derivative must equal the explicitly supplied original input.

A decision retains three kinds of nonvanishing conditions independently of derivative cancellations:

- The normalized input denominator.
- The rational primitive's denominator.
- Every term's exact norm `Res_z(q,G)`, with its Brown evidence.

Semantics remain formal local complex primitives, including every distinct root exactly once. Individual roots, principal logarithm branches, real-valued displays and radical conversion are outside this gate.

## Complete private artifacts

The separately tagged `rational-integration-decision`, version 1 format stores input and primitive structure, every Hermite division/square-free/Bézout/step certificate, residue Brown/indexed evidence, flat component trees, specialization analyses, normalization inverses, monic divisions, norm certificates, and final inverse/trace/derivative evidence and conditions. Mathematical coefficients use exact integer strings; there are no serialized contexts or trusted verification flags.

`decision-wire-algebra.ts` supplies fixed-depth, exact-schema evidence codecs. `rational-decision-wire.ts` binds them to the explicitly supplied owner, checks the stored input against the separately supplied expected input, and replays verifiers. It does not regenerate integration or norm PRS output. `FormalPrimitiveDomain.termFromEvidence` checks saved norm evidence before an owned term can escape. The reusable `decodePrimitiveInDomain` preserves the existing primitive decoder's interface and wire format; the scalar/polynomial format is unchanged.

Schemas reject extra/missing keys, accessors, sparse/extended arrays, noncanonical coefficients, wrong variables, unreduced quotient values, inconsistent references, incomplete evidence, altered conditions, and malformed nested data. Arrays and coefficients are bounded before traversal/construction. Component traversal is iterative. Existing typed failures distinguish invalid input, ownership mismatch, failed proof and resource exhaustion.

## Resources and validation contract

All producing algorithms, arithmetic, decoding and verification share the caller's execution context. No default application budget or hidden algorithmic degree ceiling was introduced. The test profile explicitly allows work 20,000,000,000; cumulative allocation units 1,000,000,000,000; integer bits 2,048; degree 256. Those are adjustable test safeguards, not a supported-degree promise or measured heap usage.

Private rational-function arithmetic now handles zero/one identities and equal denominators directly after ownership checks. Constant-denominator normalization uses the fact that a nonzero constant is a unit. It still checks monicity and exact cross multiplication, and nonconstant denominators retain checked coprimality. These changes preserve mandatory verification while reducing redundant Euclidean work in nested Q(x) arithmetic.

Acceptance covers all prior 84 tests; exact automatic fixtures through a nontrivial quintic; known Hermite parts; repeated/mixed poles and residues; degree loss; abnormal PRS drops; highest selection; seeded independently differentiated inputs; ring monic division; full artifacts with producers disabled during replay; adversarial scaling/index/split/inverse/division/weight/trace/target/condition mutations; and shared-budget exhaustion during construction, decoding and final verification.

The [milestone verification dossier](../../../.memory/sessions/2026-09/2026-09-27/2026-09-27__integration-rational-decision1/verification-summary.md) records actual test counts, checks and representative resource measurements. Repository lint/build remain required before a subsequently authorized source commit. No full integration suite or Playwright gate applies while the core has no app caller.

A subsequent stage profile localized the generic-quintic cost: Hermite/LRT together ~0.21 s, derivative construction and target verification ~33.17 s, final complete replay ~8.21 s. The dossier distinguishes these measurements from unquantified candidate optimizations. Performance work should target nested exact proof arithmetic and redundant verification while preserving proof obligations.

## Handoff

The next adoption gate must explicitly settle input lowering and original-expression exclusions, result authority, local-complex versus real display/branch semantics, and cancellation/resource execution policy. It must not infer app support from this backend milestone. The original implementation excluded staging/commit/push; the user subsequently authorized a separate integration-only commit checkpoint. No push is authorized.

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

## 2026-09-28 performance follow-up

The decision milestone is committed as `3a96622c`. [INTEGRATION-RATIONAL-PROOF-PERFORMANCE1](integration-rational-proof-performance1-spec.md) accelerates construction and replay with operation-local checked reuse and shared-denominator proof arithmetic. The mathematical and version-1 artifact contracts above are unchanged. Its same-machine acceptance results and preserved baseline artifact are recorded separately; historical decision-gate timings remain evidence of that original implementation.
