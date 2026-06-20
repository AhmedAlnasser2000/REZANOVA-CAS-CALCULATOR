# Current State

Last updated: 2026-06-20

## Purpose

This file is the live Calcwiz state map. It should describe what is true in the current repo, not retell every milestone that got us here.

Historical milestone detail belongs in the dated journals, session folders, and `.memory/research/milestones/current-state-milestone-archive-2026-06.md`. Do not rewrite historical records to remove old names; they are evidence. Do not present old compatibility names as active current behavior.

## Active Context

- Workspace: `Calcwiz`.
- Live checkout: `/home/ahmed/Downloads/Calculator`.
- Current development posture: architecture boundaries are now enforced by repo validators; new infrastructure should be demand-driven, not speculative.
- Commit convention: `0` milestones are audit/docs/readiness only; implementation or behavior/editing milestones start at `1` or higher.
- Memory convention: meaningful code/tooling/UX/workflow commits need same-commit memory records or an explicit no-memory-needed note.
- Daily catch-up is enforced: `.memory/current-state.md` must be at least as new as the newest journal/session day before meaningful commits pass `npm run test:memory-protocol`.

## Agent Ownership

- Default agent: Codex.
- Other agents are opt-in and should stay inside explicitly assigned lanes.
- When another agent has dirty work in a lane, do not touch it unless the user asks for coordination or repair.
- For repo-structure work, prefer one clear milestone at a time with verified gates and same-commit memory.

## Product Posture

Calcwiz is a desktop math workbench, not a generic quick calculator. Calculate remains the compact quickform evaluator. Rich guided workflows belong in their visible workspaces such as Equation, Calculus, Trigonometry, Statistics, Geometry, Matrix/Vector, Table, and Guide.

Graphing remains intentionally deferred. It should be planned as a scene/runtime surface over trustworthy solver outputs, domains, restrictions, branches, discontinuities, parameter ranges, and failure reasons. There is no current graphing compartment, route, workspace, pack, or Surface candidate.

Surface Protocol, broad bus/nervous-system work, plugins, packs, external SDKs, runtime registries, generated contracts, and distro layers are deferred until a concrete product or contributor need appears.

Equation search discipline is closed as a foundation track after `EQUATION-SEARCH-DISCIPLINE-CLOSEOUT0`. The corrected handoff and roadmap remain at `.memory/research/roadmaps/equation-solver-search-discipline-handoff.md` and `.memory/research/roadmaps/equation-search-discipline-roadmap.md`. The live repo now has pure target-shape profiling, conservative route planning, internal/test-facing search trace evidence, exp/log generated-handoff routing, a shared symbolic polynomial coefficient seam, route-gated carrier/composition/mixed generated branch handoff, and shared MathJson arithmetic adoption where parity was proven. This gives Calcwiz bounded, inspectable selected-target search discipline; it is not broad CAS recursion, algorithm expansion, or a new planner authority. Future solver work should use these seams instead of adding parallel route evidence, branch delegation, or coefficient arithmetic. `EQUATION-CAP-RECALIBRATION-AUDIT0` classifies current Equation caps before any expansion, and `EQUATION-CAP-HIT-EVIDENCE1` backs that classification with focused tests across all known cap families. `EQUATION-SOURCE-MIRROR-CONTEXT-AUDIT0` compares the local FriCAS/SymPy/Maxima/SageMath/Giac-XCAS/SymEngine/GeoGebra mirrors against Calcwiz and records the durable lesson: mature systems get recursive solving breadth from algebraic substrates, domain/conversion gates, assumptions, branch facts, elimination/factorization, and honest fallback objects, not from unbounded selected-target peeling. `EQUATION-CAP-HIT-REAL-CASES0` then checks current real/default evidence and does not justify raising caps yet: a visually deep selected-target affine/quotient shell normalizes and solves under defaults, no public default generated branch-count hit is known, and current default stops still mostly classify as algorithm/readback/semantic boundaries. `EQUATION-SUBSTRATE-ROADMAP0` starts the substrate track with this order: factoring/product decomposition, higher-degree root representation policy, branch/domain/exclusion facts, compact readback/implicit-root policy, then Exact/Isolate semantics. `EQUATION-FACTOR-PRODUCT-DECOMPOSITION1` adds the first substrate seam, `product-decomposition.ts`, as pure internal product extraction/decomposition for explicit zero-product MathJSON: zero-side extraction, `Multiply`/`InvisibleOperator` flattening, positive-power multiplicity, target classification, and target-power rejection. Only `factorable-polynomial.ts` consumes it for the explicit zero-product path; rational, algebraic, composition, denominator facts, branch facts, broad automatic factoring, and exact-rational factoring remain separate follow-ups. `EQUATION-ROOT-REPRESENTATION-SEAM1` adds the first solver-owned internal root model under `src/lib/equation/roots/representation.ts` and adopts it only in `factorable-polynomial.ts` explicit-product and exact-rational expanded factorable paths. The seam can model exact finite roots, factor-derived roots, exact-rational factor roots, numeric validated roots, implicit algebraic roots, and structured stops, but v1 adapts back to existing `exactLatex`, `branchReadback`, supplements, and detail lines with no visible `RootOf`, implicit-root notation, cap raise, schema change, or Exact/Isolate cleanup. `EQUATION-BRANCH-DOMAIN-FACTS1` adds the first internal Equation branch/domain facts seam under `src/lib/equation/facts/`, wrapping existing `ExactSupplementEntry` and `SolveDomainConstraint` meanings with attachment scopes while rendering the same raw `exactSupplementLatex` compatibility strings. First adoption is limited to factorable root-group facts and rational denominator exclusions; `detailSections` remain prose, and guarded algebra/composition/periodic/candidate-validation fact migration remains later. DAG/search-graph work is deferred until repeated transformation-state pressure appears. Symbolic degree-2 and algebraic/factorable degree-4 limits are primarily correctness/readback/algorithm-boundary caps; composition depth and periodic-parameter caps are semantic boundaries; selected-target peel depth and generated branch counts stay watchlist candidates only after user-real default-cap hit examples justify them. The Exact/Isolate answer-mode boundary remains deliberately deferred; the likely future differentiator is `Isolate` as rearrangement/isolation intent and `Exact` as isolation plus root, branch, principal-range, domain, and candidate-validation semantics when it claims a solved answer.

