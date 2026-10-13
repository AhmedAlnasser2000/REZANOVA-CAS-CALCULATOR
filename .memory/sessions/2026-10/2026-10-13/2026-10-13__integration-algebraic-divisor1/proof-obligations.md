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

## Gate B (backend; active, implementation verification pending)

- Positive-characteristic owners are separate from characteristic-zero interfaces. Finite extension fields require Frobenius irreducibility evidence; quotient/truncated algebras remain rings.
- Good reduction requires number-field maps, denominator/discriminant exclusions, maximal orders, proper smooth gluing, geometric connectedness through L(0), genus and divisor-class specialization. Characteristic exceeds the function-field degree.
- Two different residue characteristics preserve all characteristic-zero torsion jointly. Each reduced order divides the original order, and prime-to-characteristic injectivity implies its least order is the LCM of the two exact reduced orders.
- BSGS coverage uses an integer Hasse–Weil upper bound. Exact reduced orders require full integer factorization, a principal witness and nonprincipality for every prime quotient.
- Characteristic-zero principality of the LCM multiple proves torsion and minimality; its checked failure proves non-torsion. Exhaustion and unsuccessful searches carry no negative authority.

The new torsion composition retains the entire characteristic-zero L(-MD), its full finite ideal and localized infinity lattice. For a nonzero basis representative f these prove div(f)-MD effective at every place, including all places outside the requested support. Both divisors have degree zero, so the effective difference is zero. This is complete divisor equality, not a candidate-membership shortcut. The existing Gate A principality producer and version-1 artifact retain their additional explicit norm/valuation evidence unchanged. Independent small-order expanded witnesses and the order-29 quadratic Pell norm identity check this composition through separate native arithmetic.

### Separate finite arithmetic and tame normality

Positive-characteristic prime and finite-extension owners never implement the characteristic-zero field interfaces. A finite extension requires full Frobenius irreducibility: the terminal q^n identity, checked gcd/Bezout exclusions at n/l for every prime l dividing n, monicity and exact degree. Deterministic Berlekamp splitting is a producer only; replay proves each terminal irreducible and the entire product with exact multiplicities. Inseparable p-th powers use the unique inverse Frobenius in the perfect finite field.

Residue characteristic p exceeds the relative function-field degree n, so all ramification indices are prime to p. At every discriminant prime the maximal-order trace radical is the complete trace-pairing kernel over its owned perfect residue field. In this tame situation it is the nilradical of the residue algebra. The complete idealizer preimage equals the original order precisely at the terminal normalization criterion. Full discriminant factorization covers all relevant primes; unramified primes need no normalization. Both finite and infinity orders retain multiplication, trace, radical, idealizer and span identities.

Finite residue algebras are rings until their irreducible quotients are independently certified. An accepted full power matrix proves a monogenic presentation of the entire algebra, including nilpotents. With p>n, the finite residue field has enough distinct primitive elements for the components; tame local components are truncated polynomial rings over separable residue fields. Deterministic moment combinations are tried first, followed by the complete finite coefficient enumeration, so a generator is eventually found. This search grants no authority until its full power inverse and factor/ideal-product coverage pass.

### Good reduction and specialization

The primitive constant generator alpha is scaled by the exact denominator LCM to an integral beta. Its monic integral relation and inverse scaling are checked. Primes dividing the scaling, discriminant or required coefficient denominators are excluded. Every irreducible residue factor is allowed, of any degree; the complete factorization and selected factor bind the number-field map.

The images of the entire source bases and multiplication tables equal the reduced order bases and tables. This defines a flat integral model over the number-field localization. Both normal charts are separable, their Laurent transition matrices glue over the overlap, and they give a proper normal finite cover of P1. Over a perfect finite field the resulting regular curve is smooth. Complete H0 computed by Hess has dimension one, establishing geometric connectedness and hence geometric integrality of the generic algebra. No derivative criterion is used in positive characteristic. Tame discriminant degrees give the canonical degree and unchanged genus.

Source place ideals retain complete integral-model basis specialization. An explicitly selected full source basis has verified polynomial coordinate transformations and inverses against the supplied ideal basis. Its entire reduced ideal equals the image of all original generators. This permits a removable denominator in a normalized generic basis without discarding flatness evidence. Canonical bases work outside a finite exceptional set; additional original-generator bases are finite deterministic candidates, and their search grants no authority. Their reduced factors, valuations, full prime-ideal product and unchanged weighted degree prove the Cartier divisor specialization in the smooth flat model. Thus ordered divisor requests specialize additively, including negative coefficients, and principal classes map to principal classes. The source fields and native owners are retained.

Only finitely many coefficient denominators, discriminants, rank determinants, chart identities and divisor presentation denominators occur in a fixed request. Outside their finite exceptional set, smooth proper reduction, the integral orders, global functions and the requested divisor specialization all spread correctly. There are infinitely many rational primes and each unramified constant relation has residue factors; deterministic enumeration therefore finds two different characteristics without an imposed trial ceiling. Rejected candidates and resource failures never establish a mathematical negative.

### Bounded Hess class arithmetic

Choose an anchor A equal to an exact positive multiple of the full infinity fibre, of degree at least g. Every degree-zero class D has a nonzero full L(A+D), so an initial witness f gives the effective representative E=A+D+div(f) of degree deg(A). Store its finite ideal and localized infinity ideal, with complete lattice evidence.

