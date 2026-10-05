# EQUATION-ADOPTION1: The New Equation Workspace (stage 14)

Date: 2026-10-05
Status:
- **Part A (row lowering, assumptions, worker and OOE runtime, drafts)**: implemented and verified on 2026-10-05.
- **Part B (page, menu, Guide, Playwright evidence)**: implemented and verified on 2026-10-05, in the same PR. This completes the gate.

Gate: the first user-facing surface of the private Equation core. Stage 14 of the [roadmap](equation-reconstruction-roadmap.md).

Dependencies:
- [`EQUATION-RESULT-CONTRACT1`](equation-result-contract1-spec.md) (V6, the adapter and its read model);
- [`EQUATION-PRESENTATION1`](equation-presentation1-spec.md) (the presentation read model);
- the precedent New Integration workspace, read only.

Nothing from the old Equation engine (`src/lib/equation/`) is used, and the old Equation workspace is unchanged; it stays the shipped surface until closeout. No file under `src/lib/calculus/new-integration/` or `src/app/new-integration/` is edited.

## User decisions (2026-10-05)

- **Entry**: a separate page from the menu, in the Core category beside Equation (Calculate, Equation, Table, New Equation), with its own tabs.
- **Input: numbered rows.**
  - One relation per row: an equation, an inequality or ≠, each in its own math editor.
  - All rows hold together.
  - "+ Add row", × to remove a row, and "Example ▾".
- **Keys**:
  - Enter solves; Shift+Enter adds a row below and focuses it.
  - A quiet tip under the rows reads "Enter to solve · Shift+Enter for a new row", and the Guide states it.
- **Solve for**: picked automatically, editable as chips (× removes one, "+" adds one, "Automatic" resets).
- **Assumptions**: a row that mentions only parameters is an assumption (see below). Without an assumption row, every case is solved.
- **Toggles in the workspace**:
  - Real | Complex beside Solve for;
  - Exact | Decimal | Both on the answer, starting from the app's output style and remembered per tab;
  - the decimal places come from the app settings.
- **Verification**: a closed "✓ Verified exactly" line opens one fixed sentence per answer type. The detailed per-check report is a later gate.
- **No step-by-step**: steps will come later from an agent through MCP in Notebook.
- **Saving**: drafts per tab only. Answers are recomputed, never stored. No History, export or import in this gate.
- **Unsolved problems**: a clear message only, in plain words.
- **Limits**: a closed "Advanced limits" panel (work, memory) with a short explanation.
- **After an edit**: the previous answer stays, greyed, with "Answer is for the previous problem — Solve again". Nothing recomputes on its own.
- **Delivery**: one PR with two commits.

## Part A

### Rows (`src/lib/new-equation/parse.ts`, shared by the page and the worker)

- Each row's LaTeX is read by Compute Engine in raw form, with numbers kept as exact decimal text (0.5 is ½). This reads input only; no printed output is ever parsed.
- The MathJSON is then put in the shape the core reads:
  - implicit products become `Multiply` (2x, xy);
  - `e` and `i` are the constants e and i, as on the keypad;
  - names must be Latin letters (the V6 symbol grammar).
- **Row errors**, each shown under its row:
  - a parse error ("This row is incomplete.");
  - several items in one row;
  - text;
  - a row without a relation sign.
- **Automatic unknowns** (`autoTargets`):
  - order: x, y, z, t, then the other letters alphabetically;
  - one unknown per row containing an equation, and at least one.
- **Checks before solving** (`checkRows`), with nothing sent to the worker:
  - unreadable rows;
  - order relations over ℂ (the row is marked "Inequalities need real numbers." and the page offers Switch to Real);
  - assumptions on names that appear in no other row;
  - unknowns that appear in no equation row.

### Lowering (`src/lib/symbolic-engine/equation/service/input.ts`, registered adapter)

- **Problem**: rows become core relations through `readRelations`. Rows naming an unknown form the relation problem; rows naming only parameters become canonical assumption relations.
- **Refusals**: an unsupported head or an invalid row names its row. Contradictory assumptions are refused as "These assumptions cannot all hold." when that is decided exactly.
- **Domain conditions** ("Conditions used"), read from the problem's structure:
  - ln u needs u > 0 (ℝ) or u ≠ 0 (ℂ);
  - an even root of u needs u ≥ 0 (ℝ);
  - a negative power of u needs u ≠ 0;
  - tan u needs cos u ≠ 0;
  - arcsin and arccos need −1 ≤ u ≤ 1 (ℝ).

  They are projected to V6 conditions and laid out by the printer.

### Assumptions (`core/parameters/assume.ts`)

- **Order**: the problem is decided without the assumptions.
  - Adding them as relations would have made the core report "If a ≤ 0: No solution" cases and refuse inequalities in systems.
  - Then every case whose conditions cannot hold together with the assumptions is dropped, and every case condition they imply is removed.
  - One remaining unconditional case collapses to a plain set; only empty cases give ∅.
- **Decisions are exact**:
  - **One parameter p**:
    - Applies to conditions rational in p with exact coefficients.
    - Samples are every real zero of a numerator or denominator, plus a rational in every gap and beyond. Over ℂ they are every zero plus one generic rational.
    - Signs are constant between samples, so a conjunction holds somewhere if and only if it holds at a sample.
  - **Several parameters**: a condition whose expression is c·∏ pᵢ^eᵢ is decided from the signs each pᵢ can take under its own conditions (4ab > 0 with a, b > 0 is implied; 4ab = 0 is impossible).
  - **Anything else**: kept as it is. It is still true, possibly vacuous, and the page notes "Some cases could not be checked against the assumptions".
