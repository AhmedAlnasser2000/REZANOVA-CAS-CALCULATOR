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

Updated after the user decision/refinement on 2026-06-27: Complex wrapper catchup should not expose explicit generated Complex Cardano/Ferrari formula readback. The boundary is method/readback quality, not degree alone: compact, validated non-Cardano/Ferrari higher-degree representations such as factorable branches or special-form `PrincipalRoot`/omega branches remain valid future candidates.

Updated by `EQUATION-COMPLEX-WRAPPER-ROLE-POWER-POLICY-LOCK1` on 2026-06-27: role-boundary tests now protect that wrapper index/exponent, inner carrier polynomial degree, and readback method are separate. This does not enable Complex power wrappers yet; it only locks the policy surface before implementation.

Updated by `EQUATION-COMPLEX-POWER-WRAPPER-CATCHUP1 + EQUATION-COMPLEX-ROOT-WRAPPER-POLICY1` on 2026-06-27: one-layer Complex power wrappers are now live as compact all-branch power relations when generated branch equations stay inside bounded Complex-capable routes. Complex square-root and nth-root wrappers are locked as principal functions and are blocked from Real-style inversion until principal-image validation exists.

Updated by `EQUATION-COMPLEX-PRINCIPAL-IMAGE-INEQUALITY-SUBSTRATE1` on 2026-06-27: principal-root image facts now exist as behavior-invisible internal/test-facing substrate. Square roots use the Complex principal-root half-plane condition, higher roots use the argument-sector condition, and obvious exact constants can be classified before a later root-wrapper route consumes the facts.

Updated by `EQUATION-COMPLEX-ROOT-WRAPPER-PRINCIPAL-IMAGE1` on 2026-06-28: one-layer Complex principal root wrappers are now live when the isolated root value is inside or guarded by the principal-root image and the powered carrier equation stays inside compact Complex-capable routes. Exact outside-image values stop with a controlled error.

## Audit Inputs

The policy pass inspected the current wrapper state, Complex foundation roadmap, Equation frontier roadmap, generated-formula validation boundaries, Complex domain tests, wrapper tests, and Cardano/Ferrari route posture.

Relevant live facts:

- Real Exact generated formula payloads are live for one-layer algebraic wrappers, affine single-root radical shells, mixed radical single-square-root shells, mixed exp/log shells, mixed trig shells, and exact depth-2 algebraic nested wrappers.
- Complex On Exact already has bounded algebraic, rational, selected-power, special-form, exp/log preimage, and trig preimage capabilities outside wrapper formula handoff.
- Complex direct/rational Cardano/Ferrari routes exist for top-level polynomial solving, but wrapper catchup does not target generated explicit Complex Cardano/Ferrari formula readback.
- Complex exact-form settings are readback policy: `cis` may use `\operatorname{cis}`, while `rectangular` and `polar` must not silently force `cis`.
- Symbolic principal-branch Complex roots remain deferred.

## Locked Policy

- Complex wrapper catchup is Equation-only, `Complex On`, and `Exact` only.
- Complex catchup must reuse existing Complex algebraic/preimage routes where they already own branch semantics. It must not route through Real-only `formulaHandoff`.
- Complex wrapper payloads that introduce symbolic branch surfaces need branch validation evidence, scoped facts, and readable branch readback.
- Explicit generated Complex Cardano/Ferrari formula readback is retired as a product/readback target, not merely waiting for validation.
- Degree-3/4 Complex wrapper solving is allowed only when it avoids explicit Cardano/Ferrari formula expansion and can reuse compact validated representations such as factorable branches, special-form `PrincipalRoot`/omega branches, or a future approved compact algebraic-root policy.
- `complexExactForm` is load-bearing. Wrapper branches must honor the selected exact-form style instead of collapsing everything to one display notation.
- Complex absolute-value wrappers remain deferred because `Abs` over Complex is magnitude/locus semantics, not the Real sign split `F=b` or `F=-b`.
- Square-root and nth-root wrappers are principal functions in Complex mode. The live route may solve them only after principal-image validation or guarded facts, and only through compact Complex-capable carrier equations.
- The Real policy `root(F,n)=rhs -> F=rhs^n` must still not leak into Complex without principal-image evidence.
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
- Compact wrapper branch evidence for future power/root wrappers, including when higher-degree special forms remain readable.
- Tests that prove Complex Off remains Real-first and Complex On does not leak Real range facts such as `-1 <= rhs <= 1` into Complex trig output.

