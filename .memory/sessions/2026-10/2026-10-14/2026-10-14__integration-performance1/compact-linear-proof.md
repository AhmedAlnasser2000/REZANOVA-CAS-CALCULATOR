# Compact exact linear evidence — prerequisites and proof obligations

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

## Status and source

Backend prerequisite inside the approved performance gate. Distinct rational rank/kernel production, standalone verification and bounded codecs now pass focused checks. Composition with registered recursive coefficient comparison also passes. Existing decision families are not yet switched to the new evidence type; compact composition remains subsequent work within this gate. Existing Gauss–Jordan APIs and version-1 formats remain unchanged. Rational arithmetic, owned prime arithmetic, checked rational reconstruction, bounds and existing exact-input codecs are established prerequisites.

Use fraction-free rank elimination following [Bareiss (1968)](https://www.ams.org/mcom/1968-22-103/S0025-5718-1968-0226829-0/S0025-5718-1968-0226829-0.pdf), and deterministic Dixon lifting on the selected nonsingular block. The [author-hosted Eberly–Giesbrecht–Giorgi–Storjohann–Villard paper](https://cs.uwaterloo.ca/~astorjoh/eggsv.pdf), introduction, restates the classical precomputed modular inverse/digit/refinement procedure. No conjectural sparse projections or randomized absence claim is adopted. The [author-hosted rational reconstruction paper](https://cs.uwaterloo.ca/~astorjoh/issac11ratrecon.pdf), section 5, states the inverse-image reconstruction/exact-residual principle; this implementation must always check exact residuals.

## Rank and family authority

For A with m rows and n columns, retain distinct row indices I and increasing column indices J of size r, and an exact inverse of B=A[I,J]. The identity B*B_inverse=I proves rank at least r. Retain n-r exact kernel vectors whose free-coordinate submatrix is the identity. Their independent annihilation by all of A proves nullity at least n-r, hence rank at most r. Together these prove exact rank and complete kernel coverage without elimination search during replay. These arguments include r=0, zero rows and zero columns; the empty inverse has no fabricated nonzero pivot.

A particular solution must satisfy every original row; setting free coordinates to zero fixes a canonical representative. If the candidate from the selected rows fails at row k, use w=e_k-A[k,J]*B_inverse applied to the selected row coordinates. The complete kernel correspondence proves w*A=0; the verifier checks that identity directly and requires w*b nonzero. Negative authority comes from this rational inconsistency witness, never from a failed solve or prime.

## Production and termination

Clear positive rational row denominators by exact LCM and inverse reconstruction. Bareiss elimination only selects a rank block; every division uses an exact checked remainder and pivots increase. For this certified nonsingular integer block enumerate primes deterministically until its modular inverse exists. Its nonzero determinant has only finitely many prime divisors.

For A_integer*X+p^k*R=I, compute digit H=A_integer_inverse*R mod p, then X_next=X+p^k*H and R_next=(R-A_integer*H)/p. Checked divisibility preserves the identity. Reconstruct rational entries from the increasing modulus and accept only when exact multiplication gives I. Cramer bounds and rational reconstruction imply eventual recovery for a nonsingular block. No fixed lifting or prime-trial ceiling is permitted; actual integer sizes and cumulative limits can stop the operation without a mathematical answer.

## Compact replay and resources

Store the complete original request, rank block/inverse, canonical independent kernel, and particular solution or inconsistency row in a distinct tagged artifact. Modular/lifting search history is not needed for authority because the exact output identities prove rank, independence, spanning and outcome. Replay uses only ownership, dimensions, exact products and canonical coefficient checks. Bound the whole artifact first. Check all dimensions before allocation, charge temporary matrices and every reconstruction, and keep every external operation fresh. No old certificate with missing operations/reduced rows is manufactured.

## Verification checkpoint

- Six new focused checks cover rectangular/dependent/empty requests, pure kernel freedom, terminal inconsistency, rational denominators, independently recorded bad-prime rejection, pivot changes, seeded matrices, large exact coefficients, immutable operands, foreign rational copies, rank/inverse/kernel/particular/witness mutations, fresh cumulative scopes and sticky resources.
- Positive and negative saved replay pass with compact, p-adic, prime and elimination producers disabled. Missing coverage, altered request, extra trusted flag and malformed bounds are rejected. Existing Gauss–Jordan and recursive descent tests remain (`compact-linear-descent-tests.log`, 21); the final bad-prime/ownership delta and benchmark acceptance tests pass (`compact-linear-final-tests.log`, 10). Incremental TypeScript and scoped lint pass.
- Positive and inconsistent rank-eight Vandermonde-product observations complete two warm-ups and all five fresh serial construction/solving/verification/encoding/decoding samples. These are subsidiary observations, not substitutes for named hard targets. Raw counters, timings, memory and artifact sizes remain ignored in `measurements/compact-linear-rank-block.json`. No timing assertion or new resource ceiling is introduced.
- Existing field, complete constant authority, constant saved replay, splitting and isolation refresh passes (`composition-retained-replay-refresh.log`, 45). Memory, file-size, OOE and compartment checks pass. No performance gate completion, staging, commit or push.
