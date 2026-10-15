# Modular number-field GCD prerequisite

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

## Authority and prerequisite boundary

Backend checkpoint inside the approved performance gate. It uses registered
characteristic-zero algebraic owners with ultimate parent Q, their checked monic
relations and original ordered power bases. It does not extend integration,
admission, constant-field or geometric authority. No native owner is replaced.

Primary source: [van Hoeij and Monagan, modular GCD over number fields with
multiple extensions](https://arxiv.org/abs/1601.01038), sections 2.1–2.3,
particularly Lemmas 3–5 and Theorem 1. The author-hosted source and extracted
text remain ignored in the task directory. This is an independently implemented
arithmetic method, not copied code.

## Checked coefficient conversion

Recursive tensor coordinates preserve every supplied generator and relation.
Native reconstruction is checked in the original owner. Reduction of a rational
coordinate requires its denominator to be nonzero modulo the chosen prime.
Every monic relation is mapped coefficientwise with complete parent coverage.
The resulting algebra has the original tensor rank over the prime field.

These positive-characteristic quotients are rings, including reducible and
nonreduced reductions. Only checked unit inverses permit division. A failed
recursive inversion rejects that prime; it makes no characteristic-zero claim.
Dimension and degree checks precede allocations; tensor coordinates are not
encoded as an artificial univariate polynomial.

## Degree-bound evidence

For an accepted prime, retain degree-preserving input reductions, a checked
unit inverse for the second input's leading coefficient, a monic modular d,
exact modular divisibility and a Bezout identity s*a+t*b=d. These establish the
modular ideal correspondence required by Theorem 1. Its p-adic lifting argument
proves deg(d) >= deg(g), where g is the characteristic-zero monic GCD, even if
the modular coefficient algebra has zero divisors. The stored identity criterion is the terminal-ideal form of that argument:
its Hensel correction divides by monic d, and its degree correction divides by
b/d, whose leading coefficient is the checked unit. Thus the proof applies to
these independently verified identities without trusting the producer's
Euclidean execution or retaining its search history. Neither modular degree
alone nor input degree preservation alone is authority.

The implementation independently checks the terminal identities; search flags
are absent. An exact native monic candidate of degree deg(d), dividing both
original inputs with retained quotient reconstruction, must equal g: it is a
common divisor and the modular evidence bounds the entire common-divisor degree.
Zero/constant cases retain their separate exhaustive applicability checks.

## Reconstruction and termination

Primes are enumerated deterministically. Discard unusable reductions and larger
modular degrees; reset CRT when a smaller degree occurs. Rational tensor
coordinates are recovered through exact Euclidean reconstruction with a bound
B satisfying 2*B^2 < modulus, checked congruence and coprimality. Reconstruction
or trial-division rejection is only a search transition.

Only finitely many primes divide source denominators, relation denominators or
the finite characteristic-zero Euclidean computation's required unit norms.
Lemma 5 therefore gives good reductions outside a finite set. Once the minimum
degree equals the true GCD degree, all retained images equal the GCD image;
growing CRT precision eventually recovers each of its finitely many rational
coordinates. There is no prime-count, factor-count or trial-degree ceiling.
Sticky execution exhaustion propagates without switching algorithms.

## Composition and old replay

Public producer/checker entries start fresh operations; private arithmetic
composition shares the enclosing operation and cumulative accounting. Existing
signatures and Brown subresultant/resultant scaling are unchanged.

Existing version-1 replay selects its original exact number-field Euclidean
checks before starting arithmetic. It does not need newly introduced modular
primes and never falls back after failure. New native modular certificates have
distinct types. Their checker reconstructs the terminal auxiliary domains and
uses stored identities without GCD or prime search. Compact saved codecs and
stored arithmetic-inverse composition remain a subsequent prerequisite; this
checkpoint alone does not claim complete compact-artifact replay or full Gate 2.

## Exact live modular-domain composition prerequisite

The bounded dependent-residue diagnostic identifies repeated modular-domain creation in number-field GCD arithmetic. Reuse only the privately constructed immutable tensor descriptor for an exact registered characteristic-zero coefficient owner and the immutable modular image for that exact descriptor and exact prime-owner object. Equal prime integers do not identify independently owned domains. Unregistered caller descriptors receive no lookup reuse. All input coordinate, unit, Bezout, CRT/recovery and final exact divisibility/degree checks remain per request. These are quotient rings, without field capabilities. Fresh external operations construct fresh auxiliary domains; charged weak operation tables are removed at operation exit. No successful GCD flag or certificate is cached. This optimization does not authorize retry after exhaustion or change old replay methods.

The same exact operation-local table may retain a tensor-coordinate conversion for a privately owned immutable native coefficient. Ownership and resource-aware validation precede lookup. The first conversion verifies full inverse native reconstruction; its returned vector is frozen. Exact owner/value identity, not printed names or equal derivatives, keys reuse. No native reconstruction or unsuccessful conversion is cached, and every external operation starts cold. Retained coordinate vectors and lookup storage remain charged.

## Checked auxiliary prime reconstruction

Stored modular GCD witnesses specify a prime integer, not an external prime owner. Their private reconstruction may share one independently checked FactorPrimeField for that integer within the exact live operation. The same checked object is used by recorded prime enumeration and finite stored-witness verification, permitting reuse of its modular number-field image. This does not identify externally supplied prime domains. Canonical increasing recorded search coverage remains unchanged; verification of a stored integer does not enumerate new primes. Each lookup checks integer bounds first, composite inputs fail before registration, fresh operations reconstruct independently, storage is charged and cleanup removes the table.

## Algebraic construction composition prerequisite

The bounded staged dependent-residue diagnostic completes pole and local-residue work and stops during constant splitting. Internal irreducible-root/residue/integral-model construction currently invokes the public construction wrapper, opening nested fresh proof scopes and discarding useful composition state. Extract a Within helper with exactly the original ownership, monic normalization, complete irreducibility and separability checks; the public wrapper still starts a fresh operation. Change only internal calls inside the Integration kernel. Nested work keeps the enclosing cumulative counters, sticky exhaustion and operation-local authority; no mathematical check is dropped or trusted flag added. Existing version-1 construction replay and native owners remain unchanged. Producer-disabled tests must disable both public and Within constructors.

## Sparse finite-constant scalar transport prerequisite

The staged composition diagnostic completes residue splitting, relative constants, curve base change and quotient reconstruction, then spends the remaining budget in base-changed residue work. Its scalar conversion currently evaluates every polynomial by repeated Horner arithmetic in the native field. Replace this evaluation with exact coefficient transposition: for p(x)=sum_j c_j x^j and c_j=sum_i q_ij gamma^i, construct p=sum_i (sum_j q_ij x^j) gamma^i in the supplied reduced gamma basis. Transport numerator and denominator separately, then use the existing checked field division. The inverse conversion and all original basis/defining-relation/embedding checks remain. This is the same unique coordinate map, requiring no field rebasing, new normalization authority or geometric search. Polynomial and matrix dimensions are checked before allocation and only actual degrees are charged.
