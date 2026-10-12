# Proof obligations — algebraic divisors

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

## Gate A (backend)

- Reverify the full constant field and native chain. Establish degree quotient and complete two-way coordinates over C(x). Derive finite/infinity C-polynomial bases from the certified Q-polynomial orders; integral closures coincide by integrality/transitivity.
- Decompose complete residue algebras as rings, including their repeated factors, field quotients, maps, ramification and degree coverage. Infinity is localized at u=0.
- Fractional-ideal operations require full module spans; valuations and principal divisors require all finite/infinity support. Canonical dx requires complete ramification and degree/genus identities.
- Hess lattices require verified unimodular changes, exact finite bounds, membership and spanning. Principality uses degree or the complete L(-D); finite constant base change preserves dimensions and descends principality.
- Exact factored witnesses use signed integer exponents and termwise principal divisors; expansion is independently bounded.

### Presentation and finite constant base change

Write N=[K:Q(x)], c=[C:Q]. The certified rational primitive theta also generates K over C(x). Consequently its first n=N/c powers form a C(x)-basis. The stored matrix consisting of these powers multiplied by all c constant powers is square of size N; both inverse identities and every native conversion are checked. The next power gives the monic relative relation. These identities establish the relative degree and bidirectional correspondence without replacing a supplied owner.

The full constant field C is algebraically closed in K. In characteristic zero this makes K/C regular. Therefore finite L/C preserves integrality of K tensor_C L and its exact constants are L. Finite extensions of the perfect field C are etale; base change of the smooth normal curve and its affine normal orders preserves normality. Transporting a complete C[x] or C[u] basis thus gives a complete L[x] or L[u] basis. The implementation retains the explicit constant embedding, native generator images, their defining relations, inverse coordinates and full multiplication/trace tables. It does not rerun integral normalization or constant search. The explicit target uses its checked primitive number-field presentation, as provided by the algebraic-field foundation.

### Residue rings, maximal ideals and local digits

For a monic irreducible p in C[x], let k=C[x]/p. The complete maximal order gives O/pO as a finite ring of dimension n over k. In characteristic zero each local component is tame and has the form k_i[epsilon]/epsilon^e after choosing a coefficient field and a uniformizer. Generic k-linear combinations of the integral basis generate the residue extensions, separate components and have nonzero uniformizer coefficient in ramified components. These are finitely many nonvanishing linear conditions over an algebraic closure. On the deterministic moment curve (1,s,...,s^(n-1)), each excludes finitely many integer seeds; search therefore terminates. Rejected seeds have no authority.

The accepted complete power matrix and its inverse identify the entire ring with k[tau]/H. Complete irreducible factorization of H produces every maximal quotient k[tau]/H_i, with ramification the multiplicity and residue degree deg H_i. Each residue map is surjective by full-rank elimination; its complete kernel lifts to the owned maximal ideal. The product of all ideal powers is checked against pO, with sum e_i f_i=n. No nilpotent quotient is promoted to a field. Infinity applies the same construction only to u=0.

For a nonzero function, clearing its order-coordinate denominators gives an integral numerator. Its polynomial norm bounds each nonnegative place valuation. Successive ideal powers include a first failed membership test, giving an exact valuation; denominator valuations are then subtracted with ramification. Principal support is the union of numerator-norm primes and clearing-denominator primes, plus every infinity place. Using the original function norm alone would lose support when valuations cancel above one prime, so that shortcut is excluded.

A polynomial basis of a maximal ideal contains a function of local valuation one, since it generates the ideal after localization. For P^m, checked Hermite quotient slots give the entire C-vector quotient. Residue monomials times powers of a uniformizer have exactly m deg(P) coordinates, with a full inverse proving their coverage. A locally regular function with a base denominator vanishing at P is reconstructed by solving delta*l=numerator modulo P^(m+v_P(delta)). Complete elimination and the independent error valuation prove reconstruction; no invalid 0/0 residue evaluation is used. Precision zero is included.

