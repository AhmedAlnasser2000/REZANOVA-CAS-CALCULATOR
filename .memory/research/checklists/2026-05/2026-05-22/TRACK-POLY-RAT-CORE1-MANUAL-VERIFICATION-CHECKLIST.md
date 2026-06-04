# TRACK-POLY-RAT-CORE1 Manual Verification Checklist

milestone: `POLY-RAT-CORE1`  
status: complete  
date: 2026-05-22  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Add bounded denominator-family readiness to the shared polynomial/rational substrate.
- Classify exact one-variable rational denominators into supported repeated rational linear factors and irreducible quadratic factors under caps.
- Add typed internal partial-fraction readiness envelopes for repeated-linear terms and irreducible-quadratic derivative/residual pieces.
- Preserve `INT-RAT1` distinct-linear decomposition and stable calculus behavior.
- Do not add visible calculus, equation, simplification, UI, result-origin, strategy-badge, source-mirror, or Playground runner behavior.

## Manual Checks

- [x] `(x-1)^2` and `(x+2)^3` classify as repeated rational linear factors.
- [x] `(x-1)^2(x+3)` classifies as mixed repeated/distinct rational linear factors.
- [x] `x^2+1` and `x^2+x+1` classify as irreducible quadratics over exact rationals.
- [x] `x^2-1` remains reducible into linear factors.
- [x] `x^2-2` stops as requiring algebraic roots instead of pretending to be supported.
- [x] Repeated-linear readiness returns typed `A/(x-a)^k` terms.
- [x] Irreducible-quadratic readiness returns derivative/residual pieces for later calculus consumption.
- [x] Existing `decomposeDistinctLinearPartialFractions` behavior remains stable for `INT-RAT1`.
- [x] Repeated/quadratic rational integration remains unsupported in stable calculus until `INT-RAT2`.

## Verification Commands

- [x] `npm run test:unit -- src/lib/algebra/polynomial-core.test.ts src/lib/algebra/rational-function-core.test.ts src/lib/algebra/capability-readiness.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/calculus/calculus-core.test.ts src/lib/modes/calculate.test.ts`
- [x] `npm run test:golden`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`

## Deferred

- `INT-RAT2` calculus adoption of repeated-linear and irreducible-quadratic rational antiderivative families.
- Broad square-free factorization, resultants, Grobner/elimination, exact linear algebra, algebraic-number coefficient domains, complex-root expansion, source-mirror execution, and copied external source.
