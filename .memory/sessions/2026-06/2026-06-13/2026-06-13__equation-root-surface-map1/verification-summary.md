# EQUATION-ROOT-SURFACE-MAP1 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

`EQUATION-ROOT-SURFACE-MAP1` is a docs-only architecture map for the current Equation root import surface.

## Commands

- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Manual Checks

- Confirmed the map reflects the post-tidy root surface.
- Confirmed `docs/README.md` lists the new map.
- Confirmed no Equation code files were edited for this commit.

## Outcome

All planned root surface map checks passed.

## Outstanding Gaps

No known `EQUATION-ROOT-SURFACE-MAP1` gaps.
