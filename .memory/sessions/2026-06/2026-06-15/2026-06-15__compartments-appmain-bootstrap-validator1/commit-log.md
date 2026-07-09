# COMPARTMENTS-APPMAIN-BOOTSTRAP-VALIDATOR1 Commit Log

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Commit

- `COMPARTMENTS-APPMAIN-BOOTSTRAP-VALIDATOR1`

## Files Changed

- `src/AppMain.tsx`
- `src/app/runtime/useAppPersistenceRuntime.ts`
- `src/lib/app-state/persistence.ts`
- `src/lib/app-state/persistence.test.ts`
- `tools/compartment-boundaries-core.mjs`
- `tools/validate-compartment-boundaries.test.mjs`
- `docs/architecture/supercarrier/app-runtime-boundary-audit.md`
- `docs/architecture/supercarrier/app-state-history-variables-boundary-audit.md`
- `docs/architecture/supercarrier/compartment-contracts.md`
- `.memory/journal/2026-06/2026-06-15.md`
- `.memory/sessions/2026-06/2026-06-15/2026-06-15__compartments-appmain-bootstrap-validator1/*`

## Summary

The commit removes AppMain's direct persistence bootstrap exception from the read-only compartment validator and routes mode persistence through the app-runtime persistence shell.
