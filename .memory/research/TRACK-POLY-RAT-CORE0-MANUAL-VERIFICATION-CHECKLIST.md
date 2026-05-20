# TRACK-POLY-RAT-CORE0 Manual Verification Checklist

milestone: `POLY-RAT-CORE0`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Add shared exact polynomial division, GCD, content/primitive, monic, and coefficient-array helpers.
- Add an internal one-variable exact rational-function normalization core.
- Add bounded distinct-linear partial-fraction readiness for future integration planning.
- Keep product rational simplification behavior stable through existing fallback paths.
- Do not add rational integration, visible solver behavior, new result origins, UI badges, or broad polynomial algebra.

## Manual Checks

- [x] Polynomial division returns exact quotient/remainder and detects nonzero remainders.
- [x] Polynomial GCD returns monic exact GCDs over rational coefficients.
- [x] Rational-function normalization cancels polynomial factors through the shared GCD.
- [x] Existing rational simplify/factor/LCD tests still pass.
- [x] Partial-fraction readiness succeeds only for proper distinct-rational-linear denominator factors.
- [x] Repeated factors, irreducible quadratics, and improper rational functions remain controlled stops.
- [x] Existing symbolic integration tests still show no new rational integration capability.

## Verification

- [x] `npm run test:unit -- src/lib/polynomial-core.test.ts src/lib/rational-function-core.test.ts src/lib/polynomial-factor-solve.test.ts src/lib/symbolic-engine/rational.test.ts src/lib/symbolic-engine/factoring.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/algebra/capability-readiness.test.ts`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
