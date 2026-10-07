# Recursive polynomial factorization

Milestone: `INTEGRATION-RECURSIVE-POLYNOMIAL-FACTORIZATION1`. Backend, CRITICAL root-only. Complete, 2026-10-07. Both ordered checkpoints and final repository/durable-memory checks pass for the user-authorized milestone commit.

## Boundary

Factor owned polynomials over Q and registered finite rational-function towers, including differential wrappers interpreted only as abstract fields. Return zero explicitly or a nonzero unit and distinct monic irreducible factors with exact positive multiplicities. Unsupported domains, ownership errors, malformed input, verification failure and sticky resource exhaustion cannot establish factorization.

Production remains inside the Integration core. No dependencies, application adoption or integration decisions. Supplied owners and all existing arithmetic and private-artifact interfaces remain. Implementation originally excluded staging/commits/pushes; the user subsequently authorized one milestone commit. No push is authorized.

## Prerequisites and ordered checkpoints

Existing exact immutable Q arithmetic, registered fraction adapters, polynomial division/Bézout and square-free decomposition, sparse multivariable arithmetic/content PRS, evidence codecs and resource profiles provide the foundation. Prime fields and truncated/prime-power rings use separate private types because native polynomial interfaces require characteristic zero.

Checkpoint A establishes rational conversion, deterministic good-prime Berlekamp decomposition, Frobenius irreducibility witnesses, monic p-adic lifts, complete modular-block rejection coverage and exact native reconstruction. Square-free completeness is checked by stored Bézout evidence rather than a trusted producer flag.

Checkpoint B adds coefficient-by-coefficient flattening/inverse conversion, checked denominator clearing and Gauss content, sparse square-free reduction, degree-preserving square-free specialization, sparse coordinate truncation, modular multivariable lifting and complete leading-coefficient restoration. Every terminal factor retains complete proper-subset coverage. No Kronecker encoding or implicit factor/variable limit is permitted.

## Recovery bound and completeness

For a shifted primitive integer working polynomial with partial degrees d_i and integer coefficient sum norm L, use C = 2^(sum d_i) L. The multivariate length/Mahler inequality bounds the sum norm of every primitive integer factor by C. Multiplying a lifted monic factor by the complete leading coefficient gives A*LC(B), whose partial degrees stay within those of the input and coefficient norm is bounded by C². Require modulus greater than 2C² before symmetric recovery. Primitive content removes LC(B); no factorization of the leading coefficient is needed. All bounds use exact integer arithmetic.

Good integer points and primes are enumerated deterministically without hidden stopping ceilings. Generic square-free degree-preserving points exist for primitive square-free inputs in characteristic zero; finitely many primes divide each relevant nonzero obstruction. Coprime monic factors lift uniquely in the private complete local working algebra. Every true proper factor corresponds to a proper union of specialized modular blocks; exhaustive checked recovery/division therefore establishes irreducibility after all proper subsets fail.

References: [Raab §4.3.1](https://www3.risc.jku.at/people/ppaule/theses/phd_raab.pdf), [Lee Chapters 6–9](https://d-nb.info/1036637972/34), [Amoroso–Mignotte coefficient inequalities, publisher copy](https://www.impan.pl/shop/en/publication/transaction/download/product/83613). The proof dossier records the conservative integer norm bound and its Gauss/leading-coefficient correspondence.

## Evidence and replay

The separately tagged `recursive-polynomial-factorization`, version 1, must bind the supplied owner and exact input, bound the whole artifact before nested decoding, reconstruct auxiliary proof owners and replay conversion, content, square-free, specialization, modular irreducibility, lift, recovery, subset rejection and native reconstruction identities. No factorization, prime search, Berlekamp, lifting or recombination producer may run during replay. Stored flags have no authority.

Every external operation starts fresh proof state; nested work shares cumulative accounting. Established limits: work 20 billion, allocation 1 trillion, integer bits 2,048, actual polynomial-coordinate degree 256, tower height 8, artifact depth 64, nodes 100,000, bytes 16 MiB. Denominator clearing adds no source restriction.

The private APIs are `factorRecursivePolynomial`, `verifyRecursivePolynomialFactorization`, `encodeRecursivePolynomialFactorization` and `decodeRecursivePolynomialFactorization`, each receiving the execution context, explicit polynomial owner, input and differential/artifact bounds. Unsupported coefficient owners receive a distinct `UnsupportedFactorizationDomain` typed error. Zero is explicit; constants have an empty factor list. Exact positive multiplicities remain BigInt until degree-checked conversion.

Registered immutable fraction owners reuse only already checked native zero and one inside a fresh exact operation token. Retention is charged and cleaned up at operation end. Their normalized one has itself as reciprocal. Custom/mutable domains are excluded. This does not cache proof decisions or remove validation. Recursive input and output reconstruction is checked through exact sparse cross-identities, rather than repeating nested native coefficient Euclid.

## Completion

All 697 retained core tests pass. The retained-core run included 76 new tests (773 total); nine later test-only additions are covered by the final 85-test focused run, yielding 782 covered core tests. All 80 affected adopted Integration service/result/replay tests pass. Two-worker focused verification, incremental TypeScript and scoped lint pass; final isolation, boundary, memory, file-size, diff and commit checks are recorded in the dossier.

Five representative fixtures complete serial two-warm-up/five-sample factor/verify/encode/decode observations. The depth-eight medians are 220.294 ms factorization, 111.290 ms verification, 110.097 ms encoding and 202.031 ms decoding. Separate single fixture construction takes 13,760.679 ms. These observations introduce neither timing assertions nor a performance guarantee. Exhaustive subset coverage and conservative recovery bounds can exhaust the explicit resource profile.

No Playwright applies to this private backend milestone. Completion means verified complete polynomial factorizations over registered recursive rational-function coefficient fields, with replayable irreducibility and reconstruction evidence. Recursive RDE/admission requires its own reviewed plan against these interfaces; no differential admission or elementary-integrability decision is granted by factorization.
