# TRACK-AREA-MULTIVAR0 Manual Verification Checklist

Attribution:

- primary_agent: `codex`
- primary_agent_model: `gpt-5.5`

## What Is Achieved Now

- Added a full synthesis area study for variable semantics and multivariable readiness.
- Compared Calcwiz with FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources only.
- Recorded that multivariable work is app-wide, not only polynomial/rational work.
- Selected `VARIABLE-CORE1` as the exact next move.
- Kept `POLY-ELIM2`, variable memory, Equation target UI, graphing, Labs runners, and source execution out of scope.

## Manual App Steps

No manual app flow is expected.

This milestone is study-only. Calculate, Equation, Calculus, Table, Matrix, Vector, Labs, and Guide should behave as before.

## Expected Results

- `AREA-MULTIVAR0` appears in the area-study index.
- The study recommends `VARIABLE-CORE1`.
- Stored variables remain distinct from solve targets in the recorded policy.
- Bivariate elimination remains blocked until variable roles are explicit.
- `test-results/` remains generated/untracked noise.

## Verification Commands

```bash
npm run test:area-studies
npm run test:source-mirrors
npm run test:memory-protocol
npm run lint
npm run build
```

Mirror containment checks:

```bash
git ls-files playground/sources/mirrors
git check-ignore playground/sources/mirrors/fricas/.probe
git check-ignore playground/sources/mirrors/sympy/.probe
git check-ignore playground/sources/mirrors/maxima/.probe
git check-ignore playground/sources/mirrors/sagemath/.probe
git check-ignore playground/sources/mirrors/giac-xcas/.probe
git check-ignore playground/sources/mirrors/symengine/.probe
git check-ignore playground/sources/mirrors/geogebra/.probe
```
