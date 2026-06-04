# TRACK-SOURCE-CAPTURE1 Manual Verification Checklist

milestone: SOURCE-CAPTURE1  
primary_agent: codex  
primary_agent_model: gpt-5.5  
recorded_by_agent: codex  
recorded_by_agent_model: gpt-5.5  
verified_by_agent: codex  
verified_by_agent_model: gpt-5.5  
attribution_basis: live

## What Is Achieved Now

- Six registered open-source context mirrors were shallow-captured under ignored local mirror paths.
- FriCAS remains the existing active static mirror.
- All seven registered mirrors are active context mirrors in `playground/sources/INDEX.md`.
- Captured mirrors remain `static-only` with `execution_policy: no-execute`.
- No mirror payload is tracked by Git.
- TI closed/proprietary calculator files are intentionally excluded.

## Captured Mirrors

| mirror | branch | commit | remote | footprint |
| --- | --- | --- | --- | --- |
| `sympy` | `master` | `a389c00361b37bb87117dd99d27948589d88b40e` | `https://github.com/sympy/sympy.git` | `46M` |
| `maxima` | `master` | `6f595002a45012ed3019ac02bc1aa378e6c85360` | `https://git.code.sf.net/p/maxima/code` | `147M` |
| `sagemath` | `develop` | `1398283a9c5fec8f220213640fff34a7864bfb0a` | `https://github.com/sagemath/sage.git` | `189M` |
| `giac-xcas` | `master` | `c1b72353317a92acfd2bfb39ed831d28e6ff53d8` | `https://github.com/geogebra/giac.git` | `88M` |
| `symengine` | `master` | `656bcef8b0df6035e363be020fadf7219678cd9e` | `https://github.com/symengine/symengine.git` | `7.8M` |
| `geogebra` | `main` | `2ecf3db09da3a02c31dbc2ca885dc8cf8ac0ad2e` | `https://github.com/geogebra/geogebra.git` | `148M` |

## Manual App Steps

- No calculator UI behavior changes are expected.
- Do not open or execute mirror code from Labs.
- For static inspection, use text search or file reads only under `playground/sources/mirrors/<mirror-id>/`.

## Expected Results

- `git ls-files playground/sources/mirrors` lists only `playground/sources/mirrors/.gitkeep`.
- `git check-ignore playground/sources/mirrors/<mirror-id>/.probe` reports each mirror path as ignored.
- `npm run test:source-mirrors` passes with seven active registered mirrors.
- `npm run test:memory-protocol` passes.
- `npm run lint` passes after excluding ignored mirror payloads from ESLint traversal.

## Boundary Confirmation

- No source mirror was built, tested, executed, or installed.
- No source mirror was added as a submodule.
- No mirror dependency was installed in the Calcwiz workspace.
- No copied mirror source entered stable Calcwiz code.
- No stable `src/` file imports or reads `playground/sources`.
- No Labs runner executes source mirrors.
