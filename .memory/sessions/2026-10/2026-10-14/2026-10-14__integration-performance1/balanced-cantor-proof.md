# Split even-degree balanced arithmetic and native principality

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

## Prerequisites and scope (backend)

Registered exact rational/number fields, separate certified finite fields, complete polynomial arithmetic and Bézout verification already exist. Native transport additionally requires the certified actual constants, complete quadratic curve correspondence, maximal orders and explicit place residue maps. Existing odd-degree Cantor guards and formats remain separate. No generic ring receives field authority.

For a square-free split model y²=H of degree 2g+2, retain a supplied leading square root and polynomial parts H+ and H−. Check H−=−H+, the distinct leading roots, and the complete identity H−(H+)²=R with deg(R)≤g. Characteristic two is unsupported by this representation. Characteristic-zero and finite domains have separate private registries/construction checks; finite extension coefficients are supported. Native curve transport currently uses the existing monic split-model correspondence, so it does not broaden that model's applicability guards.

## Representation and termination

With a=ceil(g/2) and b=floor(g/2), represent the degree-zero class by an affine semireduced pair (U,V), plus coefficient n at infinity+, and coefficient g−deg(U)−n at infinity−, then subtract a infinity+ + b infinity−. The canonical range is deg(U)≤g and 0≤n≤g−deg(U); the neutral class is (1,0,a). Norm/divisibility, coefficient ownership and all counterweights are checked exactly.

The model, ordinary/infinity reductions and uniqueness are based on [Galbraith–Harrison–Mireles Morales, Proposition 1 and Algorithms 2–4](https://www.math.auckland.ac.nz/~sgal018/ANTS08.pdf). The retained proof below gives our exact normalization and native transport consequences. The author's PDF was read and its algorithm pages rendered/inspected in ignored task storage; a later web refresh timed out and did not supply additional authority.

Each flip retains interpolation W, (H−W²)/U, the next monic U and V=−W modulo that U. For W with leading term +A x^(g+1), the counterweights are deg(U)−g−1 and g+1−deg(U_next); swap them for −A. Otherwise both weights equal half the affine-degree difference. Verify the full streamed coefficient identity, resulting pair and both weights. Ordinary reduction strictly decreases affine degree. Infinity interpolation uses H±+(V−H± mod U) and produces affine degree at most g.

Our infinity-loop measure is the smaller of n and m=g−deg(U)−n. Once deg(U)≤g+1, n+m≥−1, hence at most one is negative. Select H+ when m is deficient; then n_next=−1−m≥0 and m_next=m+g+1−deg(U_next)>m. The other sign is symmetric. Thus each unfinished step strictly increases the negative integer measure; no trial ceiling is used. Every ordered flip, sign and measure is independently replayed. Signed binary multiplication retains its inverse and every double/add bit, including zero.

Leading cancellation is checked before applying the degree budget to a norm quotient. The streamed virtual numerator is not instantiated as a polynomial or used as an artificial degree bound. The old odd-degree verifier retains its stricter noncancelling norm-degree check.

## Native places, functions and principality

Every place is interpreted using its complete owned residue map. Infinity signs are the residues of y/x^(g+1), with e=f=1. A finite relative-degree-one place gives the exact ideal (p,y−V), including ramification; complete residue dimensions prove equality. A relative-degree-two inert place is pO by the verified dimension/vanishing diagram. These are ideal correspondences, not guesses from printed coordinates or arbitrary horizontal lifts.

Transport each place as P−deg(P) infinity+. Finite split places start at n=a−deg(p); inert places give div(p) plus the class −deg(p)(infinity+−infinity−). Infinity+ transports to zero and infinity− to its difference from infinity+. Summing a degree-zero request cancels every introduced base divisor. Retain each place normalization, signed multiple, addition, resulting canonical class and native factors.

For our convention y=V on the affine support, each reduction contributes (y−W)/U_next; composition contributes its cancelled polynomial gcd. Inversion contributes its retained normalization function divided by the original U. Verify the factored product term by term without expanding powers. Independently expanded small acceptance witnesses match complete principal divisors, including both infinities and a ramified nonrational place.

Nonzero degree proves nonprincipality. For degree zero, uniqueness of the balanced representative identifies the principal class exactly with (1,0,a), yielding `hyperelliptic-balanced-principality-v1`. This is principality authority only; it does not claim torsion or integration non-elementarity.

## Replay and checkpoint evidence (2026-10-15)

- Separate bounded tags `balanced-cantor-multiple`, `finite-balanced-cantor-multiple` and `hyperelliptic-balanced-principality`, version 1, retain original field/curve construction, labelled infinities, complete arithmetic/places, factored witnesses and conditions. Fresh auxiliary domains are reconstructed from checked identities. Producer-disabled replay covers search, normalization, composition, GCD and geometric producers; no stored flag is accepted.
- Focused/retained acceptance passes 54 checks (`balanced-acceptance-tests.log`): quartic order-two classes, the order-29 infinity class, genus parity, signed multiples, number/finite-extension coefficients, nonmonic split leading roots, nonrational ramification, inert places, independently expanded witnesses, altered coverage/weights/factors/conditions, fresh scopes, whole-artifact bounds and sticky exhaustion. Initial fixture/API naming errors were corrected; no mathematical check was waived.
- Four subsidiary workloads complete two warm-ups and all five serial construction/solving/verification/encoding/fresh-decoding cycles. Raw records remain ignored: `measurements/balanced-cantor-arithmetic-final.json`, `balanced-native-principality.json`, with source qualification in `balanced-source-fingerprint.txt`. The original arithmetic record remains preserved; the refresh follows extraction of the unchanged constructor body for native composition. These are arithmetic/principality observations, not full Schultz cycles or new hard-target claims.
- Incremental TypeScript (`typecheck-balanced-closeout.log`), scoped lint (`lint-balanced-closeout.log`), memory/file-size/OOE/compartment (`*-balanced.log`) and diff hygiene pass. No app output or broader input adoption changes in this checkpoint; earlier adopted visual evidence remains separately qualified.
- The original arithmetic/principality checkpoint grants no torsion authority. The subsequent `balanced-torsion-proof.md` records complete finite orders, native good-reduction torsion and integration dispatch with focused independent replay; all four subsidiary serial workloads and static checks pass. This does not complete Gate 2. Remaining recursive/negative compact formats, polynomial/norm modular composition and final current-source fixed-corpus/control acceptance also remain. Overall Gate 2 is incomplete. No staging, commit or push; no serial measurement commit is authorized.
