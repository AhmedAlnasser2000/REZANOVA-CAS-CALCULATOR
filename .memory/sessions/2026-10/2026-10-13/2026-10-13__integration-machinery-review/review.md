# Integration machinery handoff: repository and mathematical review

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- attribution_basis: mixed
- Handoff provenance: user-supplied Claude Code.pdf, 20 pages, read in full including rendered pages. Claude's proposals and reported decisions are review inputs, not independently granted implementation authority.
- Repository baseline: fb0f3436, INTEGRATION-ALGEBRAIC-DECISION1 Gate B. Review performed root-only. No implementation, benchmark restart, commit or push.

## Assessment and limits

The performance problem is real. The handoff identifies useful advanced algorithms and unnecessary proof/serialization work. It is not ready to implement verbatim: its admission argument is false over the stated number-field constants, its constant-extension example exceeds the available machinery, some code claims are stale at the very commit it cites, and its mixed-field argument proves much less than a complete integration algorithm.

This is a targeted source/code/mathematics review, not a new proof of every implementation path or a performance rerun. Source inspection identifies repeated work; it does not quantify its share of elapsed time. The stopped benchmark remains stopped. Existing completion records are not replaced by this review, and existing performance limitations are not evidence that their mathematical answers are wrong.

The useful direction is complete mathematical algorithms with smaller independently checkable certificates. Exact genus-specific algorithms with certified applicability and complete general coverage do not recreate the old engine's failure on unrecognized expression templates.

## 1. Measurements and current code

All times below come from retained repository artifacts, not fresh measurements.

| Fixture | Construction | Integration/reduction | Standalone verification | Encode | Decode | Qualification |
|---|---:|---:|---:|---:|---:|---|
| Schultz dependent residues | included in total | 341.940 s | 39.952 s | 254.068 s | 208.202 s | Single completed acceptance; another 38.726 s replay verification; 884.19 s whole test |
| Order-29 integral | included in total | 506.665 s | 51.598 s | 279.008 s | 218.527 s | Single completed acceptance; another 48.061 s replay verification; 1105.96 s whole test |
| Height eight, input 1 | 32.577 s | 4.675 s | 3.245 s | 8.044 s | 51.639 s | Earlier transcendental snapshot, medians after two warm-ups/five samples; not a fresh fb0f3436 benchmark |
| Cubic, y^3-y-x=0 | separate setup | 39.909 s reduction | 6.424 s | 26.563 s | 19.406 s | Gate A historical medians; exact-differential solve separately 14.897 s |

The earlier divisor dossier also records elliptic order-two torsion at 25.716 s median. Schultz and order-29 artifacts are 880,899 and 998,448 bytes. Their sampled RSS observations reached approximately 1.16 GB and 1.92 GB respectively; these observations are not continuous peak-memory profiles.

The height-eight fixture deliberately constructs seven exponential generators, exp(x), ..., exp(x^7), then integrates 1. It exposes expensive field construction/replay; it does not establish that ordinary app input 1 constructs that tower. The historical snapshot predates final transcendental accounting/bridge changes.

Evidence files:

- `../2026-10-13__integration-algebraic-decision1/gate-b-dependent-residue-observation.json`
- `../2026-10-13__integration-algebraic-decision1/gate-b-order29-observation.json`
- `../2026-10-13__integration-algebraic-decision1/gate-b-measurements-stop.json`
- `../2026-10-13__integration-algebraic-decision1/gate-b-performance-results.md`
- `.memory/sessions/2026-10/2026-10-12/2026-10-12__integration-transcendental-decision1/performance-results.md`

Repository findings, under `src/lib/symbolic-engine/integration/core/` unless stated otherwise:

