# INTEGRATION-ALGEBRAIC-DIVISOR1

Status: Gate A verified (2026-10-13); Gate B approved but not yet activated. The milestone remains incomplete.

## Scope and sequencing

Complete divisor arithmetic, Riemann–Roch spaces, principality and least-order principal-multiple recognition over the formally owned polynomial-defined fields established by INTEGRATION-ALGEBRAIC-FIELD1. The certified full constant field is authoritative, including nonrational and hidden constants. Supplied owners and generator order remain unchanged.

Gate A establishes exact geometry and principality, passes its checks and receives its separately authorized commit before Gate B starts. Gate B establishes positive-characteristic infrastructure, good reductions and complete torsion recognition. The milestone completes only after both gates pass. No pushes, dependencies, integration decisions, transcendental/mixed fields, numerical branches or application/result changes.

## Gate A — geometry and principality

Privately registered immutable curve views retain full constant certificates, complete C(x) coordinates and the degree quotient. Checked module transformations derive C[x] and C[1/x] bases from the existing integral closures; explicit finite constant base changes retain defining relations and both correspondences.

Places are owned maximal ideals with certified residue fields/maps. Requested irreducible base primes decompose completely with ramification, residue degrees and prime-product coverage. Infinity uses u=1/x localized at u=0. Exact valuations, local parameters and bounded lifting retain reconstruction evidence. Immutable sparse divisors use exact signed integer coefficients and residue-weighted degrees.

Fractional ideals use complete polynomial modules. Principal divisors cover every finite and infinity place and have degree zero. Canonical dx and genus require full ramification coverage. Riemann–Roch uses the general Hess finite/infinity lattice method, verified unimodular transformations and complete coefficient bounds; membership alone is insufficient. Return complete C-bases and coordinate conversions, including dimension zero.

Principality uses `algebraic-principality-riemann-roch-v1`: nonzero degree is impossible; degree zero uses the complete L(-D). A nonzero member must have exact divisor D. Full Riemann–Roch base change proves constant-extension descent. Factored witnesses retain native functions and exact signed exponents; expansion has separate bounds.

Implemented private operations live in `algebraic-curve*`, `algebraic-place*`, `algebraic-fractional-ideal`, `algebraic-valuation`, `algebraic-divisor*`, `algebraic-hess-lattice`, `algebraic-riemann-roch`, `algebraic-principality`, `algebraic-local`, `algebraic-curve-geometry` and `algebraic-factored-function`. Separate version-1 curve, place-decomposition, divisor, principal-divisor, valuation, local-expansion, curve-geometry, Riemann–Roch, principality and factored-function artifacts retain exact requests and replay without producers. Finite constant base changes are explicitly tagged curve authorities and retain their complete source/embedding evidence. The proof dossier records monogenic residue-ring coverage and the Hess noncancellation law.

## Gate B — good reduction and torsion

Positive-characteristic prime/extension fields, polynomials, fractions and residue/reduced-curve algebras have separate registered owners. Frobenius irreducibility, Bézout and reconstruction confer field authority; reducible/truncated quotients remain rings.

Deterministic prime/residue-factor enumeration retains number-field maps, denominator/discriminant exclusions, full basis/divisor specialization, maximal reduced orders, smooth proper chart gluing, connectedness through complete L(0) and genus. Require characteristic greater than the function-field degree. Zero derivatives do not determine geometric constants in positive characteristic. Finite bad-prime exclusion proves termination, without a trial ceiling.

For degree-zero D, two good reductions of different characteristics yield exact class orders m1,m2. Checked deterministic baby-step–giant-step uses Hess divisor reduction and Riemann–Roch equality, with an integer Hasse–Weil upper bound. Exact order evidence includes a principal witness for mi Di, complete integer prime factorization and nonprincipality for every prime quotient.

Rule `algebraic-divisor-two-reduction-v1`: prime-to-characteristic torsion injectivity implies any characteristic-zero order is exactly M=lcm(m1,m2). Decide principality of M D in characteristic zero; success yields least order M, failure yields non-torsion. Nonzero degree is non-torsion; the zero divisor has order one. A negative divisor decision makes no integration non-elementarity claim.

## Evidence and private operations

Explicit-owner/request verifiers and version-1 codecs accompany curve construction/base change, place decomposition/valuations, principal divisors, `solveAlgebraicRiemannRoch`, `decideAlgebraicPrincipality` and `decideAlgebraicDivisorTorsion`. Whole artifacts are bounded before nested processing. Auxiliary owners require checked defining evidence. Replay invokes no constant/factorization/place/module/linear/Riemann–Roch/prime/torsion producers. References and flags grant no authority.

Fresh external proof state, shared cumulative nested accounting and sticky exhaustion remain mandatory. Invalid input, unsupported domains, ownership, division by zero, verification and exhaustion remain distinct. Preserve input/returned-value evaluation provenance; auxiliary ideals, discriminants and denominator clearing add no source exclusions.

## Resources and acceptance

Unchanged profile: 20 billion work, 1 trillion cumulative allocation, 2048 integer bits, degree 256, construction height 8 including the variable, artifact depth 64, 100000 nodes and 16 MiB. Charge arithmetic, conversion, matrices/lattices/search, temporary storage, witnesses and codecs. Keep dimensions/exponents/orders exact until checked conversion; no hidden genus/place/order/trial limit.

Coverage includes rational and arbitrary polynomial-defined fields, singular models, hidden constants/base changes, nonrational places, finite/infinity ramification, complete L(0), ideal identities, general Riemann–Roch dimensions, elliptic orders two/three, the infinite-order divisor (3,5)-O on y²=x³-2, and the order-29 infinity divisor on y²=x⁶+4x⁵+6x⁴-12x³+33x²-16x. Mutation, producer-disabled replay, ownership, malformed artifacts, fresh scopes and exhaustion are required, including manageable height-eight/higher-genus cases.

Each gate runs focused two-worker Vitest, incremental TypeScript, scoped lint, isolation, OOE/compartment, memory/file-size and diff checks. Repository lint/build precede each gate commit. Private backend work requires no Playwright. Serial two-warm-up/five-sample construction/solving/verification/codec observations report counters and memory without timing assertions.

Primary algorithm sources: [Hess](https://research-information.bris.ac.uk/en/publications/computing-riemann-roch-spaces-in-algebraic-function-fields-and-re/), [Schultz](https://bpb-us-e1.wpmucdn.com/sites.psu.edu/dist/d/34699/files/2016/12/IntegrationOnCurves-2hhuby8.pdf), [Bronstein](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf). The following INTEGRATION-ALGEBRAIC-DECISION1 plan requires separate review against verified interfaces.
