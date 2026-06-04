# TRACK-VARIABLE-READBACK1 Manual Verification Checklist

status: completed
date: 2026-05-25
primary_agent: codex
primary_agent_model: gpt-5.5

## Scope

- Verify stored-value details are concise by default.
- Verify protected variable notes are present as `Variable Policy` detail sections for Detailed Facts.
- Verify effective substituted expressions/equations appear where helpful.
- Verify Equation numeric no-root readback names the searched interval and substituted equation.

## Manual Checks

- [x] Calculate standard Evaluate shows used stored values and an effective expression.
- [x] Derivative readback shows used stored parameters and keeps the derivative variable protected in detailed policy notes.
- [x] Table readback shows an effective table expression and keeps `x` protected.
- [x] Equation numeric no-root readback is interval-scoped when stored values were used.
- [x] Concise display policy hides `Variable Policy` while keeping `Stored Values`.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/variable-memory.test.ts src/lib/display/result-detail-policy.test.ts src/lib/modes/calculate.test.ts src/lib/modes/table.test.ts src/lib/modes/equation.test.ts src/lib/advanced-calc/engine.test.ts src/lib/app-state/history-schema.test.ts`
- [x] `npm run test:ui -- src/AppMain.ui.test.tsx src/components/VariablesPanel.ui.test.tsx`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
