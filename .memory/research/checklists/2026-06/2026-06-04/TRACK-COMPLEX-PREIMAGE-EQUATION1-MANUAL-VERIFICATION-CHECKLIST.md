# TRACK-COMPLEX-PREIMAGE-EQUATION1 Manual Verification Checklist

Milestone: `COMPLEX-PREIMAGE-EQUATION1`
Date: 2026-06-04

## Scope

- [ ] Confirm `Exact + Complex On` solves guarded complex function preimages in Equation only.
- [ ] Confirm `Complex Off` keeps real-first behavior for explicit complex routes.
- [ ] Confirm `Approximate` remains real numeric interval root search for equations only.
- [ ] Confirm `Isolate` remains equation rearrangement only.
- [ ] Confirm `i` / `\imaginaryI` remains a reserved imaginary unit and not a variable target.
- [ ] Confirm selected `complexExactForm` still controls exact complex branch readback.

## Finite And Rational Spot Checks

- [ ] `ln(x-1)=4` returns `x = e^4 + 1` with `x-1 != 0` in `Valid when`.
- [ ] `ln((x-1)/(x+2))=4` returns the exact rational preimage and keeps `x+2 != 0` in `Valid when`.
- [ ] `exp(x)=1` returns the complex logarithm family `x = 2 pi i k`, `k in Z`.
- [ ] `exp(2x+1)=i` solves the affine shell and returns an exact family.
- [ ] `exp((x-1)/(x+2))=1` solves the rational-linear shell and keeps denominator exclusions in `Valid when`.
- [ ] `(x^2+1)/(x-2)=i` solves the exact quadratic-over-linear route and keeps `x-2 != 0` in `Valid when`.

## Periodic And Power Spot Checks

- [ ] `sin(x)=i` returns inverse-sine branch families with integer parameter `k`.
- [ ] `tan(x)=1+i` returns inverse-tangent branch families with integer parameter `k`.
- [ ] `cos(2x+1)=i` solves the affine shell and honors active angle unit readback.
- [ ] `exp(x^2)=1` returns a root-family main answer and a collapsed expanded-branches detail.
- [ ] `exp(x^4)=1` returns a fourth-root family main answer and a collapsed expanded-branches detail.

## Boundaries

- [ ] `abs(x)=2` and `abs(x+i)=3` stop cleanly rather than pretending to produce finite branches.
- [ ] Complex trig/log/exp routes do not run unless `Complex On` and `Exact` are active.
- [ ] Stored complex values are still unsupported.
- [ ] No non-Equation complex adoption is visible.
- [ ] No OOE runtime behavior changed.
- [ ] No Rust solver execution was added.
