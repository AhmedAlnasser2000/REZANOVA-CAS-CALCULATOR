# Recursive factorization — completeness and authority

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

## Algebra and Gauss correspondence

The supported registered coefficient fields are Q and finite rational-function towers over Q, including their owned differential wrappers. Each tower is interpreted as a fraction field of independent algebraic indeterminates. This certificate does not assert any analytic exponential/logarithmic interpretation, preserve a differential constant field, or admit a function generator.

The registered adapter reads only owned normalized values. Recursively evaluating numerator/denominator coefficient polynomials gives a checked sparse fraction over Q in the supplied coordinate order. Verification independently reads the owned coefficients, checks cross-identities, complete coefficient coverage and every common-denominator quotient. Coefficient content retains the existing recursive primitive-PRS/GCD dossier, including divisibility, scaled fraction-field Bézout identity and complete content chains. A multivariable polynomial Bézout identity equal to one is not required.

For original P, clearing denominator D and extracting coefficient content H and integer scale s gives W = s D P/H. W is primitive with respect to the supplied outer variable and integer coefficient content, and has positive lexicographic leading coefficient. Gauss's lemma identifies its positive-outer-degree primitive integer factors with irreducible factors over the original coefficient fraction field. Coefficient-only content belongs to the scalar unit, never the output factor list. Native output factors are monic, explicitly owned and checked by inverse coefficient conversion, not by printed names.

## Square-free completeness

Rational input uses existing square-free production with additional stored derivative and pairwise Bézout witnesses. Recursive input uses the same characteristic-zero square-free decomposition over the cleared sparse UFD, using existing checked multivariable GCD/content machinery. Every square-free component has positive outer degree, exact increasing BigInt multiplicity, checked derivative GCD of outer degree zero and checked pairwise GCDs of outer degree zero. Complete product reconstruction includes the exact rational scalar. Over the coefficient fraction field these degree-zero GCDs are units. Thus all irreducible factors and all multiplicities are covered, even though working factors are normalized over Q rather than monic in the outer variable.

## Finite-field authority

Primes are selected deterministically and checked independently by integer trial division. Modular degree preservation, original leading-coefficient nonvanishing and square-free Bézout evidence are mandatory. Berlekamp production computes the Frobenius fixed-space kernel and separates all modular factors deterministically. Its matrix/elimination work is computational only: final modular authority comes from reconstruction, distinctness, and each factor's stored Frobenius irreducibility dossier.

For a monic degree-n modular factor, check h_0 = z mod F, every h_(i+1) = h_i^p mod F through i=n-1, and h_n=h_0. For every prime divisor l of n, a checked Bézout identity proves gcd(F,h_(n/l)-h_0)=1. These are the finite-field irreducibility conditions. All required indices are independently enumerated and covered. No stored success flag or Berlekamp kernel claim is proof authority.

## Good specialization and local lifting

For a primitive square-free W(z,Y), its leading coefficient and outer-variable discriminant are nonzero polynomials in Y. An infinite deterministic enumeration of integer points therefore reaches a point avoiding their zeros. At that point only finitely many primes divide the nonzero leading coefficient/discriminant obstruction. Rejected points or primes are not negative mathematical evidence.

P-adic monic factors preserve their original degrees and reduction correspondence at each modulus transition. Check all stored product congruences, coprime seed inverse witnesses and exact modulus progression. The final modulus must meet the independent recovery bound.

Multivariable lifting takes place in the private ring Z/(p^k)[z,Y]/(Y_i^(d_i+1)), where d_i are actual shifted partial degrees. This truncated algebra and prime-power coefficient rings have no field capability. The complete leading coefficient is a unit because its specialized constant term is prime to p. Its stored inverse is checked by multiplication. Seed cofactor inverses are checked modulo each monic seed at the full prime-power modulus.

The lifted monic factors have fixed outer degrees, exact specialized reductions and product equal to W/LC_z(W) in the full coordinate truncation. Coprimality of seeds gives uniqueness of this monic lift in the nilpotent coordinate ideal. Consequently replay can check the final identities and correspondence without reproducing the lifting iterations. P-adic transitions remain stored and checked separately.