- **Evidence** (`verifyAssumedOutcome`, run by the adapter after the full outcome is verified):
  - every kept case is a case of the full outcome, with a subset of its conditions;
  - at a grid of parameter values (each parameter's cell samples, and −2, −1, 0, ½, 1, 2) where every assumption holds, exactly one kept case holds, with the full outcome's set there;
  - re-deriving gives the same outcome.
  - A tampered pruning (a dropped live case, swapped sets) is rejected.

### V6 amendment: `assumptions`

- The V6 primary gains an optional `assumptions`: a non-empty list of relations (`eq`, `ne`, `lt`, `le`) on the declared parameters only. Root binders are not allowed, and orders are real only.
- When present, the outcome describes the solutions for parameter values satisfying every assumption.
- The adapter records them and replays them (`readAssumptions`), and the presentation shows "Assuming a > 0" as the first row. AGENTS.md lists the field.
- No other V6 field changes.

### Worker, service and runtime

- **Service** (`service/service.ts`, the worker entry): one cumulative `ExecutionContext` per request, from the tab's limits, covers:
  - lowering;
  - deciding;
  - assumptions;
  - verification, projection and replay;
  - the presentations in all three styles;
  - the domain conditions.

  A stop while presenting falls back to the printer-only presentation. Input refusals and stops before projection are V2 error documents with the row notes.
- **Runtime** (`src/lib/new-equation/runtime.ts`):
  - the `equation.new-equation` capability on the `new-equation-worker-runtime` host;
  - an OOE runtime shell with commit-latest-only;
  - a stale revision, a closed tab or an abort drops the reply;
  - Stop terminates the worker;
  - there is no main-thread fallback.
- **Rust descriptors**: the plan in `registry.rs` (UserVisible) and the host in `hosts.rs` (WebWorker, HardStop), with the command counts. The compartments manifest owns `src/lib/new-equation/` under Equation, and the runtime probe registers the workspace (11 workspaces).
- **Drafts** (`src/app/runtime/new-equation-drafts.ts`):
  - per tab: rows, unknowns (or automatic), domain, style and limits;
  - bounded to 64 tabs and 4 MiB, with a notice on overflow;
  - no answer or trust state is stored.

## Part B

- **Page** (`src/app/new-equation/NewEquationPage.tsx`, `NewEquationAnswer.tsx`, `styles/app/new-equation.css`), in this order:
  - the rows, with the tip and the assumption hint under assumption rows;
  - Solve for and Real | Complex;
  - Solve and Stop;
  - the answer;
  - Advanced limits.
- **Answer panel**:
  - The rows come from the worker's presentation (typed roles and depths), rendered as LaTeX without display normalization.
  - "✓ Verified exactly" with its sentence, chosen from the typed outcome in `src/lib/new-equation/verification.ts`.
  - "Conditions used".
  - Copy LaTeX and Copy text, through the shared clipboard adapter.
- **Non-answers**: an `incomplete` outcome shows a plain sentence from its typed owner, with the engine's reason in a closed "Technical reason" panel. Other non-answers show the presentation's message.
- **Menu and tabs**:
  - the Core launcher entry (also merged into older desktop catalogs);
  - the `new-equation` page workspace kind (Equation compartment);
  - surfaces, tab actions and per-tab runtime.

  `useNewPageRuntimes` keeps `AppMain.tsx` within its size cap.
- **Guide**: the "New Equation" article (algebra), covering rows, unknowns, assumptions, Real/Complex, styles and the Enter / Shift+Enter keys. The duplicated draft builders in `selectors.ts` now come from `builders.ts`; the file's cap is lowered to 2498.

## Evidence

- **Unit tests**:
  - rows and service (15);
  - assumptions (8);
  - adapter assumptions (1);
  - V6 assumptions validation (1);
  - runtime shell (5);
  - drafts (2).
- **UI tests**: the runtime hook (4), the page (4) and the answer panel (4).
- **Playwright on the real app** (`e2e/new-equation.spec.ts`), with screenshots:
  - a quadratic;
  - the circle system with x ≠ −1;
  - the outdated state;
  - x² = a with and without a > 0;
  - sin x = ½;
  - x⁵ − x − 1 = 0 in all three styles;
  - domain conditions;
  - cos x = x, unsolved;
  - an inequality with Complex, then Switch to Real;
  - Shift+Enter and Enter;
  - Stop on x⁴⁰ − x − 1 over ℂ;
  - tabs and draft restore after a reload;
  - a 390 px screen.
- **Repository gates**:
  - result contract;
  - V2 enforcement;
  - display-contract inversion (baseline accepted for the two canonical reads of the error document and the projection);
  - compartments and OOE boundaries;
  - file sizes;
  - core isolation;
  - `tsc -b` and ESLint.

  `cargo check` cannot build here (GTK system libraries missing); the Rust edits are formatting-checked and mirror the New Integration entries.

## Follow-ups (ledger)

- the detailed verification report, per check (`EQUATION-VERIFICATION-REPORT1`);
- global History for New Equation;
- export, open and verify of saved problems;
- step-by-step through the Notebook MCP agent;
- assumptions that couple several parameters beyond monomials (`EQUATION-SEMIALGEBRAIC1`).
