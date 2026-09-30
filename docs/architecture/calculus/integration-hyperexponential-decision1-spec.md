# INTEGRATION-HYPEREXPONENTIAL-DECISION1

Date: 2026-09-30
Gate: backend; CRITICAL, root-only.
Status: backend complete and verified; user subsequently authorized the milestone commit. Evidence is in the milestone dossier.

## Outcome and boundary

For normalized b,r in an explicitly owned Q(x), D(x)=1, with nonconstant r, decide whether b exp(r) has an elementary primitive. Return a checked u exp(r), u in Q(x), or a checked non-elementarity certificate. Completeness is for this class and is subject to caller-supplied finite execution safeguards. Exhaustion is no decision, never non-elementarity.

Production changes remain inside the private integration core. No parser, UI, public result, legacy integration, dependency, application-limit or runtime changes. Finite sums, general rational functions in an exponential generator, independent exponentials, nested towers and constant extensions remain future gates. The original implementation authorization excluded staging/commit/push; the user subsequently authorized this finished milestone commit. No push is authorized.

Prerequisites are the owned differential-field foundation, exact Q(x) arithmetic, certified first-level exponential admission, independent dual-number derivative verification, complete rational RDE certificates, strict existing codecs and bounded artifact traversal. This milestone composes these prerequisites; it does not replace their mathematical algorithms.

## Private interfaces and representation

- `integrateHyperexponential(ctx, owner, b, r, bounds)` constructs and verifies one decision.
- `verifyHyperexponentialDecision(ctx, owner, b, r, decision)` checks a supplied mathematical decision against explicit expected inputs.
- `encodeHyperexponentialDecision` and `decodeHyperexponentialDecision` use the separately tagged `hyperexponential-decision`, version 1 artifact, with explicit expected owner/b/r and bounds.

`HyperexponentialResult` has elementary, non-elementary and unsupported variants. Unsupported has reason `constant-exponent`; it is not a proof artifact. Every constant r, including zero and the b=0,r=0 case, receives that response. Nonconstant r with b=0 receives the checked zero primitive, retaining the exponent's denominator. Foreign elements, Q rather than Q(x), and formal/higher-tower owners are rejected. A registered-owner check rejects prototype-forged fields with a typed ownership error before private methods execute.

Elementary decisions retain the supplied owner and normalized b/r, certified exponential field, requested exponential alias, assembled integrand, checked derivative of r, complete RDE decision, reduction-rule identifier, rational coefficient u, assembled primitive, final derivative evidence and conditions. Non-elementary decisions retain the same input/admission/reduction/RDE evidence, with no primitive. All produced and decoded containers are immutable. Caller-owned certificates/artifacts are not frozen or mutated.

The private generator label is h, or h1 when the base variable is h. Names never establish ownership. Existing admission may orient the generator as exp(-r) rather than exp(r); the single-argument alias exponent is exactly +1 or -1. Verify the argument reconstruction and alias before using it. Additive constants in r remain explicit: exp(x+1) and exp(x) are different supplied constructions even though their RDE coefficients agree.

## Algorithm and positive verification

1. Validate the base owner and normalized b/r. Return unsupported for constant r.
2. Reuse `buildExponential` for the single original argument r; obtain a certified extension and its alias for exp(r).
3. Differentiate the original r with checked evidence; solve u'+r'u=b using `solveRationalRde`.
4. Replay that complete RDE certificate against the exact derivative and b. A positive result must have an empty homogeneous basis.
5. Construct the exact extension-field elements b exp(r) and, for a positive result, u exp(r). Check the coefficient against the RDE particular solution and check assembly.
6. Independently replay the primitive derivative using dual numbers and require exact equality with the assembled integrand.

The returned representative has integration constant zero. A nonzero rational homogeneous coefficient would give h'/h=-r', contradicting the admission obstruction. Thus u is unique; the empty basis check is a required invariant, not a reason to discard solutions from an arbitrary RDE.

## Negative authority: mathematical proof and executable hypotheses

