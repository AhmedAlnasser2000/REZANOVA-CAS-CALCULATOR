# EQUATION-RECONSTRUCTION-CLOSEOUT1: corpus, capability ledger, retirement

This is stage 17, the last stage of Phase 1 of the [reconstruction roadmap](equation-reconstruction-roadmap.md). The user approved it on 2026-10-14.

The stage has two parts:
- **PR A** runs New Equation's core on a corpus of every equation the old engine was tested on. It fixes what the corpus exposes and records the evidence in the [capability ledger](equation-capability-ledger.md).
- **PR B** retires the old Equation workspace and engine.

## User decisions

**2026-10-14**
- **Retirement.** Both the old workspace and its engine are retired. New Equation becomes "Equation".
- **No parity features.** New Equation gains no feature just to match the old workspace.
- **History.** All History is wiped once, with a notice.
- **No parity bar.** The comparison with the old engine is dropped as a bar: that engine is almost defunct, often solved for a parameter instead of the unknown, and gave unconditioned answers. The corpus tests the new core alone.
- **Runs past 60 s are fixed.** Every corpus run killed at 60 s is fixed with exact methods and no caps. A fix ends in an answer, or in a typed stop that arrives in seconds.

**2026-10-15**
- **All five last cases fixed before PR A.**
- **Many parameters.** The complete case list is the answer, merged where possible (no typed stop for size).
- **The constant i in Real mode.** Real mode restricts the unknown, not the constants, as in Mathematica: the problem is decided over ℂ and intersected with ℝ.
- **Galois groups and a shared factorization layer** need the user's approval first. Neither was needed.

## PR A: corpus, fixes, capability ledger

### A1. Corpus and harness (`tools/equation-parity/`)

- `corpus.json` (committed) holds 1,540 problems:
  - the 50 cases of the baseline table in the [inventory](equation-reconstruction-inventory.md);
  - every equation-like string literal in the old engine's tests (their expectations are not used).
  - `mine-corpus.mjs` produced it. `String.raw` literals keep their backslashes.
- `run.mjs` runs the corpus over ℝ and over ℂ in four batch processes:
  - a parent watchdog kills a run still going at 60 s (SIGKILL, so a busy loop cannot ignore it);
  - runs resume after the last recorded result;
  - results are keyed by problem text.
- `runner.ts` decides, verifies and records each run's outcome, values, verification and timing.
- `report.mjs` sorts the runs into classes:
  - exact;
  - certified;
  - refused, a typed outcome (input the lowering rejects with a typed message counts here);
  - failed;
  - killed;
  - unreadable, meaning strings that are not equations.
  It also groups the refusals and lists the runs that took 10–60 s.

### A2. Fixes (`src/lib/symbolic-engine/equation/core/`)

Everything below is exact: no time limit, cap or rounding decides anything.

**Exact zeros that sign tests refined forever**
- `representation/angles.ts` `expandDeep`: expansion inside function arguments, so the builders' folds apply.
- `log-zero.ts`: sums of logarithms combined on the positive reals.
- `kernel-identity.ts`: values as rational functions of their kernels, with these parts:
  - exponentials grouped by direction (exp(2 + 2i) = exp(1 + i)²);
  - radical relations reduced in one pass per relation;
  - a normal form with gcd cancellation;
  - denominator rationalization over square-root kernels (i = √−1).
- `defined-folds.ts`: folds of defined values that the builders keep for domain reasons:
  - 0·t;
  - (u^a)^n;
  - e^{c·ln A};
  - odd symmetry;
  - principal-branch inverses, certified by enclosures;
  - kernel normal forms of arguments.
- `periodic/rectangular.ts`: the complex zero test.
  - A 64-bit enclosure that excludes 0 settles "nonzero".
  - Otherwise field arithmetic on the complex form, with log(exp a) = a when |Im a| < π.

**Angles**
- `arc-unit.ts`: e^{i·arc u} from a direct annihilator:
  - degree 2d for acos;
  - the norm of a Gaussian one, degree 4d, for asin and atan.
- `unit-circle.ts`: cos θ and sin θ of a unit point.
  - They come from its self-reciprocal minimal polynomial (Dickson polynomials).
  - |W| = 1 is certified by root identity.

**Algebraic numbers**
- `algebraic/arithmetic.ts`:
  - αⁿ from one resultant of degree deg α;
  - q·α by scaling the minimal polynomial.
- `root-identity.ts`: the root index is memoized per root.
- `decision/number-field-zeros.ts`: zeros of a polynomial whose one algebraic coefficient is γ.
  - Uses dynamic evaluation in ℚ(γ)[y]: a gcd with each norm factor, and the split h = G·(h/G).
  - No Liouville bound is needed.
- `parameters/verify.ts`: conditions at algebraic samples.
  - Signed modulo the sample's minimal polynomial.
  - Otherwise by a certified enclosure before exact evaluation.

