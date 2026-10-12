# Algebraic field foundation

Status: verified 2026-10-12; both ordered CRITICAL root-only backend Gates A/B pass. Containing milestone commit authorized 2026-10-13 after repository lint/build passed; no push.

## Contract

INTEGRATION-ALGEBRAIC-FIELD1 has two ordered backend gates. A establishes owned irreducible algebraic extensions of Q(x), auxiliary number fields, exact arithmetic, explicit embeddings, independent derivatives and complete nested factorization. B establishes polynomial-module infrastructure, complete finite/infinity integral bases and the full constant field for every supplied tower prefix. A alone does not certify constants. No integration decisions or application adoption are activated.

Native owners and their order remain unchanged. Formal algebraic roots are single abstract field generators, not principal radicals or all-root binders. Equality of names or derivatives establishes no embedding. Reducible square-free quotients remain rings. Original relations and checked monic normalization survive serialization.

## Gate A authority

AlgebraicField is privately registered, holds immutable construction evidence and owns reduced power-basis values. Its field capability requires complete parent-field irreducibility evidence. Zero/constants/reducible/repeated relations are rejected; linear extensions are supported. Base domains are closed native Q/Q(x) owners; formal exp/log owners are excluded.

Nested polynomial factorization uses deterministic integer shifts, square-free norm resultants, complete parent factorizations and checked GCD correspondences. A square-free norm and its complete irreducible factorization prove irreducibility of each recovered component; reconstruction alone does not. Degree-one irreducibility uses its exact algebraic rule. See [Trager 1976](https://www.cecm.sfu.ca/~monaganm/teaching/TopicsinCA09/TragerFactor.pdf).

The unique derivation of an algebraic generator is -(D_parent P)(a)/P_y(a). Separability and checked quotient inverses authorize it. Explicit target derivatives are independently verified with dual-number Horner evaluation. Reduced parent-field elements use checked parent coefficient derivatives without rebuilding an unused generator tangent; this also handles degree-one extensions. Norms retain Brown PRS evidence and are checked against multiplication-matrix elimination; traces are checked by multiplication columns and Newton sums. Embeddings require parent maps and exact root images; injectivity follows from irreducibility over the embedded parent.

## Gate B authority

Auxiliary primitive-element models preserve two-way conversion to the supplied tower. Exact polynomial modules retain complete unimodular transformation evidence. Integral closure uses complete trace radicals and idealizers at discriminant primes, with discriminant-index descent and terminal maximality coverage. See [Abelard, section 3](https://arxiv.org/html/2005.03964).

Constants are the intersection of integral closures over Q[x] and Q[1/x]. Finite coefficient bounds come from an exact transition matrix at infinity, never a trial degree. Complete rational kernels establish spanning. Independent derivatives, multiplication closure, a rational primitive polynomial and exact embedding establish the returned number-field structure. Constants may grow; no automatic Q label or tower rebasing is permitted.

## Replay and resources

New version-1 tags: algebraic-field-construction, algebraic-field-value, algebraic-derivative, algebraic-polynomial-factorization and algebraic-constant-field. Existing artifacts and guards remain unchanged. Entire artifacts are bounded before nested decoding; values bind to explicit expected owners and full relations. Replay checks stored evidence without producer search. Original construction/input denominators and returned representatives retain ordered provenance; auxiliary proof transformations create no source restrictions.

Fresh operations share cumulative accounting. Limits remain work 20 billion, allocation 1 trillion, integer bits 2048, polynomial degree 256, construction height 8 including the variable, artifact depth 64, nodes 100000 and bytes 16 MiB. Actual auxiliary polynomials obey the degree budget. Exhaustion is sticky and gives no certification.

## Verification

Each gate requires focused two-worker tests, incremental TypeScript, scoped lint, isolation, OOE/compartment, memory/file-size and diff validation. Preserve 1005 established core tests and affected Integration coverage. Representative serial observations use two warm-ups and five samples with fresh proof state. No UI/Playwright gate belongs to this private foundation. Commit/push require separate authorization. Next: separately reviewed INTEGRATION-ALGEBRAIC-DECISION1.

## Implemented constant-field construction

Polynomial row Hermite certificates use only unimodular swaps, polynomial row additions and nonzero rational-unit scalings. Zero rows of the transformation give a complete polynomial kernel. Trace kernels over certified Q[x]/p residue fields generate the full preimage lattice with p times the old basis. The idealizer conditions are stacked multiplication matrices in that lattice. Clearing their common denominator and taking row Hermite form H proves that the complete idealizer coordinates are d H^-1 Q[x]^n. Checked inclusions and discriminant-index identities prove strict descent or terminal lattice equality.

Finite and infinity bases are converted back to the same theta presentation. If A transforms infinity coordinates into finite coordinates, each finite polynomial coefficient has degree at most the maximum infinity degree of its row in A. Complete divisibility remainders and rational elimination give the full intersection. Both directions of this bound and mapping are verified. A full-rank rational primitive element then gives the exact number field and inverse coordinates; prefix inclusions and independent product/derivative checks preserve supplied owners.

The constant-field codec uses bounded checked shared-data graphs. Repeated references carry no authority. Verification reuse is restricted to immutable evidence, the exact expected owner, rule and bounds in one fresh operation, and is charged and cleared. Distinct verification rules cannot reuse each other's checks.

Verified evidence: 73 new always-on tests plus sixty affected regressions (132-test focused gate plus the final number-residue-field regression), targeted deltas and separate serial measurement harnesses. Full checkpoint and completeness evidence is retained in the milestone dossier. Repository lint/build pass at the authorized 2026-10-13 commit checkpoint.
