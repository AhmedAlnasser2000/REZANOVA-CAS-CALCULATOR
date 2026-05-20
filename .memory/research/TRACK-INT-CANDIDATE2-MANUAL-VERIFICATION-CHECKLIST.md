# TRACK-INT-CANDIDATE2 Manual Verification Checklist

milestone: `INT-CANDIDATE2`  
status: complete  
date: 2026-05-20  
primary_agent: codex  
primary_agent_model: gpt-5.5

## Scope

- Add internal integration candidate metadata.
- Thread metadata through symbolic integration and calculus-core integration evaluation.
- Preserve existing visible outputs, `ResultOrigin` values, strategy labels, and UI behavior.
- Add no new antiderivative family, rational integration, partial fractions, Risch/Liouville engine, branch-heavy integration, or polynomial algorithm.
- Keep missing polynomial prerequisites explicit instead of hiding them in calculus.

## Manual Checks

- [x] Existing supported integration strategies still return the same exact LaTeX and strategy labels.
- [x] Unsupported composition-like forms are classified as `missing-derivative-factor`.
- [x] Polynomial rational gaps are classified as `blocked-polynomial-prerequisite`.
- [x] Partial fractions, polynomial gcd, and polynomial division remain blocked prerequisites.
- [x] Compute Engine fallback metadata remains separate from app-owned symbolic rules.
- [x] No visible result-surface change was added.

## Verification

- [x] `npm run test:unit -- src/lib/symbolic-engine/integration.test.ts src/lib/calculus-core.test.ts`
- [x] `npm run test:unit -- src/lib/calculus-core.test.ts src/lib/calculus-workbench.test.ts src/lib/symbolic-engine/integration.test.ts src/lib/advanced-calc/integrals.test.ts src/lib/math-engine.test.ts src/lib/modes/calculate.test.ts src/lib/algebra/capability-readiness.test.ts`
- [x] `npm run test:memory-protocol`
- [x] `npm run lint`
- [x] `npm run build`
- [x] `npm run test:golden`
- [x] `npm run test:ui`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
