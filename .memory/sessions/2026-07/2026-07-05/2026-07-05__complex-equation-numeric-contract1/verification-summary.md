# COMPLEX-EQUATION-NUMERIC-CONTRACT1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Backend Gate

Passed:

- `node tools/validate-equation-corpus-ledger.mjs`
- `node --test tools/validate-equation-corpus-ledger.test.mjs`
- `git diff --check`
- `npm run test:memory-protocol`

Blocked by unrelated dirty work:

- `npm run test:file-sizes`

Blocker:

- `src/lib/symbolic-engine/limits/finite-leading-terms.ts` has 939 lines and exceeds its cap of 900. This file was already dirty in the Calculus lane before this Equation ledger gate and is not part of this commit scope.

## Visual Gate

Not run for this frontier because the gate changes only corpus ledger validation and schema documentation. No app-visible Equation rendering, solver output, cards, or controls changed.

## Evidence Rules Covered

- Global-polynomial evidence is accepted with `complex-polynomial-aberth` and `global-polynomial` verification.
- Bounded-region evidence is accepted only with region bounds, argument-principle engine, contour-verified status, and matching contour/candidate counts when marked supported.
- Supported bounded-region rows with inconclusive evidence are rejected.
- Bounded-region rows without region bounds are rejected.
- Contour-verified rows with mismatched contour/candidate counts are rejected.
- `locus-deferred` rows marked supported are rejected.
