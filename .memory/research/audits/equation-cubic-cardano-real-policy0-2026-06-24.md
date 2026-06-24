# EQUATION-CUBIC-CARDANO-REAL-POLICY0 Audit Note

Date: 2026-06-24
Repo: `/home/ahmed/Downloads/Calculator`
Status: complete
Gate type: Real-domain Cardano policy audit

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Verdict

Do not implement Real Exact Cardano yet.

`EQUATION-CUBIC-CARDANO-READBACK-POLISH1` fixed the live Complex Exact output shape, so the next Real work can build on compact `A/B/C/p/q/Delta/R/U_k` readback. Real Exact Cardano still needs explicit case facts, real-root notation, casus irreducibilis readback, and validation policy before formulas become visible.

This milestone is audit-only. It does not add a production route skeleton, does not change selected-target route order, does not alter Real Exact stops, and does not add formula code.

## Current Baseline

- Complex Exact direct symbolic cubics solve through the existing `cubic-cardano` family.
- Real Exact general symbolic cubics remain stopped.
- Direct low-degree Real special forms such as `u^3=a` keep existing real radical output.
- General symbolic quartics remain Ferrari-deferred.
- `PrincipalRoot_3` is a Complex principal-branch notation, not a Real Exact notation.

## Required Facts For A Future Real Route

A future `EQUATION-CUBIC-CARDANO-REAL-ROUTE1` must emit or internally attach:

- `a\ne0` for the original leading coefficient.
- Definitions for `A=b/a`, `B=c/a`, `C=d/a`, `p=B-A^2/3`, `q=2A^3/27-AB/3+C`, and `Delta=(q/2)^2+(p/3)^3`.
- A case fact for exactly one of `Delta>0`, `Delta=0`, or `Delta<0`.
- Degenerate facts for the repeated-root case, especially `p=0` and `q=0` for the triple-root branch versus `p\ne0` for the double-root branch.
- Denominator facts for any formula branch that divides by an auxiliary expression.
- Candidate/proof evidence tying emitted roots back to the original selected-target polynomial.

## Case Policy

For the depressed cubic `y^3+p y+q=0` with `x=y-A/3`:

- `Delta>0`: future Real output may emit the single real root using real cube roots only:
  `x=-A/3+\sqrt[3]{-q/2+\sqrt{Delta}}+\sqrt[3]{-q/2-\sqrt{Delta}}`.
- `Delta=0`: future Real output must split the triple-root and double-root subcases:
  - if `p=0` and `q=0`, emit the triple root `x=-A/3`;
  - otherwise, with `p\ne0`, emit the distinct real roots `x=-A/3+3q/p` and `x=-A/3-3q/(2p)` with multiplicity/readback policy decided before implementation.
- `Delta<0`: future Real output must not use Complex `PrincipalRoot` intermediates. It should use a real trigonometric/arccos branch representation, or remain stopped until an equivalent real-branch representation is approved and fact-gated.

## Notation Policy

- Real Cardano must use real odd-root notation such as `\sqrt[3]{...}` for real cube roots.
- Real Cardano must not show `\operatorname{PrincipalRoot}_{3}`.
- Real casus irreducibilis output must not expose symbolic complex intermediates as a shortcut.
- If a future route uses trig/arccos notation for `Delta<0`, it must define the branch index, real-domain facts, and principal angle range in visible readback or structured facts.

## Validation And Route Evidence Policy

Future Real Cardano implementation must:

- reuse the n-degree symbolic polynomial substrate and the compact Cardano definition/readback vocabulary;
- reuse the existing `cubic-cardano` route family unless a later trace audit proves a separate family is needed;
- record route details with `{ degree: 3, algorithm: 'cardano', domain: 'real' }`;
- prove roots by construction over the normalized polynomial or run an exact symbolic residual check suitable for symbolic coefficients;
- keep transformed/generated-handoff Cardano disabled until separate validation and facts exist for those paths;
- keep formula-size stops honest rather than falling back to `RootOf`, implicit roots, or truncated formulas.

## Out Of Scope

- No production route skeleton.
- No Real Exact formula output.
- No Complex route behavior changes.
- No Ferrari/quartic route.
- No symbolic carrier-quadratic PrincipalRoot composition.
- No Display, History, OOE, app-state, Tauri, or schema changes.

## Next Implementation Prerequisites

Before `EQUATION-CUBIC-CARDANO-REAL-ROUTE1`, Calcwiz needs:

- compact Real detail/readback tests for the three discriminant cases;
- a visible multiplicity/readback policy for `Delta=0`;
- an approved casus irreducibilis real-branch representation;
- exact symbolic validation/proof tests for all emitted Real roots;
- mode-level regressions proving Complex Cardano stays compact and Real output never contains `PrincipalRoot` or `RootOf`.
