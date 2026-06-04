# TRACK-EDITOR-VARIABLE-HINTS1 Manual Verification Checklist

status: completed
date: 2026-05-25
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Verify semantic variable hints appear as stable visible chips near supported editors.
- Verify hints use existing `VARIABLE-CORE1` classifications and stored-value memory.
- Verify Equation symbolic stored values are labeled as ignored/preserved, not substituted.
- Verify Table and calculus active/bound variables are marked without changing evaluation behavior.
- Verify named-string variables remain unsupported and no parser/solver behavior changes.

## Manual Checks

- [x] Stored `z=8`; Equation symbolic `x+z=5`, target `x`, shows `x` as target and `z` as stored ignored.
- [x] `az=1` shows adjacent-letter ambiguity through variable hints.
- [x] `sin(x)+pi` marks reserved function/constant identifiers.
- [x] Table `a x^2` with stored `a=4`, `x=9` marks `a` as stored and `x` as active table variable.
- [x] Calculus/Advanced Calc workbench editors mark active or bound variables when the editor context is explicit.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/variable-hints.test.ts src/lib/algebra/variable-core.test.ts src/lib/algebra/variable-memory.test.ts src/lib/modes/equation.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
