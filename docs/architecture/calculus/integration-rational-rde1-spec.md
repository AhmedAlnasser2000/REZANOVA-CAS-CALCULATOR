# INTEGRATION-RATIONAL-RDE1

Date: 2026-09-30
Gate: backend; CRITICAL, root-only.
Status: complete, backend-verified; user authorized the milestone commit. Verification and commit records are in the session dossier.

## Scope and prerequisites

The private solver decides `u' + a u = b` over an explicitly owned Q(x), with D(x)=1, subject to caller-supplied execution limits. It returns a complete rational affine solution space or a checked `no-rational-solution` certificate. This is not an elementary-integrability decision. There is no parser, application caller, public-result change, legacy solver change, new dependency or higher-tower RDE solver.

The existing kernel supplies immutable BigInt rationals, owned differential fields, exact polynomial/fraction arithmetic, verified GCD/Bézout and square-free decomposition, Brown subresultants, exact linear-system certificates and independent dual-number derivative checking. This gate adds the positive-integer-root prerequisite, finite-pole completeness proof, infinity bound, coefficient system, outcome checking and artifact replay. Production changes stay inside `src/lib/symbolic-engine/integration/core/`.

The approach follows the indicial/pole-order method in [Salvy, Villard and Prébet, §6.5.5](https://perso.ens-lyon.fr/bruno.salvy/data/poly-CA.pdf); signed Sturm sequences follow §11.3. No external implementation is adopted. The executable certificates below spell out the first-order specialization and hypotheses.

## Interfaces and evidence

- `solveRationalRde(ctx, owner, a, b)` constructs and verifies a decision.
- `verifyRationalRde(ctx, owner, a, b, decision)` checks supplied evidence against explicit expected coefficients and the owned base derivation.
- `encodeRationalRde(ctx, owner, a, b, decision, bounds)` verifies before encoding.
- `decodeRationalRde(ctx, owner, a, b, data, bounds)` binds values to the expected owner, reconstructs fresh auxiliary polynomial rings and replays verifiers.

The immutable decision contains its exact inputs; denominator-clearing evidence; square-free, valuation, Hasse, resultant, Sturm and component coverage evidence; universal denominator; transformed polynomial equation; degree bound; complete coefficient system and replayable elimination; final derivative evidence; and retained denominators. `solutions` carries a particular solution and zero or one homogeneous basis element, with arbitrary coefficients in Q. `no-rational-solution` carries a checked linear inconsistency witness and both completeness bounds. Resource exhaustion and failed verification never produce a mathematical decision.

Q, Q(x) and higher formal fields use distinct owned representations. Only the Q(x) differential-field constructor's `variable` kind over owned Q is accepted. Formal towers and foreign elements fail; equal printed names do not supply compatibility. The private core's application import boundary is unchanged.

## Clearing and primitive equations

For normalized input denominators d_a,d_b, a verified monic GCD gives monic LCM A. Exact polynomial quotients A/d_a and A/d_b reconstruct B=Aa and C=Ab. Two Bézout certificates give gcd(gcd(A,B),C). Multiplication identities verify division of all three entries by that common factor. A remains nonzero.

The stored quotient polynomials and reconstruction identities are exact-division evidence; replay does not repeat the producing denominator-clearing algorithm. A zero B or C has explicit zero-polynomial handling.

## Finite-pole completeness

For a solution pole at a root alpha, write ord_alpha(A)=s and ord_alpha(B)=t. If its order is m>0, the leading orders of A u' and B u are s-m-1 and t-m. C is polynomial and hence regular there.

- Away from A's roots, the derivative has a strictly lower order than B u, so no solution pole is possible.
- If t<s-1, B u alone has the lower order. A negative value is impossible, hence m<=t.
- If t>s-1 (including B=0), A u' alone has the lower order, hence m<=s-1.
- If t=s-1, poles m>s-1 require cancellation: `B^[s-1](alpha) - m A^[s](alpha)=0`.

Here Hasse derivatives obey `j P^[j] = (P^[j-1])'`. Stored lists start at P, and replay checks every recurrence. Square-free decomposition of A partitions roots by s. Successive verified GCDs with B^[0],...,B^[s-1] partition each square-free factor by exact t<s and a remaining t>=s component. Each quotient reconstructs its parent; disjointness follows from square-freeness and the verified GCDs. This covers all roots without irreducible factorization.

For a resonant component F, Bézout evidence proves A^[s] is a unit modulo F. Therefore `R_F(m)=Res_x(F,B^[s-1]-m A^[s])` is a nonzero polynomial: its coefficient of m^deg(F) is a nonzero product of local leading coefficients. The existing Brown certificate verifies the exact resultant, including scaling/indices. Complete positive integer roots are then certified independently of the search.

For each such integer m, `gcd(remaining F, B^[s-1]-m A^[s])` selects precisely its roots. These components are disjoint because A^[s] is a unit, and replay checks that every integer root has its split. Assign exponent max(s-1,m); leftover roots receive s-1. Nonresonant valuation components receive t or s-1 as above. The monic product U therefore contains the normalized denominator of every rational solution. U need not be minimal.

## Complete positive integer roots

Verified square-free decomposition supplies the monic square-free part p, preserving distinct roots. Its signed Sturm chain starts p,p'; every subsequent entry is the negative of a certified division remainder, without sign-changing monic normalization. Degrees strictly decrease and the final nonzero entry is constant; the last stored division has zero remainder. Nonzero constant inputs use p=1 and a one-entry chain. Zero input is invalid.

The exact Cauchy bound is `H = 1 + max_i ceil(abs(c_i/lc(p)))`, with zero maximum for a constant. All positive integer roots lie in [1,H]. BigInt division/remainder computes the ceiling; no floating-point approximation or integer factorization is used.

Search iteratively bisects integer intervals [l,h] into [l,mid] and [mid+1,h]. A non-singleton can be discarded only when `V(l-) - V(h+) = 0`. One-sided signs at an endpoint are computed from the first nonzero derivative there, with odd-order sign reversal on the left. This includes boundary roots correctly without numerical perturbation. Singleton intervals use exact evaluation; noninteger roots between adjacent integers need no further subdivision.

The artifact contains a flat, ordered partition of [1,H]. Replay checks exact coverage with no gaps/overlaps, endpoint variations and each exclusion or singleton result, then checks that the root list matches all successful singletons exactly. It does not rerun bisection. Tests cover repeated/noninteger/negative roots, endpoint roots and a 10^25 bound with fewer than 100 retained intervals.

## Infinity and the finite system

Substitute u=P/U to obtain F P' + G P=H with F=AU, G=BU-AU', H=CU^2. Checked multiplication and a common-GCD certificate verify the primitive transformed triple; no solution changes in Q(x).

Set delta=max(deg F-1,deg G), treating G=0 separately. F is nonzero. The coefficient of degree n+delta for a leading monomial x^n is the nonzero polynomial

`L(n) = [deg F-1=delta] lc(F)n + [deg G=delta] lc(G)`.

If L(n) is nonzero, a nonzero polynomial solution requires n=deg H-delta and H nonzero. If L(n)=0, n must be its nonnegative integer root. The linear resonance is solved exactly in Q; no root is rounded. The largest nonnegative candidate is N, or N=-1 if there is none. Constants and F constant/G zero (delta=-1, resonance n=0) are handled explicitly.

Every solution thus has P of degree at most N. Column j is the coefficient vector of F(x^j)' + Gx^j, for every j=0,...,N. Every required coefficient equation from these images and H is included. Replay checks dimensions, every polynomial column identity and the RHS. N=-1 yields zero columns; explicit dimensions distinguish it from the zero-row system for u'=0.

Existing deterministic Gauss–Jordan certificates replay row operations and verify the complete nullspace or a left inconsistency witness. Mapping coefficient vectors to P/U is checked exactly, and independent dual-number derivative verification establishes `u0'+a u0=b` and `h'+a h=0`. The Q(x) constant field is Q; any two nonzero homogeneous solutions have derivative-zero ratio, so the homogeneous dimension is at most one. The verified finite nullspace supplies completeness, not this dimension assertion alone.

A negative answer is authoritative only after denominator coverage, infinity bound, matrix reconstruction and inconsistency all pass. In particular, u'=1/x has no rational solution even though its primitive is elementary outside Q(x).

## Replay, conditions and resources

Artifact tag: `rational-rde-decision`, version 1. Exact coefficients and mathematical integer bounds are string-valued integers. Auxiliary ring ownership is reconstructed, never serialized. All nested evidence uses strict schemas and canonical scalars/polynomials/fractions. No context, callback or trusted-success flag is accepted. Fresh replay verifies the explicit expected inputs and all certificates; producer-disabled tests cover the solver, root search, denominator/degree/matrix construction, linear solver, resultant producer and derivative producer.

The existing differential-artifact bounded traversal was extracted into the private `artifact-bounds.ts` helper; its behavior and existing codec formats remain unchanged. Traversal bounds precede decoding and reject cycles, accessors, sparse arrays, unknown fields, excessive depth, nodes and bytes. Existing exact, primitive, rational-decision and differential formats are retained.

Original normalized coefficient denominators and actual normalized solution denominators are retained separately. **U is a proof device, never an additional source restriction.** Pre-normalization expression exclusions remain outside this backend boundary.

All arithmetic, verification, search and decoding use the same supplied execution context and sticky resource failure. Pole orders, candidate integer roots and degree bounds remain BigInts until checked conversion to array dimensions. No required bound is truncated. The initial test profile is work 20,000,000,000; cumulative allocation 1,000,000,000,000; integer bits 2,048; degree 256. Artifact bounds are depth 64, nodes 100,000, bytes 16 MiB. These are adjustable safeguards, not mathematical completeness ceilings or RAM measurements. No application defaults change.

## Verification and follow-up

The focused core suite passes 240 tests in 20 files with two workers: 178 retained and 62 new. Coverage includes known positive/negative fixtures, affine families, repeated and irregular poles, quadratic factors, distinct integer resonances within one square-free factor, seeded derivative-constructed equations, oversized proved bounds, mutation of completeness/linear/derivative evidence, strict replay and final-check exhaustion. Measurements and exact workflow evidence live in the 2026-09-30 `integration-rational-rde1` dossier.

Outcome: **verified rational RDE solution spaces and no-rational-solution certificates over Q(x), with replayable completeness evidence**. Parameters, families of RHSs, equations over higher towers, general elementary decisions and app adoption remain later work. A bounded hyperexponential integration decision is a plausible next gate, but its Liouville reduction/negative authority and result representation need their own reviewed plan. The roadmap remains subject to change when necessary.
