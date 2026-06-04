# TRACK-COMPLEX-PREIMAGE-READBACK1 Manual Verification Checklist

Milestone: `COMPLEX-PREIMAGE-READBACK1`
Date: 2026-06-04

## Scope

- [ ] Confirm this is readback polish only, not new complex solving capability.
- [ ] Confirm main complex preimage answers stay concise.
- [ ] Confirm expanded branch details are collapsed when verbose.
- [ ] Confirm no complex Approximate, complex Isolate, stored complex values, non-Equation adoption, OOE behavior change, or Rust solver execution was added.

## Complex Branch Readback Checks

- [ ] `exp(x^2)=1` keeps a concise root-family main answer and renders expanded branches as math.
- [ ] `exp(x^4)=1` keeps a concise root-family main answer and renders expanded branches as math.
- [ ] `tan(x)=1+i` keeps a concise branch family and respects the active angle unit.
- [ ] `tan(sin(x))=1+i` keeps distinct branch parameters and math-rendered details.
- [ ] `cos(tan(x^2))=i` does not leak ASCII-only expanded branch formulas.

## Display Setting Checks

- [ ] `EXACT` uses the selected complex exact form where exact values materialize.
- [ ] `DECIMAL` uses rectangular decimal branch readback where safe.
- [ ] `BOTH` keeps exact main readback and approximate supplement.
- [ ] `rectangular`, `polar`, and `cis` still affect exact complex value readback.

## Boundary Checks

- [ ] Absolute-value complex locus cases still stop cleanly.
- [ ] Periodic-over-rational complex cases still stop cleanly.
- [ ] Too-deep composition still stops cleanly.
- [ ] Multivariable complex preimages still stop cleanly.
