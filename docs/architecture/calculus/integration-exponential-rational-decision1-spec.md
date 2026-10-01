# INTEGRATION-EXPONENTIAL-RATIONAL-DECISION1

Status: backend verified; authorized source commit checkpoint. Backend, CRITICAL, root-only. Started 2026-09-30; continued 2026-10-01.

## Outcome and prerequisites

Decide elementary integrability of every normalized element of the owned certified first-level field Q(x)(t), t = exp(r(x)), r nonconstant rational, subject to execution safeguards. The representation prerequisite is [EXPONENTIAL-RATIONAL-REPRESENTATION1](integration-exponential-rational-representation1-spec.md). Existing differential arithmetic, exact polynomial arithmetic, Brown indexed subresultants, quotient rings, rational RDE completeness, rational integration and finite exponential sums remain the other prerequisites.

No nested/independent exponential families, parameters, parser/UI adoption, public result widening or legacy changes. Exhaustion and failed verification return no mathematical decision. Signatures and historical formats remain unchanged.

## Executable reduction

1. Separate t's valuation from the monic denominator. Square-free-decompose its normal part using the formal t derivative. Modular Bézout separation covers every normal power; subtraction leaves only a Laurent polynomial. Exact reconstruction proves separation from the special power.
2. Check gcd(V,DV)=1 using the total derivative and a Bézout identity. For H/V^k, use the unique reduced T with -(k-1)T DV = H mod V and store DT and Hnext. Replay verifies H = (DT+Hnext)V-(k-1)T DV. A checked assembled identity proves f=D(v)+L+A/N.
3. Compute Res_t(N,A-z DN). Preserve its nonzero leading scalar and monic polynomial, complete PRS degrees, scaling and indices. Check resultant degree equals deg N. Independently differentiate every monic coefficient. The first nonzero derivative supplies the nonconstant-residue obstruction.
4. If all derivatives vanish, descend coefficients to Q with exact reconstruction, then square-free-decompose. Specialize indexed subresultants through flat factor-first partition evidence. Unit witnesses establish degrees and normalization. Lower indices vanish and monic division proves divisibility of both inputs. Every component modulus descends to Q before becoming a root binder.
5. Build logarithms with weight z. Subtract their independently checked derivative and prove the remainder has only a power-of-t denominator. Extract every Laurent coefficient; call the existing finite exponential-sum decision with arguments k*r. Negative Laurent evidence stops here.
6. On success, map solved coefficients back to the original t powers using original argument identities and full slot coverage. The nested solver may have rebased its generator; names are never used as a conversion. Embed its rational primitive, combine all pieces and replay the complete derivative against the original input.

For total differentiation DN has degree deg N (its leading coefficient is deg(N)*r'), unlike ordinary rational integration. At the highest-index boundary, B=A-z DN may be a nonzero multiple of N. G=N is checked by exact division, not by an inappropriate B=0 requirement. Original PRS metadata is never rewritten after specialization.

## Negative authority: rational-exponential-residue-liouville-v1

The algorithm specializes the normal-denominator residue and exponential Laurent reductions in [Bronstein, sections 3.2–3.6](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf). The following arguments explain the hypotheses checked in this implementation.

**Admission over complex constants.** If nonzero integer n and v in C(x) satisfied v'/v=n*r', a finite pole of r would give a pole of order greater than one on the right; logarithmic derivatives of rational functions have only simple finite poles. If r is polynomial, r' is a nonzero polynomial, whereas v'/v tends to zero at infinity. These obstructions survive extending rational constants. They establish the transcendental exponential monomial and unchanged constant field over C.

**Only t is special.** A special irreducible polynomial other than t would have a nonzero algebraic root beta with beta'/beta=r'. Taking its norm from the finite algebraic extension of C(x) gives a rational logarithmic derivative equal to a nonzero integer multiple of r', contradicting admission. Thus the verified t-power separation exhausts all special factors. Coprimality with DV checks the remaining factors directly.

**Normal residues.** At a simple normal pole, the residue relative to D is A/DN. Rational derivatives have zero normal residues; logarithmic derivatives have constant residues. Hence elementary integrability requires every root of the residue resultant to be constant. Its monic normalization has constant roots exactly when all its coefficients are constant. A verified nonzero coefficient derivative disproves this. When coefficients are constant in Q(x), exact descent to Q is checked rather than inferred from a guessed zero test.

**Sufficiency of logarithm subtraction.** The indexed gcd selections account for every normal pole of each residue, with multiplicity determining gcd degree, not logarithmic weight. Their trace logarithms remove the normal residues. The implementation additionally verifies by exact field subtraction that no normal denominator remains. Monic factors of constant polynomials over Q(x) descend to Q; this regular-extension fact is guarded by executable coefficient descent at every component.

**Laurent obstruction.** Subtracting the verified rational derivative and elementary logarithms preserves elementary integrability. Distinct positive/negative powers of the transcendental t cannot cancel a coefficient obstruction. The existing finite-sum rule supplies complete rational RDE decisions, including constant-extension descent: pole/infinity bounds still apply over C(x), and a rational inconsistency witness remains contradictory there. No unsuccessful search or exhausted budget is promoted to non-elementarity.

These establish both negative branches and completeness for the admitted field, conditional only on successful execution within the explicit safeguards. Positive authority also independently checks the complete returned primitive.

## Evidence, artifacts and conditions

The immutable decision contains the original input, the fixed rule, complete Hermite and optional residue certificates, either obstruction or complete Laurent decision, and (on success) rational embedding, primitive and final derivative evidence. Normalized input and primitive evaluation conditions retain provenance. Universal denominators and auxiliary elimination denominators are proof devices, not new input exclusions.

`exponential-rational-decision`, version 1, stores all this evidence and the full expected construction. It reuses the existing differential, rational and finite-sum codecs. Replay rejects changed exponents even if derivatives agree, missing/duplicated component coverage, altered bounds, witnesses, traces, targets and conditions. It invokes no integration, Hermite, residue-selection, admission, differentiation or RDE producer.

The complete envelope is bounded before nested decoding. Every external operation starts fresh proof state; nested arithmetic uses the same context. Initial limits: work 20 billion; allocation 1 trillion; bits 2,048; degree 256; tower 8; depth 64; nodes 100,000; bytes 16 MiB. No new application default or hidden degree ceiling. Serial measurements report time and accounting separately from process memory. UI adoption remains separately reviewed; roadmap sequencing is provisional.

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

## Acceptance evidence

386 retained tests plus 24 representation and 60 decision tests pass through the retained run and final affected delta (85 tests including isolation). TypeScript, lint, build, OOE/compartment, memory/file-size and milestone diff checks pass. Producer-disabled replay covers positive, both negative, rational-only, rebased, quadratic-residue and repeated-pole artifacts. See the dated decision dossier for detailed measurements and the documented 2,048-bit coefficient-growth limitation.
