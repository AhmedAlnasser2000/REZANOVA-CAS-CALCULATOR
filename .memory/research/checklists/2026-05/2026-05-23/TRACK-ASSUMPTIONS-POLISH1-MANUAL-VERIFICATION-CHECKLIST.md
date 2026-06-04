# TRACK-ASSUMPTIONS-POLISH1 Manual Verification Checklist

milestone: `ASSUMPTIONS-POLISH1`  
status: implemented, verified locally, not committed  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Added a global `Detailed Facts` setting, default off, for visible assumption/readback detail.
- Kept backend `AssumptionFact[]` and `DisplayOutcome.detailSections` generation unchanged.
- Added display-layer filtering so default result surfaces stay concise while detailed mode shows the full domain/interval/candidate/trust wording.
- Preserved primary math outputs, history behavior, strategy chips, result origins, and solver/calculus behavior.

## Manual App Steps

- Evaluate `\int\frac{1}{x^2-1}\,dx` in Calculate.
- Confirm the default result shows concise `Partial Fractions` detail without standalone verbose trust wording.
- Open Settings, enable `Detailed Facts`, and confirm the same result surface now exposes full checked-source/trust detail.
- Disable `Detailed Facts` again and confirm the concise result surface returns without recomputing the math result.

## Expected Results

- The primary answer and badges are unchanged.
- Concise mode avoids overwhelming fact detail.
- Detailed mode remains available for auditing what was checked.

## Verification Commands

- [x] `npm run test:unit -- src/lib/display/result-detail-policy.test.ts src/lib/app-state/settings.test.ts src/components/SettingsPanel.ui.test.tsx src/AppMain.ui.test.tsx src/lib/algebra/assumption-readback.test.ts`
- [x] `npm run test:ui -- src/components/SettingsPanel.ui.test.tsx src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Commit

Pending explicit user approval.

```bash
git commit -m "Polish ASSUMPTIONS-POLISH1 fact detail settings"
```
