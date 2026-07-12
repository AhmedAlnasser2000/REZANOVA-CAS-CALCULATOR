# Current State

Last updated: 2026-07-12

## Purpose

This file is the live Calcwiz state map. It should describe what is true in the current repo, not retell every milestone that got us here.

Historical milestone detail belongs in the dated journals, session folders, and `.memory/research/milestones/current-state-milestone-archive-2026-06.md` or `.memory/research/milestones/current-state-milestone-archive-2026-07.md`. Do not rewrite historical records to remove old names; they are evidence. Do not present old compatibility names as active current behavior.

## Agent Ownership

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: terra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: terra
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: terra
- attribution_basis: live
- Current maintenance note: the July anti-regression program keeps this file as a current operating snapshot; stale July 1-or-earlier milestone detail remains in `.memory/research/milestones/current-state-milestone-archive-2026-07.md`.

## Active Context

- Workspace: `Calcwiz`.
- Live checkout: `/home/ahmed/Downloads/Calculator`.
- Git posture: local `main` is one commit ahead of `origin/main` at `NOTEBOOK-AUTHORING-KEYBOARD1` (`91e4fa42` over `f35d4164`). Concurrent Notebook canvas work and the structured-History result-contract lane remain dirty and are kept separate. This session did not push; no push is authorized, and untracked `test-results/` remains unrelated and excluded.
- Public identity posture: the primary public name is `REZANOVA CLASSWIZ CALCULATOR`; `Calcwiz` and `Classwiz` are friendly aliases only. Compatibility slugs such as `calcwiz-desktop`, `calcwiz_desktop`, and `com.ahmed.calcwizdesktop` remain unchanged unless a dedicated compatibility migration is approved.
- Public overview posture: current-facing docs should present the app as a Linux-first preview that is still advancing, with guided workspaces, Workspace Tabs, live Order of Execution traffic control, Formula Viewer, full Settings and History page surfaces, bounded Equation/Calculus progress, and English-only Language infrastructure. App-level Workspace Tabs stay top-anchored and outside calculator/page scaling; Settings and History page content honors UI scale and high-contrast settings. Full Settings now has premium app-page taxonomy, icon navigation, existing-control category segmentation, derived live preview, dynamic symbolic rewrite preview, and History row-notation controls; full History uses the full available app-stage width with a dense virtualized ledger, timeline rail, table-like columns, selected-result inspector, truthful local filters, selection-first interaction, and a separate LaTeX default for ledger rows. Graphing, Spreadsheet, full Variables pages, Surface Protocol mounting, plugins, external software development kit, Complex nonlinear numeric roots, Complex locus/set output, full Risch certificates, and Arabic/right-to-left localization remain future.
- Surface Protocol posture: the hostless spine now has DTO firewall, capability manifest, versioned error, read-only event adapter, pure query, conformance-test, policy/vocabulary registry, contract-fixture, and internal-agent spec foundations. Surface Protocol has a dedicated `src/lib/surface-protocol/` boundary with compact result DTOs, pure `DisplayOutcome` summary mapping, a Calculate/Equation-only manifest, supported-version helpers, structured errors, curated lifecycle DTO mapping from the Order of Execution event outbox, snapshot-input queries for current result summary, workspace info, and safe settings with optional angle unit only, `test:surface-protocol` boundary/serialization coverage, internal field/vocabulary policy registries that do not change response DTO shapes, canonical fixtures for manifest/current-result/safe-settings/lifecycle-event/failure outputs, and fixture-aligned docs. Host commands, mounting, History, Variables, Graphing, tabs, plugins, remote compute, raw event payloads, diagnostics, app-global state facades, Model Context Protocol adapters, and external software development kit work remain unavailable.
- Current development posture: architecture boundaries are now enforced by repo validators; new infrastructure should be demand-driven, not speculative.
- Release posture: `v0.2.0` is the current Linux-first early preview target. The repo release path covers AppImage, Debian/Ubuntu `.deb`, and RPM artifacts; native Arch packaging and full CAS parity are not claimed.
- Commit convention: `0` milestones are audit/docs/readiness only; implementation or behavior/editing milestones start at `1` or higher.
- Algorithm prerequisite policy: nontrivial algorithms must declare required representation, symbolic primitives, facts/assumptions, validation, route evidence, readback/presentation, and tests before implementation. Missing prerequisites must be built before or alongside the algorithm, or the algorithm must stop and record the gap.
- Visual verification policy: app-visible mathematical output gates must use Playwright to inspect the real rendered answer/error cards, facts, detail or boundary cards, and readability risks; unit tests alone are not enough.
- Anti-regression canary posture: `WORKSPACE-CANARY-SUITE1` defines a launcher-derived 19-case Playwright floor across Calculate, Equation, Calculus, Trigonometry, Geometry, Statistics, Matrix, Vector, and Table. The verified browser run passes 19/19 in 74.90 seconds. The separate Statistics guided-control gate now preserves raw dataset delimiters and non-first form focus; widening the shared canary from direct structured input remains part of the approved consolidation roadmap. Calculate exact inverse trig preserves bounded special values across DEG/RAD/GRAD, and the canary incident also closed exact Equation affine-root and Geometry circle-pi readback defects.
- Anti-regression runtime-probe posture: `WORKSPACE-RUNTIME-PROBE-REGISTRY1` defines one executable native OOE-facade probe for each of the same nine computational workspaces, with a committed count floor and explicit capability, primary/fallback host, request snapshot, runtime-shell, commit/stale, diagnostics, and History-ticket evidence. Statistics and Table also have direct worker tests; their intentionally different post-start failure policies remain preserved.
- Anti-regression CI posture: pull requests and `main` now run app identity, Surface Protocol, OOE, compartment, file-size, canary-registry, and runtime-probe gates. The independent Linux browser job runs all 19 workspace canaries plus the preserved 11-case Calculus smoke with retries pinned to zero, while Linux release runs the same required static gates and canaries before Tauri packaging. A validator ratchets workflow triggers, commands, ordering, browser independence, and zero-retry policy. The Incident Review supplemental repair recognizes the planner's canonical `\operatorname{abs}` form for the existing scoped Complex empty-set boundary; all 3,450 unit tests now pass.
- Anti-regression seam posture: `SEAM-IMPACT-SELECTOR1` classifies explicit paths, Git ranges, and GitHub pull-request or push events through a declarative registry, emits stable human or JSON plans, and may run only allowlisted additive contract suites. It never skips baseline CI. Matrix and Vector are distinct lanes with independent worker/fallback hosts; only genuinely shared Linear Algebra core and lifecycle-helper paths select both lanes.
- Anti-regression feature-probe posture: `FEATURE-PROBE-REGISTRY1` exhaustively classifies all 24 live `Settings` keys as semantic runtime, formatting, shell/accessibility, or persistence/privacy policy and ties every key to at least one executable native, component, or persistence test. `npm run test:feature-probes` is part of the local aggregate gate and pins DEG/RAD/GRAD inverse trig, exact/decimal output, notation/precision, scale/contrast, language, History privacy, and calculator-memory behavior; orphan catalog probes fail validation.
- Anti-regression print-hygiene posture: `PRINT-HYGIENE-BASELINE1` collects stable typed paths only from explicit mathematical `DisplayOutcome` fields and typed math detail parts, plus separate Table row cells. It hard-fails bounded `NaN`, `undefined`, internal-error, and `[object Object]` markers while allowing a Table cell whose complete value is `undefined`. The committed 43-case normalized manifest has at least two successful cases per workspace and can change only through an explicit acceptance command with a durable reason; it does not alter rendering, printing, or clipboard behavior.
- Anti-regression freshness posture: `WORKSPACE-FRESHNESS-REPORT1` scans dated session slugs through one alias registry, maps shared anti-regression/canary evidence to all nine workspaces and Linear Algebra evidence to Matrix plus Vector, and emits deterministic human or JSON status for an explicit `--as-of` date. Evidence older than 14 full days is stale; stale and missing are operational warnings with successful exit status. A Monday `03:17 UTC` workflow builds, runs all 19 Chromium canaries, and publishes reports without committing generated files.
- Anti-regression replay posture: `HISTORY-REPLAY-RATCHET1` is committed as `63d21229`. It freezes a version-1 computation/print-settings snapshot plus launch-time `Ans` when each pending History ticket is reserved, then attaches it only when that ticket commits. Legacy entries remain loadable and classify internally as nondeterministic. The native harness runs 100 sanitized versioned fixtures across all nine workspaces, hard-compares stable identity/cardinality, and reports normalized LaTeX drift without failing it. Weekly automation and relevant seam changes run the ratchet; the opt-in importer writes only ignored candidates under `.task_tmp/`.
- Presentation-roadmap posture: the Printer, Detail, and Clipboard program is complete and accepted at `bb6fc4ba`. The printer inventory is 519 result paths with zero compatibility, 277 migrated, and 239 forwarded; all 100 replay fixtures hard-compare normalized LaTeX. `HISTORY-PERSISTENCE-PARITY-CLOSURE1` is committed at `1e6e894f`: all 35 current `HistoryEntry` fields plus unknown extensions survive browser reload, Calculator Memory, Rust file restart, and an isolated real Tauri restart; failed appends retain the session row and show a durability warning. The user-approved inserted `RESULT-INTENT-DECLARATION-CLOSURE1` raises explicit live-detail coverage to 447/447, pairs every direct solve-summary assignment with typed parts, and proves no-guess compatibility projection across all 43 golden and 100 replay executions. The next named gate adds the bounded neutral canonical result document. No push is authorized.
- Latest CI cleanup posture: the July 6 CI repair gate clears the deprecated React `MutableRefObject` source usage, restores unit/UI/typecheck/lint/build/file-size gates, and adds an exp/log real-domain validation guard for generated same-base logarithmic candidates.
- Algorithm and presentation posture: Equation has live direct/rational-cleared Cardano and Ferrari, bounded Real and Complex wrapper families, compact-first Formula Viewer handling for dense formulas, and producer-side readback hygiene. Equation benchmark planning now has a runtime-free corpus ledger scaffold under `benchmarks/equation-corpus/` with unique-case, duplicate-case, run-result, and scan-finding ledgers plus a validator; duplicate source sightings attach to one canonical runnable case per sweep. The first OpenStax Algebra/Trig scan records 50 unique cases, zero duplicate sightings, and historical run/finding evidence. `EQUATION-CORPUS-ALGTRIG-FIX1` adds a post-fix run for the six scan findings, marking exact factorization, cancelled-hole exclusion, exact exponential inverse, quadratic-trig periodic output, and two trig special-angle readback findings fixed while preserving the original scan rows. Complex-On companion evidence is now a corpus policy for applicable canonical cases; the July 5 fix gate closes the 20 all-real companion findings, records 434 canonical companion runs with 415 supported, 19 controlled unsupported, and zero wrong-result rows, preserves periodic trig families under Complex On, adds positive numeric-base complex exp/log branches, and turns the scoped absolute-value boundary case into controlled empty-set evidence. The first Complex numeric roadmap gate adds optional ledger evidence for global-polynomial, bounded-region, symbolic-family, controlled-boundary, and locus-deferred scopes, with validator rules preventing bounded-region or locus evidence from overclaiming support. The July 6 polynomial hardening gate keeps the TypeScript Aberth-Ehrlich plus `decimal.js` backend and adds visible root-slot, backward-error, derivative, cluster, and pole-aware evidence without claiming formal Complex root certification. The July 6 branch-pullback gate lets Complex Region solve through direct or real-affine principal-branch pullbacks when mapped regions are safe, and fails closed with `branch-unsafe` evidence for unsupported composed carriers instead of crossing uncertain cuts. The July 6 contour-moment seed gate adds Equation-local Delves-Lyness moment seeds for safe one- or two-root cells after contour undercount, with visible moment diagnostics and final acceptance still gated by residual and contour agreement. The July 6 local-box validation gate adds Krawczyk-style contraction evidence for accepted simple Complex Region roots, while clustered or multiple roots remain inconclusive instead of receiving unique-root claims. The July 6 readback/guidance polish cleans Complex exact-square wrapper roots, zero-log preimage readback, no-region nonlinear guidance, plain `Re`/`Im`/`conj` editor hints, and simple locus meaning cards. Deferred areas remain Complex locus/set output, unrestricted generated wrapper formula expansion, broad `RootOf`/implicit-root display, persisted Display schemas, and formal full-CAS parity.
- Linear Algebra readback posture: Matrix and Vector remain separate workspaces with named-value libraries, natural result cards, and no automatic Equation routing. App-level `APPROX` cards are reserved for real numeric approximations; Matrix suppresses nonnumeric summary text and Vector filters nonnumeric summaries while keeping numeric scalar approximations.
- Linear Algebra input posture: successful Matrix/Vector editor parses canonicalize pasted list syntax and MathLive matrix variants into natural matrix/vector LaTeX for editor, preview, history, and replay; keyboard paste and app `Paste` naturalize supported friendly list imports immediately before Run, while raw list syntax remains import-only and malformed paste stays editable for controlled Run errors. Matrix typed editor expressions can compose arbitrary named or inline matrices before routing into existing Matrix operations. Exact `profile(...)` now presents a Matrix as a linear map through 6 by 6 with domain/codomain dimensions, rank-nullity, kernel, image, pivots, one-to-one/onto reasons, square-only determinant/invertibility facts, and collapsed RREF evidence; rectangular maps explicitly treat invertibility as not applicable. Vector typed editor expressions can compose arbitrary named or inline vectors for add/subtract, exact numeric scalar multiplication and division, negation, norm/unit/angle/Gram-Schmidt, general `proj(base,target)`, exact 3D cross product, scalar triple product, and variadic `span(...)` or `independent(...)`. Span/independence accepts one through six exact vectors of length at most six, selects basis vectors from original pivot inputs, and provides one exact dependence relation when needed through Matrix-owned column-family/RREF analysis. Finite decimal coefficients are preserved as rational sidecars; symbolic coefficients and invalid vector/scalar division forms stop explicitly. Soft F-keys remain active Left/Right or First/Second shortcuts only. The named-value libraries have readable dark controls, active operand badges, insert-name-to-editor buttons, and large-grid card layout polish. Structured Linear Algebra answer rows may improve display readability while `exactLatex` remains the copy/export truth.
- Linear Algebra runtime seam posture: Matrix and Vector keep separate OOE identities through `linearAlgebra.matrix` and `linearAlgebra.vector` and now use independent runtime topology. Matrix selects `matrix-worker-runtime` with `matrix-runtime` fallback and `matrix-worker-shell`; Vector selects `vector-worker-runtime` with `vector-runtime` fallback and `vector-worker-shell`. Each owns its worker entrypoint, thin client, lifecycle evidence, probe identity, and seam lane while sharing only the unchanged lifecycle ritual and reusable exact math cores. App-facing dispatch, paste canonicalization, active-operand request construction, named snapshots, and Equation handoff types remain exposed through `src/lib/linear-algebra/runtime-request.ts`; request/replay schemas, History, stale/cancel rules, and commit legality did not change.
- Linear Algebra dimension posture: one shared contract distinguishes visual editing from exact execution. Matrix editing accepts 1 by 1 through 8 by 8 and Vector editing accepts length 1 through 8; exact elimination/rank/RREF routes stop above 6 by 6, exact editor arithmetic remains bounded at 8, single-RHS and multi-RHS augmented profiles retain their existing 7 and 12 limits, the current spectral V1 profile remains 2 by 2, exact powers retain absolute exponent 12, and exact scalar growth retains the existing absolute guard of 1,000,000,000. Over-cap work returns a controlled stop and never silently changes from proof-grade exact algebra to approximate computation.
- Equation history replay posture: new Equation history entries persist an internal `equationSeed` for guided route restoration and `systemReadback` for structured system-answer replay, so Polynomial/Simultaneous screens restore their original controls and clean answer rows instead of falling back to Symbolic-result guessing.
- Workspace and page-surface posture: app-level Workspace Tabs, same-tab retargeting, quick side inspectors, singleton Settings/History pages, and Formula Viewer are live. Quick inspectors stay calculator-only; full management/canvas surfaces belong outside the calculator shell. Graphing, Spreadsheet, full Variables pages, saved-work/project management, export/import, artifact history, and Formula Viewer-from-record actions remain deferred.
- Guide and Notebook education-platform posture: Guide is a singleton app-level page surface outside the calculator shell, with existing reference/example content rehosted through the page-surface model and null Order of Execution runtime context. Notebook remains a document-tab app page with null Order of Execution runtime context. Its rich-authoring foundation now includes an app-owned version-2 document tree, loss-preserving version-1 migration, four starter-template contracts, exact-pinned permissively licensed Tiptap foundations, and an asynchronous persistence port with an in-memory contract adapter only. Existing Notebook math fields now use a Notebook-owned wrapper and active-field coordinator: inline/display ownership is explicit, MathLive keyboard policy is manual, the blue built-in keyboard control is hidden only inside Notebook, focus-safe field commands are available, and global keyboard layouts stay untouched. The verified custom authoring keyboard adds a Notebook-only adaptive dock, a compact floating template toolbar, curated searchable subject tabs, and explicit authoring-runnable versus document-only safety classification without changing calculator MathLive layouts. The page remains on its version-1 session draft until the canvas gate adopts version 2; durable local storage waits for a separate Notebook persistence milestone. Teacher/community packages, import/export, in-notebook solving, History insertion, grading, cloud/community hosting, Graphing, Spreadsheet, Model Context Protocol work, and Surface Protocol widening remain future.
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
- Limits frontier symbolic-asymptotic posture: the frontier arc now has Limits-owned asymptotic term/series and conditional-case infrastructure plus live finite recursive leading-term, infinity-scale, rewrite/cancellation-spine, Piecewise branch-selection, absolute-value side-behavior, MRV-lite, narrow complex principal-branch proof routes, conditional symbolic infinity leading-coefficient cases, and explicit route-orchestration fallback policy. The finite route preserves target-free symbolic coefficients and exact finite answers for local carriers, products, quotients, integer powers, sums/cancellations, and selected standard compositions; it also has a capped symbolic local-series fallback through Taylor order 10 for cancellation cases such as `(sin(a*x)-a*x)/x^3`, `(tan(a*x)-a*x)/x^3`, and `(e^(a*x)-1-a*x)/x^2`, while refusing invalid log-series expansion when the log argument is not `1 + small`. The infinity-scale route compares numeric-coefficient powers/roots, scaled logarithms such as `log(2x)`, logarithms of power/root/exponential scales, iterated logarithms, linear exponentials, products, quotients, dominant sums, and real-valid square-root ratios at negative infinity before L'Hospital or numeric fallback, and narrow symbolic polynomial-scale infinity cases such as `a*x`, `b*x^2+a*x`, `b*x^2+a*x+c`, and `a*x^2+3*x` now branch on coefficient sign/zero fallthrough through the case surface, including target-free constant and lower numeric-growth fallthrough rows when higher symbolic coefficients vanish. The rewrite/cancellation spine centralizes finite common-denominator rewrites, positive-infinity radical conjugates, and safe log/power transforms before retrying existing leading-term or scale routes. Limit readback now renders small conditional case answers directly as `L = cases` up to six rows, keeps larger case answers in the compact viewer, deduplicates repeated proof rows, and keeps rewrite/equivalent method text from collapsing into glued math artifacts. The Piecewise route supports friendly `piecewise(...)` and LaTeX `cases` input with simple comparison and chained linear-interval conditions such as `0 <= x < 5`, finite-side and infinity-side branch selection, existing branch evaluators, and left/right disagreement proof cards; the guided Limit row editor now keeps only the `Piecewise` keypad entry, preserves condition spacing while typing, canonicalizes approach-field infinity spellings, maintains active-row focus, supports whole-block removal, and keeps drag/reorder cleanup local to the row editor. The absolute-value route supports affine carriers such as `|x|/x`, `|x-a|/(x-a)`, and `|x-a|` with one-sided sign proofs and two-sided disagreement stops. The MRV-lite route supports capped positive-infinity exponential/logarithmic scale comparisons such as `e^{sqrt(x)}/e^x`, `e^{sqrt(x)}/x^5`, `e^{x+log(x)}/(x e^x)`, and `e^{log(x)^2}/x^5`. Complex On can prove recognized principal square-root boundary carriers such as `sqrt(x)`, `sqrt(x+1)`, and `sqrt(x^2+x)-x`; Real-mode domain stops now append compact `Domain Proof` detail cards when one side is outside the real domain. Numeric fallback is intentionally narrow: direct substitution and finite-pole side-evidence routes may use it, while exact symbolic/proof routes must resolve symbolically or stop with proof/diagnostic details. Full Gruntz remains deferred.
- Latest Limits frontier gate: `CALCULUS-LIMITS-GRUNTZ-CORPUS-HARDENING1` seeds the durable Limits corpus with Gruntz finite-bridge rows for right-hand, left-hand, and two-sided-disagreement `exp(1/x)` cases, allows `gruntz` as a corpus route expectation, and verifies route/detail evidence through the ledger harness. Gruntz remains a controlled Limit route after exact/domain/piecewise/abs/specialized symbolic routes and before numeric fallback for scale/indeterminate cases; full unrestricted Gruntz and large PDF/site corpus ingestion remain future. `npx tsc -b --pretty false` remains blocked by unrelated Equation complex-locus work.
- Symbolic integration posture: current Calculus integration covers the agreed exact-rational and target-free symbolic Tier-I/Rubi surface, bounded Risch-Norman and Rothstein-Lazard-Rioboo-Trager heuristics, named special-function certificates, canonical genus-0/genus-1 algebraic slices, the July 4 recognition/readback fix for early textbook indefinite integrals, input-layer paste canonicalization for safe ASCII fractions/products plus textbook function powers and supported inverse-trig/hyperbolic function names, the July 5 verified indefinite-integration presentation layer for parseable `+C`, one-expression answer rendering, canonical Copy Result/To Editor LaTeX, and the July 6 exponent-paste/readability fix for grouped fractional exponents and unambiguous fractional-power antiderivative display, the July 5 low-risk textbook unlocks for positive-discriminant improper rational division, reciprocal `3/2` radical templates, and affine hyperbolic square table forms, bounded IBP gaps for polynomial-times `arctan(x)`/`arcsin(x)` and affine-polynomial `sec^2(ax+b)`/`csc^2(ax+b)` rows, plus the July 6 next400 gates for performance-boundary hygiene, small log/arcsec/hyperbolic/affine-IBP templates, affine squared-carrier trig-substitution root templates, and bounded textbook trig-power reductions. The Calculus benchmark scaffold is an indefinite-only integration corpus under `benchmarks/calculus-corpus/integration/`, with 950 unique cases, 50 duplicate sightings attached to canonical rows, app-level backend run records, Playwright visual-status run records, and validation coverage. The original next-350 survey recorded 282 app-supported and 68 controlled unsupported rows with all 350 visually checked; the July 5 low-risk and IBP gates added backend plus Playwright evidence for 31 formerly open findings, and the July 6 regenerated next400 promotion recorded 384 supported rows, 16 controlled unsupported rows, 0 timeouts, and 400 visually checked rows. Broader symbolic trig-identity cleanup, affine arcsin recurrence widening, polynomial-times affine `sec^2`/`csc^2` residual-log IBP coverage, difference-root trig substitution variants, broad generic algebraic genus-1 coefficient solving, definite elliptic evaluation, and deeper benchmark hardening remain future.
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
- Surface Protocol now has a hostless internal spine for future external integration contracts, while host mounting, adapters, commands, plugins, and external software development kit work remain future.

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

