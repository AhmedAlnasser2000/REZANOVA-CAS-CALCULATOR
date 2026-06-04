# TRACK-POLY-CORE-AUDIT1 Manual Verification Checklist

milestone: `POLY-CORE-AUDIT1`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Audit the current polynomial substrate without adding polynomial behavior.
- Record shipped exact scalar, one-variable polynomial, factor, rational, numeric-root, and equation-solve readiness.
- Keep `polynomial-core` classified as `ready-with-adapter`.
- Keep exact linear algebra deferred.
- Keep `INT-CANDIDATE2` as the next planned native milestone unless it exposes a stronger polynomial prerequisite.

## Manual Checks

- [x] Readiness matrix separates shipped behavior from future polynomial algebra prerequisites.
- [x] Gcd, polynomial division, square-free factorization, resultants, partial fractions, and Grobner/elimination are not marked ready.
- [x] Regression tests cover current polynomial-core contracts only.
- [x] No equation, calculus, rational, factor, solver, UI, or Matrix/Vector behavior was widened.
- [x] `ALG-CAPS0` readiness facts still separate math-substrate readiness from runtime kernel execution capabilities.

## Verification

- [x] `npm run test:unit -- src/lib/algebra/polynomial-core.test.ts src/lib/algebra/polynomial-roots.test.ts src/lib/algebra/polynomial-factor-solve.test.ts src/lib/symbolic-engine/factoring.test.ts src/lib/symbolic-engine/rational.test.ts src/lib/symbolic-engine/patterns.test.ts src/lib/algebra/capability-readiness.test.ts`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
