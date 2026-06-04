# TRACK-AREA-POLY-RAT0 Manual Verification Checklist

milestone: `AREA-POLY-RAT0`  
status: verified pending commit approval  
date: 2026-05-21  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Created the first real multi-source area study under `playground/area-studies/studies/area-poly-rat0/`.
- Compared polynomial/rational substrate patterns across Calcwiz, FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra.
- Updated area-study validation for committed `studies/<area-id>/` folders.
- Chose bounded `INT-RAT1` as the next recommended move.

## Boundary Checks

- [x] No product math behavior changed.
- [x] No source mirror was executed.
- [x] No source mirror dependency was added.
- [x] No external source code was copied into Calcwiz.
- [x] No Labs runner capability changed.
- [x] GeoGebra was treated as workflow/CAS interaction evidence; Giac/XCAS remains the calculator-engine evidence source.

## Decision

`AREA-POLY-RAT0` recommends `INT-RAT1`.

The recommended first slice is one-variable exact rational integration over normalized rational functions whose proper denominators decompose into distinct rational linear factors. The slice should require derivative-backed verification and explicit stop reasons.

## Deferred Or Blocked

- repeated-factor partial fractions
- irreducible quadratic partial fractions
- square-free factorization
- resultants
- Grobner/elimination
- exact linear algebra
- broad simplification/normal-form expansion

## Verification Commands

- [x] `npm run test:area-studies`
- [x] `npm run test:source-mirrors`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `git ls-files playground/sources/mirrors`
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
git commit -m "Add AREA-POLY-RAT0 rational substrate synthesis"
```
