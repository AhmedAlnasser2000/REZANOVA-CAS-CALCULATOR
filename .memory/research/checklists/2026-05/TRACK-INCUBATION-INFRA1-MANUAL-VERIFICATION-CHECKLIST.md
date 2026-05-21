# TRACK-INCUBATION-INFRA1 Manual Verification Checklist

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now
- Source mirrors have explicit security tiers and required policy metadata.
- Labs runners have explicit dev-only/no-history/no-remote/no-source-mirror-execution policy metadata.
- Area-study templates exist for lite, standard, full, and missing-capability-gate synthesis.
- `test:area-studies` is available and wired into CI/release gates.
- GeoGebra is registered as a planned context mirror without cloning or execution.

## Manual App Steps
- Launch normally and confirm no Labs runner capability is exposed without dev flags.
- Launch with `VITE_SHOW_LABS=1 VITE_ENABLE_LAB_RUNNERS=1 npm run tauri:dev`.
- Open Labs and confirm the existing approved runners still appear.
- Confirm no source mirror execution control appears in Labs.
- Confirm normal Calculate/Equation behavior is unchanged.

## Expected Results
- Source mirrors remain context-only and non-executable by default.
- Labs runner output remains experimental/developer-only.
- No normal calculator history/provenance is created by Labs runs.
- Future capability research should start from `playground/area-studies/` templates rather than single-source adoption.

## Automated Verification
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:area-studies`
- Passed: `npm run test:labs-catalog`
- Passed: `npm run test:playground`
- Passed: `npm run test:memory-protocol`
- Passed: `npm run lint`
- Passed: `npm run build`
- Passed: `npx --yes js-yaml .github/workflows/ci.yml >/dev/null`
- Passed: `npx --yes js-yaml .github/workflows/release-linux.yml >/dev/null`
