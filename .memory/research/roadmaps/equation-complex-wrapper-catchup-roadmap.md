# Equation Complex Wrapper Catchup Roadmap

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Status

Created by `EQUATION-COMPLEX-WRAPPER-CATCHUP-POLICY0` on 2026-06-27.

This is a policy and roadmap artifact only. It does not enable Complex wrapper formula output, change solver routes, change Display, change Formula Viewer, change Copy Result, change History, change OOE, change app-state, change Tauri, or change persisted schemas.

The Real wrapper track is complete enough to start Complex catchup planning. That does not mean Complex parity is a flag flip: Complex wrapper output needs separate branch, principal-value, validation, and readback policy.

Updated after the user decision on 2026-06-27: Complex symbolic wrapper catchup stops at degree 2. Wrapper-generated Complex Cardano/Ferrari output is no longer a roadmap target because the cubic/quartic symbolic output is too large and unreadable for the wrapper user experience.

## Audit Inputs

The policy pass inspected the current wrapper state, Complex foundation roadmap, Equation frontier roadmap, generated-formula validation boundaries, Complex domain tests, wrapper tests, and Cardano/Ferrari route posture.

Relevant live facts:

- Real Exact generated formula payloads are live for one-layer algebraic wrappers, affine single-root radical shells, mixed radical single-square-root shells, mixed exp/log shells, mixed trig shells, and exact depth-2 algebraic nested wrappers.
- Complex On Exact already has bounded algebraic, rational, selected-power, special-form, exp/log preimage, and trig preimage capabilities outside wrapper formula handoff.
- Complex direct/rational Cardano/Ferrari routes may exist for top-level polynomial solving, but wrapper catchup does not target generated Complex Cardano/Ferrari output.
- Complex exact-form settings are readback policy: `cis` may use `\operatorname{cis}`, while `rectangular` and `polar` must not silently force `cis`.
- Symbolic principal-branch Complex roots remain deferred.

## Locked Policy

- Complex wrapper catchup is Equation-only, `Complex On`, and `Exact` only.
- Complex catchup must reuse existing Complex algebraic/preimage routes where they already own branch semantics. It must not route through Real-only `formulaHandoff`.
- Complex wrapper payloads that stay within the degree-2 cap still need branch validation evidence when they introduce new symbolic branch surfaces. Cubic/quartic generated Complex wrapper formulas are retired as a product/readback target, not merely waiting for validation.
- Complex symbolic wrapper catchup stops at degree 2. Wrapper branches that would require generated cubic/quartic Cardano/Ferrari output should stop honestly instead of trying to render huge symbolic Complex formula branches.
- `complexExactForm` is load-bearing. Wrapper branches must honor the selected exact-form style instead of collapsing everything to one display notation.
- Complex absolute-value wrappers remain deferred because `Abs` over Complex is magnitude/locus semantics, not the Real sign split `F=b` or `F=-b`.
- Square-root and nth-root wrappers remain deferred until the principal-root wrapper policy is explicit. The Real policy `root(F,n)=rhs -> F=rhs^n` cannot be copied blindly into Complex.
- Display, Formula Viewer, Copy Result, History, OOE, app-state, Tauri, and persisted schema changes are not part of the catchup policy.

## Current Inventory

Available substrate:

- Complex domain intent and exact-mode routing.
- Complex input support for explicit imaginary units.
- Bounded Complex algebraic solving for direct/factorable polynomial, rational, selected-power, and special-form cases.
- Complex preimage solving for direct exp/log and trig families with branch rows.
- Complex exact-form readback helpers for finite branches and higher-degree exact trigonometric branch notation.
- Generated formula payload infrastructure with Real validation evidence and an explicit Complex block at the handoff boundary.
- Display and Formula Viewer can render large structured `caseMath` answers and count cues without needing solver contract changes.

Missing prerequisites for broad Complex wrapper parity:

- Wrapper-level Complex branch validation evidence.
- Principal/root branch policy for symbolic wrapper RHS values.
- Branch-cut and domain-fact wording for wrapper-generated log/root/power branches.
- Complex absolute-value locus representation.
- Degree-2 wrapper boundary evidence for future power/root wrappers.
- Tests that prove Complex Off remains Real-first and Complex On does not leak Real range facts such as `-1 <= rhs <= 1` into Complex trig output.

## Family Classification

First-candidate families:

- Single-carrier exp/log affine wrappers, such as `a*exp(F)+c=d` and `a*ln(F)+c=d`, when isolation produces a carrier equation already owned by the existing Complex preimage route.
- Single-carrier trig affine wrappers, such as `a*sin(F)+c=d`, `a*cos(F)+c=d`, and `a*tan(F)+c=d`, when isolation produces a carrier equation already owned by the existing Complex preimage route.
- Power-wrapper substrates for `F^n=R` shapes only when every generated symbolic wrapper branch remains degree 2 or lower and after symbolic RHS branch-readback policy plus `complexExactForm` behavior are locked.

Deferred families:

- Any wrapper-generated cubic/quartic Complex formula path, including Complex Cardano/Ferrari wrapper payloads.
- Complex square-root and nth-root wrappers until principal-root semantics are explicit.
- Complex absolute-value wrappers until locus/set output is designed.
- Complex mixed-radical and true two-selected-target radical wrappers.
- Complex nested wrappers, including depth-2 algebraic nested chains.
- Complex same-argument mixed sine/cosine wrappers, because the Real amplitude/range split is not the Complex policy.
- Target-dependent exp/log/trig companions, target-in-base powers, log-combination transforms, trig products, mismatched trig arguments, and nested trig towers.
- Visible `RootOf`, implicit roots, numeric-only Exact closure, broad route widening, graphing, step-by-step, Rust migration, and schema/runtime changes.

## Milestone Sequence

### 0. `EQUATION-COMPLEX-WRAPPER-CATCHUP-POLICY0`

Status: this roadmap milestone.

Scope:

- Audit the live Real wrapper closeout and Complex foundation.
- Lock the catchup policy and family order.
- Record the new roadmap in durable memory.
- No code or runtime behavior changes.

Verification:

- Memory protocol.
- Diff check.
- Path-specific docs/memory commit.

### 1. `EQUATION-COMPLEX-WRAPPER-BASELINE-LOCK1`

Status: implemented in the first catchup bundle.

Purpose: add focused regression coverage for the current Complex wrapper boundary before enabling any new family.

Scope:

- Lock current unsupported Complex wrapper cases across algebraic, exp/log, trig, mixed, rational, and nested examples.
- Assert no Real `Trig Formula Cases`, `Real Cardano Cases`, `Real Ferrari Cases`, or `Nested Formula Cases` leak into Complex wrapper outcomes.
- Assert Complex Off behavior remains Real-first.
- Add route/readback inventory tests for already-supported direct Complex preimage and special-form routes that future wrapper catchup should delegate to.

Out of scope:

- New solver behavior.
- Display/UI changes.

### 2. `EQUATION-COMPLEX-PREIMAGE-WRAPPER-CATCHUP1`

Status: implemented for exact constants in the first catchup bundle.

Purpose: enable the lowest-risk Complex wrapper catchup by peeling affine shells around exactly one exp/log/trig selected-target carrier and delegating to existing Complex preimage routes.

Candidate forms:

- `a*e^F+c=d`
- `a*ln(F)+c=d`
- `a*sin(F)+c=d`
- `a*cos(F)+c=d`
- `a*tan(F)+c=d`

Requirements:

- Complex On + Exact only.
- No numeric interval route.
- Exact numeric or explicit complex constants only; symbolic shell coefficients/constants remain deferred.
- One selected-target carrier only.
- Generated symbolic wrapper equations should remain degree 2 or lower; cubic/quartic generated formula payloads are not a target.
- Preserve branch families from existing Complex preimage readback.
- Preserve denominator/domain facts generated by the final branch equations.
- Do not apply Real sine/cosine range facts in Complex mode.

Boundaries:

- No same-argument mixed sine/cosine Complex wrapper in this slice.
- No target-dependent companions.
- No nested exp/log/trig towers.
- No generated Cardano/Ferrari wrapper formula payloads; this is a standing product/readback boundary, not just a missing validation helper.

### 3. `EQUATION-COMPLEX-POWER-WRAPPER-POLICY1`

Purpose: lock the Complex branch policy for power wrappers before visible implementation.

Questions to settle:

- How should symbolic RHS branches for `F^n=R` render under `rectangular`, `polar`, and `cis` exact forms?
- Which cases may use all-branches nth-root readback, and which require controlled unsupported guidance?
- How should branch-local facts and finite branch parameters be named?
- How should exact numeric, exact complex, and symbolic RHS cases differ?

Output:

- A policy/session dossier and focused tests for direct route behavior.
- No visible wrapper expansion unless explicitly approved as part of the same milestone.

### 4. `EQUATION-COMPLEX-POWER-WRAPPER-CATCHUP1`

Purpose: enable one-layer Complex power wrappers where the policy from milestone 3 is satisfied.

Candidate forms:

