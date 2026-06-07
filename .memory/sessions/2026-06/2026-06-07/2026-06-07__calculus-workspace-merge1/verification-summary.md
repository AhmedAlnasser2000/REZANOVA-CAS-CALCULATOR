# CALCULUS-WORKSPACE-MERGE1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Automated Checks

- `npm run test:unit -- src/lib/modes/calculate-navigation.test.ts src/lib/navigation/launcher.test.ts src/lib/advanced-calc/navigation.test.ts src/lib/guide/content.test.ts src/lib/guide/content.contract.test.ts src/lib/app-state/history-schema.test.ts`
- `npm run test:unit -- src/lib/advanced-calc/*.test.ts src/lib/calculus/calculus-workbench.test.ts`
- `npm run test:ui -- src/AppMain.ui.test.tsx -t "Calculus history"`
- `npm run test:ui -- src/components/HistoryPanel.ui.test.tsx`
- `npm run test:unit -- src/lib/ooe/workspace-pilot.test.ts src/lib/ooe/ooe-bridge.test.ts src/lib/advanced-calc/ui.test.ts`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`

## Notes

- Focused Calculus UI checks passed.
- The full `src/AppMain.ui.test.tsx` run still has an unrelated Equation sawtooth UI failure in `renders COMP10 quadratic sawtooth carriers as exact families with piecewise details`; a focused rerun of that unrelated Equation test also failed to find the expected success card. This was not introduced by the Calculus surface merge and was not fixed in this milestone.
