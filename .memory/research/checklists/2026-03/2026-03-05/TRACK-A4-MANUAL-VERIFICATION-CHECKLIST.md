# Track A4 Manual Verification Checklist

Date: 2026-03-05
Scope: Track A4 (Exp/Log Solve Completion, bounded guarded scope)

## What A4 Achieved Now
- Shared solver covers bounded exp-polynomial substitution parity for `e^(...)` and `exp(...)` forms.
- Inverse isolation remains bounded (`ln`, common `log`, `exp`, `a^x`) with deterministic guarded recursion/cycle handling.
- Solve provenance is aligned across Equation and Trigonometry equation flows, including substitution badges and diagnostics.
- Unsupported mixed log-combination forms (for example `ln(x)+ln(x+1)=2`) stay controlled unsupported.
- Numeric interval behavior remains explicit and interval-first; no silent fallback.

## App Verification Steps
Use `Equation > Symbolic` unless noted.

| # | Input | Steps | Expected |
|---|---|---|---|
| 1 | `e^(2x)-5e^x+6=0` | Enter equation, press `EXE/F1` | Success, substitution/inverse provenance appears, solutions near `ln(2)` and `ln(3)` |
| 2 | `exp(2x)-5exp(x)+6=0` | Enter equation, press `EXE/F1` | Same solve class and outcome as step 1 (notation parity) |
| 3 | `5e^(x+1)-10=0` | Enter equation, press `EXE/F1` | Success via inverse isolation path (solution near `ln(2)-1`) |
| 4 | `ln(2x+1)=3` | Enter equation, press `EXE/F1` | Success with bounded inverse isolation and valid-domain solution |
| 5 | `2log(x)-1=0` | Enter equation, press `EXE/F1` | Success with bounded common-log inverse isolation |
| 6 | `ln(x)+ln(x+1)=2` | Enter equation, press `EXE/F1` | Controlled unsupported-family error (no fake symbolic solve) |
| 7 | `cos(x)=x` | Enter equation, open Numeric Solve panel, set interval `[0,1]`, run numeric solve | Numeric success near `0.739085...`, numeric method/provenance visible |
| 8 | `sin(x^2)=5` | Enter equation, press `EXE/F1` | Range Guard hard-stop (no handoff/no numeric recommendation) |
| 9 | `e^(2x)-5e^x+6=0` in `Trigonometry > Equation Solve` | Open trig equation screen, run | Same solve class/provenance as Equation |
| 10 | `cos(x)=x` in `Trigonometry > Equation Solve` | Run from trig equation screen | Controlled unresolved + `Send to Equation` action shown |

## Pass/Fail Notes
- [ ] Step 1
- [ ] Step 2
- [ ] Step 3
- [ ] Step 4
- [ ] Step 5
- [ ] Step 6
- [ ] Step 7
- [ ] Step 8
- [ ] Step 9
- [ ] Step 10

## Reviewer Notes
- Runtime checked on: `desktop` / `browser preview` (circle one)
- Any mismatch from expected behavior:
  - 
- Follow-up issue candidates:
  - 
