# REZANOVA CLASSWIZ CALCULATOR App Summary

## Snapshot
- Date: 2026-07-05
- Context: public overview catch-up after app-level Workspace Tabs, Settings and History full page surfaces, the singleton Guide page, hostless Surface Protocol foundations, Formula Viewer hardening, Statistics Guide visibility, bounded Equation/Calculus progress, and the English-only Language foundation.
- Identity: the primary public name is `REZANOVA CLASSWIZ CALCULATOR`. `Calcwiz` and `Classwiz` are friendly aliases only.

## Product State
- REZANOVA CLASSWIZ CALCULATOR is a Linux-first Tauri desktop math workbench with React/TypeScript UI, Rust/Tauri desktop integration, MathLive input/rendering, and repo-owned validation.
- It is an early preview, not a production-stable full computer algebra system.
- The app is still advancing quickly. Current symbolic and numeric coverage should be described as bounded, explicit, and evidence-backed rather than universal.
- The launcher and tab surface organize dedicated workspaces for Calculate, Equation, Calculus, Trigonometry, Geometry, Statistics, Matrix, Vector, Table, Guide, Settings, History, and Variables.
- Workspace Tabs are live session-scoped workspace instances. They organize current work, calculator workspaces, and singleton app page surfaces; they are not a document/project file system.
- Settings and History now have singleton full-page app surfaces outside the calculator shell. Their quick inspectors remain calculator-side fast access surfaces, not replacements.
- Guide is a singleton app-level page surface with in-app help, search, symbol lookup, mode guidance, and examples. Statistics is intentionally Guide-visible.
- Order of Execution is live runtime traffic control for launches, host selection, cancellation, stale-result gates, commit legality, diagnostics, and history tickets.
- Formula Viewer is live for dense current-result formulas, especially huge Cardano/Ferrari-style output, with virtualized rows and reveal controls for heavy formulas.
- The hostless Surface Protocol spine exists as infrastructure for Calculate and Equation result summaries, lifecycle events, safe settings summaries, policy/vocabulary registries, fixtures, and internal spec examples. Mounting, host commands, adapters, plugins, and external software development kit work remain future.
- The Language foundation is present as English-only infrastructure. Arabic and right-to-left localization remain future work.

## Current User-Facing Capabilities
- Calculate evaluates expressions, runs simplify/factor/expand actions, handles `Ans` and finite stored numeric values, and keeps bound/active variables protected in supported workflows.
- Equation supports explicit selected targets beyond `x`, including case-sensitive single-letter targets and explicit named targets through `@name` / `var(name)`.
- Equation keeps non-target symbols symbolic, avoids silent symbolic stored-value substitution, and shows target/parameter policy in hints and details.
- Equation exact solving covers many bounded selected-target families, including affine/linear, quadratic, rational, factorable polynomial, direct cubic/quartic, carrier, exp/log, trigonometric, composition, wrapper, mixed algebraic, same-argument mixed trigonometric, and compact periodic preimage families.
- Equation Complex Exact is real current functionality for bounded exact families, including direct Cardano/Ferrari paths and compact Complex wrapper/root-power routes. Complex numeric roots and Complex absolute-value locus/set output remain future work.
- Equation numeric work is explicit and local. Numeric Interval Solve is manually available for selected-target symbolic inputs, periodic/dense-root fallbacks ask for finite real windows, and large interval root lists are capped with narrowing guidance.
- Calculus has guided derivative, derivative-at-point, first-order partial derivative, integral, limit, Taylor/Maclaurin, and differential-equation workflows.
- Calculus has bounded app-owned symbolic integration progress: direct and rule-based routes, guarded Risch-Norman adoption, bounded Rothstein-Lazard-Rioboo-Trager rational integration, named special-function certificates, and narrow proof-backed non-elementary certificate families. This is practical progress, not a full Risch implementation or a full certificate system.
- Calculus limit work includes bounded route-owned exact/proof progress, finite/infinity route handling, Piecewise branch selection, absolute-value side behavior, and MRV-lite pre-Gruntz support. Full Gruntz and broad theorem proving remain future.
- Trigonometry, Geometry, Statistics, Matrix, Vector, and Table keep guided domain workflows rather than collapsing into one generic input box.
- Statistics includes dataset/frequency workflows, descriptive summaries, bounded probability tools, one-sample mean inference, and regression/correlation quality summaries.
- Variables remain finite real stored numeric values with insert/edit/clear controls and visible substitution policy. A full Variables page remains future.
- Settings has a full page with current controls, category navigation, live preview, page-scale/high-contrast behavior, and History notation preferences.
- History has a full page with a virtualized ledger, timeline grouping, search/filtering, selected-result details, and bounded row rendering.
- Guide provides a singleton page for examples, search, symbols, mode guidance, and current Statistics-visible guidance.

## Internal Architecture Status
- `src/lib/kernel/*` owns capability, runtime-host, execution-profile, runtime-policy, and envelope metadata.
- `src/lib/ooe/*` owns Order of Execution runtime traffic control and diagnostics.
- `src/lib/equation/*` owns selected-target, exact, numeric, wrapper, periodic, and guarded solving helpers.
- `src/lib/calculus/*` owns Calculus workflows, symbolic differentiation/integration adapters, derivative operator state, and integration strategy boundaries.
- `src/lib/display/*` and app display surfaces own formula rendering policy, compact result handling, and Formula Viewer behavior.
- `src/lib/surface-protocol/*` owns the hostless Surface Protocol DTO/query/event/policy/fixture boundary. It is infrastructure only; it is not mounted to a website or external host yet.
- `src/lib/language/*` owns the English-only Language foundation and localization boundaries.
- Internal exact algebra substrates and shared symbolic primitives exist for bounded backend use, but product-facing polynomial systems and broad elimination workflows remain future.
- Source mirrors and area studies remain research context only; stable product code must not depend on mirror source trees.

## Active Boundaries
- No full Mathematica, Maple, SageMath, FriCAS, or industrial computer algebra parity claim.
- No raw multi-letter variable parsing: `mass` is adjacent multiplication where parseable; one named variable requires `@mass` or `var(mass)`.
- No Equation symbolic stored-value substitution.
- No Graphing workspace yet.
- No Spreadsheet workspace yet.
- No Notebook, teacher/community package, or import/export package system yet.
- No website mount, Surface Protocol host mount, Model Context Protocol adapter, plugin system, remote compute system, or external software development kit yet.
- No Complex numeric root solver and no Complex absolute-value locus/set output yet.
- No full Variables management page yet.
- No full Risch certificates, broad Risch-Norman completeness, or broad Rothstein-Lazard-Rioboo-Trager algebraic-log coverage yet.
- No Arabic or right-to-left localization yet.

## Validation Posture
- Public release language is guarded by README, release docs, pillars, memory-protocol checks, app-identity checks, and CI gates.
- Core validation uses unit tests, UI tests, golden tests, memory-protocol checks, lint, build, and Rust `cargo check`.
- `npm run test:gate` remains the strongest single local validation command.
