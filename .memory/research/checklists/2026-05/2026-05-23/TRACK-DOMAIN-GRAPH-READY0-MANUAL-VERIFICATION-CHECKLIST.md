# TRACK-DOMAIN-GRAPH-READY0 Manual Verification Checklist

milestone: `DOMAIN-GRAPH-READY0`  
status: implemented, verified locally, not committed  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Added reusable domain sampling readiness for table and future graphing surfaces.
- Reused `domain-range-core` and the shared `AssumptionFact[]` vocabulary.
- Updated Table mode to consume the shared readiness helper instead of local ad hoc fact construction.
- Recorded the readiness layer in math capability facts without adding graph UI or plotting behavior.

## Manual App Steps

- Build a Table for `f(x)=\sqrt{x}` across a range that includes a negative sample.
- Confirm sampled rows still behave the same, with undefined rows and the existing real-domain warning.
- Confirm default detail readback remains concise.
- Enable `Detailed Facts` and confirm the domain/interval facts can still be inspected.

## Expected Results

- Table output rows and warnings remain unchanged.
- Domain sampling facts are reusable and tested as internal readiness, not a new graphing feature.
- Future graph work can consume the helper without inventing local domain/trust metadata.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/domain-sampling-readiness.test.ts src/lib/modes/table.test.ts src/lib/algebra/domain-range-core.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/display/result-detail-policy.test.ts`
- [x] `npm run test:ui -- src/components/SettingsPanel.ui.test.tsx src/AppMain.ui.test.tsx`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Commit

Pending explicit user approval.

```bash
git commit -m "Add DOMAIN-GRAPH-READY0 domain sampling readiness"
```