**Parameters**
- `parameters/shift.ts`: the shift test (decomposition with a linear inner component), and closed forms of binomial roots.
  - (x + a)¹³ = b gives x = b^{1/13} − a.
- `parameters/product.ts`: the zero-product split (factor first).
- `parameters/exclusions.ts`: exclusion splitting for one equation with denominators.
  - The complete case list.
- `parameters/outer-power.ts`: outer-power decomposition, u(x)ⁿ = b through u = w.
  - It falls back to the previous route where it cannot express an answer.

**Radicals**
- `constraints/radical-chain.ts`: chains of square roots, by isolating and squaring.
  - Polynomial sign conditions are decided exactly by `signAtReal`.
  - Used both by the decision and by the verifier.

**Routing and verification**
- `real-restriction.ts`: equations with i in Real mode.
  - Decided over ℂ, then intersected with ℝ by exact imaginary-part tests.
- `decision/rules.ts`: the polynomial conversion goes to its fixed point.
- `parameters/specialize.ts`: samples with transcendental constants go to the constants slice.
- `composition/families.ts`: points where φ′ is undefined cut the monotone pieces.
- `generators/closed-form-set.ts`: a point where an atom is undefined does not satisfy it.
- `generators/verify.ts`: samples inside narrow members come from refined enclosures.

**Tests**
- `core/closeout/slow-cases.test.ts` and `core/parameters/shift.test.ts` cover every fixed corpus case.

### A3. Capability ledger

- [equation-capability-ledger.md](equation-capability-ledger.md) records the final corpus run:
  - counts by class over ℝ and ℂ;
  - the refusal groups, each mapped to the Phase 2 ledger row that owns it;
  - the runs that take 10–60 s.
- The old engine's numbers are an informative appendix, not a bar.

### Verification (PR A)

- The equation core and New Equation unit suites, typecheck and ESLint.
- The final corpus run: no run killed at 60 s, no failed run.
- The probe tool `tools/equation-slow-case-probe.mjs` for single cases.

## PR B: retirement

### User decisions (PR B)

**2026-10-14**
- Keep open: Equation (the New Equation page), New Integration, Graphing, Notebook, Settings, History and Guide.
- Every other workspace stays visible but cannot be opened, signed "Unavailable: being rebuilt".
- The starting workspace becomes Equation.
- Graphing's complex sampling moves under New Equation, marked "temporary, must be replaced later" (C5).

**2026-10-15**
- **CI scope.** Tests of every workspace except New Integration, Equation, Graphing, Notebook, Settings and History leave CI; their files stay. Only the old Equation tests are deleted.
- **Old-engine tests.** Tests of old math code that no kept workspace and no Integration code imports leave CI too.
- **Internals.** OOE, Surface Protocol, compartments, goldens, canaries and ratchets keep running. Internal tests that only exercise a retired workspace leave CI (the browser specs for Calculate, the History replay ratchet, the clipboard audit, and three result-contract unit tests). The canaries keep Equation's cases.
- **Integration.** Every Integration unit test keeps running (the Integration program owns them); the three browser specs that drive the old Calculus integral UI leave CI.
- **Ratchets.** See "Ratchet changes" below; each was approved in this conversation.
- **Guide.** The 13 worked examples written for the old Equation are removed. The other examples open retired workspaces: "Open in Tool" is refused with the sign, and they are marked for removal or rewriting when their workspace is rebuilt.

### B1. Availability (`src/lib/workspaces/availability.ts`)

One module decides what opens: the launcher leaves `new-equation` and `new-integration`, and the shell mode `guide`. Every route that opens a calculator-shell workspace asks it:
- the launcher row: disabled, badge and tooltip "Unavailable: being rebuilt", no new-tab action, no context menu;
- the launch action;
- AppMain's `setMode`, `routeToModeDestination`, its new-tab variant and the launcher's new-tab route. These cover Guide examples, Guide's back action, hotkeys and the mode strip. A refused route shows "<Workspace>: Unavailable: being rebuilt".

Every open surface is now a page, and pages have no MENU key, so the tab strip's "+" menu is the navigation. It gains New Integration and a "Being rebuilt" group listing the retired workspaces, disabled and signed.

The old Equation launcher entry is removed from the client and Tauri catalogs. New Equation takes the name "Equation" and its place after Calculate. Older host catalogs that still list the retired entry are merged without it. Internal IDs (`new-equation`) are unchanged.

### B2. Starting workspace

New tabs and the boot tab are Equation. The boot tab restores the saved Equation drafts (the first fills it, the rest open beside it) and saves from the start. Tabs of calculator-shell workspaces were never saved, so none can come back on start.

New tabs (the "+" button and "New Equation tab") are Equation tabs; closing the last tab leaves a blank Equation tab.

### B3. History wipe

`src/lib/app-state/history-retirement-wipe.ts` clears all History once, on web and desktop. The versioned marker `rezanova.history-wipe.equation-retirement.v1` keeps it to one run. An app notice says "History was cleared when Equation was upgraded." Pages have no display panel, so the existing "N incompatible History records were removed" cleanup is announced through the same app notice.

