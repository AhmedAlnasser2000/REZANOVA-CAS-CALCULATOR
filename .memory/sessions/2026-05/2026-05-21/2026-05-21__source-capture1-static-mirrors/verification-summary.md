# SOURCE-CAPTURE1 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Capture Evidence
- `sympy`: `master`, `a389c00361b37bb87117dd99d27948589d88b40e`, `46M`
- `maxima`: `master`, `6f595002a45012ed3019ac02bc1aa378e6c85360`, `147M`
- `sagemath`: `develop`, `1398283a9c5fec8f220213640fff34a7864bfb0a`, `189M`
- `giac-xcas`: `master`, `c1b72353317a92acfd2bfb39ed831d28e6ff53d8`, `88M`
- `symengine`: `master`, `656bcef8b0df6035e363be020fadf7219678cd9e`, `7.8M`
- `geogebra`: `main`, `2ecf3db09da3a02c31dbc2ca885dc8cf8ac0ad2e`, `148M`

## Automated Checks
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed after adding `playground/sources/mirrors/**` to ESLint global ignores: `npm run lint`

## Ignore Checks
- Passed: `git check-ignore playground/sources/mirrors/<id>/.probe` for FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra.
- Passed: `git ls-files playground/sources/mirrors` listed only `playground/sources/mirrors/.gitkeep`.