## Integer-only unique recovery

Let L be the sum norm of the shifted primitive integer W, and d_i its partial degrees, including the outer variable. Use C = 2^(sum d_i) L. The length/Mahler inequality L(A) <= 2^(sum deg_i A) M(A), multiplicativity of Mahler measure, M(nonzero integer polynomial) >= 1, and M(W) <= L(W) imply L(A) <= C for every primitive integer divisor A of W. These inequalities are recorded on page 1 of [Amoroso–Mignotte](https://www.impan.pl/shop/en/publication/transaction/download/product/83613); the implementation uses a conservative integer bound, not their sharper irreducible-factor estimate.

If W=A B, the union of modular blocks belonging to A lifts to A/LC_z(A). Multiplying by the complete LC_z(W) restores A LC_z(B). Its coefficient norm is at most C². Its partial degree in each coefficient variable is at most deg_i A + deg_i B = deg_i W; its outer degree is deg_z A. Therefore the coordinate box retains the entire restored polynomial. A modulus greater than 2C² makes symmetric integer recovery unique. Checked coefficient content removes LC_z(B); primitive integer normalization recovers A, without factoring the leading coefficient or guessing its divisors.

## Recombination and irreducibility

Every true proper factor specializes into a proper union of the distinct modular factors. Enumerate every nonempty proper subset with exact BigInt masks; this implementation does not use complement symmetry. Each rejection stores the restored raw polynomial, checked primitive content/scaling and either an independently checkable invalid-degree condition or a nonzero exact division remainder. Sparse division checks reconstruction and that no remainder monomial is divisible by the divisor's leading monomial. Such a remainder excludes exact divisibility in the polynomial UFD.

A terminal factor is irreducible only after complete ordered rejection coverage. A split retains the complete checked preceding rejection prefix, selected lift/recovery/division correspondence, exact product reconstruction and two recursively verified children of strictly smaller positive outer degree. This recursive descent terminates. Linear primitive factors are irreducible by Gauss correspondence. Distinct monic irreducible native factors are pairwise coprime; square-free pairwise coverage supplies the same conclusion across multiplicity components.

For each sparse component C_j, its normalization gives W_j = s_j C_j/H_j. Native leaf F becomes F/LC_z(F). Complete scalar recovery checks

u = H/D/s * squareFreeScalar * product_j((H_j/s_j * product_leaves LC_z(F))^m_j).

This is checked by exact coefficient-polynomial cross-multiplication against the supplied native leading coefficient. Together with square-free, tree and inverse-conversion identities it proves full native input reconstruction without repeating deeply nested fraction arithmetic.

## Replay, bounds and limited reuse

Version-1 factorization artifacts contain values and complete evidence, no owner identities, contexts, callbacks or trusted flags. Decode prebounds the complete raw artifact, reconstructs auxiliary sparse/Q/modular owners, binds native values to the explicitly supplied expected owner, then replays every obligation. Factorization, good-point/prime search, Berlekamp, content production, lifting, recombination and square-free production are absent from replay. Existing private codecs retain their interfaces and formats; sparse codec helpers are generalized only in their TypeScript coefficient parameter.

Every external operation starts a fresh proof scope and shares cumulative arithmetic accounting. Sparse coordinate boxes avoid artificial Kronecker degrees. Temporary arrays, exact integer operations and traversal are charged, and sticky exhaustion never authorizes a result or triggers a fallback. Exhaustive recombination can be expensive; resource exhaustion remains honest incompleteness.

Registered immutable fraction owners may reuse only already checked native zero and one inside one exact execution-operation token, with charged retention and unconditional cleanup. Custom or mutable coefficient domains cannot qualify. A registered owned normalized n/n is one and its inverse is the same value. These arithmetic identities avoid repeated unit reconstruction; they do not cache factorization decisions, change normalization, merge owners or relax verification.
