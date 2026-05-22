# TRACK-AREA-POLY-RAT1 Manual Verification Checklist

milestone: `AREA-POLY-RAT1`  
status: verified pending commit approval  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Added the full-domain follow-up study under `playground/area-studies/studies/area-poly-rat1/`.
- Marked `AREA-POLY-RAT0` as the predecessor narrow decision study.
- Compared Calcwiz against FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static source-context evidence.
- Produced a Calcwiz-native roadmap instead of a parity target.

## Boundary Checks

- [x] No stable math/runtime code changed.
- [x] No source mirror was executed, built, tested, or dependency-installed.
- [x] No external source code was copied or translated line-by-line.
- [x] No Labs runner or UI execution capability changed.
- [x] No product dependency on any source mirror was added.
- [x] No claim was made that Calcwiz should match any mirror's breadth.

## Decision

Recommended next move: `POLY-RAT-CORE1`.

Reason: `INT-RAT1` proved the distinct-rational-linear slice, but broader rational integration still needs repeated-linear readiness, irreducible-quadratic readiness, square-free/factor-multiplicity facts, and stronger rational-function stop metadata in the algebra substrate first.

## Deferred Or Separate

- `INT-RAT2` waits until `POLY-RAT-CORE1` exists.
- `AREA-SIMPLIFY0` remains the next study if normal-form/readback policy becomes the blocker.
- `AREA-POLY-ELIM0` remains separate for resultants/Grobner/elimination.
- Exact linear algebra remains deferred behind its own area/core readiness.

## Verification Commands

- [x] `npm run test:area-studies`
- [x] `npm run test:source-mirrors`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `git ls-files playground/sources/mirrors`
- [x] `git check-ignore playground/sources/mirrors/fricas/.probe`
- [x] `git check-ignore playground/sources/mirrors/sympy/.probe`
- [x] `git check-ignore playground/sources/mirrors/maxima/.probe`
- [x] `git check-ignore playground/sources/mirrors/sagemath/.probe`
- [x] `git check-ignore playground/sources/mirrors/giac-xcas/.probe`
- [x] `git check-ignore playground/sources/mirrors/symengine/.probe`
- [x] `git check-ignore playground/sources/mirrors/geogebra/.probe`

## Verification Notes

- `npm run build` passed with the existing large-chunk warning.
- `git ls-files playground/sources/mirrors` listed only `playground/sources/mirrors/.gitkeep`.

## Commit

Do not commit until the user explicitly approves.

Suggested commit message after approval:

```bash
git commit -m "Add AREA-POLY-RAT1 domain atlas"
```
