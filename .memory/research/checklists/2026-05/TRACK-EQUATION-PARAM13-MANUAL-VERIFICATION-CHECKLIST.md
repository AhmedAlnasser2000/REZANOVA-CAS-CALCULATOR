# TRACK-EQUATION-PARAM13 Manual Verification Checklist

milestone: `EQUATION-PARAM13`
date: 2026-05-24
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Polish selected-target Equation error and boundary readback.
- Remove user-facing PARAM/milestone wording from selected-target stops and the generic symbolic unsupported boundary.
- Preserve solver behavior, result origins, badges, and history/schema surfaces.

## Manual Checks

- Enter `sin(cos(z^2+x))=5`, choose `z`, and confirm the error explains the real trig range failure.
- Enter `sin(sqrt(|z-a|))=b`, choose `z`, and confirm the error explains a deeper composition boundary.
- Enter `sin(z)+sqrt(z)=a`, choose `z`, and confirm the error explains independent mixed carriers.
- Enter `z+sin(z^2)=a`, choose `z`, and confirm the error explains target-outside-carrier structure.
- Enter `az=1`, choose `z`, and confirm the error suggests explicit multiplication such as `a z`.
- Enter `x^3+x+1=0` and confirm the generic exact-symbolic unsupported message does not mention milestones.

## Verification

- [x] `npm run test:unit -- src/lib/equation/equation-parameterized-readback.test.ts src/lib/modes/equation.test.ts src/lib/equation/guarded-solve.test.ts src/lib/equation/equation-parameterized-composition.test.ts src/lib/equation/equation-target.test.ts src/lib/kernel/runtime-policy.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Boundaries

- No new solving families.
- No additive mixed-carrier solving.
- No deeper composition.
- No variable memory, named string variables, graphing, `POLY-ELIM2`, source-mirror execution, Labs runner work, result-origin changes, badge changes, or history schema changes.