- `F^2=b`
- `a*F^2+c=d`
- Power shells whose generated final branch equations remain degree 2 or lower.

Requirements:

- Reuse existing selected-target power and Complex special-form routes.
- Honor `complexExactForm`.
- Preserve finite branch counts and denominator/domain facts.
- Keep branch generation capped by existing Complex exact branch limits.
- Keep generated final symbolic branch equations at degree 2 or lower.

Boundaries:

- No principal square-root/nth-root function wrappers.
- No degree-3-or-higher generated symbolic wrapper branches.
- No symbolic-coefficient carrier quadratics unless the existing Complex route already supports them honestly.
- No visible `RootOf`.

### 5. `EQUATION-COMPLEX-GENERATED-FORMULA-VALIDATION1` (Retired)

Status: retired by user decision on 2026-06-27.

Purpose:

- Do not build a validation substrate whose main purpose is to unlock wrapper-generated Complex Cardano/Ferrari output.
- Keep tests proving unsafe Complex generated cubic/quartic wrapper payloads remain blocked.
- If future Complex wrapper work needs validation for degree-2 branches, build that narrower evidence inside the degree-2 wrapper milestone rather than reopening cubic/quartic formulas.

### 6. `EQUATION-COMPLEX-CARDANO-FERRARI-WRAPPER-CATCHUP1` (Retired)

Status: retired by user decision on 2026-06-27.

Purpose:

- No longer a planned implementation milestone. Complex wrapper-generated cubic/quartic symbolic output is expected to be too complex and unreadable.
- Top-level Complex Cardano/Ferrari policy is separate; this retirement applies to wrapper-generated Complex formula output.

### 7. `EQUATION-COMPLEX-ROOT-WRAPPER-POLICY1`

Purpose: decide principal-function wrappers such as `sqrt(F)=R` and `root(F,n)=R`.

Questions to settle:

- Whether Calcwiz treats user-entered Complex roots as principal functions, all-branch relations, or notation requiring explicit mode wording.
- Which exact facts express the principal-root image/range condition.
- How negative/complex/symbolic RHS values are validated.
- Whether root wrappers can reuse power wrapper output after adding principal-image facts.

### 8. `EQUATION-COMPLEX-NESTED-WRAPPER-SUBSTRATE1`

Purpose: only after one-layer Complex wrappers are reliable, audit whether a depth-2 nested substrate is safe.

Boundaries:

- No depth-3 chains.
- No mixed radical/exp-log/trig nesting.
- No nested formula payloads before one-layer validation and root policy are proven.

## First Recommended Implementation After This Roadmap

`EQUATION-COMPLEX-WRAPPER-BASELINE-LOCK1` and `EQUATION-COMPLEX-PREIMAGE-WRAPPER-CATCHUP1` are the first implementation pair. Future Complex wrapper work should stay degree-2-first.

Rationale:

- Baseline tests prevent accidental Real formula leakage while catchup begins.
- Exp/log/trig preimage wrappers can reuse existing Complex branch-family routes and avoid the unresolved symbolic principal-root problem.
- Power/root wrappers need a degree-2 branch policy first.
- Generated Complex Cardano/Ferrari wrappers are not a roadmap target.

## Manual QA Seeds

Real wrapper examples should continue to work unchanged:

- `a\sin((z^4+z+1)/(z-m))+c=d`
- `A\sin((z^4+z+1)/(z-m))+B\cos((z^4+z+1)/(z-m))=C`
- `\sqrt[3]{\sqrt{z^4+z+1}}=b`

Complex catchup seeds for supported/preferred degree-2 behavior:

- `2e^{z^2}+1=3`
- `2\ln(z-1)+1=5`
- `\ln((z-1)/(z+2))+1=5`
- `2\sin(z)+1=1+i`
- `2\tan(z^2)+1=3+2i`
- `(z^2+1)^2=b`

Boundary seeds:

- `a e^{z^3+z+1}+c=d`
- `a\ln(z^3+z+1)+c=d`
- `a\sin(z^3+z+1)+c=d`
- `a\tan((z^4+z+1)/(z-m))+c=d`
- `(z^3+z+1)^3=b`
- `((z^4+z+1)/(z-m))^2=b`
- `\sqrt{z^3+z+1}=b`
- `\sqrt[3]{z^4+z+1}=b`
- `|z^3+z+1|=b`
- `A\sin(z^3+z+1)+B\cos(z^3+z+1)=C`
- `\sin(z^3+z+1)\cos(z^3+z+1)=b`
- `\sqrt{\sqrt{z^3+z+1}}=b`
