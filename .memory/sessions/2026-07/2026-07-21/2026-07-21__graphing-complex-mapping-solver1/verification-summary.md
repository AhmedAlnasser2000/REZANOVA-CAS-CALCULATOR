# GRAPHING-COMPLEX-MAPPING-SOLVER1 verification summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: backend and ui
- date: 2026-07-21
- commit_hash: pending at write time

## Passing evidence

- Focused parser, sampling, complex evaluator/Newton, analysis, document/session, scene, OOE, boundary, and Graph UI tests pass with at most four workers.
- Incremental TypeScript and the production build pass. The production build retains only the established mixed static/dynamic import warning for `active-job-registry.ts`.
- The canonical-result V2 enforcement, full result-contract suite, file-size ratchet, memory protocol, diff hygiene, and focused lint gate pass. The file-size gate initially identified the controller at 1,051 lines; its view/session actions were extracted to the private `useGraphSessionActions.ts` companion, leaving the controller at 969 lines without altering runtime behavior.
- Real-domain sampling regressions prove `ln(-x)` and `sqrt(-x)` emit only their valid x less-than-or-equal-to-zero domains.
- The Graph boundary ratchet permits only `src/lib/equation/complex-domain-public.ts` and rejects direct imports of Equation-private complex implementation.
- Focused Chromium Playwright passes 1/1 with no console errors.

## Visual evidence

- Chromium at 1440x940 verifies the default large domain-color view, synchronized 2x2 component maps with readable labels, complex analysis and authored assumption entry, and independent Real plus Complex pane composition.
- Captured evidence: `.task_tmp/GRAPHING-COMPLEX-MAPPING-SOLVER1/playwright-results-layout-final/graphing-minimum-visible-G-1f619-h-explicit-bounded-evidence-chromium/graphing-complex-domain-1440x940.png`, `graphing-complex-components-1440x940.png`, and `graphing-complex-both-1440x940.png`.

## Final hygiene

- Protected prior root `test-results/` artifacts remain present and excluded.
- All Move 26 Playwright output remains verification-only under `.task_tmp/` and excluded from the commit.
