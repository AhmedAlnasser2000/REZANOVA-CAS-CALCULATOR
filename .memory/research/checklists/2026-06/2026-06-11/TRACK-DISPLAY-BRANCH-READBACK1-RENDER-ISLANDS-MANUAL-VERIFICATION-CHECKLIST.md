# TRACK-DISPLAY-BRANCH-READBACK1 Render Islands Manual Verification Checklist

## Scope

- Display-only repair for branch-heavy finite exact answers.
- Branch rows preserve full `target relation branch` semantics while rendering the prefix and branch expression as separate math islands.
- Full `exactLatex` stays canonical for Copy Result, To Editor, history, replay, and stored solver output.
- No solver, OOE, history schema, replay, or result semantics changes.

## Manual Checks

- Branch-heavy Equation selected-target output renders as vertical rows.
- Non-`x` targets such as `s`, `t`, `z`, and `\theta` retain the selected target in each displayed row.
- Symbolic parameters inside branches remain intact and are not treated as extra solve targets.
- Dense branch rows do not collapse into one horizontal set and do not show a count-only answer.
- Copy Result still uses the original full exact result.

## Verification Commands

- `npm run test:unit -- src/lib/display/*.test.ts`
- `npm run test:ui -- src/components/MathStatic.ui.test.tsx`
- `npm run test:ui -- src/AppMain.ui.test.tsx`
- `npx tsc -b --pretty false`
- `npm run lint`
- `git diff --check`
- `npm run test:memory-protocol`
- `npm run build`
