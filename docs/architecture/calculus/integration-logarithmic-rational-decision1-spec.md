# INTEGRATION-LOGARITHMIC-RATIONAL-DECISION1

Date: 2026-10-07
Gate: backend; CRITICAL, root-only.
Status: verified backend milestone; application adoption is separate.

## Domain and boundaries

Decide elementary integrability of any normalized owned element of Q(x)(t), t=log q(x), for nonconstant q in Q(x). Support arbitrary numerator and denominator polynomials in t, including inverse powers, with rational-function coefficients in x. Reverify the supplied certified first-level construction, its original argument, derivation and ownership. Equal derivatives do not identify log x with log(2x).

Preserve exact BigInt fractions, ownership, existing entry points and formats. No dependencies, parsing, result/UI adoption, higher-field algorithms, staging, commits or pushes. Multiple logarithmic generators, mixed exponential/logarithmic fields, symbolic parameters and constant extensions remain unsupported by these entry points.

Every success or negative conclusion requires complete evidence. Invalid input, foreign ownership, failed verification and sticky resource exhaustion retain typed failures. Exhaustion is no mathematical decision.

## Checkpoint A — exact primitives

An immutable primitive consists of v in F and finitely many all-roots terms sum(w(alpha)*log G(alpha)). Each modulus is monic, nonconstant and square-free in Q[z]; weights and arguments are reduced modulo it. Every distinct root is included once. Arguments must be units in the square-free quotient ring; reducible moduli are never assumed to define fields.

Each logarithmic derivative is the trace of w*D(G)*G^-1. Evidence includes independent dual-number derivatives of the field part and every argument coefficient, the inverse identity, nonzero resultant norm, multiplication-basis trace and independent Newton-sum trace. The rational primitive bridge preserves coefficients, root coverage and norms through checked owner conversions.

Private entry points are `logarithmicLogTerm`, `logarithmicPrimitive`, `differentiateLogarithmicPrimitive`, explicit-target `verifyLogarithmicPrimitive`, and `encodeLogarithmicRationalPrimitive`/`decodeLogarithmicRationalPrimitive` with the explicit expected field and target.

The separate `logarithmic-rational-primitive`, version 1 artifact retains full construction, target, term, inverse, norm, trace, derivative and condition evidence. Replay reconstructs auxiliary domains and checks stored evidence without invoking its producing algorithms. Semantics are formal local-complex logarithms; no principal branches, real forms, or logarithmic product/power identities are selected. Output log terms do not admit additional input-field generators.

Checkpoint A passed 25 new logarithmic and 52 retained exponential tests, plus isolation, TypeScript, scoped lint and protocol/boundary checks before decision authority was activated.

## Checkpoint B — complete decisions

Set a=q'/q. Formal t differentiation is used for polynomial square-free algorithms; integration uses total differentiation D(t)=a and coefficient differentiation. All nonconstant denominator factors are normal. A special monic factor would force a rational primitive of a through its next coefficient, contrary to admission, including over complex constants.

Checked differential Hermite reduction covers the entire denominator, including t powers. It verifies reconstruction, square-free and normality Bezout evidence, exact divisions and every repeated-pole transition. The output identity is f=D(h)+P+A/N, with P polynomial and either an explicit zero residual or a proper residual with monic normal square-free denominator.

For a nonzero residual, checked indexed subresultants give R(z)=Res_t(N,A-z*D(N)). Verify its nonzero scalar, monic normalization, reconstruction and degree deg(N), then independently differentiate every normalized coefficient. A nonzero derivative yields the `nonconstant-residue` obstruction.

Constant coefficients descend exactly to Q. Checked specialization partitions, indices, scaling, lower-index vanishing, selected degrees, divisibility, quotient units and component coverage produce all-roots logarithms. Each term has weight z once, irrespective of residue multiplicity. Moduli split over Q(x)[z] must descend to monic Q[z]. After subtracting checked log derivatives, the remaining denominator must be one.

For polynomial degree m>0 with leading coefficient p_m, solve D(u)=p_m+c*a through complete rational limited integration. Successful coefficient choices have no nullspace directions: two choices would yield a rational primitive of a. Construct B=u*t^m-c*t^(m+1)/(m+1), using the canonical rational representative. Independently verify D(B), subtract it and require strict degree reduction.

Every step retains the exact request, complete limited-integration certificate, correction, derivative and next remainder. Stop at the first checked negative certificate, retaining its successful prefix and marking subsequent work unsolved. This is the `polynomial-coefficient` obstruction. A zero top correction coefficient is checked against the actual degree m, not the theoretical m+1 bound.

