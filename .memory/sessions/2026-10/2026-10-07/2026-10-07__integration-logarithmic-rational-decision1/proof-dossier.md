# Logarithmic rational decisions — completeness dossier

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
- attribution_basis: live

## Accepted field and constants

Let K=Q(x), D(x)=1, a=D(q)/q, and t a chosen local logarithm of the nonconstant rational q. The boundary replays the existing logarithmic admission: square-free numerator/denominator decompositions and coprimality show a nonzero integer simple-pole residue at a zero or pole of q. This remains nonzero after extending constants to C. A rational derivative has no simple-pole residue, so a is not D(u) for u in C(x). If the chosen local log were algebraic over C(x), the derivative of its normalized field trace would be a, contradicting that residue. Thus it is transcendental. Constants in C(x)(t) are preserved directly: a rational constant cannot have a normal denominator factor because total differentiation raises the pole order; it must be polynomial. A positive-degree constant polynomial would have a constant leading coefficient and its next coefficient would be a rational primitive of a nonzero multiple of a, again impossible. Its remaining degree-zero coefficient is in C. The same reasoning yields constants Q for the native formal field. Distinct chosen constructions are not identified merely because their derivatives match.

## All denominator factors are normal

Suppose a monic positive-degree irreducible p in C(x)[t] were special: p divides D(p). The total derivative lowers its t degree because its leading coefficient is one and D(t)=a lies in the base field. Therefore D(p)=0. If p has degree n, its next coefficient b would satisfy D(b)=-n*a, contradicting the admitted simple-pole residue. Consequently all positive-degree denominator factors are normal, including t. The executable reduction checks the actual normality Bezout identities. Formal t differentiation is used only for square-free decomposition.

## Normal reduction and residue obstruction

Verified differential Hermite transitions and denominator separation give f=D(h)+P+A/N with P polynomial, A/N proper, and N monic normal square-free. Liouville's theorem in this primitive extension implies that the residues at normal poles of an elementary primitive are constants. The monic polynomial of residues is the normalized resultant Res_t(N,A-z*D(N)). A nonzero derivative of one of its coefficients proves that not all residues are constants. This is invariant under subtracting rational derivatives. Both the normality and resultant evidence are independently replayed; the stored obstruction label alone has no authority.

If all coefficient derivatives vanish, exact base-field descent gives rational coefficients. Square-free decomposition and checked indexed-subresultant component coverage construct logarithmic derivatives with those residues. Quotient algebras are square-free rings, not assumed fields. Divisors formed over Q(x)[z] must descend to monic Q[z] moduli; no algebraic constant arithmetic is introduced. Selected argument weight is z once, even when its residue has multiplicity greater than one. Independent traces prove each derivative. The remaining denominator must be one: there are no positive-degree special factors.

## Polynomial completeness and rational descent

After these logarithms are removed, remaining logarithmic derivatives in a Liouville representation contribute only a base-field term. A normal pole in the rational field part would produce an order-two-or-higher pole that the simple-pole logarithmic derivatives cannot cancel, so that field part is polynomial. Logarithmic derivatives of monic positive-degree polynomials are proper in t; canceling all their normal poles leaves no positive-degree polynomial contribution. Derivatives of their leading coefficients lie in the base field. The polynomial part of an elementary primitive has degree at most m+1 for a polynomial integrand of degree m. A higher-degree leading constant would force a rational primitive of a in the next coefficient equation.

For leading coefficient p_m, the necessary equation is D(u)=p_m+c*a with a constant c. The complete rational limited-integration certificate decides this equation. Its rational linear inconsistency witness remains contradictory over C; conversely consistent rational data yield rational coefficients and a rational representative. The coefficient choice is unique: two choices would make a rational derivative of a. The verifier therefore requires an empty coefficient-direction basis, while preserving the independent additive constant of u.

For a successful certificate, B=u*t^m-c*t^(m+1)/(m+1) satisfies D(B)=p_m*t^m+m*a*u*t^(m-1). Thus subtracting D(B) strictly reduces degree. Taking the canonical rational u with zero polynomial constant is harmless: another choice changes B by an elementary polynomial C*t^m, whose derivative can be handled in the remaining lower degree. Induction establishes completeness of the descending solver. A completely checked failure at the first remaining degree proves non-elementarity after the already verified elementary subtractions. No unverified prefix or unfinished candidate is returned as success.

The final base-field remainder always has a formal elementary primitive by the existing rational Hermite/LRT procedure. The returned assembled primitive is independently differentiated and compared with the original input. Local logarithm choices can change its value by constants; no principal branch, real conversion or log-product identity is chosen.

## Fixed authority and references

Executable rule: rational-logarithmic-residue-liouville-v1. Negative paths: nonconstant-residue and polynomial-coefficient. Each requires full admission, reduction, retained input conditions and its relevant complete preceding evidence. Resource exhaustion and verification failure grant no mathematical authority.

Mathematical reference: [Manuel Bronstein, Symbolic Integration Tutorial, sections 3.1–3.5](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf). The independent algorithm cross-check is [SymPy 1.14.0's integrate_primitive_polynomial](https://github.com/sympy/sympy/blob/1.14.0/sympy/integrals/risch.py#L1264-L1304). Both primary sources were checked on 2026-10-07; neither is a runtime dependency or certificate producer. The executable negative authority is this field-specific proof plus the replayed concrete hypotheses and certificates, rather than delegation to either implementation or a stored flag.
