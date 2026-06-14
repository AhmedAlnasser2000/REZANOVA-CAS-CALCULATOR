# CALCULUS-GUIDE-DOMAIN-COMPAT-AUDIT0 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Task Goal

Audit the Guide domain/content ids that still mention `advancedCalculus` or `advancedCalc*` after the current Calculus workspace naming cleanup.

## What Changed

- Added `docs/architecture/calculus-guide-domain-compat-audit.md`.
- Updated `docs/README.md`.
- Classified active current Guide identity as `calculus`.
- Classified `advancedCalculus`, `advancedCalcScreen`, `advancedCalcSeed`, `advanced-*` article ids, and `advanced-calculus-core` as compatibility surfaces.
- Recorded future cleanup candidates, high-risk contracts, test gates, and stop rules.

## Boundaries

- Docs/memory only.
- No Guide code, content, examples, imports, schemas, replay/history paths, solver behavior, Display behavior, OOE policy, or CSS behavior changed.

## Verification

- Verification commands are recorded in `verification-summary.md`.

## Commits

- Same-commit milestone: CALCULUS-GUIDE-DOMAIN-COMPAT-AUDIT0.

## Follow-Ups

- Continue with `CALCULUS-ENGINE-PATH-AUDIT0` to audit `src/lib/advanced-calc/*` versus canonical `src/lib/calculus/*` engine paths.