Language is now a first-class static compartment foundation, not a translation wave. `src/lib/language/` owns the English-only typed catalog, deterministic English fallback, metadata with direction, validation, typed function interpolation, and a React provider/hook. English remains the safe default/fallback for reset, invalid persisted settings, missing language resources, unknown language codes, or failed validation. Language owns prose, labels, commands, metadata, fallback, and interpolation; Display/notation continues owning math rendering. Mixed prose plus math should move toward structured text/math parts so math fragments honor MathNotation, and RTL metadata must not blindly change math semantics. After `LANGUAGE-SHELL-PILOT1`, low-risk app-shell consumers read shell/common labels through `useLanguage()`. After `LANGUAGE-SETTINGS-SEAM1`, `languageCode` is the durable settings field, `LanguageProvider` is mounted from settings in `AppMain`, the app shell exposes `lang="en"`, Settings shows a visible English-only language control, and web-preview plus Tauri desktop persistence both sanitize unsupported language codes back to English. After `LANGUAGE-PANELS-PILOT1`, `SettingsPanel`, `HistoryPanel`, and `VariablesPanel` read panel-owned labels, helper text, empty states, actions, aria text, History pending-row interpolation, and Variables feedback messages through the English Language catalog without changing settings persistence, History schemas, stored localized data, variable policy, solver wording, Display math rendering, or OOE/runtime behavior. After `LANGUAGE-ROADMAP-CLOSEOUT0`, the Language roadmap is intentionally paused: the foundation and first English seams are complete and tested, while navigation metadata, RTL, non-English packs, Guide/content work, and solver/readback localization should wait for real product pressure. The DisplayTextPart / mixed prose-math seam should resurface later as Display/math-fidelity work, not as translation work.

