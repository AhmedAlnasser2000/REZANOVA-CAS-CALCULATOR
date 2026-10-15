# Polynomial Pell prerequisite

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

## Scope before activation

Build exact continued-fraction evidence for monic square-free H of positive even
degree over a registered number field C. The subsidiary request asks for a
nontrivial p+q*sqrt(H), q != 0, with constant nonzero norm and deg(p) <= B.
B is explicit and exact; a bounded negative means only that no such unit exists
through B. It does not establish non-torsion without a complete outer bound.

Source: [Pappalardi and van der Poorten, Pseudo-elliptic Integrals, Units, and
Torsion](https://www.cambridge.org/core/services/aop-cambridge-core/content/view/070393D1DE619F5C17F98B2D41BEBD17/S1446788700010934a.pdf/pseudoelliptic_integrals_units_and_torsion.pdf),
§§2.3 and 4. The primary PDF/text remains ignored in the task directory. The
stored-identity and bounded-coverage design below is an independent derivation.

## Formal expansion and identities

Let deg(H)=2m. Retain A0 of degree m, leading coefficient one, with
deg(H−A0²)<m; this uniquely identifies the polynomial part of the formal Laurent
root with leading term x^m. It selects no numerical or principal radical branch.

Starting P0=0, Q0=1, retain every quotient and exact transition:

- Ai=floor((A0+Pi)/Qi).
- Pnext=Ai*Qi−Pi; Qi*Qnext=H−Pnext².
- pi=Ai*p_previous+p_previous_previous; likewise for qi.
- pi²−H*qi²=(−1)^(i+1)*Qnext.

Verify polynomial divisions and complete coefficient identities independently.
Subsequent partial quotients have positive degree, so convergent degrees strictly
increase. A constant Qnext gives a unit; prior nonconstant norms exclude earlier
units. Keep the actual norm in C*, without extracting a constant root or forcing
norm one.

## Completeness through the explicit bound

Every nontrivial constant-norm pair satisfies deg(p)=deg(q)+m, and p/q
approximates the formal root with error degree −(2*deg(q)+m). The elementary
continued-fraction best-approximation criterion places it among these
convergents. This criterion uses only the degree valuation, so the characteristic
zero number field need not be ordered or algebraically closed.

Thus the first constant norm has least positive degree. To certify bounded
absence, retain all convergents through B and the next complete quotient. Its
positive-degree numerator recurrence proves the next convergent degree exceeds
B; it need not construct an irrelevant polynomial exceeding B or the execution
profile. If B<m, the universal lower bound m proves bounded absence directly.
Otherwise strict degree increase gives finite termination through B, subject to
sticky resource exhaustion. No fixed trial ceiling or uncharged alternative.

## Subsequent curve composition

The same continued-fraction identities and degree-valuation argument apply over
finite fields of odd characteristic. Reuse only their arithmetic ritual through
an explicit operations interface. Positive-characteristic owners retain their
own registrations and types; do not cast them to ExactField or PolynomialRing.
Finite extension defining/Frobenius evidence and the supplied polynomial's
square-freeness remain mandatory. A bounded negative is still only bounded
absence until the reduced-curve correspondence and complete Jacobian bound have
been verified. This is the next prerequisite for infinity torsion reductions.

For principality of k*(Pplus−Pminus), the complete bound is abs(k), without
finite-field work. The smooth square-free affine model has integral closure
C[x,Y], Y²=H. A function with no finite zeros or poles and its inverse both
belong to this order; its norm is a nonzero constant. Thus its two polynomial
coordinates solve Pell, and its pole degree is exactly abs(k). Constant units
have zero divisor. The complete continued-fraction prefix either proves no
unit through abs(k), or produces the fundamental unit of degree N. Valuation
maps the infinity-supported unit group modulo C* into Z, hence its image is
N*Z. The requested divisor is principal exactly when N divides k. Return the
fundamental unit to the exact signed exponent −k/N, retaining factored output.
This is complete principality authority, not a negative torsion test.

For a certified good reduced curve, reverify proper smoothness, geometric
constants via complete global-function evidence, and the original reduced
quadratic presentation. Check its square-free monic even-degree H and both
infinity residue signs. The existing exact integer Hasse--Weil Jacobian bound
then bounds the order of Pplus−Pminus. Solve finite Pell through that complete
bound; bounded absence is a verification failure, never a finite-group negative.
The first norm unit has fundamental degree N and proves least order N. For the
requested k-fold class its order is N/gcd(N,k). Retain prime factorization and
every prime-quotient nondivisibility witness, with the signed factored unit as
the principal witness. This replaces reduced class search only for this checked
two-infinity structure. General finite divisors still need Cantor/Hess coverage.

Retain an additional certified reduction in a characteristic distinct from both
original characteristics. If its exact order does not divide the candidate M,
then M*D remains nonzero after specialization. A characteristic-zero torsion
class would have order exactly M by the two-reduction theorem, contradicting
that specialization. This supplies the selected finite-field non-torsion
certificate without characteristic-zero principal computation. If it divides
M, make no positive inference; finish the complete native bounded-Pell check.
All three orders, complete specializations and good-reduction hypotheses remain
replay premises. This is a proof rule, not a heuristic or a stopped search.

For a certified split even-degree hyperelliptic presentation, norm units have
support only at the two infinite places. Native conversion, their residue data,
pole degrees and constant norm must prove the exact signed divisor. A supplied
divisor k*(Pplus−Pminus) has least order N/gcd(N,k), if N is the fundamental
unit degree.

For a complete negative torsion decision, two independently certified reductions
first provide M for the requested divisor. Use the mathematically derived
B=abs(k)*M; verified bounded absence then excludes principality of M*D through
the existing two-reduction theorem. The finite two-infinity Pell composition now has focused native/replay evidence; general Cantor and broader integration dispatch remain unactivated. A continued-fraction stop never
authorizes absence. Preserve the complete general path until its new successor
has all prerequisites and codecs verified.

## Verified subsidiary checkpoint

- Formal continued fractions, complete bounded negatives and first-unit minimality pass independent degree-29 numerator and degree-28 absence fixtures. Number-field norms, adversarial evidence, fresh/exhaustion and producer-disabled codecs pass.
- Split native models preserve original coefficients, monic normalization and full inverse basis. Infinity residue data distinguishes both places; exact norms/inverses and complete support prove the signed unit divisor. Low-degree native units agree with independently constructed principal divisors.
- Derived-bound principality passes complete signed/large multiple and positive/negative replay checks. Its distinct version-2 format does not fabricate legacy RR space evidence.
- The order-29 principality subsidiary completes serial construction, solving, checking and replay observations; raw measurements remain ignored. General torsion negatives still require complete outer reduction evidence, and full integration dispatch/acceptance is unfinished.

- Finite prime/extension-field Pell and complete reduced two-infinity order evidence pass independent norm/divisor, mutation and search-free replay checks. Composed three-reduction non-torsion and positive two-reduction/native-Pell certificates retain full proper-curve, constant and specialization premises. The concrete non-torsion companion has reduced orders 7, 9 and 4; its third order does not divide the two-reduction candidate multiple. This is exact certificate data, not a small-multiple search or timing report.
- Complete order-29 and negative subsidiary cycles finish all declared samples under the watchdog/profile; detailed measurements remain ignored. Neither broader torsion dispatch nor the full Schultz integration gate is complete.
