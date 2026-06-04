# TRACK-COMPLEX-PREIMAGE-EQUATION2 Manual Verification Checklist

Milestone: `COMPLEX-PREIMAGE-EQUATION2`
Date: 2026-06-04

## Scope

- [ ] Confirm the milestone is Equation-only and runs only in `Exact + Complex On`.
- [ ] Confirm `Complex Off` keeps real-first behavior for complex inputs.
- [ ] Confirm `Approximate` remains real numeric interval root search for equations only.
- [ ] Confirm `Isolate` remains textbook equation rearrangement only.
- [ ] Confirm no stored complex values, OOE behavior, non-Equation adoption, or Rust solver execution was added.

## Rational And Finite Preimage Checks

- [ ] `(x^2+1)/(x-2)=i` still solves and keeps `x-2 != 0` in `Valid when`.
- [ ] `(x^2+1)/(x^2-2)=i` solves through bounded denominator clearing and keeps denominator exclusions in `Valid when`.
- [ ] `ln((x^2+1)/(x-2))=1+i` solves through the log preimage and denominator-cleared inner route.
- [ ] `exp((x^2+1)/(x-2))=i` solves through logarithm-family branch handoff and denominator-cleared inner route.
- [ ] Finite composition remains capped at four guarded layers.

## Two-Trig-Layer Checks

- [ ] `tan(sin(x))=1+i` returns a concise family with distinct integer parameters.
- [ ] `sin(cos(x))=i` returns nested trig branch families with distinct integer parameters.
- [ ] `cos(tan(x))=1+i` returns nested trig branch families without parameter collisions.
- [ ] `tan(sin(x^2))=1+i` hands the inner branch family to bounded selected-target powers and shows expanded branches in a collapsed detail.
- [ ] `sin(cos(x^4))=i` hands the inner branch family to bounded selected-target powers and shows expanded branches in a collapsed detail.
- [ ] Main periodic answers use concise `k,n in Z` family readback while expanded branch enumeration remains in details.

## Controlled Stops

- [ ] `tan(sin((x-1)/(x+2)))=1+i` stops cleanly as periodic-over-rational.
- [ ] `sin(sin(x^5))=i` stops cleanly as above the bounded degree cap.
- [ ] `sin(sin(x+y))=i` stops cleanly as multivariable.
- [ ] `abs(x)=2` stops cleanly as deferred complex absolute-value locus solving.
- [ ] Complex `Approximate` and `Isolate` do not route into complex preimage solving.

## Readback And Settings

- [ ] `EXACT`, `DECIMAL`, and `BOTH` output styles remain respected.
- [ ] `rectangular`, `polar`, and `cis` exact complex display settings remain respected where branch readback materializes exact complex values.
- [ ] `i` / `\imaginaryI` remains a reserved imaginary unit and is not offered as a solve target or parameter.
- [ ] Result chips keep `Domain: Complex` without duplicate domain-intent noise.
