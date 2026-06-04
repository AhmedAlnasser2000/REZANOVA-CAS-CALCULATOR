# TRACK MATH-GOLDEN0 Manual Verification Checklist

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

- `MATH-GOLDEN0` adds a small typed golden corpus for shipped math behavior.
- The corpus lives under `src/lib/__golden__/`.
- The first pass contains 24 cases across:
  - Calculate arithmetic, simplify, factor, and expand
  - calculus derivatives, integrals, definite-integral stops, and numeric fallback
  - finite limits, directional infinities, removable holes, local equivalents, and domain stops
  - Equation symbolic solve, guided quadratic, rational exclusions, radical candidate rejection, absolute-value solving, and range-guard stops
- `npm run test:golden` is wired into `test:gate`, `ci-linux`, and `Release Linux`.
- `docs/validation/golden-math-regression.md` explains how to add cases and what not to include.
- The math-regression pillar now points to the golden corpus documentation.

## Boundaries Preserved

- No math capability was added.
- No solver behavior changed.
- No UI snapshots were added.
- No aspirational cases were added.
- No FriCAS, incubation, Playground, diagnostics, telemetry, or calculus-polish work was started.

## Automation Gate

```bash
npm run test:golden
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

1. Confirm the corpus covers shipped behavior only.
2. Confirm assertions use stable substrings/metadata instead of full UI snapshots.
3. Confirm `test:golden` is wired into CI and release packaging.
4. Confirm no runtime behavior changed to satisfy golden cases.
5. Confirm `CALC-POLISH1` remains next unless public pressure changes the order.

## Pass/Fail

- Golden corpus: passed.
- Memory protocol: passed.
- ESLint: passed.
- Production build: passed.
- Workflow YAML parse: passed.
- Unit tests: passed.
- UI tests: passed.
- Rust cargo check: passed.