## Family Classification

First-candidate families:

- Single-carrier exp/log affine wrappers, such as `a*exp(F)+c=d` and `a*ln(F)+c=d`, when isolation produces a carrier equation already owned by the existing Complex preimage route.
- Single-carrier trig affine wrappers, such as `a*sin(F)+c=d`, `a*cos(F)+c=d`, and `a*tan(F)+c=d`, when isolation produces a carrier equation already owned by the existing Complex preimage route.
- Power-wrapper substrates for `F^n=R` shapes when every generated symbolic wrapper branch has compact validated readback, such as direct/factorable/special-form branches, and after symbolic RHS branch-readback policy plus `complexExactForm` behavior are locked.

Deferred families:

- Any wrapper-generated explicit Complex Cardano/Ferrari formula path.
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
- Generated symbolic wrapper equations in this first preimage slice are guarded at pure-power degree 2 as an implementation boundary; broader higher-degree special-form catchup requires its own compact-readback policy.
- Preserve branch families from existing Complex preimage readback.
- Preserve denominator/domain facts generated by the final branch equations.
- Do not apply Real sine/cosine range facts in Complex mode.

Boundaries:

- No same-argument mixed sine/cosine Complex wrapper in this slice.
- No target-dependent companions.
- No nested exp/log/trig towers.
- No generated Cardano/Ferrari wrapper formula payloads; this is a standing product/readback boundary, not just a missing validation helper.

### 3. `EQUATION-COMPLEX-POWER-WRAPPER-POLICY1`

Status: implemented through `EQUATION-COMPLEX-WRAPPER-ROLE-POWER-POLICY-LOCK1` plus `EQUATION-COMPLEX-POWER-WRAPPER-CATCHUP1 + EQUATION-COMPLEX-ROOT-WRAPPER-POLICY1`.

Purpose: lock the Complex branch policy for power wrappers before visible implementation.

Questions to settle:

- How should symbolic RHS branches for `F^n=R` render under `rectangular`, `polar`, and `cis` exact forms?
- Which cases may use all-branches nth-root readback, and which require controlled unsupported guidance?
- How should branch-local facts and finite branch parameters be named?
- How should exact numeric, exact complex, and symbolic RHS cases differ?

Output:

- Focused route tests cover the wrapper-index versus carrier-degree boundary, compact special-form readback, symbolic affine shell facts, denominator preservation, exact-form notation, generated cubic/quartic formula deferral, branch caps, and root-wrapper policy stops.
- Visible power-wrapper expansion is now limited to all-branch power relations whose generated final branch equations stay inside compact Complex-capable routes.

### 4. `EQUATION-COMPLEX-POWER-WRAPPER-CATCHUP1`

Status: implemented for one-layer `F^n=R` and `A*F^n+C=R`, `n=2..12`, when final branch equations remain compact and bounded.

Purpose: enable one-layer Complex power wrappers where the policy from milestone 3 is satisfied.

Candidate forms:

- `F^n=b` when existing Complex special-form readback can keep all branches compact and bounded.
- `a*F^n+c=d` when shell isolation yields a supported compact special-form branch family.
- Power shells whose generated final branch equations remain readable without explicit Cardano/Ferrari formula expansion.

Requirements:

- Reuse existing compact Complex selected-target branch routes.
- Honor `complexExactForm`.
- Preserve finite branch counts and denominator/domain facts.
- Keep branch generation capped by existing Complex exact branch limits.
- Keep generated final symbolic branch readback compact; degree alone is not the boundary.

Boundaries:

- No principal square-root/nth-root function wrappers.
- No explicit Cardano/Ferrari formula expansion for generated degree-3/4 branches.
- No symbolic-coefficient carrier quadratics unless the existing Complex route already supports them honestly.
- No visible `RootOf`.

### 5. `EQUATION-COMPLEX-GENERATED-FORMULA-VALIDATION1` (Refocused)

