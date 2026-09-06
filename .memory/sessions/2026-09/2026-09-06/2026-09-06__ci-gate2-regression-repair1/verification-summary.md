# CI-GATE2-REGRESSION-REPAIR1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- gate_type: backend and ui
- status: verified; selective commit approved

## Backend Evidence

- The eight previously affected files pass together: 8 files and 136 tests with four workers.
- Comparator and Matrix authority focus passes 4 files and 47 tests; the post-lint delta passes 10 files and 60 tests.
- Selector passes 24/24. The explicit 11-path `seam:impact --run` executes and passes Graph contracts, workspace runtime contracts, feature probes, Display contracts, result contracts, Canonical V2 enforcement, MathJSON coverage, Equation solve-result, display inversion, printer migration, and History replay.
- Result contracts pass 146/146. Equation solve-result passes 56/56. Workspace runtime passes 90/90. Feature probes pass 126 engine tests plus 39 UI tests. History replay passes 7/7.
- Canonical V2 enforcement passes for all 20 frozen files. Display inversion and printer migration pass with unchanged baselines and zero compatibility fallbacks.
- MathJSON inventory remains 506 canonical leaves, 506 proven, 0 exempt, and 0 missing.
- Incremental TypeScript, production build, lint, and diff hygiene pass. Lint retains two unrelated non-failing Graph hook warnings.

## Browser Evidence

- Chromium real-app run passes 6/6 at 1440 by 940 with one worker.
- `x^4-16=0`, Complex Off: two established exact rows `-4/2` and `4/2`; copy and History replay match.
- `x^4-16=0`, Complex On: four distinct rows `-2`, `2`, `-2i`, and `2i`, with Complex route details; copy and replay match.
- `sin(x^2+x)=1/2`, radians: four parameterized rows retain `2\pi k`, representative branches, and parameter constraints; copy and replay match.
- `sqrt(x^2+sqrt(5-x^2))=2`: two simplified exact rows using `7/2` and `sqrt(5)`, with domain/rejection evidence; copy and replay match.
- `sqrt(x^2+x+sqrt(4-(x^2+x)))=2`: two simplified exact rows using `sqrt(13)`, with domain/residual rejection evidence; copy and replay match.
- Matrix adjoint of `[[1,i],[a,1-i]]`: the result is `[[1,a*],[-i,1+i]]`; the negative sign, symbolic conjugate, copy, and replay all match.
- Visual inspection found no result-card or page overflow, clipped roots, ambiguous signs, or unreadable evidence.

## Process Hygiene

- No Vitest, Playwright, preview, worker, Cargo, or Tauri process remains.
- Screenshots, traces, and the visual harness remain ignored under `.task_tmp/ci-gate2-regression-repair1/`.
