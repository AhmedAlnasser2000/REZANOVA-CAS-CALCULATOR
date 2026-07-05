# Current State

Last updated: 2026-07-05

## Purpose

This file is the live Calcwiz state map. It should describe what is true in the current repo, not retell every milestone that got us here.

Historical milestone detail belongs in the dated journals, session folders, and `.memory/research/milestones/current-state-milestone-archive-2026-06.md` or `.memory/research/milestones/current-state-milestone-archive-2026-07.md`. Do not rewrite historical records to remove old names; they are evidence. Do not present old compatibility names as active current behavior.

## Agent Ownership

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live
- Current maintenance note: the July 3 memory cleanup keeps this file as a current operating snapshot; stale July 1-or-earlier milestone detail was moved to `.memory/research/milestones/current-state-milestone-archive-2026-07.md`.

## Active Context

- Workspace: `Calcwiz`.
- Live checkout: `/home/ahmed/Downloads/Calculator`.
- Public identity posture: the primary public name is `REZANOVA CLASSWIZ CALCULATOR`; `Calcwiz` and `Classwiz` are friendly aliases only. Compatibility slugs such as `calcwiz-desktop`, `calcwiz_desktop`, and `com.ahmed.calcwizdesktop` remain unchanged unless a dedicated compatibility migration is approved.
- Public overview posture: current-facing docs should present the app as a Linux-first preview that is still advancing, with guided workspaces, Workspace Tabs, live Order of Execution traffic control, Formula Viewer, full Settings and History page surfaces, bounded Equation/Calculus progress, and English-only Language infrastructure. App-level Workspace Tabs stay top-anchored and outside calculator/page scaling; Settings and History page content honors UI scale and high-contrast settings. Full Settings now has premium app-page taxonomy, icon navigation, existing-control category segmentation, derived live preview, dynamic symbolic rewrite preview, and History row-notation controls; full History uses the full available app-stage width with a dense virtualized ledger, timeline rail, table-like columns, selected-result inspector, truthful local filters, selection-first interaction, and a separate LaTeX default for ledger rows. Graphing, Spreadsheet, full Variables pages, Surface Protocol mounting, plugins, external software development kit, Complex nonlinear numeric roots, Complex locus/set output, full Risch certificates, and Arabic/right-to-left localization remain future.
- Surface Protocol posture: the hostless spine now has DTO firewall, capability manifest, versioned error, read-only event adapter, pure query, conformance-test, policy/vocabulary registry, contract-fixture, and internal-agent spec foundations. Surface Protocol has a dedicated `src/lib/surface-protocol/` boundary with compact result DTOs, pure `DisplayOutcome` summary mapping, a Calculate/Equation-only manifest, supported-version helpers, structured errors, curated lifecycle DTO mapping from the Order of Execution event outbox, snapshot-input queries for current result summary, workspace info, and safe settings with optional angle unit only, `test:surface-protocol` boundary/serialization coverage, internal field/vocabulary policy registries that do not change response DTO shapes, canonical fixtures for manifest/current-result/safe-settings/lifecycle-event/failure outputs, and fixture-aligned docs. Host commands, mounting, History, Variables, Graphing, tabs, plugins, remote compute, raw event payloads, diagnostics, app-global state facades, Model Context Protocol adapters, and external software development kit work remain unavailable.
- Current development posture: architecture boundaries are now enforced by repo validators; new infrastructure should be demand-driven, not speculative.
- Release posture: `v0.2.0` is the current Linux-first early preview target. The repo release path covers AppImage, Debian/Ubuntu `.deb`, and RPM artifacts; native Arch packaging and full CAS parity are not claimed.
- Commit convention: `0` milestones are audit/docs/readiness only; implementation or behavior/editing milestones start at `1` or higher.
- Algorithm prerequisite policy: nontrivial algorithms must declare required representation, symbolic primitives, facts/assumptions, validation, route evidence, readback/presentation, and tests before implementation. Missing prerequisites must be built before or alongside the algorithm, or the algorithm must stop and record the gap.
- Visual verification policy: app-visible mathematical output gates must use Playwright to inspect the real rendered answer/error cards, facts, detail or boundary cards, and readability risks; unit tests alone are not enough.
- Algorithm and presentation posture: Equation has live direct/rational-cleared Cardano and Ferrari, bounded Real and Complex wrapper families, compact-first Formula Viewer handling for dense formulas, and producer-side readback hygiene. Equation benchmark planning now has a runtime-free corpus ledger scaffold under `benchmarks/equation-corpus/` with unique-case, duplicate-case, run-result, and scan-finding ledgers plus a validator; duplicate source sightings attach to one canonical runnable case per sweep. The first OpenStax Algebra/Trig scan records 50 unique cases, zero duplicate sightings, and historical run/finding evidence. `EQUATION-CORPUS-ALGTRIG-FIX1` adds a post-fix run for the six scan findings, marking exact factorization, cancelled-hole exclusion, exact exponential inverse, quadratic-trig periodic output, and two trig special-angle readback findings fixed while preserving the original scan rows. Complex-On companion evidence is now a corpus policy for applicable canonical cases; the July 5 fix gate closes the 20 all-real companion findings, records 434 canonical companion runs with 415 supported, 19 controlled unsupported, and zero wrong-result rows, preserves periodic trig families under Complex On, adds positive numeric-base complex exp/log branches, and turns the scoped absolute-value boundary case into controlled empty-set evidence. Deferred areas remain Complex locus/set output, unrestricted generated wrapper formula expansion, broad `RootOf`/implicit-root display, persisted Display schemas, and formal full-CAS parity.
- Linear Algebra readback posture: Matrix and Vector remain separate workspaces with named-value libraries, natural result cards, and no automatic Equation routing. App-level `APPROX` cards are reserved for real numeric approximations; Matrix suppresses nonnumeric summary text and Vector filters nonnumeric summaries while keeping numeric scalar approximations.
- Linear Algebra input posture: successful Matrix/Vector editor parses canonicalize pasted list syntax and MathLive matrix variants into natural matrix/vector LaTeX for editor, preview, history, and replay; raw list syntax remains import-only.
- Linear Algebra runtime seam posture: Matrix and Vector keep separate OOE identities through `linearAlgebra.matrix` and `linearAlgebra.vector`, but app runtime still imports private Linear Algebra parser/named-value internals while no dedicated public runtime-request/paste/canonicalization seam exists. Enforcement is deferred until that seam is built; do not harden the validator against current Linear Algebra runtime imports inside audit-only work.
- Equation history replay posture: new Equation history entries persist an internal `equationSeed` for guided route restoration and `systemReadback` for structured system-answer replay, so Polynomial/Simultaneous screens restore their original controls and clean answer rows instead of falling back to Symbolic-result guessing.
- Workspace and page-surface posture: app-level Workspace Tabs, same-tab retargeting, quick side inspectors, singleton Settings/History pages, and Formula Viewer are live. Quick inspectors stay calculator-only; full management/canvas surfaces belong outside the calculator shell. Graphing, Spreadsheet, full Variables pages, saved-work/project management, export/import, artifact history, and Formula Viewer-from-record actions remain deferred.
- Guide education-platform posture: Guide is now a singleton app-level page surface outside the calculator shell, with existing reference/example content rehosted through the page-surface model and null Order of Execution runtime context. The July 5 content-reality audit is findings-only: Guide identity is current, but domain/article parity and stale overview-source issues should be fixed before a broader Guide content rewrite. The future direction remains an authorable educational platform built from notebooks, guidance packs, learner copies, compact computation/evidence snapshots, and safe import/export contracts. Notebook blocks, teacher/community packages, import/export, highlights, rich text editing, MathLive notebook blocks, and Guide persistence remain future; this is not a universal generated step-by-step engine and does not depend on embedding external textbooks or websites.
- Symbolic primitives/readback posture: the five private Symbolic Primitives and Equation presentation/readback seams exist as governed internal tools. Future consumers should adopt them only through focused parity milestones, not broad sweeps.
- Language posture: English-only language infrastructure is live as a static compartment foundation. Non-English packs, Arabic/right-to-left behavior, and solver/readback localization wait for dedicated product pressure.