Workspace tabs now have the first visible browser-style shell after `WORKSPACE-TABS-SHELL1`, built on the earlier session identity, active-only surface-state hosting, OOE workspace-instance scoping, and per-instance Display state from `WORKSPACE-INSTANCE-MODEL1`, `WORKSPACE-STATE-HOST1`, `OOE-WORKSPACE-INSTANCE-SCOPE1`, `WORKSPACE-STATE-HOST-EXPANSION1`, and `WORKSPACE-DISPLAY-STATE-HOST1`. The app still uses one `AppMain`, one active rendered workspace surface, one OOE authority, and global committed History. The tab strip sits above the mode strip, shows one tab per `WorkspaceInstance`, supports focusing, plus-created blank Calculate tabs, rename, duplicate, close, close others, clear state, and stop jobs in a tab. Inactive tabs are not hidden mounted React trees; switching routes through the state host and singleton `currentMode`. Normal mode selection retargets the active tab, like browser same-tab navigation, instead of focusing or creating another tab. After `WORKSPACE-TABS-LAUNCHER-ACTIONS1`, launcher leaf rows keep primary click, Enter, hotkeys, and the existing Open action as current-tab retarget, while hosted runtime workspace leaves expose explicit `Open in new tab` through a visible row action and a right-click context menu. Labs remains open-here only, Guide is not a launcher leaf, and the `+` tab button still creates a blank Calculate tab; `WORKSPACE-TABS-DEFAULTS1` is deliberately deferred. Retargeting clears that tab's surface/display/runtime slots, updates default titles, preserves custom titles, increments a workspace-instance navigation revision, and makes older in-flight OOE work for that tab stale if it returns late. Retargeting does not request real job cancellation; old-revision jobs may finish internally but cannot visibly commit into the retargeted tab, and old-revision pending/running work is ignored by active-tab status and tab job summaries. Focusing another tab does not cancel the origin tab's running jobs. After `WORKSPACE-INACTIVE-TAB-COMMIT-FIX1`, OOE active-input revision checks can resolve the origin workspace instance's current revision from saved surface state when that instance is inactive but still open; this lets open inactive tabs accept their own completed results while still stale-dropping closed, retargeted, missing, or edited-origin jobs. Inactive-tab completions update only the origin tab's saved Display/Ans state. Manual testing exposed the key leak invariant: even when a completed job belongs to the correct workspace instance, async commit code must not read the active tab at Promise resolution time as the visible target; launch workspace context is frozen for ticket/runtime commit routing, and ref-backed runtime context getters keep completion writes scoped to the launch/origin instance. Surface state is hosted for all current runtime workspaces: Calculate, Equation, Calculus, Table, Trigonometry, Statistics, Geometry, Matrix, and Vector. Display outcome, `Ans`, and replay display/substitution fragments are workspace-instance session state, so a result committed in one tab does not overwrite another tab's visible answer/facts/assumptions. Display state is updated by explicit tab capture or origin commit only; it is not passively mirrored from whichever display happens to be visible. Runtime/editor status is also workspace-instance session state: editor stopped state, restart generation, runtime status overrides, final runtime elapsed duration, and Display header clipboard notices are captured/restored per active tab, and the Display header no longer reads the app-wide React transition pending flag. Runtime jobs now show calm elapsed timing in the Display header: whole-second `Computing`/`Stopping` labels while running, then a two-decimal `Ready` elapsed label after completion until that workspace launches another runtime job. Finalized committed History entries may store `runtimeElapsedMs`, and History rows show compact duration metadata; this is UI/persistence metadata only and does not change OOE stale gates, cancellation, host routing, or commit authority. Guide and Labs remain outside normal workspace surface-state hosting. OOE job identity, active/recent jobs, diagnostics records, lifecycle events, runtime envelopes, and launch-ticket evidence can carry optional `workspaceInstanceId` plus launch-time labels and revision metadata; pending/running History rows show launch-time tab labels for disambiguation, but finalized History rows return to normal workspace identity and do not store tab names. Closing a tab with active work asks for cancel/keep-open, and confirmed close cancels matching active work, clears matching pending tickets, then relies on existing instance-aware stale-drop to prevent late commits. Stop jobs remains an explicit active-tab cancellation path. After the 2026-06-19 stop-control follow-up, Display header Stop and Restart first target the active workspace scoped pending runtime ticket before falling back to legacy editor-analysis cancellation, so a hard Calculus worker run can be stopped from the header just like from the History pending row. Committed History, persistence, and global settings such as angle unit remain global. The agreed direction remains one app shell, no projects/files, no multiple `AppMain` copies, no second OOE authority, and no broad bus.

