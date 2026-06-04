# TRACK-AREA-EXACT-LINEAR-ALGEBRA0 Manual Verification Checklist

Attribution:

- primary_agent: `codex`
- primary_agent_model: `gpt-5.5`

## What Is Achieved Now

- Added `AREA-EXACT-LINEAR-ALGEBRA0` as a full synthesis study.
- Registered `area-exact-linear-algebra0` in area-study validation.
- Compared Calcwiz plus seven static source mirrors for exact scalar, matrix, vector, row-reduction, determinant, rank, inverse, solve, and fraction-free readiness.
- Recommended exactly one next move: `EXACT-LINEAR-ALGEBRA1`.
- Kept product Matrix/Vector behavior, solver behavior, polynomial elimination, graphing, source execution, and copied source out of scope.

## Manual App Steps

No manual app flow is expected.

This is a study/tooling/memory milestone only. The calculator should behave exactly as before.

## Boundary Checks

- No stable math files should implement exact matrices, exact row reduction, or exact solving.
- No Matrix/Vector UI behavior should change.
- No source mirror should be executed or tracked.
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

- Area-study validation accepts six committed studies.
- Source mirrors remain ignored except the tracked placeholder.
- Memory protocol passes with the new checklist/session dossier.
- Lint and build pass.
- One commit includes both the clearer-name cleanup and this study.