Status: refocused by user decision on 2026-06-27.

Purpose:

- Do not build a validation substrate whose main purpose is to unlock explicit wrapper-generated Complex Cardano/Ferrari formula output.
- Keep tests proving explicit generated Complex Cardano/Ferrari wrapper payloads remain blocked.
- If future Complex wrapper work needs validation for compact factorable/special-form or algebraic-root branches, build that narrower evidence inside the relevant compact-readback milestone rather than reopening explicit Cardano/Ferrari formulas.

### 6. `EQUATION-COMPLEX-CARDANO-FERRARI-WRAPPER-CATCHUP1` (Retired As Explicit Formula Readback)

Status: retired by user decision on 2026-06-27.

Purpose:

- No longer a planned implementation milestone for explicit Complex Cardano/Ferrari wrapper formula readback. That output is expected to be too complex and unreadable.
- Top-level Complex Cardano/Ferrari policy is separate; this retirement applies to wrapper-generated explicit formula expansion, not to all degree-3/4 Complex wrapper solving.
- Future higher-degree Complex wrapper solving must come through compact non-Cardano/Ferrari representations, such as factorable roots, special-form roots, or a future approved compact algebraic-root policy.

### 7. `EQUATION-COMPLEX-ROOT-WRAPPER-POLICY1`

Status: policy locked for now: Complex root wrappers are principal functions, not all-root relations, and visible inversion remains deferred until principal-image validation exists.

Purpose: decide principal-function wrappers such as `sqrt(F)=R` and `root(F,n)=R`.

Locked direction:

- User-entered Complex square-root and nth-root wrappers are treated as principal functions.
- The Real all-root inversion rule must not leak into Complex root wrappers.
- Root-wrapper enablement requires principal-image facts and validation before delegating to power-wrapper output.
- Negative, complex, and symbolic RHS validation remains future work.

### 8. `EQUATION-COMPLEX-PRINCIPAL-IMAGE-INEQUALITY-SUBSTRATE1`

Status: implemented as behavior-invisible substrate.

Purpose: add reusable principal-root image conditions before enabling visible Complex root-wrapper solving.

Scope:

- Square-root image fact: `Re(R)>0 or (Re(R)=0 and Im(R)>=0)`.
- Higher nth-root image fact: `R=0 or -pi/n < arg(R) <= pi/n`.
- Exact classifier for zero/positive real inside, negative real outside, square-root half-plane constants, and simple exact imaginary-axis constants.
- Unknown symbolic or non-obvious exact complex values emit guarded facts rather than pretending proof.

Boundaries:

- No visible `sqrt(F)=R` or `root(F,n)=R` solve output.
- No route-order changes.
- No Display, Formula Viewer, Copy Result, History, OOE, app-state, Tauri, or persisted schema changes.

### 9. `EQUATION-COMPLEX-ROOT-WRAPPER-PRINCIPAL-IMAGE1`

Status: implemented for one-layer compact Complex principal root wrappers.

Purpose: consume the principal-image substrate to enable one-layer Complex principal root wrappers only when the isolated root value is inside or guarded by the principal-root image.

Candidate forms:

- `sqrt(F)=R`
- `root(F,n)=R`, `n=2..12`
- `A*root(F,n)+C=R`

Requirements:

- Complex On + Exact only.
- Target appears only inside `F`; shell pieces are target-free.
- Symbolic shell coefficients emit `A\ne0`.
- Generated carrier equations solve only through compact Complex-capable routes.
- Outside-principal-image exact values produce a controlled no-solution error.
- Generated Complex Cardano/Ferrari formula readback and visible `RootOf` remain blocked.

Implemented coverage:

- `sqrt(z^2+1)=a`
- `root(z^2+1,3)=a`
- `A*sqrt(z^2+1)+C=R`
- `sqrt((z-1)/(z+2))=a`

Remaining boundaries:

- Cubic/quartic generated root-wrapper carriers stay blocked unless they can later use compact non-Cardano/Ferrari readback.
- Nested, mixed, abs, and multi-root-carrier wrappers remain later milestones.

### 10. `EQUATION-COMPLEX-ABS-WRAPPER-POLICY0`

Status: planned audit/test-only policy lock.

