# EQUATION-GENERAL-POWER-WRAPPER-POLICY0

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

This is a policy/readiness audit only. It does not change solver behavior, route order, generated handoff behavior, Display, History, OOE, app-state, Tauri, or persisted schemas.

The audited future umbrella is Real Exact one-layer algebraic power wrappers beyond the current live set:

```text
F(target)^n = rhs
\sqrt[n]{F(target)} = rhs
```

Current live consumers remain only:

- Real square-root wrappers;
- Real absolute-value wrappers;
- Real square-power wrappers.

## Current Repo Evidence

- Generated formula payloads can preserve Real `caseMath` rows, detail sections, answer domain, global supplements, and scoped branch/case facts.
- Generated formula validation can require wrapper back-substitution, candidate validation, scoped-fact preservation, and case-condition preservation before a wrapper consumes formula payloads.
- Grouped formula readback now supports multiple generated wrapper branches without flattening local Cardano/Ferrari definitions into one global namespace.
- Exact-zero grouped readback can hide redundant single-branch labels while retaining provenance in details.
- The hardening pass locks exact-positive behavior for the existing wrappers: if all generated branches are legacy finite-root branches, the wrapper remains legacy-only; if all generated branches are formula payloads, grouped formula output is used; mixed formula-plus-legacy output remains deferred/fail-closed.
- Default generated handoff still excludes `cubic-cardano` and `quartic-ferrari`. Formula routes are opt-in per wrapper family only.

## Real Power Policy

### Odd Powers

For odd `n = 2k+1`, Real powers are injective over real wrapper values:

```text
F(t)^n = rhs  ->  F(t)=\sqrt[n]{rhs}
```

Policy:

- exact negative `rhs` is allowed;
- exact zero `rhs` collapses naturally to `F(t)=0`;
- symbolic target-free `rhs` needs no nonnegative fact;
- generated equation readback should use real odd-root notation such as `\sqrt[3]{rhs}`, not Complex `PrincipalRoot`;
- candidate validation must check the original wrapper equation or an equivalent fact-preserving chain;
- denominator exclusions from generated rational clearing remain global only when they are truly global.

This is the safest first live general-power slice because it is one generated branch and does not require sign splitting.

### Higher Even Powers

For even `n = 2k`, Real powers need signed even-root branches:

```text
F(t)^n = rhs  ->  F(t)=\sqrt[n]{rhs}  or  F(t)=-\sqrt[n]{rhs}, with rhs>=0.
```

Policy:

- exact negative `rhs` is domain-empty;
- exact zero `rhs` collapses to one generated branch `F(t)=0`;
- symbolic target-free `rhs` gets global `rhs>=0`;
- grouped readback should use branch labels `F=\sqrt[n]{rhs}` and `F=-\sqrt[n]{rhs}`;
- local Cardano/Ferrari definitions stay scoped per generated branch group;
- dedupe must not merge rows across different wrapper branches or different formula case facts unless the fact scopes are proven identical.

Higher even powers are not just "square-power with a bigger exponent." They need a real even-root notation and validation policy for arbitrary even `n`, plus branch dedupe/multiplicity rules for duplicated signed branches.

## Real Root-Wrapper Policy

### Odd Root Wrappers

For odd root wrappers:

```text
\sqrt[n]{F(t)} = rhs  ->  F(t)=rhs^n
```

Policy:

- exact negative `rhs` is allowed;
- no output nonnegative fact is needed;
- generated equation is usually polynomial/rational in the selected target with a target-free right side;
- candidate validation must still check the original root wrapper because parser/readback and simplification may rearrange powers.

Odd root wrappers are mathematically simple, but they need a root-carrier detection seam for `\sqrt[n]{...}` beyond ordinary square root before they can go live.

### Even Root Wrappers

For even root wrappers, the real principal even root has a nonnegative output:

```text
\sqrt[n]{F(t)} = rhs  ->  F(t)=rhs^n, with rhs>=0.
```

Policy:

- exact negative `rhs` is domain-empty;
- exact zero `rhs` becomes `F(t)=0`;
- symbolic target-free `rhs` gets global `rhs>=0`;
- the generated equation `F(t)=rhs^n` plus `rhs>=0` preserves the real radicand-domain requirement because `rhs^n>=0`;
- candidate validation must reject any candidate that fails the original root wrapper equation.

Even root wrappers should not be enabled until the app has explicit nth-root wrapper parsing/carrier matching and tests proving the output constraint is preserved.

