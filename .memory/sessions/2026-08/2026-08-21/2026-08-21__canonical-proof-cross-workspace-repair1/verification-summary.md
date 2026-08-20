# CANONICAL-PROOF-CROSS-WORKSPACE-REPAIR1 Verification

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

## Automated Evidence

- Focused eight-file regression inventory plus formal proof near-misses: 9 files, 124 tests passed.
- `npm run test:result-contract`: 18 files, 135 tests passed; zero `Compilation fallback for` output.
- `npm run test:mathjson-coverage`: 4 tests passed; committed invariant remains 506/506 proven leaves with 0 missing and 0 exempt.
- `npm run test:canonical-result-v2-enforcement`: 7 enforcement tests plus live validator passed; 20 frozen files passed; included V2/MathJSON and 24-test display-inversion evidence passed.
- `npm run build`: TypeScript project build and Vite production build passed.
- `npm run test:file-sizes`: 10 tests and 2,164 files passed.
- `git diff --check`: passed before durable-memory staging.

## Real-App Evidence

- Rebuilt `dist/` before browser verification after discovering the previous preview artifact dated 2026-08-14.
- Repository Playwright passed Statistics inference and the established derivative request/history scenario.
- A temporary ignored Playwright probe passed current Statistics descriptive rows, stored-value derivative-at-point (`26`, stored values `a=4`, `c=2`, protected `t`, V2 request body `4t^2+2t`), and Complex Matrix spectral rows using the current MathLive driver. Answer/fact/detail surfaces and horizontal containment were inspected.
- The installed in-app Browser control skill could not be used because this session does not expose its required `node_repl` tool. Repository Playwright Chromium supplied the required real-app evidence instead.

## Classification Notes

- The maintained Statistics descriptive spec assumes IQR/outliers occupy the first math row even though the current approved result uses labeled vertical rows.
- The maintained Matrix spectral spec uses an older scalar-cell commit helper and an outdated detail-section locator. The current shared MathLive driver produces the correct Complex result. Both permanent driver corrections remain in expanded Gate 7.
