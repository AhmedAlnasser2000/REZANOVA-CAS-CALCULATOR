# INTEGRATION-EXPONENTIAL-SUM-DECISION1

Date: 2026-09-30
Gate: backend; CRITICAL, root-only.
Status: backend complete and verified; user authorized the milestone commit. Evidence is in the milestone dossier.

## Outcome and supported class

For an explicitly owned Q(x), D(x)=1, decide elementary integrability of

`b0 + sum_j bj exp(rj)`, with every bj,rj in Q(x),

when all surviving nonconstant arguments are rational multiples of one common argument. Exact grouping and cancellation precede family admission. Empty, zero and pure rational inputs are accepted. Input terms remain ordered in the saved request; they need not be sorted or distinct.

The return is a checked elementary primitive, a checked non-elementarity certificate, or a precise unsupported input-boundary reason. Exhaustion is no decision. A negative result is not a statement about special-function representability.

Production changes stay in the private integration core. Existing single-product admission/decision, arithmetic, public results, application routes and codecs are unchanged. No dependencies or UI adoption. The user subsequently authorized committing the completed milestone; no push. Independent exponential families, nonzero constant extensions, arbitrary denominators in exponentials and nested towers remain subsequent work.

Prerequisites are the certified first-level exponential batch builder, complete rational RDE solver, exact native fractions, independent dual-number derivative checker, rational Hermite/LRT decisions and bounded artifact codecs. This gate composes those primitives and adds sum coverage and an explicit rational-representation bridge.

## Normalization and coverage

The input contains `rationalPart` and `terms: {coefficient, argument}[]`, all elements owned by the supplied differential Q(x). Validate every element before cancellation, including zero-coefficient terms. Copy containers without freezing or mutating caller data.

Group exactly equal normalized arguments in first-occurrence order. Each group stores its argument, ordered original indices and summed coefficient, including groups whose sum vanishes. Replay verifies index range, strict order, disjointness, complete coverage, pairwise distinct group arguments, equality with original arguments and the reconstructed coefficient sum. It checks the stored partition; it does not rerun the producing grouping search.

Zero arguments contribute their coefficient to the rational part. Zero coefficients disappear from the active set. Only then reject surviving nonzero constant arguments (`constant-exponent`) or arguments outside the rational-multiple class (`not-rational-multiples`). Thus exp(x²)-exp(x²)+exp(x) succeeds; exp(1)-exp(1) cancels exactly; a surviving exp(1) remains unsupported. Original denominator conditions survive these cancellations.

Admit all active group arguments together. The existing batch admission proves `rj = kj s`, integer kj with GCD one, positive-leading-numerator orientation for s, transcendence and constant-field preservation. Additive constants are retained: x+1 and 2x+2 form a family, while x and x+1 do not. The generator label is h, or h1 when the integration variable is h. Names do not confer ownership.

Components reference active groups, carry signed BigInt exponents and checked aliases t^k, and are sorted by increasing signed exponent. The verifier binds admission arguments to the active groups, proves every component appears once, and checks every alias in the same field. It reconstructs the complete normalized integrand `c0 + sum ck t^k`. No separate Laurent arithmetic representation is introduced.

## Algorithm and positive verification

For each nonzero component in sorted order, solve `u' + k s' u = ck` using the complete rational RDE procedure. Replay the exact target and full certificate. A successful coefficient has an empty homogeneous basis: any nonzero homogeneous rational solution would contradict the admitted exponential obstruction for the nonzero integer k.

Stop at the first checked negative RDE decision. A negative artifact contains the successful prefix followed by precisely one obstruction, with all later components explicitly unsolved through their presence in the complete component list. It contains no rational primitive or incomplete overall primitive. Verification rejects omitted prefix decisions, missing input components, reordered powers, extra solved evidence or a positive result without all components solved.

After all components succeed, integrate c0 using the existing rational procedure. Even c0=0 has a complete rational decision. The rational primitive domain uses the supplied base variable and deterministic residue variable z (z1 if the base variable is z).

### Explicit rational bridge

Differential Q(x) uses coefficients wrapped in owned differential-Q elements. The rational integrator uses Rational coefficients directly. The bridge receives both concrete owners, validates their inputs, copies the exact scalar coefficients into the destination's native constructors and compares every normalized numerator/denominator coefficient afterward. The inverse bridge performs the symmetric checks. This preserves normalized mathematical values without using display text or inferring an embedding from equal variable names. A fresh same-named polynomial owner cannot consume a foreign native fraction.

### Combined primitive

The primitive contains the complete rational decision and the exponential field element `sum uk t^k`. It also stores the independently checked derivative of the latter and the assembled derivative. Root-log terms are retained in the rational formal primitive; they are not falsely embedded in Q(x)(t).

Replay verifies all component RDEs, reconstructs the exponential primitive from their particular solutions, checks its derivative by the existing dual-number verifier, replays the rational decision/trace derivative, converts that rational derivative through the bridge and checks their sum equals the complete normalized integrand. The representative has zero integration constant. Rational root-log semantics remain local complex logarithms, with local choices differing by constants.

## Completeness and negative authority

The fixed rule `rational-exponential-sum-liouville-v1` names the following documented theorem. It is not a serialized trusted assertion. The verifier checks every concrete hypothesis and the complete obstruction certificate.

Let K=C(x) and t=exp(s), where s is nonconstant rational with rational coefficients. For every nonzero integer n and v in K*, `n s' != v'/v`: if s has a finite pole, s' has a pole of order at least two, whereas a rational logarithmic derivative has only simple poles; if s is polynomial, s' has a nonzero polynomial part, whereas a rational logarithmic derivative has none. The checked admission supplies this obstruction. The exponential-monomial criterion gives transcendence of t and constants C for K(t).

