# Equation Numeric Angle-Unit Consistency Verification Summary

## Automated Verification
- `npm run test:unit -- src/lib/equation/domain-guards.test.ts src/lib/equation/numeric-interval-solve.test.ts src/lib/equation/guarded-solve.test.ts`
- `npm run test:ui -- --run src/AppMain.ui.test.tsx`
- `npx playwright test e2e/qa1-smoke.spec.ts -g "Equation numeric interval smoke|follow up unresolved composition guidance"`
- `npm run test:gate`

## Focused Coverage Added / Updated
- `src/components/SignedNumberInput.test.ts`
  - scientific-notation parsing for large and small values
- `src/lib/equation/domain-guards.test.ts`
  - angle-aware residual validation for `deg`, `rad`, and `grad`
- `src/lib/equation/numeric-interval-solve.test.ts`
  - direct trig numeric interval solving in `deg` and `grad`
  - unit-aware branch guidance for direct trig composition misses in `deg` and `grad`
- `src/lib/equation/guarded-solve.test.ts`
  - explicit numeric interval priority over unresolved composition guidance
  - Equation numeric interval solving across all three angle units
  - current-unit branch guidance on unresolved periodic composition misses
- `src/AppMain.ui.test.tsx`
  - Equation numeric interval solve in `DEG`, `RAD`, and `GRAD`
  - `tan(ln(x+1))=1` numeric follow-up with a valid interval
  - `tan(ln(x+1))=1` no-root guidance in `DEG`
  - Equation numeric interval inputs accept scientific notation for large branch windows
- `e2e/qa1-smoke.spec.ts`
  - browser smoke for angle-unit-aware Equation numeric solve
  - browser smoke for composition guidance followed by numeric interval solve
  - browser smoke for unit-aware branch guidance on a missed trig-composition interval

## Outcome
- Passed