## RHS And Denominator Policy

Target-free RHS expressions are acceptable for future live slices when they can be represented in generated equations without introducing target dependence:

```text
F(t)^3 = a+c
F(t)^4 = a^2+b
\sqrt[3]{F(t)} = a-c
```

The collector must reject RHS expressions that contain the selected target.

Denominator exclusions from generated rational clearing remain required. They may be global when the cleared denominator came from the wrapper's generated branch and applies to every candidate. If a future branch introduces a denominator that is branch-local, the exclusion must stay scoped to that branch or case.

## Dedupe And Multiplicity Policy

Future generalized power wrappers must dedupe by structured scope, not just by visible root string.

Rows may be merged only when all of these match:

- same generated wrapper branch or a proven equivalent branch;
- same root expression;
- same answer domain;
- same global wrapper facts;
- same branch/case-local formula conditions;
- same denominator exclusions;
- same multiplicity meaning.

Multiplicity should come from the delegated solver or from an explicitly proven wrapper collapse such as exact zero. Do not infer multiplicity across wrapper branches merely because two visible formulas simplify to the same string.

## Readback Policy

The current grouped `caseMath` substrate is enough for future odd/even power formula wrappers if each live milestone supplies the correct wrapper config:

- odd powers: single generated branch, usually no grouped labels in the visible answer;
- higher even powers: grouped branch labels for positive and negative even-root branches;
- root wrappers: usually one generated branch with root-output facts for even roots;
- helper definitions remain local per generated branch group;
- case-local Cardano/Ferrari facts remain attached to the row that produced them;
- Copy Result, To Editor, History, replay, OOE, app-state, Tauri, and persisted schemas continue using existing compatibility surfaces.

Real root notation should use `\sqrt[n]{...}` for real odd/even roots. Complex `PrincipalRoot` is reserved for Complex principal-root branches and must not appear in Real wrapper output.

## Validation Evidence Required

Every future live wrapper must supply wrapper-specific generated formula validation evidence:

- wrapper back-substitution is validated;
- candidate validation against the original wrapper equation is present;
- target-free RHS is confirmed;
- exact negative/zero RHS cases are handled before formula delegation;
- denominator exclusions are preserved;
- case-local formula facts are preserved;
- branch-local conditions are not lifted globally;
- mixed formula-plus-legacy generated branch output stops honestly unless a later milestone explicitly defines mixed readback.

## Complex Boundary

Complex power wrappers remain deferred.

Reasons:

- Complex roots and powers require principal-branch or multi-valued branch policy, not Real odd/even root notation.
- `F^n=rhs` over Complex is a branch-complete root-family problem, not a real sign split.
- `\sqrt[n]{F}=rhs` over Complex depends on principal-root semantics and branch cuts.
- Wrapper back-substitution and candidate validation would need Complex principal-branch facts, not only Real nonnegative-output facts.
- Current grouped Real `caseMath` is not a Complex branch policy.

Complex wrapper formula work should wait for a dedicated Complex principal-wrapper policy and tests.

## Readiness Decision

Proceed next with a Real odd-power wrapper formula milestone, not a broad general-power switch.

Recommended first live slice:

```text
EQUATION-ODD-POWER-WRAPPER-FORMULA1
```

Suggested scope:

- Real Exact one-layer `F(target)^n=rhs` for odd integer `n` within the current bounded power policy, likely odd `3 <= n <= 11`;
- target-free RHS expressions;
- generated branch `F=\sqrt[n]{rhs}`;
- exact zero collapse to `F=0`;
- exact negative RHS allowed;
- generated Cardano/Ferrari delegation when the resulting branch equation is degree 3 or 4;
- rational generated branch denominator exclusions;
- no Complex, higher even powers, nth-root wrappers, nested/mixed wrappers, exp/log/trig wrappers, or broad generated route widening.

Higher even powers should follow after odd powers because they reuse the square-power grouped shape but need arbitrary even-root notation and branch-scope dedupe tests. General nth-root wrappers should follow after root-carrier detection/readback is audited.

## Conclusion

The live wrapper substrate is ready for a narrow Real odd-power wrapper formula route. It is not ready for a single "general powers" milestone that enables odd powers, higher even powers, and nth-root wrappers together. The safe sequence is:

1. Real odd-power wrapper formula.
2. Real higher-even-power wrapper formula.
3. Real nth-root wrapper formula after root-carrier parsing/readback policy.
4. Complex wrapper policy later.