## Calculus Identity

Calculus is canonical. Live `src` and `src-tauri` should not contain retired legacy Calculus identity vocabulary.

Current shape:

- Guided Calculus workspace code lives under `src/lib/calculus/workspace/`.
- Shared Calculus compute code lives under `src/lib/calculus/engine/`.
- Stable Calculus root surfaces are intentionally small: `calculus-identity.ts`, `calculus-workbench.ts`, and `calculus-strategy.ts`.
- `src/lib/modes/calculus.ts` is the public mode facade for current Calculus execution.
- Calculus CSS identity is canonical `calculus`, not retired legacy naming.
- Differentiation expansion is paused until Vector/Matrix are upgraded enough for symbolic multivariable and vector-output work. Existing guided derivative behavior remains available for stabilization/backlog only: natural editor requests, derivative shortcuts, derivative keypad overlays, bounded output normalization, repeated ordinary derivatives, mixed partials, and the Equation-owned implicit derivative seam are present, but Gradient/Jacobian/Hessian/vector-calculus operators should wait for symbolic vector/matrix representation, readback, and workspace UX. The next active Calculus lane is Limits.
- `CALCULUS-LIMITS-AUDIT0` records the current Limits baseline. Limits now have a tested natural request parser plus exact finite targets such as `\pi`, `\pi/2`, `3\pi/2`, and `e`; friendly infinity forms such as `infinity`, `infinty`, `infty`, `∞`, `+∞`, and `-∞` canonicalize to `\infty`/`-\infty`; variable mismatches stop with a correction suggestion instead of silently treating the body as constant or substituting stored values; two-sided finite-limit mismatches add a collapsed `Why This Limit Fails` detail card with left/right behavior; and signed one-sided/same-sign-divergence cases add `Side Behavior` details. The natural Limit screen now routes through an internal classifier-owned route plan: unsupported, malformed, and over-budget routes stop with `Limit Diagnostic` details, and numeric fallback is route-owned for direct-substitution and finite-pole side-evidence plans. Exact local algebra is Limits-owned and uses existing symbolic primitives for finite common-denominator rewrites and the positive-infinity radical-conjugate case `sqrt(x^2+ax+b)-x`. Safe indeterminate transforms are pattern-based and proof-card-backed for `0*infinity` log products and selected power forms such as `0^0`, `infinity^0`, and `(1+c/x)^(kx)`, including `(1+1/x)^x -> e`. Capped Taylor leading terms support additive cancellations through order `10`, with method details for the first nonzero derivative/order comparison. Pattern-based squeeze and oscillation handling is live for classic finite-target forms such as `x*sin(1/x) -> 0`, `x^2*cos(1/x) -> 0`, and `sin(1/x)` no-limit proof cards. The visible guided Limits menu uses one canonical `Limit` screen whose main editor owns the full expression, while old finite/infinite routes remain hidden compatibility paths. Current visible copy says "limit expression" instead of "limit request". Broader theorem proving, Gruntz, symbolic targets, and non-pattern squeeze remain deferred.
- Limits frontier symbolic-asymptotic posture: the frontier arc now has Limits-owned asymptotic term/series and conditional-case infrastructure plus live finite recursive leading-term, infinity-scale, rewrite/cancellation-spine, Piecewise branch-selection, absolute-value side-behavior, MRV-lite, narrow complex principal-branch proof routes, conditional symbolic infinity leading-coefficient cases, and explicit route-orchestration fallback policy. The finite route preserves target-free symbolic coefficients and exact finite answers for local carriers, products, quotients, integer powers, sums/cancellations, and selected standard compositions. The infinity-scale route compares numeric-coefficient powers/roots, logarithms, iterated logarithms, linear exponentials, products, quotients, and dominant sums before L'Hospital or numeric fallback, and narrow symbolic polynomial-scale infinity cases such as `a*x` and `b*x^2+a*x` now branch on coefficient sign/zero fallthrough through the case surface. The rewrite/cancellation spine centralizes finite common-denominator rewrites, positive-infinity radical conjugates, and safe log/power transforms before retrying existing leading-term or scale routes. The Piecewise route supports friendly `piecewise(...)` and LaTeX `cases` input with simple comparison and chained linear-interval conditions such as `0 <= x < 5`, finite-side and infinity-side branch selection, existing branch evaluators, and left/right disagreement proof cards; the guided Limit row editor now keeps only the `Piecewise` keypad entry, preserves condition spacing while typing, maintains active-row focus, supports whole-block removal, and keeps drag/reorder cleanup local to the row editor. The absolute-value route supports affine carriers such as `|x|/x`, `|x-a|/(x-a)`, and `|x-a|` with one-sided sign proofs and two-sided disagreement stops. The MRV-lite route supports capped positive-infinity exponential/logarithmic scale comparisons such as `e^{sqrt(x)}/e^x`, `e^{sqrt(x)}/x^5`, `e^{x+log(x)}/(x e^x)`, and `e^{log(x)^2}/x^5`. Complex On can prove recognized principal square-root boundary carriers such as `sqrt(x)`, `sqrt(x+1)`, and `sqrt(x^2+x)-x`. Numeric fallback is intentionally narrow: direct substitution and finite-pole side-evidence routes may use it, while exact symbolic/proof routes must resolve symbolically or stop with proof/diagnostic details. Full Gruntz remains deferred.
- Symbolic integration posture: current Calculus integration covers the agreed exact-rational and target-free symbolic Tier-I/Rubi surface, bounded Risch-Norman and Rothstein-Lazard-Rioboo-Trager heuristics, named special-function certificates, canonical genus-0/genus-1 algebraic slices, the July 4 recognition/readback fix for early textbook indefinite integrals, input-layer paste canonicalization for safe ASCII fractions/products plus textbook function powers, and the July 5 low-risk textbook unlocks for positive-discriminant improper rational division, reciprocal `3/2` radical templates, and affine hyperbolic square table forms. The Calculus benchmark scaffold is an indefinite-only integration corpus under `benchmarks/calculus-corpus/integration/`, with 550 Thomas/Finney unique cases, 17 duplicate sightings attached to canonical rows, app-level backend run records, Playwright visual-status run records, and validation coverage. Current next-350 evidence records 282 app-supported and 68 controlled unsupported rows with all 350 visually checked; `CALCULUS-INTEGRATION-LOWRISK-UNLOCKS1` adds post-fix backend and Playwright evidence for 17 formerly open findings. Broader textbook trig-identity cleanup, inverse-trig by-parts, affine trig-derivative by-parts, difference-root trig substitution variants, broad generic algebraic genus-1 coefficient solving, definite elliptic evaluation, and deeper benchmark hardening remain future.
- Algebraic roadmap/audit recovery: the genus-0 and genus-1 algebraic integration roadmaps plus the earlier docs-only algebraic audit artifacts are now tracked after Codex forgot to include them in their intended earlier roadmap/audit commits. These recoveries do not change runtime behavior.
- `ALGEBRAIC-DETAIL-CARD-NOTATION-NORMALIZATION1` starts the algebraic frontier batch by keeping generated algebraic detail cards notation-aware. Genus-1 named-root, Legendre normal-form, differential-basis, and elliptic-proof details now carry structured math/text parts through assumption/trust merging and Display render signatures, so proof cards honor the active math notation mode; Playwright evidence covers answer cards, facts, proof details, Copy Result, History replay, and overflow.
- `ALGEBRAIC-GENUS1-ROOT-LEGENDRE-DATA2` adds behavior-invisible exact-rational root Legendre readiness data for three-real-root cubics and four-real-root quartics. Root-based normal forms now carry preferred real branch, amplitude, parameter, multiplier, inverse-map, and first/second/third-kind basis evidence using named `\alpha_i` roots; one-real-root cubics remain explicitly deferred to an alternate complex-pair/root-chart lift and live integration behavior stays unchanged.
- `ALGEBRAIC-GENUS1-GENERIC-FIRST-KIND-LIVE1` makes the first generic exact-rational named-root genus-1 slice live: reciprocal cubic/quartic radicals with supported real root charts now return first-kind `EllipticF` answers through the existing `u-substitution` strategy, carrying the displayed preferred real branch, leading-coefficient-aware multiplier, named-root details, and exact proof evidence. Square-root/second-kind generic forms, alternate one-real-root cubic charts, and symbolic generic curves remain deferred to later frontier gates.
- Inserted prerequisite `ALGEBRAIC-GENUS1-LEGENDRE-CHANGE-OF-VARIABLE-PROOF1` makes the root-chart proof explicit before generic second-kind/rational-in-radical widening. Three-real-root cubic and four-real-root quartic Legendre data now carry substitution identities, inverse maps, radicand factorization, and first-kind kernel pullback evidence in a dedicated detail section; live coverage is unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-ROOT-BASIS-COEFFICIENT-OBLIGATIONS1` records test-facing root-field coefficient obligations before generic second-kind/third-kind widening. Three-real-root cubic and four-real-root quartic Legendre data now expose the named-root coefficient field, explicit first-kind coefficient, and second/third-kind coefficient templates without changing live dispatch.
- Inserted prerequisite `ALGEBRAIC-GENUS1-ROOT-PULLBACK-BASIS-PROFILE1` records behavior-invisible pullback basis profiles before generic second/third-kind adoption. Reciprocal radicals are marked first-kind-ready, radical pullbacks are marked coefficient-solve-required, and rational-in-radical pullbacks are marked Hermite-reduction-required; live dispatch remains unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-ROOT-BASIS-COEFFICIENT-SYSTEM1` records behavior-invisible finite coefficient systems for named-root Legendre pullbacks. Reciprocal radicals carry a solved first-kind coefficient, radical pullbacks expose first/second/third-kind unknowns, and rational-in-radical pullbacks expose rational/log residual plus elliptic-basis unknowns; live dispatch remains unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-ROOT-PULLBACK-RATIONAL-FORM1` records behavior-invisible rational pullback forms in the Legendre chart. Reciprocal radicals expose a constant first-kind coefficient, radical pullbacks expose the rational coefficient multiplying the first-kind kernel before F/E/Pi basis solving, and rational-in-radical pullbacks expose the Hermite-plus-elliptic rational coefficient; live dispatch remains unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-ROOT-PULLBACK-COEFFICIENT-SPECIALIZATION1` tightens that pullback evidence so radical and rational-in-radical coefficients carry the actual named-root first-kind multiplier instead of placeholder notation; live dispatch remains unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-ROOT-BASIS-COEFFICIENT-SOLVER1` adds behavior-invisible coefficient-solver evidence: constant first-kind pullbacks are marked live-adoptable, while radical and rational-in-radical pullbacks expose explicit elliptic-basis or Hermite proof obligations and remain non-adoptable.
- Inserted prerequisite `ALGEBRAIC-GENUS1-COMPLEX-PAIR-ROOT-CHART1` records behavior-invisible readiness for exact one-real-root cubic genus-1 radicals such as `sqrt(x^3+x+1)`: it names the real root, irreducible quadratic cofactor, real branch, and missing real Legendre chart data without changing live dispatch.
- Inserted prerequisite `ALGEBRAIC-GENUS1-COMPLEX-PAIR-LEGENDRE-DATA1` adds behavior-invisible first-kind Legendre descriptors for exact one-real-root cubic genus-1 radicals: beta/rho cofactor notation, A scale, amplitude, parameter, multiplier, and first-kind prototype while live dispatch remains unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-COMPLEX-PAIR-PULLBACK-BASIS-PROFILE1` threads one-real-root cubic Legendre data through root pullback basis, coefficient-system, rational-form, and solver evidence; live dispatch remains unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-COMPLEX-PAIR-CHANGE-OF-VARIABLE-PROOF1` adds behavior-invisible tan-half-angle substitution proof evidence for one-real-root cubic complex-pair charts; live dispatch remains unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-SECOND-KIND-DENOMINATOR-CLEARING-SURFACE1` records behavior-invisible denominator factors, clearing multiplier, and compact proof obligations for raw-radical second-kind matrix population. The cleared zero form stays unevaluated until a later bounded expansion and row-coefficient extraction gate; live dispatch remains unchanged.
- Inserted prerequisite `ALGEBRAIC-GENUS1-SECOND-KIND-ROW-COEFFICIENT-EXTRACTION1` adds behavior-invisible bounded cleared-zero-form expansion and row coefficient extraction for raw-radical second-kind matrix population. The surface handles three-real-root and complex-pair cubic charts, records row equations in `z`, uses named first-kind multiplier atoms inside the coefficient field, and keeps matrix population, solving, proof backcheck, and live EllipticE/Pi adoption blocked.
- Inserted prerequisite `ALGEBRAIC-GENUS1-SECOND-KIND-POPULATED-MATRIX-SURFACE1` adds behavior-invisible matrix entry and RHS population from the bounded row equations for raw-radical second-kind genus-1 readiness. Rows are split affinely over the existing unknown vector, row residual backcheck nodes are recorded, and symbolic solve, pivot facts, antiderivative proof backcheck, and live EllipticE/Pi adoption remain blocked.
- Inserted prerequisite `ALGEBRAIC-GENUS1-SECOND-KIND-SOLVE-BACKCHECK-SURFACE1` adds behavior-invisible solve/backcheck readiness for populated raw-radical second-kind matrices. The surface records parsed pivot candidates for each unknown column plus row residual backcheck nodes, but it does not solve coefficients or allow live adoption.
- Inserted prerequisite `ALGEBRAIC-GENUS1-SECOND-KIND-BOUNDED-SOLVE-ATTEMPT1` adds behavior-invisible bounded symbolic elimination attempts for raw-radical second-kind matrices. Three-real-root cubic raw radicals now stop with controlled coefficient-growth evidence, complex-pair cubics stop with a pivot-boundary trace, and live EllipticE/Pi adoption remains blocked until a solved vector is antiderivative-backchecked.
- `ALGEBRAIC-FUNCTION-FIELD-ORCHESTRATOR1` centralizes the late algebraic integration routing surface for existing genus-0 radical successes, genus-1 elliptic/Hermite successes, genus-2 hyperelliptic boundary stops, and deferred genus-1 boundary stops. Public strategy labels and result schemas stay unchanged; the orchestrator is an internal route coordinator, not a new algebraic solver.
- `ALGEBRAIC-GENUS1-BRANCH-CASEWISE-COVERAGE1` packages exact-rational genus-1 real-root branch facts as capped casewise coverage evidence. The surface records radicand sign rows, real-valued intervals, reciprocal endpoint exclusions, and selected-variable-safe details without changing live elliptic dispatch.
- `ALGEBRAIC-GENUS1-ELEMENTARITY-CERTIFICATE1` adds proof-context detail cards to accepted live genus-1 elliptic answers. Canonical F/E/Pi templates, named-root first-kind charts, complex-pair first-kind charts, and bounded Hermite reductions now explain that the displayed special-function antiderivative is non-elementary in the stated non-degenerate genus-1 elementary field, while degenerations and coefficient cancellations remain separate routes or controlled stops.
- `ALGEBRAIC-GENUS1-DEGENERATION-FALLBACK-LIVE1` makes a narrow repeated-root genus-0 fallback live for perfect-square quartic radicals whose square factor is provably nonnegative. Polynomial radicals collapse to genus-0 polynomial answers and reciprocal radicals collapse to rational answers with denominator exclusions; branch-changing squares such as `(x^2-1)^2` remain controlled boundary stops.
- `ALGEBRAIC-RISCH-PRACTICAL-CLOSEOUT0` closes the current algebraic frontier push as practical but not complete. The live surface is ready for benchmark-driven validation across Tier-I/RN/transcendental, genus-0, canonical genus-1, supported named-root first-kind, safe degeneration, and controlled boundary cases; broad generic second/third-kind coefficient solving and broad symbolic named-root adoption remain future.

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

Linear Algebra is the current known exception: Matrix/Vector have public mode facades and separate OOE identities, but app runtime still imports private `src/lib/linear-algebra/` editor-dispatch and named-value helpers. The future target is a public Linear Algebra runtime seam before adding `workspace-runtime-request-boundary` enforcement for this compartment.

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