Addition uses the ideal pair for E_left+E_right-A. Its degree is deg(A), so complete Hess reduction supplies h and the new effective representative E_new=E_left+E_right-A+div(h). The original correspondence witness is h*f_left*f_right. It stays an exact factored expression; no large product or trial divisor degree is expanded. Binary multiples and the baby/giant tables use these bounded representatives.

At infinity, canonical DVR row reduction uses only unit row scalings and integral row additions at u=0. Every elementary transformation and its inverse are retained. Terminal diagonal pivots are exact powers of u and all pivot residues are fully truncated. This proves both localized span directions while removing factors that are units at u=0; it imposes no conditions at unrelated points of the infinity chart.

Class equality computes the full Hess space for the ideal pair J_left/J_right, namely L(-(E_left-E_right)). For equal degrees, a nonzero member has exactly the requested divisor; a complete zero space proves distinctness. An equality h between a representative and the zero representative yields the exact principal function h*f_zero/f_representative. All native factors and exact integer exponents are retained and verified against the reduction tree. No small-genus template is used.

### Complete order and the two-reduction criterion

For field size q and genus g, the Jacobian order is at most (1+sqrt(q))^(2g). The checked integer upper bound (1+ceil_sqrt(q))^(2g) is sufficient. With s=ceil_sqrt(upper), the pairs j*s-i for 0<=i<s cover every integer 1..upper. BSGS therefore finds a principal multiple using exact Hess class equality. Replay requires the final complete principal witness and every prime-quotient exclusion. These independently prove existence and least order; the BSGS table history is unnecessary authority. The retained bounded search multiple is divisible by that least order and hence principal by an exact power of its witness.

A principal witness for mD plus a complete prime factorization of m and nonprincipality for every (m/l)D proves that m is the least positive order. These facts establish exact reduced orders independently of which collision the producer found.

Prime-to-residue-characteristic torsion injects under good reduction. If the characteristic-zero order N exists, each reduced order m_i divides N and has every l-primary component of N for l different from its residue characteristic. Two different characteristics cover every prime l, hence lcm(m_1,m_2)=N. The characteristic-zero full principality decision for this single LCM multiple therefore proves torsion with its least order or proves that no positive principal multiple exists. This LCM criterion is a derived rule, not a claim that either reduced order alone equals N. See [Milne, Abelian Varieties, IV.3.5](https://www.jmilne.org/math/CourseNotes/AV.pdf).

Riemann-Roch commutes with finite constant extension. A divisor defined over the source constants becomes principal after constant extension exactly when its original L(-D) is nonzero. Thus principality and least principal-multiple order descend. No constant roots, numerical branches or integrand non-elementarity claim are introduced.

### Native arithmetic and replay

Characteristic-zero lattice arithmetic uses checked linear-power cancellation and primitive number-field content/PRS and constant-unit row-content normalization before Euclidean module divisions. Stored row operations remain unimodular and preserve previous formats. Its rational modular GCD bridge retains an explicit finite auxiliary-prime coverage list. Each replay reconstructs and verifies those prime domains, performs exact modular gcd/CRT arithmetic and exact inverse division, and never searches new primes. Matching modular and exact degrees prove gcd completeness. The recovery bound is integer-only. These optimizations are scoped to the new Gate B operations; existing artifacts and arithmetic APIs retain their formats.

Stored class reduction trees, local transformations, finite-field factorization and order witnesses are independently replayed. Only exact, deeply immutable successful class obligations can be reused, keyed by the expected curve and exact evidence in the enclosing fresh operation; reuse is charged and never serialized. Whole shared-data artifact bounds precede any domain reconstruction. Prime selection, factorization, place search, module/linear solving, Hess/Riemann-Roch, torsion search and constant-field producers are disabled in replay tests.

New Gate B transport shares record-key schemas and stores graph adjacency as canonical decimal indices. Exact mathematical atoms remain separate structured graph nodes; the full nested private codecs receive their original records after reconstruction. Whole physical depth/node/byte bounds apply first. Each reconstructed adjacency array is bounded by the same 100,000-node profile, so a small stored edge string cannot expand an unbounded list. No additional aggregate reference-count ceiling is imposed; all temporary reconstruction work and allocation are cumulatively charged. Parsing and iterative record reconstruction share cumulative execution charges. The existing strict graph verifier still checks every shape, backward reference, unique node and complete reachability. Published formats retain their original bound and wire shape; only narrow builder/replay composition helpers are extracted. Keys and references carry no mathematical authority.

Factored class witnesses combine factors by exact native field equality. Structural graph sharing may merge equal immutable class records; it cannot change factor exponents, coverage or the verified product. JavaScript object identity is not a mathematical factor identity. A dedicated equal-class replay fixture checks this distinction.

Height is not itself an artifact-size exemption. Both the total-degree-two hidden-constant tower and the full total-degree-four nested tower at height eight replay within the final compact transport budget. Their complete native evidence is retained. Earlier WIP encodings exceeded the stored-node budget; transport sharing resolves that overhead without raising limits. Oversized stored imports and mathematical graph nodes remain explicit sticky-resource rejection fixtures.

## Replay and resources

Whole-artifact bounds precede reconstruction. Every producer-disabled replay validates exact requests, owners, maps, module/kernel coverage and witnesses. References/flags confer no authority. Fresh external proof scopes share cumulative accounting internally. Limits remain 20 billion work, 1 trillion allocation, 2048 bits, degree 256, height 8, artifact depth 64/nodes 100000/bytes 16 MiB.
