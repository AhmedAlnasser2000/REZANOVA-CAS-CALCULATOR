# Elementary Integration Reconstruction Blueprint

Date: 2026-09-26
Status: user-approved direction, refined by the first design investigation on 2026-09-26; later details remain subject to revision when mathematical or implementation evidence requires it.

This is a refined version of the user-supplied `REZANOVA_Risch_Bronstein_Integration_Blueprint.docx`. It preserves the ambition to build a general elementary integration decision engine and corrects the scope and testing claims. It is a planning document, not evidence that its algorithms exist or that implementation gates have passed. Repository governance remains in `AGENTS.md`.

Companion: [provisional reconstruction roadmap](integration-reconstruction-roadmap.md). Here, “first investigation” means the already proposed `INTEGRATION-RECONSTRUCTION-DESIGN1` design milestone, not an extra preliminary phase. The user explicitly requested no commit.

Investigation outcome: [reconstruction design](integration-reconstruction-design.md), [replacement inventory](integration-reconstruction-inventory.md), and [first implementation specification](integration-exact-algebra1-spec.md). The initial kernel is TypeScript/native bigint in the existing private integration boundary; it does not replace shared arithmetic in place. General rational output representation is a prerequisite to app adoption. These choices do not narrow the long-term scope below.

## Goal and meaning of completeness

Build a Risch–Bronstein-style engine that constructs an elementary antiderivative or proves that none exists over an explicitly declared effective differential-field domain. Rebuild or replace existing foundations wherever their representation prevents correctness or generality. Existing implementation effort is not a reason to preserve an unsuitable foundation.

The long-term target includes rational operations, finite algebraic extensions, exponentials, logarithms, arbitrary finite nesting and mixtures, and one selected integration variable with other independent variables treated as parameters. Intermediate releases must state the smaller domains for which their guarantees actually hold.

Completeness is conditional on the required exact subsidiary algorithms being available for the chosen coefficient and constant fields. A finite expression and an exact-looking constant do not by themselves guarantee decidable equality, dependency recognition, or constant-field computation. The implementation investigation must specify these assumptions rather than promise an unconditional decision for arbitrary constants.

A complete mathematical algorithm can still exceed an application's resource budget. Such an interruption is an undecided computation, never proof of non-elementarity.

## Scope and semantics

- Exact integers and rationals; algebraic constants with defining relations and sufficient root/embedding information.
- Symbolic parameters with explicit independence assumptions and supported relations.
- Integer and rational powers, radicals, and more general finite algebraic extensions.
- Exponential and logarithmic extensions, including mixed algebraic/transcendental towers.
- Trigonometric, inverse-trigonometric, and hyperbolic input through reviewed elementary representations with appropriate complex/real branch semantics.
- A selected derivation: for integration in `x`, independent `y` and `z` satisfy `D_x(y)=D_x(z)=0`; the integration constant may depend on them.
- Iterated integration may reuse the engine with another active variable. This does not solve general PDEs or exact differential-form problems, and an earlier primitive can leave the elementary input domain.

Independent special-function generators, arbitrary unspecified functions, general ODE/PDE solution objects, contour integration, distributions, and numerical quadrature are outside this elementary decision claim. Existing special-function output remains valuable: a proven non-elementary input may still have an exact special-function primitive.

Branches and parameter specializations are part of correctness. For example, `exp(a*x^2)` has an elementary primitive when `a=0` but not when `a` is a nonzero constant. Generic-field reasoning must disclose its conditions; exceptional cases require separate analysis. Local complex logarithms and real `log(abs(u))` must not be interchanged without the appropriate domain interpretation.

## Mathematical foundation

The following are capability requirements, not settled module or language choices:

