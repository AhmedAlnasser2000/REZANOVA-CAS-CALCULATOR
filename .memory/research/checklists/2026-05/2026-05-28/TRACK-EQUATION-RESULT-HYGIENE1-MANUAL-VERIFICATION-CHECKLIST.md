# TRACK-EQUATION-RESULT-HYGIENE1 Manual Verification Checklist

## Scope

- Prevent internal symbolic readback fragments from reaching user-facing Equation results.
- Normalize only safe multiplication-shaped products for display/readback.
- Keep exact formulas visible and copyable while containing very large answer and validity sections.
- Keep OOE RS work, new solver families, broad simplification, and history schema changes out of scope.

## Manual Checks

- [x] Screenshot-style equation with raw products renders without `\mathtip`, `\blacksquare`, `\error`, or `tuple<...>` fragments.
- [x] `Valid when` conditions render display-safe product spacing instead of black placeholder boxes.
- [x] Raw adjacent products such as `uy` still follow the existing multiplication policy.
- [x] Safe monomial parenthesized products such as `(v)(c^4a^3)` and `v(c^4a^3)` normalize as multiplication.
- [x] Reserved functions and constants such as `\ln(m)`, `\sqrt{x}`, `\mathbb{Z}`, and `\operatorname{atan2}` are not rewritten as variable products.
- [x] Exact answer blocks and validity blocks remain visible, horizontally scrollable when wide, and vertically contained when large.
- [x] Existing selected-target Equation, named-variable, raw-adjacent target, and symbolic-display regressions remain green.

## Verification Commands

- [x] `npm run test:unit -- src/lib/display/result-readback.test.ts src/lib/display/symbolic-display.test.ts src/lib/algebra/variable-core.test.ts src/lib/display/symbolic-output-hygiene.test.ts src/lib/modes/equation.test.ts src/lib/equation/equation-parameterized-readback.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/MathStatic.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Follow-Up Notes

- Consider `EQUATION-ANSWER-MODES1` before resuming OOE RS work so Exact, Approximate, and Isolate/Rearrange intent becomes part of the Equation runtime contract.
