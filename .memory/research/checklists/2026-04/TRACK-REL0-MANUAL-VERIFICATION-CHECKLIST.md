# TRACK REL0 Manual Verification Checklist

Date: 2026-04-26

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- `REL0` adds public repository guardrails after the first public attention spike.
- CI now has a Linux-first `ci-linux` job for memory protocol, unit tests, UI tests, lint, frontend build, and Rust `cargo check`.
- Browser smoke runs in a separate `e2e-linux` job using the focused Playwright calculus smoke suite.
- Linux preview release automation is manual/tag-triggered only and never runs as an automatic release on normal pushes to `main`.
- Release artifacts are uploaded as GitHub Actions artifacts, with optional draft prerelease upload.
- Repository governance now includes CODEOWNERS, a PR template, issue templates, CONTRIBUTING, SECURITY, and a first public preview checklist.
- README now mentions the early Linux-first preview release path honestly.
- No math behavior, solver behavior, architecture refactor, Playground adoption, provider-host compute, signing keys, or private machine config is added.

## Automation Gate

Primary verification is automated:

```bash
npm run test:memory-protocol
npm run test:unit
npm run test:ui
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npx --yes js-yaml .github/workflows/ci.yml >/dev/null
npx --yes js-yaml .github/workflows/release-linux.yml >/dev/null
```

Optional browser smoke:

```bash
npx playwright test e2e/calc-audit0-smoke.spec.ts --project=chromium
```

## Manual GitHub Settings

Enable branch protection for `main`:

1. Require a pull request before merging.
2. Require at least 1 approval.
3. Require review from Code Owners.
4. Dismiss stale pull request approvals when new commits are pushed.
5. Require conversation resolution before merging.
6. Require status check `ci-linux`.
7. Block force pushes.
8. Block deletions.
9. Restrict who can push to `main`.

Do not require `e2e-linux` until the focused browser smoke proves stable in GitHub Actions.

## First Release Smoke

Before publishing a draft prerelease:

1. Confirm `ci-linux` passes.
2. Confirm `e2e-linux` passes or manually run the focused browser smoke.
3. Run the Linux app locally or from a workflow artifact.
4. Check a basic Calculate expression.
5. Check derivative, indefinite integral, safe definite integral, unsafe definite-integral stop, and equation solve smoke.
6. Confirm README and `LICENSE` state MIT.
7. Confirm the release body says early Linux-first preview and not full CAS parity.

## Pass/Fail

- Memory protocol: passed locally on 2026-04-26.
- Unit tests: passed locally on 2026-04-26.
- UI tests: passed locally on 2026-04-26.
- ESLint: passed locally on 2026-04-26.
- Production build: passed locally on 2026-04-26.
- Rust cargo check: passed locally on 2026-04-26.
- Workflow YAML parse: passed locally with `js-yaml` on 2026-04-26.
- Browser smoke: passed locally with Chromium on 2026-04-26.
- Launch preflight: passed locally on 2026-04-26.
- Manual smoke: optional after automation and before publishing the first preview artifact.
