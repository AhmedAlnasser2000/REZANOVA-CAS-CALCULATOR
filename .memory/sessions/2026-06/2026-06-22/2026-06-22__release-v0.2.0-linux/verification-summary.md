# RELEASE-V0.2.0-LINUX Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Verification

- Passed: focused release-fix unit suite:
  `npm run test:unit -- src/lib/equation/equation-complex.test.ts src/lib/modes/equation/ooe-runtime.test.ts src/lib/modes/equation/shared-symbolic-backend.test.ts src/lib/modes/equation/stored-values-targets.test.ts src/lib/__golden__/golden-runner.test.ts`
  - 5 files passed, 108 tests passed.
- Passed: focused release-fix Playwright smoke subset:
  `npx playwright test e2e/qa1-smoke.spec.ts -g "Equation numeric interval smoke respects|NP1 settings smoke|Trigonometry smoke covers guided|Equation numeric interval smoke can follow|Equation numeric interval smoke shows"`
  - 5 tests passed.
- Passed: `npm run test:gate`
  - Unit: 238 files passed, 1819 tests passed.
  - UI: 38 files passed, 297 tests passed.
  - E2E: 72 tests passed.
- Passed: `npm run tauri:build`
  - Built Linux bundles:
    - `src-tauri/target/release/bundle/deb/REZANOVA CLASSWIZ CALCULATOR_0.2.0_amd64.deb`
    - `src-tauri/target/release/bundle/rpm/REZANOVA CLASSWIZ CALCULATOR-0.2.0-1.x86_64.rpm`
    - `src-tauri/target/release/bundle/appimage/REZANOVA CLASSWIZ CALCULATOR_0.2.0_amd64.AppImage`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Notes

- Existing Vite chunk warnings appeared during the production build and remained non-blocking because the builds exited successfully.
- Release publication is deferred until an explicit tag/push/release request.
