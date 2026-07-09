## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Gate
- date: 2026-07-03
- milestone: `CALCULUS-LIMITS-ASYMPTOTIC-ORCHESTRATION-HARDENING1`
- gate_type: backend

## Verification
- PASS: `npm run test:unit -- src/lib/calculus/limit-route-orchestrator.test.ts src/lib/calculus/limit-route-classifier.test.ts src/lib/calculus/limit-route-corpus.test.ts src/lib/calculus/workspace/limits.test.ts`
- PASS: `npm run test:unit -- src/lib/calculus/limit-route-classifier.test.ts src/lib/calculus/limit-route-corpus.test.ts src/lib/calculus/workspace/limits.test.ts src/lib/calculus/engine/limit-heuristics.test.ts src/lib/calculus/engine/finite-limit-target.test.ts src/lib/calculus/limit-route-orchestrator.test.ts src/lib/calculus/limit-request.test.ts src/lib/symbolic-engine/limits.test.ts src/lib/symbolic-engine/limits/infinity-scale-terms.test.ts src/lib/symbolic-engine/limits/mrv-lite.test.ts src/lib/symbolic-engine/limits/piecewise-limits.test.ts src/lib/symbolic-engine/limits/conditional-cases.test.ts src/lib/symbolic-engine/limits/asymptotic-terms.test.ts src/lib/symbolic-engine/limits/finite-leading-terms.test.ts src/lib/symbolic-engine/limits/abs-side-behavior.test.ts src/lib/symbolic-engine/limits/complex-domain.test.ts src/lib/symbolic-engine/limits/lhospital.test.ts`
- PASS: `npx tsc -b --pretty false`
- PASS: `npm run test:file-sizes`
- PASS: `npm run test:memory-protocol`
- PASS: `git diff --check`

## Notes
- New corpus verifies exact symbolic/proof routes do not fall into numeric fallback.
- Corpus includes controlled failures for Piecewise disagreement, absolute-value side disagreement, and oscillation proof routes.
- Corpus includes Complex On principal square-root proof handling while preserving Real mode domain failure.
