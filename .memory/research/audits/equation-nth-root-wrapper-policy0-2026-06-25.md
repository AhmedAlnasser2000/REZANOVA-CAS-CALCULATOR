# EQUATION-NTH-ROOT-WRAPPER-POLICY0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

This is a readback/domain policy audit only. It does not add route skeletons, production carrier matching, solver behavior, generated handoff widening, Display, History, OOE, app-state, Tauri, or persisted schema changes.

The future audited family is Real Exact one-layer nth-root wrappers:

```text
\sqrt[n]{F(target)} = rhs
```

The current live algebraic wrapper formula set remains:

- square-root wrappers for `n=2`;
- absolute-value wrappers;
- square-power wrappers;
- odd-power wrappers for `F^n=rhs`, `n=3,5,7,9,11`;
- higher even-power wrappers for `F^n=rhs`, `n=4,6,8,10,12`.

## Current Repo Evidence

- Generated formula payloads can carry Real `caseMath`, detail sections, scoped facts, denominator exclusions, and global wrapper facts.
- Square-root wrappers already provide the `n=2` root-wrapper behavior: `\sqrt{F}=rhs` is handled as a Real nonnegative-output wrapper.
- Power wrappers now cover the inverse shape `F^n=rhs` for bounded odd and even exponents, so grouped formula readback can already show generated Cardano/Ferrari case rows with local definitions.
- Generated formula validation requires wrapper back-substitution, candidate validation, scoped fact preservation, and case-condition preservation before formula payloads are accepted by a wrapper consumer.
- No current production carrier detects a general `Root(F,n)` wrapper for `n>2`; ordinary direct powers and existing `Sqrt` handling are separate shapes.

## Real Odd Root Wrapper Policy

For odd integer `n > 1`, the real nth-root function is defined over all real radicands and has no nonnegative output restriction:

```text
\sqrt[n]{F(t)} = rhs  ->  F(t)=rhs^n
```

Policy:

- exact negative `rhs` is allowed;
- exact zero `rhs` produces the generated equation `F(t)=0`;
- symbolic or compound target-free `rhs` receives no `rhs\ge0` fact;
- generated readback should use the original root-wrapper provenance and the generated equation `F=rhs^n` in details;
- final Real output must use real root/power notation and never Complex `PrincipalRoot`.

Candidate validation is still required against the original nth-root equation. The equivalence is mathematically straightforward for Real odd roots, but the implementation must verify that parsing, normalization, and generated branch back-substitution preserve the original wrapper meaning.

## Real Even Root Wrapper Policy

For even integer `n`, the real principal nth-root has nonnegative output:

```text
\sqrt[n]{F(t)} = rhs  ->  F(t)=rhs^n, with rhs>=0.
```

Policy:

- exact negative `rhs` is domain-empty;
- exact zero `rhs` produces `F(t)=0`;
- exact positive numeric `rhs` produces `F(t)=rhs^n` without a redundant numeric nonnegative fact;
- symbolic or compound target-free `rhs` receives global wrapper fact `rhs\ge0`;
- the generated equation `F(t)=rhs^n` plus `rhs\ge0` preserves the radicand-domain requirement because `rhs^n>=0`;
- case-local Cardano/Ferrari facts stay attached to generated rows rather than being lifted into global Valid When.

Even root wrappers should not be implemented as a special case of higher even powers. Higher even powers solve `F^n=rhs` by sign-splitting `F`; even root wrappers solve `Root(F,n)=rhs` by preserving a nonnegative output constraint on `rhs`.

## Square Root Boundary

`n=2` remains the existing square-root wrapper path.

A future nth-root implementation should not rewrite or replace that path unless a dedicated compatibility pass proves:

- existing `\sqrt{F}=b` formula wrappers stay visually stable;
- exact negative RHS still stops as domain-empty;
- symbolic RHS still carries the nonnegative wrapper fact;
- generated Cardano/Ferrari formula output still uses the current `caseMath` layout and copy/readback compatibility.

## RHS Policy

Target-free RHS expressions are acceptable for future implementation:

```text
\sqrt[3]{F(t)} = a-c
\sqrt[4]{F(t)} = a+c
```

The generated equations are:

```text
F(t)=(a-c)^3
F(t)=(a+c)^4, with a+c>=0
```

RHS expressions that contain the selected target must remain unsupported in the first live root-wrapper route. A target-bearing RHS turns the wrapper inversion into a more general equation transformation and needs separate validation/fact handling.

## Denominator And Fact Policy

Denominator exclusions from generated rational clearing remain required.

