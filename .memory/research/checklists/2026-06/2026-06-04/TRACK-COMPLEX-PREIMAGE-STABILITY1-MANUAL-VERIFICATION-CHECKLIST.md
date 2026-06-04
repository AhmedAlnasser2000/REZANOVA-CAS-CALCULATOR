# TRACK-COMPLEX-PREIMAGE-STABILITY1 Manual Verification Checklist

Milestone: `COMPLEX-PREIMAGE-STABILITY1`
Date: 2026-06-04

## Scope

- [ ] Confirm this is a stability/regression gate for existing complex preimage behavior.
- [ ] Confirm rational clearing, finite composition, two-trig-layer families, and bounded-power handoff remain stable.
- [ ] Confirm no new complex solver family was added.
- [ ] Confirm no complex Approximate, complex Isolate, stored complex values, OOE behavior change, non-Equation adoption, or Rust solver execution was added.

## Regression Matrix

- [ ] `ln(x-1)=4` still solves through finite preimage.
- [ ] `ln((x-1)/(x+2))=4` still solves with denominator exclusions in `Valid when`.
- [ ] `exp(x)=1` still returns a complex log family.
- [ ] `exp(x^2)=1` still returns root-family readback.
- [ ] `(x^2+1)/(x-2)=i` still solves with denominator exclusions in `Valid when`.
- [ ] `(x^2+1)/(x^2-2)=i` still solves or stops according to bounded exact clearing.
- [ ] `sin(x)=i`, `tan(x)=1+i`, and `cos(2x+1)=i` stay stable.
- [ ] `tan(sin(x))=1+i` and `sin(cos(x^4))=i` keep distinct branch parameters.

## Replay And UI Checks

- [ ] History replay preserves complex domain intent and complex exact display form.
- [ ] `Copy Result` keeps the canonical answer.
- [ ] `To Editor` loads canonical math rather than rendered prose.
- [ ] Result chips keep `Domain: Complex` without duplicate intent noise.
- [ ] Detail cards remain collapsible and readable after replay.
