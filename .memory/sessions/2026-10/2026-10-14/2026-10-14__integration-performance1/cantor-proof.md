# Cantor arithmetic prerequisite

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

## Scope and prerequisites before activation

Use a certified actual constant field C of characteristic zero and a checked
native quadratic presentation y^2=H(x), with H square-free of odd degree 2g+1.
The native tower and its original relations remain unchanged. Full curve,
constant and basis authority comes from the existing field/divisor machinery.
This checkpoint does not activate balanced even-degree arithmetic or integration.

The arithmetic reference is the author's corrected Chapter 10 of
[Galbraith, Mathematics of Public Key Cryptography](https://www.math.auckland.ac.nz/~sgal018/crypto-book/ch10.pdf),
Theorem 10.3.14, Lemmas 10.3.17/20/24 and Theorem 10.4.1. Reduce v modulo u
after composition; do not copy the missing reduction in the displayed equation.
The explicit stored witnesses and degree-safe arithmetic below are our derivation.

## Representation, composition and functions

Retain u monic, deg(v)<deg(u), and q with H-v^2=u*q. The smooth affine order
C[x,y] is integrally closed: its coordinate ring is regular of dimension one.
The ideal (u,y-v) is a complete affine effective divisor with norm u. At a
branch point its multiplicity is at most one, since H is square-free and
u divides H-v^2. Its degree-zero representative subtracts deg(u) times the
unique rational ramified infinity place. This uses closed places and works over
C; it does not assume that roots or residues are rational.

For two pairs, retain two complete GCD/Bézout certificates giving
d=gcd(u1,u2,v1+v2). Write d=s1*u1+s2*u2+s3*(v1+v2).
The composition has U=(u1/d)*(u2/d) and
V=(s1*u1*v2+s2*u2*v1+s3*(v1*v2+H))/d modulo U.
The equivalent expression
V=v2+(u2/d)*(s2*(v1-v2)+s3*q2) modulo U avoids constructing a large numerator.
Both complete GCD certificates and H-V^2=U*Q establish all cancellation and
ideal-product coverage. Its function d(x) has divisor
class(pair1)+class(pair2)-class(composition).

For reduction, retain U=monic(q), V=-v modulo U and the complete new norm
quotient. Its function (y-v)/U has divisor class(old)-class(new). Because H
has odd degree, the pole orders of v and y have different parity, so their
leading terms cannot cancel at infinity. If deg(u)>g, the next degree is
max(2g+1,2deg(v))-deg(u)<deg(u). Verify that decrease and every transition.
Stop only when deg(u)<=g. The reduced representation is unique, so equality
of pairs is complete class equality and (1,0) is precisely the principal class.

Signed binary multiplication retains every double/add and the negative
conjugation function u(x). Function factors remain native, ordered and carry
exact integer exponents. Verify the accumulated divisor identities without
expanding powers. An expansion is separately bounded.

## Native place correspondence and replay obligations

Reverify each owned maximal ideal and its complete residue map. At finite
residue degree one, recover v in C[x]/p from the residue of native y, and verify
inverse reconstruction. The ideal (p,y-v) is contained in the supplied maximal
ideal and has the same residue degree; this proves equality. At residue degree
two, the sole unramified place equals p times the affine order and its complete
degree-zero divisor is principal, with function p(x). At infinity verify u=0,
ramification two, residue degree one and complete quadratic degree coverage.
Every supplied divisor entry must occur in the ordered transport.

The codec retains the full curve and original request plus native model,
place transports, complete GCD identities, norm quotients, reduction and binary
coverage, factors and conditions. Cold replay verifies evidence without model,
place, factorization, Cantor GCD/composition, linear, divisor-reduction or
integration producers. Existing exact fraction-normalization arithmetic remains
charged; it is not a geometric or Cantor search.
No cached flag establishes authority.

## Resource obligations

Check degrees/dimensions before allocation. Stream H-v^2 and product-congruence
coefficients when their virtual degree exceeds that of the values being built;
do not instantiate a polynomial beyond the actual-value degree budget just to
verify an identity. Charge all streaming arithmetic, conversions and retained
proof storage. A failed/exhausted arithmetic obligation has no class decision
authority and never selects an alternate algorithm.

## Finite class-order prerequisite

The same exact identities apply over registered finite fields of odd
characteristic. Recheck all prime/Frobenius constructions, cardinalities and
square-freeness; share only arithmetic operations and codec structures. The
smooth odd-degree model is geometrically integral and has one rational infinity
place, hence has its stated finite field as full geometric constants. This is
a geometric argument, not a zero-derivative test.

For order search use the existing checked integer Hasse--Weil upper bound U and
s=ceil(sqrt(U)). Store j*A for 0<=j<s, then compare k*s*A with the table for
1<=k<=ceil(U/s). Every integer 1<=n<=U occurs as k*s-j in this range. Exact
owned finite coefficient indices form the table key; confirm full coordinate
equality on a match. An annihilating candidate can be reduced by its complete
prime factorization. Terminal replay needs only its checked annihilating
multiple, complete prime factorization and nonzero class for every n/prime,
not the search table. All binary reductions retain exact factored function
witnesses, proving principality for the annihilator. The prime-quotient tests
establish the least order. An incomplete search or resource stop is a typed
failure, never an absence result.

This abstract finite model does not yet assert correspondence with an arbitrary
supplied reduced curve/divisor: that transport must independently verify its
proper-curve, presentation and place maps before this order certificate is used
in characteristic-zero torsion decisions.

For that transport, recheck the supplied reduced proper smooth model, both
maximal orders/gluing and its complete global-function space. Verify the
completed-square odd-degree equation in its original full basis and agree on
genus. Reuse only the same closed-place quotient-dimension argument, through
the reduced owned residue maps. Every divisor entry maps to its Mumford class
with the retained function correction. The final order witness is the class
correction raised to the exact order times the annihilator's Cantor function.
Prime-quotient nonzero classes exclude principal quotients of the original
divisor. The enclosing good-reduction codec must retain the full model and
specialization; the small composition codec alone does not grant that authority.

The characteristic-zero consumer keeps the existing two-reduction theorem:
for a torsion class, the least order is the LCM of its exact orders in two
different residue characteristics, by prime-to-characteristic injectivity.
An additional certified reduction whose order does not divide that LCM proves
non-torsion. Otherwise decide the derived multiple by complete native Cantor
principality. A principal class has order one directly; nonzero degree proves
non-torsion. These rules apply over the certified actual number-field constants
and do not apply rational torsion classifications to larger constant fields.
They decide divisor torsion, not integrand non-elementarity.

## Verified subsidiary checkpoint

- Registered rational/number-field Mumford arithmetic, exact cancellations,
  signed binary coverage and decreasing reduction pass independent elliptic and
  genus-two fixtures, mutations, ownership, fresh/exhaustion and producer-disabled
  checks. Norm and Bezout identities stream their complete coefficients.
- Native odd-degree models retain full original relations and inverse basis.
  Split, inert, ramified and nonrational places transport through the actual
  residue maps. Factored functions agree with independently computed complete
  principal divisors; the established hidden-constant tower also passes.
- Positive and negative principality replay retains complete coverage, fresh
  auxiliary domains and request order; missing coverage, changed constructions,
  residues, factors, restrictions and flags are rejected. Version-1 checks remain.
- All declared warm-ups and samples finish for the closed-place positive and
  negative subsidiary cycles. Raw records stay ignored at
  `.task_tmp/2026-10-14__integration-performance1/measurements/cantor-principality-initial.json`.
  These are not the full Schultz integration targets.
- An attempted constant-last elliptic fixture, y^2=x^3+1 followed by beta^2=2,
  exhausted integer-product bits in existing Trager/multivariable factorization
  before constant/curve construction. Its initial failed log is retained at
  `.task_tmp/2026-10-14__integration-performance1/cantor-native-tests.log`.
  It supplies no mathematical negative. Modular arithmetic/factorization
  performance remains an unresolved obligation; the fixture was not retried.
- Separate finite prime/extension-field Cantor arithmetic and exact class orders
  pass signed and producer-disabled replay checks. Independent F3/F9 point
  counts establish the genus-two order-seventeen acceptance fixture. Complete
  reduced-curve transport checks proper models, geometric constants and full
  owned residue maps, including inert/nonrational places; native principal
  witnesses agree with the original general principal-divisor procedure.
- Complete odd-degree characteristic-zero torsion retains direct principality,
  two exact good reduced orders, the third-reduction obstruction where present,
  and native principal multiples. Positive, negative and direct/degree branches
  pass producer-disabled full artifacts, evidence mutations and resource checks.
  This is divisor authority, not an integrand non-elementarity decision.
- All finite-order and composed positive/negative torsion subsidiary cycles
  finish their warm-ups and samples. Raw records stay ignored at
  `.task_tmp/2026-10-14__integration-performance1/measurements/cantor-finite-order-initial.json`
  and `ramified-cantor-decisions-initial.json` in that directory. Shared finite
  construction and polynomial/codec helpers preserve the existing Pell formats.
- Gate 2 remains incomplete: balanced even-degree Cantor arithmetic,
  full integration assembly, complete compact negatives, broader arithmetic,
  final control/target and app-visible regression acceptance remain pending.