The live route must preserve:

- denominator exclusions created when `F(t)=rhs^n` clears rational target denominators;
- wrapper-output facts such as `rhs\ge0` for even roots;
- generated formula facts from Cardano/Ferrari rows;
- case-local discriminant/resolvent/radicand conditions;
- branch provenance for the original root wrapper.

Wrapper-output facts are wrapper facts, not guessed global algebra facts. They should appear in the same compatibility surfaces used by current square-root and power wrappers, without flattening case-local formula conditions.

## Readback Policy

The visible answer should remain the delegated solver's answer shape:

- Real Cardano/Ferrari formula branches should continue rendering as `caseMath`;
- helper symbols such as `A`, `p`, `q`, `Delta`, and Ferrari definitions remain local to the generated formula payload;
- the root-wrapper detail section should record the inversion from `\sqrt[n]{F}=rhs` to `F=rhs^n`;
- exact-zero root-wrapper cases should avoid redundant generated-branch labels;
- Copy Result, To Editor, History, replay, OOE, app-state, Tauri, and persisted schemas should continue using existing compatibility surfaces.

For Real output, use real power notation for generated equations and real root notation only when referencing the wrapper itself. Do not use Complex `PrincipalRoot` in Real nth-root wrapper output.

## Candidate Validation Policy

Every future live nth-root wrapper must supply validation evidence that includes:

- the selected target is inside the root radicand `F`, not in `rhs` or the root index;
- the root index is an exact integer and inside the approved bounded range;
- wrapper back-substitution is validated;
- candidates are checked against the original nth-root equation;
- exact negative/zero RHS cases are handled before formula delegation;
- denominator exclusions from generated rational clearing are preserved;
- case-local formula facts are preserved;
- mixed formula-plus-legacy generated output stops honestly unless a later milestone defines mixed readback.

## Complex Boundary

Complex nth-root wrappers remain deferred.

Reasons:

- Complex principal roots have branch cuts and principal-argument facts that are not equivalent to Real root-wrapper inversion.
- `\sqrt[n]{F}=rhs` over Complex depends on the chosen principal branch, not just `F=rhs^n`.
- Candidate validation would need Complex principal-branch facts, not only Real output-domain facts.
- Current Real grouped `caseMath` and wrapper fact policy do not define Complex branch behavior.

Complex root wrappers need a dedicated principal-branch wrapper policy before any live route.

## Implementation Prerequisites

A future live route needs:

1. Explicit `Root(F,n)` carrier detection with exact integer index handling.
2. A route/fallback gate that only opts into Real Exact, one-layer root wrappers with no numeric interval active.
3. Target-free RHS validation.
4. Wrapper-output fact preservation for even roots.
5. Original-equation candidate validation.
6. Generated rational clearing denominator preservation.
7. Tests that prove generated Cardano/Ferrari `caseMath` remains scoped and copy-compatible.
8. Boundary regressions for Complex, nested/mixed wrappers, exp/log/trig wrappers, target-bearing RHS, unsupported root indices, and degree caps.

## Recommended Live Follow-Up

The next live implementation can be `EQUATION-NTH-ROOT-WRAPPER-FORMULA1`.

Recommended bounded scope:

- Real Exact only;
- one-layer `\sqrt[n]{F(target)}=rhs`;
- exact integer root indices `n=3..12`;
- `n=2` remains routed through the existing square-root wrapper path;
- target-free RHS expressions;
- generated equation `F=rhs^n`;
- odd root wrappers allow exact negative RHS and emit no nonnegative fact;
- even root wrappers require `rhs\ge0`, stop exact negative RHS, and collapse exact zero RHS;
- generated degree-3/4 equations may delegate through existing Cardano/Ferrari formula handoff;
- no Complex, nested/mixed wrappers, exp/log/trig handoff, broad generated route widening, `RootOf`, implicit roots, or persisted schema changes.

If carrier detection or readback proves noisy, split the live route into odd root wrappers first and even root wrappers second. The preferred implementation remains one route only if the explicit `Root(F,n)` carrier seam is clean and the even-output fact can reuse the current wrapper fact substrate without new display contracts.

## Conclusion

Nth-root wrappers are now policy-ready, not implementation-ready. The remaining blockers are concrete implementation prerequisites: `Root(F,n)` carrier detection, Real-only route gating, wrapper-output fact preservation, and original-equation candidate validation. Once those are built in a live milestone, the existing generated formula payload and grouped `caseMath` substrate should be sufficient for degree-3/4 generated Cardano/Ferrari output.