Tabs do not replace side panels. Side panels remain for quick, essential, while-working access: recent History, common Settings toggles, Vars, and developer diagnostics. Dedicated tab pages are the future home for deeper management surfaces that need room, such as full History/Records, full Settings, richer Variables management, Guide pages if needed, and future Graphing/Spreadsheet surfaces. The reason is architectural as much as UX: tabs are the app's general full-surface layer, so future rich surfaces do not have to be squeezed into the MathEditor/result shell, tiny side panels, or one-off modal/route systems. If tabs are treated only as multiple calculators, Calcwiz stays artificially limited: Settings remains cramped, History cannot grow into a real records manager, Variables cannot become a richer manager, and graphing/spreadsheet-style surfaces get forced into the wrong history/editor model. The distinction is important: side panels stay small and efficient, while tab pages can handle search, categories, filtering, large records, custom layouts, and future artifact types that do not fit the current computation `HistoryEntry` model. Graphing and Spreadsheet saved-work or artifact history remains deferred.

`WORKSPACE-TABS-PAGE-FOUNDATION-AUDIT0` finds the tab foundation ready for future full-page surfaces, but not by adding pseudo calculator modes. A later page foundation should add a thin tab-surface/page-kind descriptor and per-surface tab action policy before implementing full Settings, full History/Records, Variables manager, Guide pages, Graphing, or Spreadsheet.

## Calculus Identity

Calculus is canonical. Live `src` and `src-tauri` should not contain retired legacy Calculus identity vocabulary.

Current shape:

- Guided Calculus workspace code lives under `src/lib/calculus/workspace/`.
- Shared Calculus compute code lives under `src/lib/calculus/engine/`.
- Stable Calculus root surfaces are intentionally small: `calculus-identity.ts`, `calculus-workbench.ts`, and `calculus-strategy.ts`.
- `src/lib/modes/calculus.ts` is the public mode facade for current Calculus execution.
- Calculus CSS identity is canonical `calculus`, not retired legacy naming.

The hard-removal policy is intentional: old records are not mapped forward in live source. Historical journals may still mention old names because they document what happened at the time.

## Supercarrier Foundation

Supercarrier foundation is closed enough for current development after `SUPERCARRIER-FOUNDATION-CLOSEOUT0`.

Standing model:

- OOE is runtime traffic control.
- OOE Event Outbox reports OOE lifecycle facts.
- Supercarrier compartments define ownership, import boundaries, damage containment, diagnostics labels, and extension discipline.
- Diagnostics and compartment projections observe existing facts; they do not decide, route, cancel, retry, or commit.
- Surface Protocol remains a future external integration contract, not a current implementation.

Current foundation state:

- `src/lib/compartments/manifest.ts` is the declarative contract source for compartment ids, labels, owned paths, public seams, private paths, dependency policies, state surface posture, OOE fact mappings, and Surface candidacy metadata.
- `tools/compartment-boundaries-core.mjs` consumes manifest-owned truth for ids, path labels, and private district checks while keeping validator rule semantics in code.
- `npm run test:compartments-boundaries` validates the read-only boundary contract.
- `npm run report:compartments` gives a static contract report plus validator pass/fail summary.
- The latest closeout report passed and validated 651 source files, 26 OOE TypeScript files, and 6 OOE Rust files.

Known broad-but-acceptable compartments:

- `app-shell`: broad visual shell/workspace/component/style ownership.
- `app-runtime`: request construction and mode-hook coordination.
- `app-state-history-variables`: persistence, history, calculator memory, variable memory, hints, and named-variable policy.
- `table`: still small and flat.
- `navigation-input-kernel`: broad shared primitives around navigation, input, editor, numeric, kernel, and virtual keyboard.
- `playground` and `reference-mirrors`: isolated research/incubation/reference areas.

Do not add more Supercarrier scaffolding unless a real messy compartment, product feature, or contributor workflow needs it.

## OOE Current State

OOE is grouped into direct districts without root compatibility stubs:

- `pilots/`
- `job-launch/`
- `runtime-control/`
- `diagnostics/`
- `bridge-schema/`
- `events/`

OOE owns runtime traffic decisions: host selection, launch tickets, stale gates, cancellation checkpoints, commit legality, runtime envelopes, and diagnostics records.

OOE Event Outbox is load-bearing. It reports lifecycle facts and carries optional compartment labels for diagnostics. It is not a command authority, app-wide bus, Surface Protocol, plugin system, or generic event framework.

OOE Diagnostics Panel current state:

- Developer-only panel with `Records`, `Events`, `Jobs`, and `Compartments` tabs.
- Panel reads OOE and compartment diagnostics through `src/lib/ooe/diagnostics/panel-surface.ts`.
- `Records` and `Jobs` keep selected-detail/copy behavior.
- `Events` shows compact lifecycle facts and compartment filtering.
- `Compartments` shows health, issue evidence, manifest metadata, and inspect targets.
- Clear removes diagnostics records, recent jobs, OOE events, and UI-boundary records while preserving active jobs.
- The latest layout fix moved selected detail above scrollable lists and increased desktop panel height.

## App Shell And Runtime

`AppMain.tsx` remains the visual and cross-mode orchestration root, but it should not own persistence or OOE internals directly.

Current extracted app-runtime shells:

- `useHistoryDisplayRuntime`: history state, pending history tickets, display outcome, `Ans`, commit/finalization, replay display restoration, and History persistence helpers.
- `useEquationRuntime`: Equation workspace state, route/menu helpers, request construction, and Equation runtime wiring.
- `useAppPersistenceRuntime`: bootstrap load, runtime label hydration, settings persistence, calculator-memory snapshot restore/reset, variable-memory callbacks, and autosave coordination.

Persistence boundary:

- App runtime imports persistence through `src/lib/app-state/persistence.ts`.
- `src/lib/app-state/tauri.ts` remains the implementation/behavior-test authority.
- App runtime/logic must not import `src/lib/app-state/tauri.ts` directly.
- `AppMain.tsx` must not import `src/lib/app-state/**` or `variable-memory-store.ts` directly.

OOE diagnostics boundary:

- `OoeDiagnosticsPanel` may import only the OOE diagnostics panel seam.
- `CompartmentErrorBoundary` may import only the public `src/lib/compartments/ui-boundary.ts` facade.
- Normal components and workspaces must not deep-read OOE internals.

## Workspace Runtime Boundaries

App runtime request-building uses narrow public request facades for guided workspaces:

- `src/lib/trigonometry/runtime-request.ts`
- `src/lib/statistics/runtime-request.ts`
- `src/lib/geometry/runtime-request.ts`

App runtime may use public workspace request, navigation, examples, mode facade, and core-mode seams. It must not import parser/runtime-input/serializer internals or workspace math-core internals directly.

## Algebra, Equation, Display, Modes, Symbolic, Engine

The earlier district/facade cleanup lane is current and should be preserved:

- Algebra, Equation, Display, Modes, Symbolic Engine, and Engine keep stable public root facades where they protect shared import APIs.
- Private implementation districts own the moved internals.
- OOE traffic-control internals are the exception: they moved without root stubs and are protected by direct import updates plus boundary validators.
- Display library policy is split into notation, result, and scheduling districts; DisplayPanel is app-shell component structure.
- App CSS is decomposed out of the old shell monolith.

Do not remove root facades casually. Retire a facade only after an audit proves it is not public or load-bearing.

## Playground And Source Mirrors

Playground remains an incubation/reference system, not product runtime authority.

- Stable `src/**` code must not import Playground or source mirrors.
- Source mirrors live under ignored local mirror paths and are context only.
- Production source and OOE events must not embed source-mirror paths.
- Research snapshots that must be preserved verbatim belong under `.memory/sources/` with index metadata.

## Current Verification Commands

Use these for boundary-sensitive work:

- `npx tsc -b --pretty false`
- `npm run test:compartments-boundaries`
- `npm run test:ooe-boundaries`
- `npm run report:compartments`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

Use focused unit/UI suites for the compartment being changed, then run `npm run lint` and `npm run build` before final code commits that touch runtime, UI, validators, or shared libraries.

The recurring Node warning about `NO_COLOR` being ignored when `FORCE_COLOR` is set is non-fatal unless a command exits nonzero for another reason.

## Near-Term Guidance

Prefer product-facing or correctness work over more infrastructure. Good next lanes should come from real pressure:

- App shell component pressure.
- Navigation/Input/keypad/editor breadth.
- Table growth.
- Solver correctness, domain facts, and display fidelity.
- Future graphing only after a concrete product plan consumes validated solver/domain/branch state.

Stop if a proposed follow-up creates a broad bus, runtime registry, plugin layer, Surface Protocol, command authority, source generator, new execution authority, or graphing compartment without a concrete need.