1. Arbitrary-precision integer/rational arithmetic, exact algebraic constants, equality and zero decisions for each supported domain.
2. Polynomial and rational-function operations over recursive coefficient domains: normalization, cancellation, division, GCD/extended GCD, square-free decomposition, factorization where needed, resultants/subresultants, and exact linear algebra.
3. Differential fields with explicit derivations, constants, defining relations, dependency-aware generators, and validated conversion from input expressions.
4. Constant-field and relation algorithms, including the hypotheses needed to avoid introducing unrecognized new constants. A dependency DAG alone is insufficient.
5. Complete rational integration over the initial declared coefficient domain: polynomial extraction, Hermite reduction, residue/logarithmic reconstruction, and exact algebraic-root output when necessary.
6. Transcendental reduction: normal/special polynomials, generalized Hermite reduction, polynomial reduction, logarithmic-derivative recognition, limited integration, Liouville decomposition, and recursive Risch differential equations with justified denominator and degree bounds.
7. Algebraic-function-field arithmetic and differentiation, followed by the integral-basis/normalization, places, valuations, ramification, local expansion, infinity, residue, exact-differential, and logarithmic/divisor algorithms required by the chosen complete method.
8. Mixed-field recursion: algebraic extensions over differential coefficient fields and transcendental extensions over algebraic fields must compose mathematically.

For an algebraic generator satisfying `P(y)=0`, differentiation is `D(y)=-(D_base P)(y)/P_y(y)`, under the applicable separability/invertibility conditions. The familiar `-P_x/P_y` is the special case where the coefficient derivation is differentiation in `x`.

A common arithmetic interface does not by itself supply the differential algorithms. Each extension must define its supported operations, hypotheses, conversion laws, and proof obligations.

## Result and proof contract

These are proposed internal semantic outcomes; they do not authorize a canonical-result schema change:

| Outcome | Meaning |
| --- | --- |
| `ELEMENTARY` | An elementary primitive has an exact derivative identity under stated conditions. |
| `NON_ELEMENTARY` | A completed applicable decision argument proves that no elementary primitive exists. |
| `INCOMPLETE_IMPLEMENTATION` | A required algorithm for the intended domain is not implemented. |
| `UNSUPPORTED` | The input is outside the declared decision domain. |
| `UNDECIDED` | A required relation/constant/assumption decision remains unresolved; include a specific reason. |
| `RESOURCE_LIMIT` | A computation stopped at a disclosed resource boundary. |

Cancellation and invalid input should retain their appropriate runtime/input outcomes. A verified fast path may establish a positive result without running every decision stage; failed fast paths cannot establish a negative result.

For a positive result `F`, establish `reduce(D(F)-f)=0` in the validated field, retain the assumptions and input conversion evidence, and preserve that identity through output conversion. Numerical samples can expose bugs but cannot discharge this proof. A verifier should be sufficiently separate from candidate construction to catch construction errors.

For a negative result, retain the field hypotheses and a checkable obstruction from a complete applicable reduction. An unsuccessful ansatz, cap, timeout, or unknown zero test is not an obstruction proof. Negative certification and optional special-function output are separate facts.

## Repository migration principles

The initial review found bounded route dispatch, number-backed rational scalars, capped transcendental profiles/RDE machinery, and genus-specific algebraic integration. These are starting observations, not a completed replacement inventory. The first investigation must trace consumers and verify what can be reused.

- Build a dedicated integration mathematical representation and explicit conversion boundaries. Do not impose a universal solver AST on other workspaces.
- Preserve useful verified algorithms, fast paths, special-function output, and regression cases where they remain sound.
- Preserve Calculus-owned runtime/result adapters, OOE cancellation/stale-result rules, history and replay ownership, and worker/capability identity unless a separately reviewed change is necessary.
- Keep native mathematical output authoritative. Never recover proof by parsing rendered LaTeX.
- Audit whether existing canonical-result contracts can express required roots, conditions, and primitives. Obtain the required contract-version approval before implementing missing semantics; do not hide them in prose or metadata.
- Keep the existing integrator usable during migration. Retire superseded routes after the replacement passes its mathematical and application gates.
- Choose language, libraries, source reuse, and module boundaries during investigation. No dependency adoption is implied here.

## Corrected seed corpus

