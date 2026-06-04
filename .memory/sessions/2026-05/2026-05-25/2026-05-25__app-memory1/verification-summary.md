## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

# APP-MEMORY1 Verification Summary

## Passed

- `npm run test:unit -- src/lib/app-state/settings.test.ts src/lib/app-state/tauri.test.ts`
- `npm run test:app-identity`
- `npm run test:ui -- src/components/SettingsPanel.ui.test.tsx src/AppMain.ui.test.tsx`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `npm run lint`
- `npm run test:memory-protocol`
- `npm run build`
- `git diff --check`

## Manual Tauri Evidence

- 2026-05-27 follow-up: live `npm run tauri:dev` quit/reopen cycle first verified full calculator-memory draft restore with a clean seeded Calculate draft `9+8`.
- The live check exposed and fixed a restore bug where invalid legacy entries inside `calculatorMemory.history` rejected the whole memory snapshot.
- The live check also verified that startup can restore a valid calculator-memory snapshot even when non-critical bootstrap/history reads are dirty.
- User review then changed the product boundary to core-only memory because restoring heavy Equation sessions can make startup unresponsive.
- Focused unit/UI coverage now verifies older saved sessions are sanitized to `session: {}` and startup restores history/variables while leaving the editor/result area empty.
- `npm run test:app-identity` now covers the REZANOVA browser/Tauri title plus unchanged desktop storage identifier outside the frontend TypeScript build.
- 2026-05-27 core-only live check: seeded a heavy Equation session plus history/variable/`Ans`, launched and relaunched `npm run tauri:dev`, and captured `.task_tmp/app-memory1/manual-tauri-core-only-startup.png` plus `.task_tmp/app-memory1/manual-tauri-core-only-reopen.png`; both opened with the `REZANOVA CLASSWIZ CALCULATOR` title and an empty Calculate editor.
- The original desktop `calculator-state.json` was restored from `.task_tmp/app-memory1/manual-tauri-backup-calculator-state.json` after the check.
- The user's pre-core-only-check desktop `calculator-state.json` was restored from `.task_tmp/app-memory1/manual-tauri-backup-before-core-only.json` after the second check.