Suppose the Laurent polynomial `f=c0+sum ck t^k` has an elementary primitive. Liouville's theorem and trace/norm descent put its derivative in the form

`f = D(v) + sum ai D(wi)/wi`, with v,wi in K(t) and ai in C.

At t=infinity, the polynomial part of v contains its positive powers. Differentiation with D(t)=s't preserves strictly proper terms at infinity. For a rational wi, the expansion `wi=a t^m(1+O(t^-1))` shows `D(wi)/wi = a'/a + m s' + O(t^-1)`, with no positive powers. Thus, for every k>0, comparison gives `uk'+k s' uk=ck`, uk in C(x).

At t=0, split off the finite negative-power principal part of v. Differentiation preserves the part regular at zero, since D(t)=s't. A rational wi has expansion `a t^m(1+O(t))`; its logarithmic derivative is regular at zero. Comparison of each k<0 therefore gives the same rational RDE. This proves that positive and negative powers cannot cancel one another's obstruction. Repeated equal arguments must first be grouped, because they are the same power, not independent components.

The rational c0 always has an elementary primitive, represented by the existing exact root-log construction. Conversely, rational solutions uk for every nonzero component and a primitive for c0 construct an elementary primitive for f directly.

The existing RDE universal-denominator and infinity-degree proofs remain valid for rational solutions over C(x). Their polynomial coefficients and finite linear system lie in Q. A complex solution to that system implies a rational solution by elimination over Q. A checked rational inconsistency witness y, with y^T M=0 and y^T b != 0, remains contradictory over C. Thus rational RDE failure with complete bounds proves elementary non-integrability, not just failure of a rational-coefficient ansatz.

This is the one-family Laurent specialization of [Bronstein's tutorial, §3.6](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf), together with the existing single-product constant-descent proof. The implementation is not a proof-assistant formalization of Liouville's theorem. Unsupported families, failed checks and resource exhaustion have no negative authority.

## Conditions and replay

Condition entries are exact base-owned polynomial elements with category and index provenance. In order: original rational denominator; each original coefficient/argument denominator; normalized rational denominator; and on success, rational primitive denominator, all root-log norms and every exponential primitive-coefficient denominator. Constant restrictions remain in backend evidence. Canceled terms keep their normalized input restrictions. Exponential nonvanishing introduces no extra exclusion; the RDE universal denominator is only a proof device. Exclusions lost before normalized backend input remain a later lowering responsibility.

Private entry points:

- `integrateExponentialSum(ctx, owner, input, bounds)`.
- `verifyExponentialSumDecision(ctx, owner, input, decision, bounds)`.
- `encodeExponentialSumDecision(ctx, owner, input, decision, bounds)`.
- `decodeExponentialSumDecision(ctx, owner, input, artifact, bounds)`.

The separately tagged `exponential-sum-decision`, version 1 envelope contains original input, normalization groups, ordered component metadata, solved RDE prefix, optional field construction, rational decision on success and retained conditions. Integer exponents and exact coefficient integers use canonical strings. It contains no contexts, callbacks or trusted verification flags.

With an exponential field, the unchanged differential artifact holds aliases in component order, then the assembled integrand, and for a positive outcome the exponential primitive and assembled derivative. Its derivative selection contains exactly the primitive derivative on success, otherwise none. The existing differential decoder binds to the expected base and reconstructs a fresh certified extension. Pure rational decisions instead carry base-owned exact values and derivative evidence without inventing a field extension. Existing RDE/rational artifact formats are nested unchanged.

Decoding bounds the entire envelope before property traversal, compares all original ordered inputs, checks normalization coverage and binds exact targets for nested codecs. The final sum verifier replays the complete decision. No integration, grouping-search, admission, differentiation or RDE producers run during replay. Missing/duplicate evidence, wrong targets, altered construction, mutable tampering, malformed records and oversized data fail closed.

## Resource and completion contract

All work shares the supplied ExecutionContext. Each external entry starts a fresh operation. Existing nested public APIs may start their own fresh proof scopes, preserving existing semantics. No new proof cache is introduced. Grouping/equality work, scans, storage, sorting, exact powers, normalization and verification are charged. Required powers remain BigInts until checked against finite degree limits; no index truncation or hidden degree cap is allowed.

Test profile: work 20 billion; cumulative allocation 1 trillion; integer bits 2,048; degree 256; tower height 8; artifact depth 64, nodes 100,000, bytes 16 MiB. These are explicit adjustable safeguards, not free-RAM measurements or application defaults.

The opt-in `__tests__/exponential-sum-measurements.ts` harness records eight representative cases and normalization/integration/verification/encoding/decoding separately, one warm-up and three measured runs, fresh contexts, serial execution, with elapsed time, work/allocation, RSS and heap observations. Fixture creation, JSON parsing and file I/O are outside timed operations. There is no speed acceptance target.

Acceptance retains 323 tests and adds positive/negative/cancellation/ownership/condition/replay/resource cases, including producer-disabled artifacts. Required checks: focused core with two workers, incremental TypeScript, scoped lint, isolation, OOE/compartments, memory, file sizes and diff hygiene. No Playwright applies because app behavior is unchanged. Repository lint/build are required for the subsequently authorized commit. Final counts, timings and commit posture live in the milestone dossier.

Outcome: **verified elementary-integrability decisions for finite sums in one rational exponential family, with cancellation-aware normalization and replayable positive/negative evidence**. Broader families, rational expressions in the exponential generator and public adoption require separately reviewed gates. Roadmap sequencing remains subject to change when necessary.
