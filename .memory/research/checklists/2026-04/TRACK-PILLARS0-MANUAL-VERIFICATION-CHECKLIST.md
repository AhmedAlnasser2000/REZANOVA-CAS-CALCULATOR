# TRACK PILLARS0 Manual Verification Checklist

Date: 2026-04-28

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `PILLARS0` adds the minimal public-quality Calcwiz pillars baseline after `REL1 + SRC0`.
- `docs/pillars/` now contains:
  - build identity
  - golden math regression corpus
  - diagnostics and error-boundary policy
  - config/schema version placeholder
  - changelog/release notes discipline
  - dependency policy
  - privacy/telemetry policy
  - result-envelope stability policy
- Each pillar records what it protects, why it is cheap now and expensive later, what exists today, first automated check, and what is deferred.
- `tools/validate-pillars.mjs` and `tools/validate-pillars.test.mjs` guard the pillar docs.
- `npm run test:pillars` is wired into `test:gate`, `ci-linux`, and the Linux release workflow.
- README links to the pillar baseline.

## Boundaries Preserved

- No math capability was added.
- No solver behavior changed.
- No UI feature, telemetry, crash uploader, plugin API, config migration, diagnostics framework, FriCAS research lane, or incubation-system change was added.
- `MATH-GOLDEN0` remains the next recommended clean-base milestone; `PILLARS0` only defines the math-regression pillar.

## Automation Gate

```bash
npm run test:pillars
npm run test:memory-protocol
npm run lint
npm run build
npx --yes js-yaml .github/workflows/ci.yml >/dev/null
npx --yes js-yaml .github/workflows/release-linux.yml >/dev/null
npm run test:unit
npm run test:ui
cargo check --manifest-path src-tauri/Cargo.toml
```

## Manual Review

1. Confirm all eight pillar docs are intentionally short and governance-focused.
2. Confirm README points to `docs/pillars/README.md`.
3. Confirm `ci-linux` and `Release Linux` run `npm run test:pillars`.
4. Confirm no runtime source files under `src/` or `src-tauri/src/` were changed.
5. Confirm `MATH-GOLDEN0` is still next before returning to `CALC-POLISH1`.

## Pass/Fail

- Pillar validation: passed.
- Memory protocol: passed.
- ESLint: passed.
- Production build: passed.
- Workflow YAML parse: passed.
- Unit tests: passed.
- UI tests: passed.
- Rust cargo check: passed.
