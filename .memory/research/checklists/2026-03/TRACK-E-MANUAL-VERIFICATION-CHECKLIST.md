# Track E Manual Verification Checklist (Current Parallel Scope)

Date: 2026-03-05  
Scope: verify the Track E consistency work already shipped in parallel with Track A.

## What Is Achieved Now
- Impossible-real equations in selected bounded families return explicit `Range Guard` outcomes instead of generic unsupported-family errors.
- Trigonometry equation flow suppresses `Send to Equation` when impossibility is already proven.
- Numeric interval solving messaging is more explicit (`Bracket-first`) and now includes local-minimum recovery behavior.
- Solver provenance is clearer through badges and summary text (`Range Guard`, `Symbolic Substitution`, `Inverse Isolation`, `Numeric Interval`, `Candidate Checked`).

## Manual Checklist (In App)

1. Equation impossible trig carrier
- Input: `sin(x^2)=5` in `Equation > Symbolic`
- Run solve
- Expect:
  - error explains no real solutions due to `[-1,1]` trig range
  - badge includes `Range Guard`
  - numeric solve panel is not offered

2. Equation impossible bounded product
- Input: `sin(x^2)cos(x)=5`
- Run solve
- Expect:
  - `Range Guard`
  - summary mentions bounded interval mismatch (e.g. `[-1,1]`)

3. Equation still-not-impossible case remains eligible
- Input: `sin(x)+cos(x)=1`
- Run solve
- Expect:
  - no false `Range Guard`
  - controlled unresolved/unsupported path remains
  - numeric solve remains available

4. Numeric interval baseline root
- Input: `cos(x)=x`
- Open Numeric Solve panel
- Interval: start `0`, end `1`, subdivisions `256`
- Run numeric solve
- Expect:
  - approx root near `0.739085`
  - badges include `Numeric Interval` and `Candidate Checked`
  - method indicates bracket-first behavior

5. Numeric no-root guidance quality
- Input: `cos(x)=x`
- Interval: start `3`, end `20`, subdivisions `512`
- Run numeric solve
- Expect:
  - explicit guidance to widen/shift interval and/or increase subdivisions
  - no fake root accepted

6. Even-multiplicity/non-sign-change recovery
- Input: `(x-0.3)^2=0`
- Interval: start `0`, end `1`, subdivisions `64`
- Run numeric solve
- Expect:
  - root near `0.3` recovered
  - solver still marks numeric provenance (not symbolic)

7. Trigonometry handoff suppression for impossible case
- Go to `Trigonometry > Equation Solve`
- Input: `sin(x^2)=5`
- Run solve
- Expect:
  - `Range Guard`-style impossible message
  - no `Send to Equation` action

8. Trigonometry handoff retained for numeric-eligible case
- In `Trigonometry > Equation Solve`
- Input: `cos(x)=x`
- Run solve
- Expect:
  - unresolved message suitable for numeric follow-up
  - `Send to Equation` action is present

9. Trig-first substitution coverage
- Input: `2tan^2(3x)+tan(3x)-1=0` in `Equation > Symbolic`
- Run solve
- Expect:
  - symbolic solve succeeds
  - badges include `Symbolic Substitution`

10. Exponential notation parity
- Input: `exp(2x)-5exp(x)+6=0` in `Equation > Symbolic`
- Run solve
- Expect:
  - solve succeeds
  - provenance reflects substitution/inverse isolation path

## Pass Criteria
- Items 1, 2, 7 must hard-stop as impossible.
- Items 4, 6 must produce valid numeric roots.
- Items 8, 9, 10 must preserve intended handoff/solve behavior.
- No item should silently return misleading success.
