# TRACK-AREA-ASSUMPTIONS0 Manual Verification Checklist

milestone: `AREA-ASSUMPTIONS0`  
status: research verified, awaiting commit approval  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## What Is Achieved Now

- Added a full synthesis area study for domain, exclusion, branch, and trust policy.
- Compared Calcwiz with FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static context sources only.
- Covered denominator exclusions, domain constraints, real-only restrictions, branch/principal-range facts, candidate rejection, interval hazards, display-only vs verified equivalence, and affected calculator surfaces.
- Selected `ASSUMPTIONS-CORE0` as the next move.
- Kept the study research-only: no math behavior, UI behavior, Labs runner behavior, source execution, copied source, or product dependency changed.

## Manual App Steps

- No manual app verification is required because this milestone changes research/tooling/memory only.
- Open `playground/area-studies/INDEX.md` and confirm `AREA-ASSUMPTIONS0` is the latest study.
- Open `playground/area-studies/studies/area-assumptions0/05-synthesis.md` and confirm the exact decision is `ASSUMPTIONS-CORE0`.
- Confirm `git ls-files playground/sources/mirrors` still lists only the mirror placeholder.

## Expected Results

- Area-study validation includes `area-assumptions0`.
- Source mirrors remain ignored and static-only.
- Memory records that `ASSUMPTIONS-CORE0` is recommended before broader algebra/calculus/table/graphing-readiness widening.
- No stable product files change behavior.

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

## Commit

Suggested only after explicit user approval:

```bash
git commit -m "Add AREA-ASSUMPTIONS0 assumptions policy study"
```
