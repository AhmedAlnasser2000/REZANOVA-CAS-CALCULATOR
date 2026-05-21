# AREA-POLY-RAT0 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Commands

Passed:

```bash
npm run test:area-studies
npm run test:source-mirrors
npm run test:memory-protocol
npm run lint
npm run build
git ls-files playground/sources/mirrors
git check-ignore playground/sources/mirrors/sympy/.probe
git check-ignore playground/sources/mirrors/maxima/.probe
git check-ignore playground/sources/mirrors/sagemath/.probe
git check-ignore playground/sources/mirrors/giac-xcas/.probe
git check-ignore playground/sources/mirrors/symengine/.probe
git check-ignore playground/sources/mirrors/geogebra/.probe
```

## Notes

- Area-study structure validates.
- Source mirrors remain ignored.
- Memory protocol passes.
- Lint/build pass.
- `npm run build` emitted the existing large-chunk warning.
- Only `.gitkeep` remains tracked under `playground/sources/mirrors`.
