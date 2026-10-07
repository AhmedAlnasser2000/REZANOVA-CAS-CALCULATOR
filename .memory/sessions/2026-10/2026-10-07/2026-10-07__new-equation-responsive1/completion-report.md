# NEW-EQUATION-RESPONSIVE1 (with TESTS-LEGACY-EQUATION-INERT1)

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Authority and scope

- 2026-10-07: the user grouped the uncommitted legacy-test gate, the Example-menu colour fix, the typing-freeze fix, show-the-answer-first and fast system verification into one PR before the roadmap resumes, one commit per fix.
- The user also set the 60-second rule as a development and testing discipline only, never a limit for users.
- Plan approved after decisions:
  - the unchecked answer is a page-only preview;
  - copy is allowed while unchecked, with a badge and a warning notice;
  - the old-Equation goldens stay in the contract ratchets until the old workspace retires;
  - one commit per fix.
- The user first held commits, then asked to commit and push once done.
- Constraints:
  - nothing from `src/lib/equation/`;
  - no edits under New Integration;
  - no old-UI changes;
  - no time caps.

## Delivered

See `docs/architecture/equation/new-equation-responsive1.md` and `tests-legacy-equation-inert1.md`.
- **C1**:
  - fast-forward to main a36c555 (schema 7);
  - the typed golden path and print hygiene on the schema-7 document;
  - the print-hygiene baseline regenerated (additions only);
  - the menu colour fix.
- **C2**: the row-reader worker, `useRowReadings`, and no parsing during render.
- **C3**:
  - the service preview, the two-phase worker protocol and runtime `onPreview`;
  - the hook states (preview, unchecked, withdrawn) and the panel states with the copy warning.
- **C4**:
  - `verify-zero-dim.ts` (number-field point evidence) with `univariate` shared from `zero-dim.ts`;
  - disk-based non-real decimals and order in `presentation/values.ts`.
- **C5**: `tools/equation-slow-case-probe.mjs` with its runner, the spec, README, roadmap, architecture index and memory.

## Verification

- **Equation core, service and new-equation unit tests**: 46 files, 797 passed (1 skipped).
- **New Equation UI**: page, typing, answer panel and runtime hook all pass.
- **Timings** (probe and service):
  - ℝ: 11.4 s → 0.33 s;
  - ℂ: over 2 min → 1.1 s, with the answer shown at 0.68 s.
- **Full unit run on the merged tree**: 28 failures, all outside this work:
  - 26 also fail on a clean main worktree (schema-7 version expectations from the consolidation);
  - one file was edited mid-run and passes;
  - New Integration's nested-arithmetic stress cases take 68–143 s each: abnormal under the 60 s rule, reported to the user, not edited.
- Final gates and Playwright are recorded in commit-log.md.
