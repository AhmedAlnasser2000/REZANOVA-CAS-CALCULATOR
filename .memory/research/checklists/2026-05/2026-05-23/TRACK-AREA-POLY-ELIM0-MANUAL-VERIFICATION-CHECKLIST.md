# TRACK-AREA-POLY-ELIM0 Manual Verification Checklist

Attribution:

- primary_agent: `codex`
- primary_agent_model: `gpt-5.5`

## What Is Achieved Now

- Added `AREA-POLY-ELIM0` as a full synthesis study.
- Registered `area-poly-elim0` in area-study validation.
- Compared Calcwiz plus seven static source mirrors for polynomial elimination, resultants, Grobner bases, multivariate representation, coefficient domains, exact linear algebra, and assumption fact propagation.
- Recommended exactly one next move: `AREA-EXACT-LINEAR-ALGEBRA0`.
- Recorded the milestone numbering convention: `0` is audit/study/surveillance/readiness, implementation starts at `1`.
- Recorded graphing deferral until broad calculator stabilization.

## Manual App Steps

No manual app flow is expected.

This is a study/tooling/memory milestone only. The calculator should behave exactly as before.

## Boundary Checks

- No stable math files should implement resultants, Grobner bases, or elimination.
- No source mirror should be executed or tracked.
- No graphing milestone should be recommended as a near-term next step.
- `test-results/` remains generated/untracked noise.

## Verification Commands

```bash
npm run test:area-studies
npm run test:source-mirrors
npm run test:memory-protocol
npm run lint
npm run build
git ls-files playground/sources/mirrors
git check-ignore playground/sources/mirrors/fricas/.probe
git check-ignore playground/sources/mirrors/sympy/.probe
git check-ignore playground/sources/mirrors/maxima/.probe
git check-ignore playground/sources/mirrors/sagemath/.probe
git check-ignore playground/sources/mirrors/giac-xcas/.probe
git check-ignore playground/sources/mirrors/symengine/.probe
git check-ignore playground/sources/mirrors/geogebra/.probe
```

## Expected Result

- Area-study validation accepts five committed studies.
- Source mirrors remain ignored except the tracked placeholder.
- Memory protocol passes with the new journal/checklist/session dossier.
- Lint and build pass.
- No commit is made without explicit user approval.
