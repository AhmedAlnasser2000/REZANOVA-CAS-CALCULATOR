# GUIDE-CONTENT-REALITY-AUDIT0 Verification Summary

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live
- commit_hash: pending

## Commands
- `git status --short`
  - Result: completed; unrelated active-agent work remains dirty outside this lane.
- `npm run test:unit -- src/lib/guide/content.test.ts src/lib/guide/content.contract.test.ts src/lib/guide/navigation.test.ts src/lib/guide/search.test.ts src/lib/guide/symbols.test.ts`
  - Result: passed, 5 files / 22 tests.
- `rg -n "REZANOVA|Calcwiz|Classwiz|Advanced Calc|Order of Execution|OOE|Risch|Rothstein|Lazard|Rioboo|Trager|Formula Viewer|Surface Protocol|Graphing|Spreadsheet|Notebook|import|export|step-by-step|step by step|website|History|Settings|statistics-inference|trig-period-phase" src/lib/guide src/app/workspaces/GuideWorkspace.tsx src/app/shell/GuidePage.tsx docs/app_summary_latest.md .memory/current-state.md`
  - Result: completed; findings recorded in the audit.
- `git diff --check`
  - Result: passed.
- `npm run test:memory-protocol`
  - Result: passed.

## Evidence Summary
- Existing Guide content tests pass, but they do not cover domain-to-article parity.
- `trig-period-phase` and `statistics-inference` are defined in Guide content and mode references but omitted from their domain article lists.
- `ACTIVE_CAPABILITIES` currently omits `statistics-core`, which gates Statistics out of Guide home/domain listings even though Statistics content and mode references exist.
- Current-state is the safer source of truth than `docs/app_summary_latest.md` for Settings/History page surfaces and Surface Protocol posture.
- Other-agent July 5 Calculus memory hunks are present in `.memory/current-state.md` and `.memory/journal/2026-07/2026-07-05.md`; they were left in the working tree and must not be staged into this Guide audit commit.

## Not Run
- No Playwright visual verification was required for this audit-only content-reality gate because no app-visible source changed.
- `npx tsc -b --pretty false` was not rerun for this audit-only gate; the prior stabilization/polish gates recorded unrelated TypeScript blockers in active-agent files.
