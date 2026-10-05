# EQUATION-ADOPTION1 (parts A and B)

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

- 2026-10-05: the user asked to plan adoption ("it is critical as we are defining user experience here"). Mock images of the row input and of the verification line were reviewed first. Decisions:
  - **Entry and input**: a separate New Equation page from the menu; numbered rows.
  - **Keys**: Enter solves, Shift+Enter adds a row, with a tip and a Guide mention.
  - **Unknowns**: picked automatically, editable.
  - **Assumptions**: parameter-only rows are assumptions; without one, every case is solved.
  - **Toggles**: Real | Complex and Exact | Decimal | Both in the workspace.
  - **Verification**: a simple "Verified exactly" line; the detailed report comes later.
  - **Not now**: no steps; no History or export.
  - **Saving**: drafts per tab.
  - **Unsolved problems**: a clear message only.
  - **Limits**: a closed limits panel.
  - **After an edit**: the old answer is kept, greyed.
- Commit, push and PR are pre-authorized when green; the work runs as one PR with two commits and continues to part B without stopping. CRITICAL, root-only, no subagents.
- Not touched: the old Equation engine and UI, `src/lib/calculus/new-integration/` and `src/app/new-integration/`. The branch was restarted from `origin/main` (`77fdcf1`).

## Delivered

- **Part A**:
  - rows and automatic unknowns (`src/lib/new-equation/parse.ts`);
  - lowering and domain conditions (`equation/service/input.ts`);
  - assumptions with independent evidence (`core/parameters/assume.ts`);
  - an optional V6 `assumptions` field (validation, adapter, replay, presentation row, AGENTS.md, contract spec);
  - the worker service (`service.ts`, `equation.worker.ts`);
  - the OOE runtime shell (`src/lib/new-equation/runtime.ts`);
  - Rust plan and host descriptors, and the compartments manifest;
  - the verification sentence;
  - drafts per tab.
- **Part B**:
  - the page and answer panel, with CSS;
  - the runtime hook (`useNewEquationRuntime`, via `useNewPageRuntimes`, so AppMain stays at its cap);
  - the launcher entry (Core, after Table), workspace kind, surfaces and tab actions;
  - the runtime probe (11 workspaces);
  - the Guide article (selectors.ts duplicate builders removed, cap lowered to 2498);
  - the Playwright spec;
  - UI test helpers matching launcher labels exactly ("New Equation" also contains "Equation").

## Decisions taken during implementation (recorded in decisions.md)

- **Assumption order**: assumptions are applied after deciding without them. Adding them as relations made vacuous cases and refused inequalities in systems.
- **V6 amendment**: V6 gained `assumptions`, because a pruned answer is only true under them.
- **Menu position**: the launcher entry is last in Core, so existing hotkeys keep their numbers.

## Real-app review fixes

- the answer math was too small;
- the answer sat below the limits panel;
- an assumption badge covered the editor's keyboard toggle (now a hint line);
- engine jargon in unsolved messages (now plain owner wording, with "Technical reason" folded);
- outdated "Conditions used" was not greyed.