### Ideal operations and Hess completeness

Every fractional lattice retains denominator LCM/Bézout reconstruction, complete polynomial Hermite row-span operations and a field-basis inverse. Stability under each order-basis multiplier proves it is an ideal. Product generators are all basis products; inverse is the complete polynomial preimage of multiplication-integrality constraints; intersection is the full zero-row module kernel. Inverse products are checked against the entire unit order. These are complete module operations, not candidate membership alone.

For a finite lattice basis row b_i, let w_i be the maximum pole order at u=0 of its coordinates in the localized infinity lattice. A dependence sum d_i*lead(b_i)=0 selects a row k of maximal active weight and replaces it by b_k + sum_(i!=k) (d_i/d_k)x^(w_k-w_i)b_i. This elementary polynomial transformation is unimodular and strictly lowers w_k. The sum of weights is bounded below by the determinant valuation, so reduction terminates. Final leading-vector independence proves that the pole weight of any polynomial combination is exactly max_i(w_i+deg a_i). Thus all and only slots 0<=deg a_i<=-w_i occur in L(D), including dimension zero. Stored transformations, strict progress, leading inverse, slots and native maps are independently replayed. Units at other points of the infinity chart impose no conditions.

### Canonical divisor and principality

The complete maximal-order discriminant covers all finite ramification. In characteristic zero the different exponent is e-1; at infinity dx=-u^(-2)du gives e-1-2e=-e-1. Complete place decomposition and residue-weighted degree therefore establish div(dx) and 2g-2. The full L(0) check has C-dimension one.

For deg D=0, any nonzero f in L(-D) has effective divisor div(f)-D of degree zero, hence div(f)=D. Conversely a principal witness belongs to that space. A complete zero-dimensional space proves nonprincipality. Nonzero degree is immediately impossible. Riemann–Roch commutes with finite constant extension, so dimension and principality descend. Exact factored witnesses retain all termwise complete divisors and integer exponents; separately bounded expansion can exhaust without changing the already verified witness.

### Replay boundary

New codecs bound the complete shared-data graph before nested processing. Native curve snapshots replay full constants and bind their exact primitive and relative relation to the expected owner. Base changes bind the complete explicit constant embedding. Fresh residue fields are reconstructed only from verified irreducibility evidence. Per-operation memoization is scoped by exact codec and expected owner; shared references provide identity, never authority. Every reconstructed ideal, map, divisor, space, norm, local lift and condition list is verified. Explicit local-place binding compares the full quotient presentation and maps, in addition to ideal equality. Stored support, dimensions and other fields are checked rather than repaired. No mathematical producer is invoked during replay.

## Gate B (backend; not activated)

- Positive-characteristic owners are separate from characteristic-zero interfaces. Finite extension fields require Frobenius irreducibility evidence; quotient/truncated algebras remain rings.
- Good reduction requires number-field maps, denominator/discriminant exclusions, maximal orders, proper smooth gluing, geometric connectedness through L(0), genus and divisor-class specialization. Characteristic exceeds the function-field degree.
- Two different residue characteristics preserve all characteristic-zero torsion jointly. Each reduced order divides the original order, and prime-to-characteristic injectivity implies its least order is the LCM of the two exact reduced orders.
- BSGS coverage uses an integer Hasse–Weil upper bound. Exact reduced orders require full integer factorization, a principal witness and nonprincipality for every prime quotient.
- Characteristic-zero principality of the LCM multiple proves torsion and minimality; its checked failure proves non-torsion. Exhaustion and unsuccessful searches carry no negative authority.

## Replay and resources

Whole-artifact bounds precede reconstruction. Every producer-disabled replay validates exact requests, owners, maps, module/kernel coverage and witnesses. References/flags confer no authority. Fresh external proof scopes share cumulative accounting internally. Limits remain 20 billion work, 1 trillion allocation, 2048 bits, degree 256, height 8, artifact depth 64/nodes 100000/bytes 16 MiB.