The rule `rational-exponential-liouville-v1` denotes a fixed mathematical implication whose hypotheses are verified for every decision. It is not a serialized trust flag or an assertion checked only by name. The argument uses [Bronstein's exponential reduction, §3.6 and differential-algebra framework §3.1](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf). This specification supplies the single-product specialization and constant-descent argument.

### Exponential admission over complex constants

Let K=C(x) and T=exp(r), where r is nonconstant rational with rational coefficients. For every nonzero integer n and nonzero v in C(x), n r' cannot equal v'/v:

- If r is polynomial, n r' is a nonzero polynomial. A rational logarithmic derivative has no polynomial part.
- Otherwise, r has a finite pole of order m>=1, and n r' has a pole of order m+1>=2. A rational logarithmic derivative has only simple finite poles.

The existing admission checks this obstruction through the normalized argument, its independent derivative, and either its polynomial part or verified denominator multiplicity and coprimality. The pole-order facts hold over C as well as Q. The standard exponential-monomial criterion consequently gives T transcendental and Const(C(x,T))=C. Equivalently, algebraicity would produce an excluded logarithmic-derivative relation by taking a norm. No representation or computation of arbitrary complex constants is required.

### Necessity of a rational coefficient in C(x)

Suppose bT has an elementary primitive. Apply Liouville's theorem over the algebraically closed constant field C. Trace/norm descent from any finite algebraic extension puts its derivative in the form

`bT = D(v) + sum c_i D(w_i)/w_i`, with v,w_i in C(x,T) and c_i in C.

At T=infinity, write the polynomial part of v as sum u_j T^j. Because D(T)=r'T, differentiation preserves a proper rational function in T. Therefore the coefficient of T in D(v) is u_1'+r'u_1.

For a nonzero rational w in T, write its leading expansion as `c T^m (1+O(T^-1))`. Its logarithmic derivative is `c'/c + m r' + O(T^-1)`, which has no positive T power. Taking the coefficient of T in Liouville's identity gives `u_1'+r'u_1=b`, with u_1 in C(x).

This coefficient argument uses T=exp(r), the original requested exponential. If the owned canonical generator is exp(-r), the verified inverse alias is an exact change of generator; it does not alter the argument. Conversely, any rational solution u immediately gives the elementary primitive uT by the product rule.

### Descent from C(x) to Q(x), and the negative witness

The existing RDE certificate proves a universal denominator U and numerator-degree bound N using local pole orders and the leading behavior at infinity. These arguments remain valid for solutions in C(x): all finite pole locations lie among the roots of the rational leading coefficient, root multiplicities and integer pole orders are unchanged, and the verified resultant/GCD partitions cover every complex root without requiring it to be rational. Infinity resonances are roots of the same rational linear polynomial.

Thus every complex-rational solution is P/U with deg(P)<=N. Its coefficients solve precisely the stored finite linear system M p=c over Q. If that system has a solution over C, Gaussian elimination over Q also yields a solution over Q. In the negative case, its verified rational witness y satisfies y^T M=0 and y^T c!=0. These identities remain true in C, excluding a complex solution as well.

Combining these facts proves elementary integrability iff a rational RDE solution exists. The executable verifier checks the original exponent/alias, admission, derivative, exact RDE target, both complete bounds, matrix construction and inconsistency witness before returning non-elementary. It never interprets unsupported input, resource failure or an unrelated RDE failure as non-elementarity.

These are documented mathematical theorems with checked algebraic hypotheses and certificates; the implementation is not a proof-assistant formalization of Liouville's theorem. No assertion is made about inputs outside the declared class or about special-function representations of a non-elementary integral.

## Conditions and saved evidence

Keep exactly three provenance-bearing fields: normalized coefficient denominator, normalized exponent denominator, and positive-result rational primitive-coefficient denominator (null for a negative result). Preserve them for zero coefficients and cancellation. Exponential nonvanishing comes from its construction: the inverse-generator alias does not create a new x-domain restriction. The RDE universal denominator and other proof intermediates are not source exclusions. Pre-normalization exclusions require later expression lowering.

The version-1 envelope contains outcome, reduction rule, a complete differential artifact, a complete rational-RDE artifact and exact conditions. The differential artifact's fixed element slots are b,r,alias,integrand, followed by u,primitive for elementary results; derivative slots are r' evidence and, for elementary results, final primitive evidence. Decode requires exactly those counts. This records the full mathematical values without serializing context objects, callbacks or trusted success flags.

The existing differential decoder now has a shared reconstruction helper and a private `decodeDifferentialArtifactOverBase` composition entry point. The existing decoder interface still rebuilds a completely fresh expected tower. The new path accepts exactly one extension above the caller's Q(x), validates and binds its Q/Q(x) descriptors, then reconstructs a fresh extension from stored admission evidence. Hyperexponential verification binds that extension to the actual expected exponent. All existing formats and expected-construction checks are preserved.

Decode first bounds and inspects the entire envelope, then replays the nested codecs. Base inputs are compared against the expected b/r; the RDE target is reconstructed from the stored, checked derivative; original exponent identity is checked separately. After replay, the complete decision verifier runs again. Producer-disabled tests cover integration, admission, differentiation, RDE solving, integer-root search, denominator/degree/matrix construction and linear solving. Unknown fields, malformed/noncanonical numbers and fractions, missing/duplicated evidence, altered conditions, cyclic/forward references, accessors and incompatible owners are rejected.

## Resources, verification and handoff

Construction, all arithmetic, proof replay and codecs share one supplied execution context. External operations start fresh proof state. The entire envelope is subject to the supplied traversal bounds, even if each nested artifact would separately fit. Exhaustion is sticky and no partial mathematical success escapes.

Initial test profile: work 20,000,000,000; cumulative allocation 1,000,000,000,000; integer bits 2,048; degree 256. Differential/artifact bounds: tower height 8, depth 64, nodes 100,000, bytes 16 MiB. These adjustable safeguards are not application defaults or measurements of free RAM. No hidden algorithmic degree cap or performance acceptance threshold is introduced.

The milestone dossier records 306 verified core tests (240 retained + 66 new), final checks and serial elapsed/work/allocation observations. The full 304-test run is complemented by the final 107-test affected-field/codec/isolation run after two added cases. Acceptance retains the prior 240 core tests and adds exact positive/negative fixtures, rational coefficients/exponents, zero inputs, shifts, inverse aliases, seeded identities, mutations, producer-disabled replay and stage-specific resource failures. No Playwright gate applies: no application caller or visible behavior changes. Full repository lint/build are required for the subsequently authorized milestone commit; see the dossier.

Outcome: **verified elementary-integrability decisions for a single rational coefficient times the exponential of a nonconstant rational function**. A following gate may combine finite powers of a common exponential, using rational-part integration and full term coverage. That expansion and application adoption are not implemented here; the broader roadmap remains subject to change when necessary.

The user-requested arithmetic comparison finds exp(-x) currently costs about 8.78x the median full-run time of exp(x), with 7.22x work units on the matched fixture. The documented inverse-generator representation exercises general recursive fraction arithmetic. A separately planned performance gate is recommended before finite sums; this milestone preserves verification and does not implement that optimization.