Purpose: keep Complex absolute-value wrappers honest as magnitude/locus equations, not Real sign-split equations.

Scope:

- Lock `|F|=R` in Complex mode as unsupported until locus/set output exists.
- Preserve no Real formula leakage.
- Record prerequisites for future affine circle cases such as `|z-c|=r`.

### 11. `EQUATION-COMPLEX-NESTED-WRAPPER-SUBSTRATE1`

Purpose: only after one-layer Complex wrappers are reliable, audit whether a depth-2 nested substrate is safe.

Boundaries:

- No depth-3 chains.
- No mixed radical/exp-log/trig nesting.
- No nested formula payloads before one-layer validation and root policy are proven.

### 12. `EQUATION-COMPLEX-MIXED-ALGEBRAIC-WRAPPER-CATCHUP1`

Status: planned after root-wrapper principal-image enablement and nested substrate audit.

Purpose: enable the first mixed algebraic Complex root-wrapper catchup where one principal root carrier is mixed with a bounded selected-target algebraic companion and powered equations stay compact.

Boundaries:

- Preserve target-dependent principal-image facts such as `b-z` inside the principal square-root image.
- Keep two selected-target root carriers, nested mixed radicals, Complex abs carriers, over-cap branches, generated Complex Cardano/Ferrari formula readback, and visible `RootOf` deferred.

## First Recommended Implementation After This Roadmap

`EQUATION-COMPLEX-WRAPPER-BASELINE-LOCK1`, `EQUATION-COMPLEX-PREIMAGE-WRAPPER-CATCHUP1`, `EQUATION-COMPLEX-POWER-WRAPPER-CATCHUP1 + EQUATION-COMPLEX-ROOT-WRAPPER-POLICY1`, `EQUATION-COMPLEX-PRINCIPAL-IMAGE-INEQUALITY-SUBSTRATE1`, and `EQUATION-COMPLEX-ROOT-WRAPPER-PRINCIPAL-IMAGE1` are implemented. The next recommended implementation is `EQUATION-COMPLEX-ABS-WRAPPER-POLICY0`, an audit/test-only lock for Complex absolute-value locus semantics before nested or mixed algebraic catchup.

Rationale:

- Baseline tests prevent accidental Real formula leakage while catchup begins.
- Exp/log/trig preimage wrappers can reuse existing Complex branch-family routes and avoid the unresolved symbolic principal-root problem.
- Power wrappers now have compact all-branch relation support; root wrappers now have one-layer principal-function support guarded by principal-image facts.
- Explicit generated Complex Cardano/Ferrari wrappers are not a roadmap target.

## Manual QA Seeds

Real wrapper examples should continue to work unchanged:

- `a\sin((z^4+z+1)/(z-m))+c=d`
- `A\sin((z^4+z+1)/(z-m))+B\cos((z^4+z+1)/(z-m))=C`
- `\sqrt[3]{\sqrt{z^4+z+1}}=b`

Complex catchup seeds for the current preimage baseline:

- `2e^{z^2}+1=3`
- `2\ln(z-1)+1=5`
- `\ln((z-1)/(z+2))+1=5`
- `2\sin(z)+1=1+i`
- `2\tan(z^2)+1=3+2i`

Complex compact higher-degree candidates for later policy/implementation:

- `(z+c)^5=a`
- `(2z-1)^6=a`
- `(z^2+1)^2=b`

Boundary seeds:

- `a e^{z^3+z+1}+c=d`
- `a\ln(z^3+z+1)+c=d`
- `a\sin(z^3+z+1)+c=d`
- `a\tan((z^4+z+1)/(z-m))+c=d`
- Explicit generated Cardano/Ferrari wrapper branches for `z^3+z+1` or `z^4+z+1`
- Noncompact high-degree wrapper branches whose only readable path would be expanded Cardano/Ferrari formulas
- `\sqrt{z^3+z+1}=b`
- `\sqrt[3]{z^4+z+1}=b`
- `|z^3+z+1|=b`
- `A\sin(z^3+z+1)+B\cos(z^3+z+1)=C`
- `\sin(z^3+z+1)\cos(z^3+z+1)=b`
- `\sqrt{\sqrt{z^3+z+1}}=b`
