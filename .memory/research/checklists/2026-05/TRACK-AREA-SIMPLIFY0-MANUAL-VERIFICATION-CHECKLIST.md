# TRACK-AREA-SIMPLIFY0 Manual Verification Checklist

milestone: `AREA-SIMPLIFY0`  
status: verified pending commit approval  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Added the full synthesis study under `playground/area-studies/studies/area-simplify0/`.
- Compared Calcwiz against FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, and GeoGebra as static source-context evidence.
- Focused on normal forms, readable result surfaces, bounded equivalence checks, denominator/domain preservation, and future rational-calculus readback.
- Produced a Calcwiz-native policy recommendation instead of a parity target.

## Boundary Checks

- [x] No stable math/runtime code changed.
- [x] No new simplification, calculus, solver, UI, result-origin, or strategy behavior was added.
- [x] No source mirror was executed, built, tested, or dependency-installed.
- [x] No external source code was copied or translated line-by-line.
- [x] No Labs runner or visual execution capability changed.
- [x] No product dependency on any source mirror was added.

## Decision

Recommended next move: `SIMPLIFY-CORE0`.

Reason: the blocker before `INT-RAT2` is a shared normal-form/readback/equivalence policy. Rational integration can now see repeated-linear and irreducible-quadratic substrate facts, but visible widening needs explicit rules for preserved denominator/domain facts, equivalent-form trust, and readable output choice.

## Deferred Or Separate

- `INT-RAT2` waits until `SIMPLIFY-CORE0` exists.
- `CALC-RAT-READBACK0` is too narrow for the blocker found by this study.
- `AREA-ASSUMPTIONS0` may reopen later if domain/exclusion policy exceeds a bounded simplify substrate.
- `AREA-POLY-ELIM0` remains separate for resultants/Grobner/elimination.

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
git commit -m "Add AREA-SIMPLIFY0 simplification policy study"
```
