# Algebraic foundation proof obligations
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

## Gate A — backend

- Closed native parent admission, exact ownership, irreducibility and immutable construction are prerequisites of field operations. Square-free reducible rings never become fields.
- A reduced power basis gives decidable equality. Extended-GCD witnesses establish inverses and separability. Linear defining relations remain valid degree-one fields.
- Trager: square-free norms and complete parent factorization establish complete recovered irreducibles. Finite bad shifts in characteristic zero justify deterministic integer enumeration. Parent height strictly decreases; no search cutoff or fallback.
- The differentiated defining relation and invertible separant uniquely determine the generator tangent. Dual-number evaluation verifies elements independently.
- Exact generator images and injected parents establish homomorphisms. Irreducibility establishes injectivity and basis independence. Names and branches have no authority.
- Trace is multiplication-basis trace, independently equal to Newton sums. Norm resultant agrees with a independently verified determinant reduction.

## Gate B — backend

- Deterministic primitive-element rank evidence proves the full supplied field is represented; retain both directions, without rebasing owners.
- Polynomial-module elementary transformations are unimodular. Complete echelon/kernel coverage proves lattice equality, not just generator membership.
- In characteristic zero the trace radical modulo an irreducible base prime is the nilradical. Idealizers are finite integral overorders. Terminal idealizer equality at all discriminant primes establishes maximality.
- Every strict enlargement reduces polynomial discriminant degree by an exact squared index; the loop terminates. No incomplete local coverage authorizes maximality.
- The two integral closures cover finite points and infinity. Their intersection is precisely the relative algebraic closure of Q, equivalently the selected derivation's constant field. Exact transition bounds and complete rational kernels prove all constants are represented.
- Constant multiplication closure, independent zero derivatives, primitive-element rank and exact minimal relation establish the returned number field and its embedding.

## Shared replay

Whole-artifact bounds, explicit expected constructions, fresh auxiliary domains, canonical coefficients and complete stored coverage precede authority. No producer search is used during replay. Auxiliary normalization adds no source restriction. Exhaustion returns no proof.


## Implemented completeness argument

### Construction, factorization and derivations

Irreducibility is checked over the actual parent. The quotient by its monic irreducible relation is a field with a unique reduced power basis. Separability follows in characteristic zero, and the stored Bezout identity independently proves the separant is invertible. A degree-one relation has basis size one; adding its syntactic owner does not change the mathematical dimension.