| Handoff claim | Finding |
|---|---|
| Admission repeatedly solves subsidiary problems and verifies large tower evidence | Confirmed. `recursive-differential-admission.ts` uses the complete subsidiary procedures. `recursive-certified-tower.ts:30` verifies, codec-round-trips, and verifies the retained admission again. |
| Encoding does substantial verification work | Confirmed. `algebraic-arithmetic-wire.ts:20` verifies, encodes, packs/unpacks, and freshly decodes curve/proof evidence to collect exact-arithmetic replay coverage. Removing this requires another sound way to retain that coverage. |
| Scoped caching has repeated traversal and a 128-entry reset | Confirmed in `scoped-proof.ts`. Its actual contribution to elapsed time was not profiled. |
| Linear certificates retain/replay elementary row operations | Confirmed in `arithmetic-linear.ts`. Smaller rank/nullspace certificates are a legitimate alternative. |
| There is no modular GCD | False at fb0f3436. `rational-modular-gcd.ts` already implements checked modular rational GCD, also covering degree-one number-field wrappers. |
| The failing number-field pseudo-division path remains the explanation for the completed Schultz run | Stale. `number-field-polynomial-gcd.ts:17` already uses monic exact Euclidean steps for genuine number fields in its evidence scope. Broader modular number-field GCD remains an opportunity. Brown resultant/subresultant scaling is a different contract. |
| Solver and independent verifier still need to be separated | They already have separate producer/verifier entry points and producer-disabled replay tests. The needed improvement is certificate size, repeated setup and verifier work, rather than first introducing independence. |
| A shared-data graph already makes depth irrelevant | It does not. `recursive-artifact-graph.ts` shares objects, but its traversal and native `differential-wire.ts` value codecs are still recursive. |

`src/lib/new-equation/runtime.ts` and `src/app/new-equation/NewEquationAnswer.tsx` confirm an unchecked preview followed by verification. After the initial audit, the user explicitly requires the same answer lifecycle for Integration: display the computed answer before independent final verification. This behavior is now a requirement, while its implementation still needs a reviewed runtime/adoption plan. A bounded Playwright inspection of the existing app confirmed the preview, verified and verification-stopped displays; final-message delivery was held to make the brief preview inspectable, so this is not a latency measurement.

## 2. Smaller certificates: sound direction, explicit trust boundary

For an elementary answer, a well-formed primitive plus its independently checked derivative equal to the explicit input can establish correctness without retaining every search step. Owner/field certification, exact root bindings, quotient units, relative-trace normalization and retained conditions still require verification. A derivative check over a large field or large expression is not automatically cheap.

For negatives, a compact witness must still establish the completeness premise. An inconsistent matrix alone is insufficient if the degree bound, candidate space or coefficient coverage is unproved. In particular, the infinity obstruction needs complete Riemann–Roch space/constraint evidence, not just a list of local orders. The nonzero holomorphic obstruction requires complete pole coverage and the applicable Liouville theorem.

Useful exact replacements include:

- Linear systems: particular solution or inconsistency row, a complete independent nullspace basis, and rank evidence such as a nonsingular minor. Handle zero rows/columns explicitly.
- Polynomial modules: transformation and inverse identities plus polynomial-ring membership and the required normal-form shape. A matrix identity alone does not establish the claimed normal form.
- GCD: divisibility and a checked Bézout or suitable modular degree witness.
- Principal divisors: complete valuations/support of a factored function witness, without expanding large powers.

First improve reuse within the enclosing operation. A persistent, cross-operation sealed-proof cache changes the approved fresh-state/accounting policy. It requires explicit ownership, immutable keys, rule/version binding, bounds and retained-memory accounting, and cold replay tests. The handoff is not approval for that change.

## 3. Admission: a concrete error in the proposed proof

Section B.3 allows a certified number field C and asserts that all admitted logarithmic/exponential rates are C-linearly independent. This is false.

Take C=Q(sqrt(2)) and K=C(x)(t,u), with t=exp(x) and u=exp(sqrt(2)x). These two exponential generators are algebraically independent over C(x) and preserve C: their exponent slopes have no nonzero rational relation. Nevertheless their logarithmic derivatives are 1 and sqrt(2), which are C-linearly dependent.

For a proposed exp((1+sqrt(2))x)=tu, the rate equation has the rational solution (1,1). It also has the C-valued solution (1+sqrt(2),0). Thus solving over C, taking one representative and testing whether its coordinates are rational can reject an existing rational relation. The claimed uniqueness is unavailable.

This counterexample concerns the handoff's stated number-field scope; it does not by itself refute a separately proved Q-only shortcut. Nor does it refute the Risch structure theorems. [Rothstein–Caviness](https://epubs.siam.org/doi/10.1137/0208028) establishes structure/dependency machinery, but the handoff explicitly labels its exact reduction as its own. The accessible abstract does not validate that reduction; the full statement must be obtained or proved before replacing admission.

