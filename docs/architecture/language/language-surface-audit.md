# LANGUAGE-SURFACE-AUDIT0

Date: 2026-06-19

Status: initial repo-grounded audit. Docs/memory only; no runtime, schema, solver, Display, OOE, or UI behavior changes.

## Purpose

Map the live user-facing text surfaces before any Language compartment implementation. The goal is to classify ownership and choose a safe migration order, not to translate the app or rewrite display/readback wording now.

## Audit Inputs

Sampled live source surfaces:

- app shell: `src/app/shell/ModeStrip.tsx`, `WorkspaceTabs.tsx`, `LauncherWorkspace.tsx`, `DisplayPanel.tsx`, and display-panel subcomponents
- side panels: `src/components/SettingsPanel.tsx`, `HistoryPanel.tsx`, `VariablesPanel.tsx`, `OoeDiagnosticsPanel.tsx`, `LabsPanel.tsx`
- navigation metadata: `src/lib/navigation/launcher.ts`, `src/lib/modes/calculate-navigation.ts`, `src/lib/equation/equation-navigation.ts`, `src/lib/calculus/workspace/navigation.ts`, `src/lib/statistics/navigation.ts`, `src/lib/geometry/navigation.ts`, `src/lib/trigonometry/navigation.ts`
- display helpers: `src/lib/display/result/display-blocks.ts`, `result-detail-lines.ts`, `result-readback.ts`
- runtime/status helpers: `src/app/runtime/useHistoryDisplayRuntime.ts`, `useDisplayRuntimeStatus.ts`, `runtimeElapsedTime.ts`, `launchWorkspaceRuntimeJob.ts`
- product content and readback surfaces: `src/lib/guide/content/**`, `src/lib/guide/symbols.ts`, `src/lib/algebra/**`, `src/lib/equation/**`, `src/lib/calculus/**`, `src/lib/statistics/**`, `src/lib/geometry/**`

The repo contains hundreds of user-facing strings across these areas, so the first implementation must be a pilot, not a whole-app migration.

## Current Surface Map

### App Shell

Examples:

- `ModeStrip`: `Guide`, `Settings`, `Vars`, `Auto Eq On`, `Complex On`, `Show Hist`, `Desktop runtime`
- `DisplayPanel`: `Run`, `Stop`, `Restart Editor`, `Ready`, `Rendering result`, `Loading...`
- `LauncherWorkspace`: `Open in new tab`, `Open Here`, `Open in New Tab`
- `WorkspaceTabs`: `Rename`, `Duplicate`, `Close Others`, `Clear Tab State`, `Stop Jobs in This Tab`, active-job close confirmation text

Target ownership:

- Language owns labels, button text, tooltips, empty states, and confirmation prose.
- App shell keeps behavior, tab action policy, focus routing, and event handling.
- Workspace tab titles generated from workspace kind should eventually use language workspace labels, but custom user tab titles remain user data and should not be translated.

Recommended pilot:

- Start with shell and tab labels after foundation because the strings are visible, low-risk, and mostly not solver-contract text.

### Settings, History, And Variables

Examples:

- `SettingsPanel`: section titles, setting labels, helper paragraphs, preview labels, reset actions, option labels.
- `HistoryPanel`: `History`, `Clear`, `Close`, `Running`, `Stopping`, `Replay`, `Answer`, `Approx`, `Domain`, `Valid when`, empty-state text.
- `VariablesPanel`: `Variables`, `Name`, `Value`, `Set`, `Insert`, `Edit`, `Clear`, validation/status prose such as stored/inserted messages.

Target ownership:

- Language owns prose and labels.
- App-state owns setting values and persistence.
- History schema should not change for localization; stored entries should persist math/result data, not rendered-language copies.
- Runtime durations should stay numeric metadata; labels around them are language-owned.

Migration caution:

- Settings is tempting but should probably follow the shell pilot because it touches app-state reset and persisted defaults once language preference is added.

### Navigation Metadata

Examples:

- Launcher category/app labels and descriptions.
- Mode soft actions such as `Open`, `Guide`, `Back`, `Evaluate`, `History`, `Send Eqn`.
- Route metadata for Calculate, Equation, Calculus, Trigonometry, Statistics, and Geometry.

Target ownership:

- Language should eventually own labels/descriptions/help text.
- Navigation should continue to own ids, targets, hotkeys, focus targets, screen kinds, and route structure.
- Do not translate stable ids, capability ids, mode ids, screen ids, or hotkey values.

Migration order:

- Route metadata can move in slices by surface. Avoid one giant migration of every mode navigation file.
- Soft-action labels are a strong early candidate because they are shared commands.

### Display Result Surface

Examples:

- `DisplayOutcomeShell`: result titles, action labels, `Resolved form`, `Transform`, `Solve note`, `Numeric method`, `Copy Result`, `To Editor`.
- `DisplayResultBlocks`: large-result pauses, `Show full result`, `Show remaining branches`, loading labels.
- `display-blocks`: `Answer`, `Valid when`, `Warnings`, `Error`, `Representative Branches`, `Principal Range`, `Suggested Intervals`, `Exact Closure Boundary`.
- `result-detail-lines`: already supports mixed text/math parts through `DisplayDetailLinePart`, `textPart`, `mathPart`, and `mixedDetailSection`.

Target ownership:

- Language owns result section labels and ordinary prose.
- Display owns math rendering, MathNotation, result block scheduling, large-result responsiveness, and mixed text/math rendering.
- Existing Display mixed-line helpers are the correct seam to extend for notation-aware display text.

