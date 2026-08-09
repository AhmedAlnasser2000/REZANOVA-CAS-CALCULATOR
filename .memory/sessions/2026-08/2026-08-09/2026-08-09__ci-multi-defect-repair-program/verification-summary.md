# Verification Summary

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

## Gate evidence

- Gate 1 `INTEGRATION-PROOF-ROUTING1` — backend:
  - incremental TypeScript passed with `npx tsc -b --pretty false`;
  - focused proof-routing and inverse-trig coverage passed 4/4 tests;
  - the four historically stuck files completed together in 17.96 seconds under a 90-second external timeout, with 19 passing tests and three deterministic presentation/boundary-wording assertions retained for Gate 2;
  - focused green subsets cover centered symbolic genus-0 radicals, selected-variable genus-1 elliptic kinds, elementarity certificates, and elliptic proof backchecks;
  - file-size validation, memory validation, and diff hygiene passed after durable-memory catch-up;
  - Canonical Result V2 enforcement passed with 20 frozen producer files unchanged, MathJSON coverage at 506/506/0/0, and zero Display compatibility projections;
  - process inspection found no active Vitest worker after verification.
- Gate 2 `CALCULUS-INTEGRATION-READBACK-AUTHORITY1` — UI:
  - the complete Integration domain inventory ran 597 tests with all 28 Gate-2 readback/proof regressions cleared; its sole remaining failure is the already-classified Gate-3 single-condition label case;
  - focused renderer, printer, proof, Calculus integration, and final workspace-authority coverage passed 69/69 tests;
  - `npm run test:result-contract`, `npm run test:display-contracts`, `npm run test:canonical-result-v2-enforcement`, and `npm run build` passed;
  - Canonical Result V2 enforcement retained all 20 frozen producer fingerprints and zero Display compatibility projections;
  - the accepted MathJSON baseline changes only serialized bytes (`126,839` to `126,954`) and route maxima for `calculate.integrals` (`1,779` to `1,827`) and `calculus.integrals` (`1,088` to `1,093`); leaves/proven/exempt/missing remain `506/506/0/0` and the global maximum remains 2,894;
  - print hygiene remains 47 cases with its workspace floors unchanged; only three producer-owned Integration canonical answer pairs changed;
  - History replay inspection found exactly three Calculus snapshot deltas from the same reviewed renderer authority (`calculus-indefinite-power`, `calculus-indefinite-log`, and `calculus-ode-separable`); those snapshots were refreshed without changing requests, budgets, or non-Calculus fixtures;
  - Playwright passed 1/1 against the built real app and visual inspection found the answer cards, facts/details, clipboard, History replay, and overflow readable for exponential, error-function, affine-rational, indexed elliptic, and inverse-trig representatives;
  - file-size validation and diff hygiene passed; no Vitest, Playwright, preview, or build process remained active after evidence collection.
- Gate 3 `CI-EQUATION-HISTORY-REPAIR1`: pending.
- Gate 4 `CI-UNIT-WATCHDOG-CLOSEOUT1`: pending.