Linear Algebra follows the same public-request posture through `src/lib/linear-algebra/runtime-request.ts`. Matrix and Vector retain separate capability IDs, replay seeds, visible workspace identities, request ownership, and independent worker/fallback hosts while sharing only their approved math cores and lifecycle ritual. App runtime and workspace UI must use the public facade instead of importing private parser, named-value, or handoff internals.

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

The user-approved anti-regression program is complete and accepted. Its governance prerequisite, four Incident Closure moves, mandatory user review, Linear Algebra topology transition, and five Behavioral Ratchets are committed; Statistics guided-control defects stayed outside the program.

Program sequence and acceptance details live in `.memory/research/roadmaps/anti-regression-nine-move-roadmap.md` and `.memory/research/roadmaps/printer-detail-clipboard-roadmap.md`; both programs are complete and accepted. The active follow-up is `.memory/research/roadmaps/history-display-contract-roadmap.md`. History persistence parity is committed, and the approved result-intent prerequisite closes the no-guess projection gap before canonical documents land; Notebook files remain outside this agent's lane. The next work adds the canonical result document, then structured History, Equation carrier separation, risk-sliced producer migration, and Display/consumer inversion with zero intentional mathematical drift. No push is authorized.

Outside that approved program, prefer product-facing or correctness work over more infrastructure. Good next lanes should come from real pressure:

- App shell component pressure.
- Navigation/Input/keypad/editor breadth.
- Table growth.
- Solver correctness, domain facts, and display fidelity.
- Future graphing only after a concrete product plan consumes validated solver/domain/branch state.

Stop if a proposed follow-up creates a broad bus, runtime registry, plugin layer, Surface Protocol, command authority, source generator, new execution authority, or graphing compartment without a concrete need.
