# GUIDE-CONTENT-CAPABILITY-EVIDENCE1 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live
- commit_hash: pending

## Commands
- `npm run test:unit -- src/lib/guide/content.test.ts src/lib/guide/content.contract.test.ts src/lib/guide/navigation.test.ts src/lib/guide/search.test.ts src/lib/guide/symbols.test.ts src/lib/guide/launch-payloads.test.ts src/app/logic/guideExampleLaunchActions.test.ts`
  - Result: passed.
- `npm run test:ui -- src/app/shell/GuidePage.ui.test.tsx src/app/runtime/useGuideRuntime.ui.test.tsx src/AppMain.workspace-tabs.ui.test.tsx src/app/shell/ActiveSurfaceHost.ui.test.tsx src/app/shell/WorkspaceTabs.ui.test.tsx`
  - Result: passed.
- `npm run test:e2e -- e2e/guide-capability-evidence.spec.ts`
  - Result: the build phase completed; the first Playwright pass exposed brittle test selectors/text assumptions, not app source failures.
- `npx playwright test e2e/guide-capability-evidence.spec.ts`
  - Result: passed after spec-only locator/text fixes against the successful production build.
- `npm run test:memory-protocol`
  - Result: passed.
- `npm run test:file-sizes`
  - Result: passed.
- `git diff --check`
  - Result: passed.

## Static Evidence
- All Guide examples now pass launch-shape validation for target workspace, allowed screen field, non-empty expression payloads, and foreign-screen absence.
- Stable representative examples are pinned for Calculate, Equation, Calculus, Trigonometry, Statistics, Geometry, Matrix, and Vector.
- Matrix and Vector are validated as `open-tool` only so Guide does not imply unsupported expression-loading behavior.

## App-Visible Evidence
- Playwright clicks through the real Guide page from Search to article examples, then opens each representative tool path.
- Calculate, Equation, Calculus, and Trigonometry checks include app-visible output after running/solving.
- Statistics, Geometry, Matrix, and Vector checks prove the intended destination workspace/screen is reached without adding solver features.

## Deferred Coverage
- This gate does not exhaustively run every Guide example.
- The next content/evidence expansion can add more representative examples per article after a specific unsupported claim or user-facing risk is found.