### B4. Moves

- Graphing's complex sampling (`numeric-evaluator`, `branch-cut-policy`, `seed-grid-newton`, `exact`, `math-json`, `types`) moves to `src/lib/symbolic-engine/equation/numeric/complex-sampling/`, marked temporary (C5: certified complex roots of non-polynomial f(z) will replace seed-grid Newton). The code is unchanged; Graphing's tests are the proof.
- `complex-input-policy.ts` moves to `src/lib/input/`.

### B5. Typed stops and deletions

The retired workspaces' calls into the old engine return the typed stop `retiredEngineStop` ("Unavailable: this workspace is being rebuilt."): Trigonometry, Calculate's solve, Matrix eigenvalues and spectral forms, and Calculus implicit derivatives. The `trigonometry.equation` route is retired.

Deleted: `src/lib/equation/`, `src/lib/modes/equation/`, `src/lib/modes/equation.ts`, its worker client and entry point, the old Equation workspace UI and runtime, the legacy-test machinery, and the old Equation tests. The compartment manifest now gives the Equation compartment only `src/lib/new-equation/`.

### B6. CI exclusion

`tools/retired-workspace-tests.mjs` is the single list, read by `vitest.config.ts`, `vitest.ui.config.ts` and `playwright.config.ts`, and checked by `src/lib/workspaces/retired-workspace-tests.test.ts` (every entry exists; none is a test of a kept workspace, Integration or an internal):
- whole folders: Trigonometry, Statistics, Geometry, Labs, the workspace editors, the Statistics shell;
- workspace files in shared folders: Calculate, Table, Matrix/Vector, old Calculus, the calculator keypad routers;
- old-engine files, found by import graph: algebra, the Calculate engine and planner, the old symbolic engine's limits and helpers. `numeric-evaluation.test.ts` stays because the feature-probe ratchet runs it;
- three internal result-contract tests (Matrix authority and V2, Trigonometry period/phase);
- the browser specs of the retired workspaces and of the internals that drive them.

The canary spec runs only open workspaces' cases; the retired cases stay in the registry for their rebuild.

Two CI steps named retired specs directly:
- `ci.yml` "Run focused browser smoke" ran the Calculate smoke; it now runs the History persistence and Guide specs, which cover this retirement on the open pages.
- The weekly "Verify History create and replay flows" step runs the excluded History replay ratchet; `test:history-replay:browser` passes with no tests until a History-writing workspace returns.

### B7. Guide

- The old Equation's 13 worked examples are removed (`src/lib/guide/content/selectors.ts`); a Guide test asserts no example targets the retired Equation.
- Every remaining example targets a workspace being rebuilt; "Open in Tool" is refused with "<Workspace>: Unavailable: being rebuilt" and Guide stays open. A Guide test counts them as the removal backlog.

### Ratchet changes

- Printer migration: Calculate and Matrix/Vector lanes exempt (on #32).
- Canaries: Equation canaries added; New Integration exempt (on #32). The old Equation canary is retired through a new `retired` section of the canary floor (total 21 → 19; only a retired workspace's floor may leave, and the list only grows).
- Runtime probes: floor 11 → 10 (the old Equation leaf is gone).
- Goldens: the six old Equation contract cases are removed and six Equation twins added; `trigonometry-periodic-sine-equation` removed; `calculus-derivative-at-point` re-baselined.
- History replay: `trigonometry-equation` and `calculus-implicit-circle` fixtures and the old Equation fixture file removed (100 → 73 fixtures).
- V2 enforcement and display-contract inversion: a `retired` mechanism; the old Equation routes and files and the `trigonometry.equation` route are retired (57 → 48 routes).
- MathJSON coverage baseline re-accepted.
- Feature probes: the four probes that pointed at deleted old Equation tests now point at the kept tests that still read their settings (output style: Equation drafts; answer mode: the History replay snapshot; domain intent: the mode strip; complex exact form: the Settings panel).

### Verification (PR B)

- `tsc -b`, ESLint, and every static gate step of `ci-linux`.
- UI suite: 71 files, 386 tests passed.
- Unit suite: 606 files passed. The 28 failing files are all Integration files, and each fails the same way on `main` (`b69c261`): timeouts past 120 s, the `integration/core` circular import, and three assertions, including `integration-transcendental-certificate-result-shape`. They are the Integration program's and are left untouched.
- Browser (Chromium, preview build): every kept spec passes, except three Graphing canvas tests that fail identically on `main` in the build container (GPU real fields, z-map zero/pole markers, the throttled performance contract).
- Screenshots: the start on Equation with the History-wiped notice; the "+" menu with the "Being rebuilt" group; an Equation solve; a refused Guide example; Graphing domain colouring of (z²−1)/z; New Integration; Notebook; the History page after the wipe.