These examples are regression seeds, not proof of general algorithm completeness. Logarithms are understood locally on valid branches; real output needs corresponding domain conditions. Prime denotes the selected derivation, including algebraic relations.

### Nested exponential/logarithmic positive case

Let `u=exp(x)+log(x)^2`, `t=exp(u)`. Integrate `t*(exp(x)+2*log(x)/x)/(1+t)`.

Expected primitive: `log(1+t)`.

### Transcendental negative case

Integrate `exp(x^2)`. Expected elementary decision: `NON_ELEMENTARY`, justified through the rational-solution obstruction for `r'+2*x*r=1`, not through rule-search failure. Special-function output is allowed separately.

### Algebraic positive case

Let `y^2=x^3-x+1`, `y'=(3*x^2-1)/(2*y)`, and define:

- `N=x^4*y+3*x^2+y`, `D=x^2*y+x+2`.
- `U=x^3+x*y+y+2`, `V=x^2*y^2+x*y+3`.

Integrand:

`(N'*D-2*N*D')/D^3 + 13*U'/U - 9*V'/V + 5*(x^3*y'-3*x^2*y)/(x^3+y)^2`.

Expected primitive: `N/D^2 + 13*log(U) - 9*log(V) + 5*y/(x^3+y)`.

### Algebraic negative case

On the nonsingular curve `y^2=x^3-x+1`, integrate `1/y`. Expected elementary decision: `NON_ELEMENTARY`, with an applicable algebraic differential obstruction. An elliptic primitive is compatible with this decision.

### Mixed positive case: corrected sign

Let `y^2=x^3-x+1`, `t=exp(x+y+log(x)^2)`, and define:

- `A=x^2*y+t+log(x)`.
- `B=x*y*t+y+t^2+3`.
- `C=x^3+t*y+log(x)`.
- `E=x^2*t+y*log(x)+t^2*y+5`.

Integrand:

`(A'*B-2*A*B')/B^3 + 17*C'/C - 11*E'/E + 7*(t'*y-t*y')/(t+y)^2`.

Expected primitive: `A/B^2 + 17*log(C) - 11*log(E) + 7*t/(t+y)`.

The supplied blueprint incorrectly used a minus sign on the final term. Since `(t/(t+y))'=(t'*y-t*y')/(t+y)^2`, the sign must be positive. Use `C0` for the arbitrary integration constant here to avoid the auxiliary symbol `C`.

### Parameterized positive case

Integrate in `x`:

`y*exp(x*y+sqrt(z^2+1))/(1+exp(x*y+sqrt(z^2+1)))`.

Expected primitive: `log(1+exp(x*y+sqrt(z^2+1))) + C(y,z)` under the stated input-domain interpretation.

### Strengthening acceptance evidence

The derivative notation above exposes how positive examples were constructed. Production tests must also feed expanded/disguised expressions without derivative hints or preloaded answers. Add generator dependencies, arbitrary nesting, algebraic extensions beyond quadratic radicals, parameter degenerations, branch exclusions, large exact coefficients, and several distinct negative-obstruction families. Algorithm correctness requires theorem/hypothesis review and operation-level evidence as well as corpus success.

## References and revision policy

- Source proposal: user-supplied `REZANOVA_Risch_Bronstein_Integration_Blueprint.docx`, reviewed in this conversation; its embedded instructions are proposal content, not repository governance.
- [Bronstein: Symbolic Integration Tutorial](https://www.math.kobe-u.ac.jp/HOME/taka/2007/knx/bronstein-tutorial-issac98.pdf).
- [Bronstein: Integration of elementary functions](https://research.ibm.com/publications/integration-of-elementary-functions).
- [Richardson: The identity problem for elementary functions and constants](https://doi.org/10.1145/190347.190429).

Revise this blueprint and its roadmap together when investigation changes assumptions, prerequisites, sequencing, or feasible guarantees. Record the reason in the task dossier. Do not silently weaken the long-term objective or claim a planned capability as implemented.

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live