Integrate the final rational remainder through checked Hermite/LRT, embed its primitive, assemble every contribution, and independently verify the complete derivative against the original input. Return one representative without an added integration constant.

### Fixed negative authority

Rule: `rational-logarithmic-residue-liouville-v1`. The [completeness dossier](../../../.memory/sessions/2026-10/2026-10-07/2026-10-07__integration-logarithmic-rational-decision1/proof-dossier.md) covers admission/transcendence and constant-field preservation over complex constants, absence of special factors, residue necessity, the degree bound, descending limited-integration completeness, rational inconsistency-witness descent and invariance under elementary derivative subtraction.

Canonical u omits its additive constant; this changes B by C*t^m and transfers only an elementary derivative to the lower-degree problem. Neither unfinished evidence nor failed computation authorizes a negative answer.

## Conditions and replay

Retain provenance for both numerator and denominator of the construction argument, full outer denominators, rational coefficient denominators inside outer numerator and denominator, and successful primitive denominators and log norms with their evaluation conditions. A logarithmic generator can vanish: inverse powers retain their actual denominator restriction. Conditions survive derivative cancellation. Earlier source exclusions lost before backend normalization remain the caller's responsibility.

Private decision entry points:

- `integrateLogarithmicRational(ctx, owner, input, bounds)`.
- `verifyLogarithmicRationalDecision(ctx, owner, input, decision, bounds)`.
- `encodeLogarithmicRationalDecision`, `decodeLogarithmicRationalDecision` against the explicit expected owner and input.

Immutable variants are `elementary` and `non-elementary`, with the two checked obstruction categories. The separately tagged `logarithmic-rational-decision`, version 1 artifact stores construction/input, reduction, residue selection, polynomial coverage and nested limited-integration certificates, rational decision where present, assembled primitive verification and conditions.

Bound the whole artifact before nested decoding. Bind values through the checked differential-owner codec and reconstruct fresh auxiliary domains. Replay invokes no admission, differentiation, Hermite, residue-selection, limited-integration, linear-system or integration producer. Serialize no contexts, callbacks, owner identities or trusted flags.

Shared `first-level-rational-*` helpers contain only identical arithmetic/evidence mechanics. Separate registered exponential and logarithmic domains retain their guards, admission and condition policies. Exponential wrappers preserve existing signatures and version-1 formats; exponential decision and decision-wire entry points are unchanged.

## Resources and verification

Unchanged profile: 20 billion work, 1 trillion cumulative allocation, 2,048 integer bits, degree 256, tower height 8, artifact depth 64, 100,000 nodes and 16 MiB. All public operations start fresh proof state; nested work shares cumulative accounting. Bounds precede expensive allocation; no hidden ceilings.

All 697 core tests pass: 599 retained and 98 new logarithmic tests. Coverage includes general rational arguments, inverse powers, repeated poles, algebraic residues, reducible rings, degree-specialization partitions, rational/root-log additions, successful prefixes followed by obstruction, seeded independently known derivatives, large coefficients, ownership, immutability, tampering, fresh proof state and sticky exhaustion.

For t=log x, independently known fixtures include:

| Input | Verified outcome |
|---|---|
| t | xt-x |
| t^2 | x(t^2-2t+2) |
| t/x | t^2/2 |
| 1/(xt) | log t |
| 1/(xt^2) | -1/t |
| (1+1/x)/(t+x) | log(t+x) |
| 1/t | Nonconstant-residue obstruction |
| t/(x+1) | Polynomial-coefficient obstruction |

Positive, both negative and partitioned artifacts replay with producers disabled. The shared extraction also passes 80 affected adopted Integration service/result/replay tests. Incremental TypeScript, scoped lint, isolation, OOE/compartment, memory/file-size and diff checks form closeout evidence. Tests use two workers. Serial observations use two warm-ups and five fresh measured runs per operation; no timing assertion or general speed guarantee applies. [Measurements](../../../.memory/sessions/2026-10/2026-10-07/2026-10-07__integration-logarithmic-rational-decision1/performance-results.md) distinguish accounting units from process RSS/heap observations.

No Playwright gate applies to this private backend milestone; application behavior and logarithmic UI adoption are unchanged. Repository lint/build remain gates for a separately authorized commit.

## Completion and next boundary

Verified elementary-integrability decisions over one certified rational logarithmic field, with exact formal primitives and replayable positive/negative evidence. Recursive RDE/admission requires its own reviewed implementation plan. Application adoption and broader tower decisions remain separate gates; sequencing stays provisional.
