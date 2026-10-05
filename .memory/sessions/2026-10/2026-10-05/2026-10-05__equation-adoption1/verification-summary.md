# Adoption gate verification

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

## Environment

- **Runtime**: cloud container, Node v22.22.2. Gate scripts run as `node` commands, because npm refuses Node 22 (devEngines 24.x).
- **Browser**: Playwright used the preinstalled Chromium (`/opt/pw-browsers/chromium`) through a local, uncommitted config.

## Results

- **Unit tests**:
  - equation, result-contract, new-equation, printer and draft suites: 72 files, 1015 tests passed (before part B);
  - the new suites: rows and service (15), assumptions (8), runtime shell (5), drafts (2) and V6 contract (+1) all pass.
- **Full unit suite** (\`vitest run --maxWorkers=4\`): 752 files and 6060 tests; 6056 pass, 1 is skipped and 3 fail. None of the three is caused by this gate:
  - the golden corpus and print-hygiene "two cases per launcher workspace" ratchets already fail on main for \`new-integration\` (checked with this gate stashed; \`ci-linux\` is red on \`77fdcf1\`), and New Equation adds the same gap;
  - \`numeric-golden-trace-harness\` exceeded its 10 s wall-time bound (10.6 s) under a fully loaded run (old Equation engine).
- **Full UI suite**: 91 files, 635 tests; 629 pass, 4 are skipped and 2 fail. The \`AppMain.formula-presentation\` case is pre-existing (it fails with this gate stashed). The \`LinearAlgebraEditorSource\` case is timing under load; it passes alone and passed in the previous full run.
- **UI tests**:
  - the runtime hook (4), page (4) and answer panel (4) pass;
  - the launcher, runtime-probe and workspace-tab UI tests pass after the label helpers were made exact;
  - `AppMain.formula-presentation.ui.test.tsx` "keeps editor hints responsive while a heavy formula case answer is compacted" also fails with this gate's changes stashed, so it is pre-existing and unrelated (old Equation path).
- **Playwright** (`e2e/new-equation.spec.ts`, production build, preview server): 2 tests pass, with screenshots of every scenario in the spec.
- **Repository gates**:
  - passing: result-contract runner, V2 enforcement, display-contract inversion (baseline accepted with a reason), compartments, OOE boundaries, surface protocol, pillars, area studies, mathfield placeholders, clipboard audit, file sizes, core isolation, `tsc -b`, ESLint on the changed files;
  - the printer-migration ratchet fails on the calculate and linear-algebra lanes, which are pre-existing and untouched.
- **Rust**: `cargo check` cannot build here (gdk-3.0 is missing); `rustfmt --check` passes on the three edited files.