For a square-free input over a simple algebraic extension, Trager's shifts separate its roots from their conjugates over the parent. Only finitely many integer shifts are bad: coincidences between distinct conjugate root pairs impose finitely many nonzero affine conditions on the shift. The stored final norm is square-free; the search history grants no authority. Its complete parent factorization and all checked GCD recoveries establish irreducibility and complete coverage over the child. Undoing the shift, preserving the unit and exact multiplicities reconstructs the input. Norm computations and all constructed polynomials obey the actual resource bounds. Recursive parent factorization strictly reduces algebraic height. See [Trager's factorization theorem](https://www.cecm.sfu.ca/~monaganm/teaching/TopicsinCA09/TragerFactor.pdf).

The differentiated defining relation forces D(alpha) = -(D_parent P)(alpha)/P_y(alpha). Independent dual-number evaluation checks this identity and every nonconstant representative. A reduced representative in the parent has no alpha term: checking the parent derivative and its embedding is sufficient and avoids producing an unused generator tangent. The full chain still receives construction and separability verification. Multiplication traces agree with Newton sums; norm resultants agree with exact elimination determinants. Explicit root images preserve defining relations; irreducibility over the injected parent proves the embedding is injective.

### Auxiliary presentation and integral models

The supplied ordered product basis has dimension n, the product of relation degrees. Checked rational coefficient conversions run in both directions, and every supplied basis vector reconstructs exactly. A deterministic integer combination theta is chosen only when the n powers have full rank over Q(x). The relation for theta^n, its complete irreducibility evidence and inverse coordinate matrix establish a presentation of the entire supplied field. Every original generator reconstructs through its stored coordinates. No supplied owner is changed.

The primitive-element theorem in characteristic zero gives termination of the integer combination search: distinct embeddings differ on at least one basis element, so their equality on the selected moment-curve combination excludes only finitely many integers. Rejected rank probes grant no authority. Denominator clearing and scaling beta = h theta give a monic polynomial with coefficients in Q[x]. Reciprocal substitution x = 1/u and independent scaling give the infinity integral model. Every transformed coefficient and inverse correspondence is checked. Auxiliary h and discriminant factors are proof devices, not new source restrictions.

### Polynomial modules, trace radicals and idealizers

Every Hermite row operation is unimodular over Q[x]: swaps, addition of a polynomial times another row, and scaling by a nonzero rational unit. Stored replay checks the full transformation and echelon coverage. Nonzero rows are independent over Q(x). Therefore the zero rows of U in U M = H give the entire polynomial left kernel, not merely some null vectors. Exact divisions in H decide module membership; membership replays the Hermite certificate first.

For an integral order A and an irreducible prime p, A/pA is a finite algebra over the characteristic-zero residue field Q[x]/p. Its nilradical is exactly the trace-pairing kernel. Complete Gauss-Jordan evidence over the independently constructed residue field supplies that kernel. Lifting the full kernel together with p times every basis vector, followed by unimodular Hermite reduction, gives exactly the preimage radical I.

Write multiplication by every I-basis element with input in A-coordinates and output in I-coordinates, and stack the resulting matrices M. An element v is in End(I) precisely when M v has polynomial entries. If d M is polynomial and its row Hermite form has full-rank square part H, unimodularity proves both implications of

    M v in Q[x]^(n*n)  <=>  H v / d in Q[x]^n.

Thus the columns of d H^-1 give the full idealizer. All product tables, trace matrices, denominator clearing, inverses and native basis mappings are checked. The idealizer is an integral overorder by the finite-module determinant argument; independently checked multiplication closure and identity membership confirm the resulting order structure.

For each enlargement, the exact polynomial inclusion matrix has index determinant i and discriminants satisfy Delta_old = i^2 Delta_new. A nonunit index strictly reduces discriminant degree, giving finite termination. A unit index and the checked inclusion imply lattice equality. Every prime of discriminant multiplicity at least two is covered in the terminal round. A nonmaximal inclusion would force its prime squared to divide the discriminant, so multiplicity-one primes need no enlargement. Terminal idealizer equality establishes integral closure by Trager's characteristic-zero normalization criterion. See [the trace-radical and idealizer algorithm, section 3](https://arxiv.org/html/2005.03964). A successful prefix stops at the first strict enlargement and restarts complete discriminant factorization; it never claims unperformed local checks.

### Complete constants from the two orders

Convert both complete closures to the same theta power basis. Let A be the exact transition from infinity coordinates to finite coordinates. An element in their intersection has finite polynomial coordinates p(x) and infinity polynomial coordinates q(u), with p(x) = A(x) q(1/x). Each q(1/x) has degree at infinity at most zero, so p_i has degree at most max_j deg_infinity A_ij. Negative bounds force zero coordinates. These bounds are derived from exact numerator/denominator degrees and checked, with no trial degree.

Enumerate all coefficients through those bounds. Substitution into A^-1 p and reciprocal conversion to u gives rational expressions linear in the unknown rational coefficients. Complete denominator divisibility remainders, including every coefficient, express membership in the infinity order. Exact rational elimination gives every solution, and its full nullspace maps injectively through the finite basis. Thus both membership and spanning of the intersection are established.

The intersection is precisely the full constant field. If h is integral over both Q[x] and Q[1/x], all conjugates are integral over both rings. Coefficients of its monic minimal polynomial over Q(x) are consequently in both integrally closed rings, whose intersection is Q. Hence h is algebraic over Q. Conversely, every element algebraic over Q satisfies a monic rational polynomial and is integral over both rings. Finally, D(h)=0 implies differentiating its monic minimal polynomial gives a lower-degree vanishing polynomial; minimality forces every coefficient derivative to vanish, so its coefficients lie in Q. The converse follows from separability. This proves the intersection equals ker(D), without relying solely on zero-derivative samples.

A full-rank deterministic primitive element of the intersection produces an irreducible rational defining polynomial and exact number-field owner. Complete coefficient descent proves its relation, and stored rank/inverse evidence gives unique coordinates. Each returned basis element reconstructs through the root image; independent native and number-field products establish multiplication closure. Every basis derivative is independently zero. Parent constant bases embed into the child, with full coordinate coverage. The supplied tower is not rebased, and Q-only integration algorithms are not activated.

### Replay and proof reuse

The five new tags use explicit expected owners, inputs and original relations. The constant tag packs the checked shared-data graph; references themselves have no mathematical authority. Whole-artifact bounds precede decoding. Auxiliary owners arise only from replayed irreducibility evidence. Canonical integers, every local prime and kernel, all terminal rounds, coefficient bounds, relation mappings and ordered conditions are checked before return. Replay tests disable algebraic and recursive factorization, integer/finite factoring, lifting, square-free production, primitive-element search, normalization, module/linear solvers, construction and derivative producers.

Every external certificate operation starts fresh proof state. Reuse is limited to the exact immutable evidence, expected owner, verification rule and full bounds inside that operation; successful checks are charged, retained with accounting, and cleared unconditionally. Construction checks and constant-completeness checks use different keys. Mutable evidence is always rechecked. Accessors, cycles, mismatched requests and trusted flags carry no reuse authority. Sticky exhaustion prevents all certification and fallback.