A possible repair is to formulate the complete rational relation problem using effective coordinates over Q, rather than assuming independence over C. Its equivalence to the full admission criteria, construction restrictions and constant hypotheses remains a proof obligation. Keep the existing complete subsidiary algorithms until that proof and replay evidence are established.

There is a second boundary error: exp(x+3)=e^3 exp(x) needs a transcendental constant e^3. Existing hidden-constant machinery constructs finite algebraic extensions of Q; it cannot represent e^3. A checked invariant with derivative zero does not determine its value. Source normalization therefore needs an explicit effective constant-domain policy.

Likewise, log(x^2)=2log(x) is not an unrestricted branch-independent identity. Radical/exponential aliases need an explicit root embedding or branch convention. Supplied owners and original constructions cannot silently be replaced.

The [official FriCAS status note](https://wiki.fricas.org/RischImplementationStatus?root=Symbolic+Integration) discusses the unresolved general constant/preprocessing problem. The page is old and is not a current source-code audit. Neither it nor this review proves the handoff's blanket claim that no other complete implementation exists anywhere.

## 4. Extra-prime non-torsion certificate: valid derived improvement

Assume an explicitly verified Jacobian/divisor-class specialization at good reductions in different residue characteristics p and q. Let the exact reduced orders be m_p and m_q. If the characteristic-zero class has finite order N, prime-to-characteristic torsion injectivity gives N/m_p a p-power and N/m_q a q-power. Consequently N=lcm(m_p,m_q)=M.

If a further certified good reduction has [M]D nonzero, then [M]D was nonzero in characteristic zero, proving non-torsion. This avoids characteristic-zero nonprincipality in that negative certificate.

For termination on a non-torsion input, spread the abelian variety and the nonzero section [M]D over a suitable open subset of the number-field integer spectrum. Its equalizer with the zero section is a proper closed subset, hence only finitely many prime ideals. Deterministic enumeration of good reductions eventually supplies a witness. This is a derived argument using good-reduction theory, not a theorem quoted verbatim from the handoff's sources; see [Milne's abelian-variety notes](https://www.jmilne.org/math/CourseNotes/AV.pdf) for the background.

It does not terminate as a negative search when [M]D=0. A complete decision still needs its positive principality/function construction, or a rigorously accounted interleaving with it. The short finite-field obstruction also depends on checked characteristic-zero models, reduction maps, exact reduced orders and good-reduction hypotheses. Those setup obligations do not disappear.

## 5. Exact algebraic algorithms worth adding

### Genus zero

[Van Hoeij's author summary](https://www.math.fsu.edu/~hoeij/papers/comments/jsc1997a.html) supports the conic/parametrization approach, with a constant extension of degree at most two when required. A checked parametrization transforms a genus-zero problem into rational integration over its actual constant field.

That last phrase matters: the existing rational decision API is over Q(x). A conic over a number field, or over a quadratic extension of that field, requires a complete rational-integration bridge over those constants plus trace/descent. It is not a direct call to the existing Q-only procedure. Preserve all conversion, derivative and condition evidence.

### Genus one

Checked conversion to an elliptic curve, group arithmetic and Miller functions are strong candidates. For number fields of degree one, two and three, the possible point orders listed in the handoff are consistent with the standard classifications; the cubic list is explicitly confirmed by [Derickx–Etropolski–van Hoeij–Morrow–Zureick-Brown](https://arxiv.org/pdf/2007.13929).

For these degrees, a good residue characteristic p>21 preserves the entire order of a torsion point. An exact reduced order outside the allowed list proves non-torsion; an allowed order m can be tested by computing [m]P in characteristic zero. Higher-degree constants still need a general complete procedure. Schultz's relevant divisor construction involves Q(sqrt(2)), so using only the rational-field torsion theorem would be insufficient.

Miller produces a function for a point-class multiple. For an arbitrary supplied divisor D, also retain the principal correction transporting D to the chosen point representative. A genus-one curve without the required rational base point needs the general divisor machinery or checked extension/descent.

### Hyperelliptic curves and Pell

Cantor-style arithmetic and [balanced divisor arithmetic](https://www.math.auckland.ac.nz/~sgal018/ANTS08.pdf) are suitable exact methods; even-degree models, rational versus conjugate infinite places and the paper's hypotheses must be handled explicitly.

The Pell argument is valid for a smooth square-free curve y^2=d(x) of degree 2h with split infinite places. A nonconstant affine unit U=P+Qy with P^2-dQ^2=c nonzero has deg(P)=h+deg(Q)=N. At one infinity it has pole order N; its conjugate product c forces zero order N at the other. Therefore div(U)=plus or minus N(infinity-minus - infinity-plus).

Conversely, a function with that divisor is an affine unit and has such a polynomial representation. The least principal multiple equals the smallest possible degree of P, not the continued-fraction period length. This applies directly to the order-29 fixture, whose retained witness has degrees 29 and 26. Infinity labeling, norm, minimality and convergent coverage remain certificate obligations. The broader Pell/torsion relationship is discussed by [Kollar](https://arxiv.org/abs/1906.08818) and [Platonov](https://www.mathnet.ru/php/archive.phtml?jrnid=rm&option_lang=eng&paperid=9563&wshow=paper).

### General arithmetic, integral bases, Riemann–Roch and lazy reduction

- [Van Hoeij–Monagan](https://www.cecm.sfu.ca/CAG/papers/hoeijmon.pdf) provides modular GCD machinery over multiple number-field extensions. Extend the existing checked rational modular path; do not describe it as absent.
- Modular resultants, reconstruction and exact linear algebra are worth profiling. [Dixon's method](https://link.springer.com/article/10.1007/BF01459082) for regular rational systems does not alone supply complete rank-deficient affine families: retain rank/nullspace coverage.
- [Bohm–Decker–Laplagne–Pfister](https://arxiv.org/abs/1505.05054) uses localization, Hensel lifting and truncated Puiseux data for integral bases. This is a substantive alternative, not a timing guarantee.
- [Le Gluher–Spaenlehauer](https://arxiv.org/abs/1811.08237) treats nodal plane models. [Abelard–Berardini–Couvreur–Lecerf](https://www.sciencedirect.com/science/article/abs/pii/S0885064X22000310) extends the setting but has input/model hypotheses. Do not drop the general Hess path on the basis of an operation-count theorem for a restricted presentation.
- [Chen–Du–Kauers](https://arxiv.org/html/2102.06538v2) supports lazy Hermite and polynomial reduction. Its in-field exactness/reduction result is not by itself the full logarithmic Liouville decision. Avoid computing a full integral basis where unnecessary, while retaining it for constant-field/divisor operations that still need it.

These are complete algorithm choices under checked applicability, not permission to introduce guessed degree bounds or unsupported negatives. Their relative payoff needs bounded profiling across multiple fixtures.

## 6. Mixed fields: promising subsidiary argument, incomplete architecture

The proposed characteristic-zero specialization argument can support torsion recognition. In a smooth proper family with an abelian scheme over a connected good base, N-torsion is finite etale in characteristic zero. A torsion section preserves its order in a good fiber. A specialized infinite-order class excludes generic torsion; a finite specialized order is only a candidate until a generic principal-multiple test succeeds.

Implementing that argument requires explicit models, extension of the divisor class, smoothness, constant embeddings, parameter specialization, and complete principality over the remaining function field. Searching suitable specializations also needs an existence/termination proof for the chosen presentation. It is not legitimate to specialize the actual curve variable away.

More fundamentally, algebraic-over-transcendental integration has a derivation acting nontrivially on the coefficient field. Replacing it by ordinary differentiation in the displayed curve coordinate changes the problem. Current pure algebraic geometry assumes constants under D. Mixed reduction needs proved normal/special behavior, residues, recursive RDE and limited integration, logarithmic relations, constant preservation and all exceptional cancellation bounds over the mixed parent.

Thus alternating the current transcendental and algebraic entry points is not an established complete mixed algorithm. Build and verify the missing mixed subsidiary infrastructure before decision assembly. Preserve both tower orders and supplied owners.

Source correction: [Blake's mixed-tower paper, September 22 v3](https://arxiv.org/html/2609.13643v3), contains proved structural statements and bounds for some cases, alongside unresolved cases. Calling the entire work guessed-bound heuristics is inaccurate; treating it as a complete general algorithm is also unsupported. Individual proved components can be considered after matching their hypotheses. The [Charlwood benchmark paper](https://arxiv.org/abs/2609.25616) explicitly makes its remaining negative conditional on a completeness hypothesis; that negative is not an independent acceptance oracle.

[Chen–Kauers–Li–Li–Masser's Weierstrass-like work](https://arxiv.org/abs/2602.06873) concerns a further class of differential extensions. It does not automatically complete the present mixed elementary scope.

## 7. Proposed sequencing, not an approved implementation plan

1. **Proof/certificate and replay performance.** Reduce retained search history, tower round trips and encode/decode duplication; preserve explicit-request verification, source conditions and cold replay. Establish separate setup/solve/verify/codec costs from the saved corpus before authorizing further long runs.
2. **Construction-height repair.** Remove the fixed mathematical shape ceiling through charged, stack-safe owner/value/proof traversal and graph codecs. Keep cycle rejection and work/allocation/bit/degree/artifact limits. Merely raising eight or using input height while leaving recursive codecs unchanged is insufficient. Develop any structure-theorem admission optimization under a separately checked proof, including effective constant fields.
3. **Exact arithmetic and geometric performance.** Prioritize modular number-field arithmetic and the elliptic/hyperelliptic/Pell machinery where the fixtures justify them. Add genus-zero constant-field bridges and improved general reduction/Riemann–Roch methods with checked hypotheses. Keep complete fallback coverage rather than an expression-template catalogue.
4. **Mixed-field prerequisites, then mixed decisions.** Review the two tower orders against the required differential algorithms and actual constants. Split prerequisite gates if necessary; do not hide an unproved general algorithm behind composition glue.
5. **Source normalization and broader adoption.** Decide dependency/alias/branch and effective constant handling, then result projection, persistence/replay and runtime adoption. Trig support remains intentionally deferred unless the user chooses to add that input class. The user subsequently requires immediate computed-answer display followed by independent verification, matching New Equation. Cross-operation proof caching remains a separate unresolved policy choice.

User clarification, 2026-10-13: the solver/verifier split is a required temporal boundary. The solver must expose its completed candidate before final verification and artifact work; a UI badge after an already verified synchronous solver would not satisfy it. Preserve necessary arithmetic/construction checks, complete solving algorithms, explicit unchecked status, and final verified authority. Verification success upgrades the answer; failure withdraws it; cancellation/exhaustion leaves it explicitly unchecked. Measure candidate latency separately. This clarifies scope and does not start implementation.

The proposed subsecond and 60-second goals are aspirations, not measured guarantees or universal completeness thresholds. Verification at at most ten percent of solve time is not a mathematical invariant. Use several named fixtures, cold/warm distinctions, recorded machine details and resource counters; report regressions and stops honestly. Performance work remains broader than Schultz/order-29.

No new roadmap gate is activated by this document. The approved current algorithms retain their authority and boundaries until a reviewed replacement passes its proof and regression gates. General special-function answers remain separate future work, consistent with the user's objective: within an effectively supported elementary class, return the primitive or a proof of elementary non-integrability; never substitute exhaustion or unrecognized syntax for that proof.

## 8. Source-audit coverage

- Full handoff: extracted text and all rendered pages inspected.
- Substantive paper sections inspected: Chen–Du–Kauers lazy reduction, van Hoeij–Monagan modular GCD, cubic torsion theorem, balanced hyperelliptic arithmetic, Blake mixed-tower v3 statements/limitations, Bronstein tutorial and Milne good-reduction background.
- Author/publisher metadata or abstracts checked, not every proof: Rothstein–Caviness, van Hoeij genus-zero/integral-basis publications, Bohm et al., Le Gluher–Spaenlehauer, Abelard et al., Dixon, Kollar, Platonov, Blake companion papers, Weierstrass-like extensions, Cherry and Raab. Rothstein–Caviness full text was not available through the inspected publisher page.
- The exact Bronstein book statement requested by B.3 was not independently verified from full chapter text. Classical Mazur/Cantor/Miller results were corroborated bibliographically and through later primary sources, not subjected to a new full proof audit. Rioboo/real-form output was not reviewed sufficiently to approve an implementation.
- The four handoff-derived arguments were assessed separately: admission rejected as stated; extra-prime non-torsion and the qualified Pell degree identity supported by the derivations above; specialization supported only under the explicit family hypotheses and only as subsidiary machinery.

No literature search establishes that a complete competing implementation does not exist. No wall-clock target is justified by paper asymptotics alone.