Migration caution:

- Do not make Language render math.
- Do not change exact LaTeX, copy/to-editor payloads, result block scheduling, or branch metadata during language foundation.

### Runtime Status And Errors

Examples:

- `Computing`, `Stopping`, `Ready`, runtime elapsed labels.
- Runtime loading failures such as `Could not load the Calculus runtime`.
- Stop/cancel status overrides such as `Calculus evaluation stopped`.

Target ownership:

- Language owns labels and user-facing status prose.
- OOE and app runtime keep launch, cancellation, stale gates, commit/drop legality, host routing, and diagnostics authority.
- Runtime helpers should not import language packs directly if that would couple launch semantics to UI text.

Recommended approach:

- Keep runtime semantic state structured where possible, then format user-facing labels near the shell/display boundary.

### Solver, Readback, And Product Errors

Examples:

- Algebra/Equation/Calculus/Statistics/Geometry produce `DisplayOutcome` titles, warnings, errors, detail-section titles, and readback lines.
- Some current solver/readback messages still include internal milestone names such as `EQUATION-PARAM*` in source strings.
- Variable-memory validation and named-variable guidance produce user-facing errors.

Target ownership:

- This is not a good first migration target.
- Future work should decide whether solver outputs expose stable message codes plus data, or whether bounded producer-owned text stays English until a later readback-localization pass.
- Display should keep rendering structured math/prose faithfully regardless of language.

Migration caution:

- Solver wording is often part of behavioral trust and test expectations. Do not rewrite it casually.
- Do not add language work to a solver capability milestone unless the milestone is explicitly readback/localization scoped.

### Guide, Labs, And Diagnostics

Guide:

- Guide content is large, article-like, and full of math examples.
- It should not be part of the first language pilot.
- Later work may split Guide metadata from article content so the shell can localize titles before full article translation.

Labs:

- Labs is dev/incubation content. Keep English-only until a concrete need appears.

Diagnostics:

- OOE diagnostics and compartment diagnostics are developer-facing.
- They can remain English longer than product shell/history/settings text.
- Diagnostics should still avoid hardcoding user-visible product claims in deep runtime code.

## ASCII Math And Mixed Prose Findings

The scan found several categories:

- editable examples/placeholders such as `x^2`, `ax^2+bx+c=0`, and `sin(x^2)`;
- keyboard labels such as `d/dx` and `pi r^2`;
- explanatory prose with inline ASCII math such as `l^2 = r^2 + h^2`, `sin^2(theta)`, `r^2`, and `1×10^-150`;
- detail/readback lines that combine prose with generated equations.

Classification:

- Editable examples and placeholders can remain raw input examples until a specific UX pass chooses rendered examples.
- Keyboard labels may intentionally be compact and symbolic.
- Explanatory prose with math should eventually move to structured display text when shown in Display/result/workspace cards.
- Generated equations and exact result fragments remain math data and should flow through Display notation helpers.

Existing seam:

- Display already has `DisplayDetailLinePart` and mixed detail sections. Future `DISPLAY-TEXT-NOTATION-SEAM1` should build on that instead of inventing a parallel token renderer.

## Proposed Migration Order

Dedicated roadmap:

- `.memory/research/roadmaps/language-roadmap.md`

1. `LANGUAGE-COMPARTMENT-FOUNDATION1`
   - English-only typed language contract.
   - Fallback behavior and validation.
   - Metadata with `ltr`/`rtl`.
   - Interpolation helper.
   - No settings UI, broad migration, or translation.

2. `LANGUAGE-SHELL-PILOT1`
   - Mode strip, launcher labels/actions, workspace tabs, common commands.
   - Keep all ids, hotkeys, actions, and runtime behavior unchanged.

3. `LANGUAGE-SETTINGS-SEAM1`
   - Add `settings.language` or equivalent preference with English fallback.
   - Reset returns to English.
   - Invalid persisted values fall back through schema/default handling.

4. `LANGUAGE-PANELS-PILOT1`
   - Settings, History, Variables panel labels and empty states.
   - No history schema migration.

5. `DISPLAY-TEXT-NOTATION-SEAM1`
   - Structured prose/math tokens for display cards and selected result details.
   - Use existing Display mixed-line helper patterns.

6. Later Guide/solver/readback passes
   - Guide metadata before article translation.
   - Solver/readback only after a dedicated message-code or producer-text policy decision.

## Boundaries

Do not include in the first language foundation:

- broad translation;
- Arabic content pack;
- RTL layout overhaul;
- Guide article rewrite;
- solver wording rewrite;
- Display math renderer changes;
- History schema changes;
- OOE event schema changes;
- Graphing, Spreadsheet, projects, plugin packs, or distro systems;
- broad bus, registry, code generator, or new runtime authority.

## Open Design Questions

- Should dynamic strings use function-based typed entries or placeholder strings with a typed interpolation helper?
- Should the first persisted setting be named `language`, `locale`, or `languageCode`?
- Should solver/readback localization use stable message codes plus data, or keep producer-owned English text until a later bounded readback pass?
- Which surface should follow the shell pilot: Settings, History, or Display result labels?
- How far should RTL application go around MathLive and rendered math before Arabic content exists?

## Verification

This audit is docs/memory-only. Verification should be:

- `npm run test:memory-protocol`
- `git diff --check`

No TypeScript, lint, UI, build, or browser gates are required until an implementation milestone touches `src/`.
