# TRACK-ASSUMPTIONS-READBACK0 Manual Verification Checklist

milestone: `ASSUMPTIONS-READBACK0`  
status: implemented, verified locally, not committed  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Added visible readback for existing internal `AssumptionFact[]` metadata through current result detail sections.
- Surfaced domain facts, interval hazards, candidate checking, branch facts, and trust notes without adding new math behavior.
- Reused existing `DisplayOutcome.detailSections` and `exactSupplementLatex` surfaces.
- Kept primary answers, result origins, strategy labels, history/provenance, Labs, and source mirrors unchanged.

## Manual App Steps

- In Calculate, simplify `\frac{1}{3}+\frac{1}{6x}` and confirm the result still reads `\frac{2x+1}{6x}` while showing a domain fact for `x\ne0`.
- In Calculate or Advanced Calc, evaluate `\int_{-1}^{1}\frac{1}{x}\,dx` and confirm it still stops before numeric fallback while showing interval safety/trust detail.
- In Equation, solve `\frac{1}{3}+\frac{1}{6x}=1` and confirm the solution/exclusion remain stable while a domain fact is visible.
- In Table, build `f(x)=\sqrt{x}` over `[-1,1]` and confirm the undefined sampled row warning also has domain/interval detail.

## Expected Results

- Existing answer LaTeX, warnings, badges, result origins, and strategy labels remain stable.
- Domain/exclusion/candidate/interval/trust facts appear as explanatory detail sections where existing engines already produce facts.
- Normal calculator history and result provenance remain unchanged.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/assumption-readback.test.ts src/lib/algebra/assumptions-core.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/symbolic-engine/rational.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/engine/math-engine.test.ts src/lib/modes/calculate.test.ts src/lib/modes/equation.test.ts src/lib/modes/table.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Commit

Pending explicit user approval.

```bash
git commit -m "Add ASSUMPTIONS-READBACK0 visible fact readback"
```
