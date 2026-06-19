# Language Compartment Roadmap

date: 2026-06-19
primary_agent: codex
primary_agent_model: gpt-5
status: planning roadmap after `LANGUAGE-SURFACE-AUDIT0`

## Purpose

This roadmap turns the Language compartment decision and `LANGUAGE-SURFACE-AUDIT0` into a safe implementation sequence.

Language is product-text infrastructure for Calcwiz. It should make user-facing prose, labels, commands, direction metadata, interpolation, fallback, and future language packs governable without moving math rendering, solver behavior, OOE authority, or Guide content into a single translation monolith.

The roadmap is deliberately staged. The first implementation should prove the contract with English-only surfaces before adding a persisted language setting, broad migration, Arabic/RTL layout work, or solver/readback localization.

## Current Baseline

Current repo facts:

- English strings are scattered across app shell JSX, side panels, workspace tab actions, launcher rows, mode navigation metadata, Display result blocks, runtime status helpers, Guide content, Labs catalog text, diagnostics panels, and solver/readback helpers.
- `Settings` and `settingsSchema` already provide a typed default/persistence seam, but no language setting exists yet.
- Display notation already lives under `src/lib/display/notation/`.
- Display result details already support structured mixed text/math parts through `DisplayDetailLinePart`, `textPart`, `mathPart`, and `mixedDetailSection`.
- OOE and app runtime own launch, cancellation, stale gates, host routing, diagnostics, and commit/drop legality. They should not become translation owners.
- Guide content is large and article-like, so it should not be part of the first migration wave.

Authoritative audit/memory records:

- `docs/architecture/language/language-compartment-display-text-memory.md`
- `docs/architecture/language/language-surface-audit.md`

## Locked Product Decisions

- English is the safe default/fallback language.
- Reset, invalid persisted language values, missing language resources, missing keys, and validation failures must fall back to English.
- Language owns prose, labels, common commands, metadata, and interpolation.
- Display owns math rendering, MathNotation, symbolic display preferences, and mixed text/math rendering.
- RTL language metadata must not blindly change math semantics, LaTeX semantics, MathLive behavior, or formula layout.
- Custom user data such as renamed workspace-tab titles should not be translated.
- Stable ids, mode ids, screen ids, capability ids, history ids, OOE ids, and hotkeys are not translatable labels.
- The first implementation is English-only foundation plus narrow pilot, not whole-app translation.
- Solver/readback text is not a first-wave migration target because it carries correctness/trust expectations and many tests.

## Non-Goals

This roadmap must not smuggle in:

- full-app translation;
- Arabic content pack before RTL foundation;
- Guide article translation or broad Guide rewrite;
- plugin/language-pack marketplace;
- external localization platform;
- distro build system;
- Graphing or Spreadsheet;
- History schema rewrites for localized strings;
- OOE event schema rewrites;
- solver behavior or solver wording changes outside dedicated readback/localization milestones;
- broad event bus, command bus, code generator, runtime registry, Surface Protocol, or new runtime authority.

## Target Shape

The final shape can change during implementation, but the intended district boundary is:

```text
src/lib/language/
  types.ts
  registry.ts
  fallback.ts
  interpolate.ts
  direction.ts
  validation.ts
  languages/
    en/
      shell.ts
      workspaces.ts
      settings.ts
      history.ts
      variables.ts
      diagnostics.ts
      display.ts
      guide.ts
      errors.ts
      index.ts
```

The root public seams should be small. App shell/components should consume a language read API or hook. Deep runtime, OOE, and solver internals should not import language packs directly.

## Contract Principles

### Typed English Source

English should be the canonical contract. Other language modules should satisfy the same shape so missing keys fail early.

The default language should delegate to English instead of copying it, so fallback strings cannot drift from the source.

### One Interpolation Convention

`LANGUAGE-COMPARTMENT-FOUNDATION1` chooses function-based typed entries, such as `closeTab(title: string): string` and count-based title helpers. Do not mix manual concatenation, template literals, and multiple placeholder systems across migrated surfaces.

### Direction Metadata

Each language should carry metadata:

```ts
type LanguageMetadata = {
  code: string;
  label: string;
  direction: 'ltr' | 'rtl';
};
```

The app can later apply direction at shell boundaries, but editor/display/math surfaces need local decisions. RTL is a UI/layout concern; it is not a math semantic switch.

### Display Text Boundary

Language owns prose. Display owns math. Mixed prose plus math should use structured parts.

Do not create a second mixed renderer. Extend the existing Display detail-part pattern when fixing notation-unfaithful prose.

## Roadmap Sequence

### 0. `LANGUAGE-SURFACE-AUDIT0`

Goal: classify live text surfaces and preserve the Language/Display boundary before implementation.

Status: in progress as docs/memory work on 2026-06-19.

Outputs:

- durable language architecture memory;
- language surface audit;
- dedicated roadmap;
- compact global memory summary;
- open questions for interpolation, settings key naming, pilot order, solver/readback localization, and RTL scope.

Acceptance:

- No `src/` changes.
- Audit maps shell, tabs, launcher, settings, history, variables, navigation metadata, Display, runtime status, Guide, Labs, diagnostics, and solver/readback text.
- Verification: `npm run test:memory-protocol`, `git diff --check`.

### 1. `LANGUAGE-COMPARTMENT-FOUNDATION1`

Status: implemented on 2026-06-19.

Implementation record:

- Added `src/lib/language/` as an English-only static compartment foundation.
- Added typed catalog contracts, metadata, deterministic English fallback, validation, and typed dynamic string function entries.
- Split English source by surface: common, shell, display, settings, history, variables, diagnostics, guide, and errors.
- Added pure APIs for supported-code resolution, catalog/metadata lookup, metadata listing, and catalog validation.
- Added an unmounted React `LanguageProvider` / `useLanguage` seam with English default context.
- Registered `language` in the compartment manifest with public pure/React seams and private `languages/` sources.
- Did not migrate UI labels, add a settings schema, add non-English packs, apply RTL layout, change Display math rendering, change solver/readback wording, or touch OOE/runtime authority.

Goal: create the English-only Language compartment and typed fallback contract without broad migration.

Expected scope:

- Add `src/lib/language/` district with typed language shape.
- Add English source modules split by surface.
- Add fallback resolver that returns English when a language, surface, or key is unavailable.
- Add language metadata with `direction: 'ltr' | 'rtl'`.
- Add one interpolation helper or function-entry convention.
- Add validation/tests that prove missing keys fail or fallback to English as intended.
- Add a small public seam for consumers.
- Optionally add the Language compartment to the compartment manifest if the shape is stable enough.

Out of scope:

- no settings UI or persisted language preference;
- no broad component migration;
- no Arabic pack;
- no RTL layout changes;
- no Guide content migration;
- no solver/readback wording changes;
- no Display math rendering changes;
- no OOE/runtime authority changes.

Acceptance:

- English contract is typed and split into small files.
- Fallback to English is deterministic.
- Unit tests cover fallback, metadata, and interpolation.
- Boundary validators still pass.
- File-size ratchet remains satisfied.

Suggested verification:

- `npx tsc -b --pretty false`
- focused language unit tests
- `npm run test:compartments-boundaries` if manifest changes
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop if foundation requires touching solver/readback producers, app-state schemas, or broad UI surfaces.

### 2. `LANGUAGE-SHELL-PILOT1`

Status: implemented on 2026-06-19.

Implementation record:

- `ModeStrip`, `LauncherWorkspace`, `WorkspaceTabs`, `MenuInspectorPanel`, and `DisplayPanel` runtime controls consume `useLanguage()` through the default English context.
- Added missing English shell/common keys for utility labels, launcher new-tab labels, context-menu text, workspace-tab aria/menu/rename/confirmation copy, menu inspector title/close text, and DisplayPanel-owned runtime-control/fallback status labels.
- Preserved current behavior: primary launcher launch remains current-tab, explicit launcher new-tab launch remains opt-in, workspace-tab actions and close confirmations still work, Display header runtime control semantics are unchanged, and custom tab titles remain user data.
- Kept `LanguageProvider` unmounted; settings/persistence/provider mounting remains deferred to `LANGUAGE-SETTINGS-SEAM1`.
- Did not migrate Display result-card labels/actions, side panels, Guide content, navigation route metadata, solver/readback strings, settings schema, RTL behavior, or non-English catalogs.

Goal: prove the language contract on low-risk, high-visibility shell surfaces.

Expected scope:

- Migrate common shell command labels and titles from:
  - `ModeStrip`
  - `WorkspaceTabs`
  - `LauncherWorkspace`
  - `DisplayPanel` runtime controls
  - common soft-action labels if a small shared seam is natural
- Keep English as the only active language.
- Keep ids, hotkeys, route targets, tab behavior, launch targets, and runtime behavior unchanged.
- Add tests proving migrated labels still render and key workflows still work.

Out of scope:

- no settings language picker;
- no mode route metadata migration beyond a tiny command-label seam;
- no settings/history/variables panel migration;
- no solver/readback text changes;
- no RTL layout application.

Acceptance:

- Shell consumes language strings through the public language seam.
- Primary launcher click, new-tab launcher action, tab close/rename/duplicate, and Display header controls behave exactly as before.
- Custom tab titles stay user data.

Suggested verification:

- focused shell/launcher/workspace-tab UI tests
- `npx tsc -b --pretty false`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop if the pilot starts pulling in settings persistence or mode navigation metadata wholesale.

### 3. `LANGUAGE-SETTINGS-SEAM1`

Goal: add the persisted language preference through the existing app-state/settings seam.

Expected scope:

- Decide the persisted field name: `language`, `locale`, or `languageCode`.
- Add schema/default handling with English fallback.
- Reset returns language to English.
- Invalid persisted values parse/fallback to English.
- Settings UI may expose English only or a disabled/future-safe control if no second language pack exists yet.
- Hydration/persistence tests cover fallback.

Out of scope:

- no Arabic pack;
- no RTL layout application;
- no broad text migration;
- no plugin/pack loading ecosystem;
- no external localization service.

Acceptance:

- App boots with English if settings are missing, invalid, or reset.
- Persisted settings remain backward-compatible.
- No broken partial-language UI can appear.

Suggested verification:

- app-state schema/persistence tests
- settings UI tests if UI changes
- `npx tsc -b --pretty false`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`

Stop if this turns into language-pack loading, distro systems, or RTL layout work.

### 4. `LANGUAGE-PANELS-PILOT1`

Goal: migrate core side-panel labels and empty states after the settings seam exists.

Expected scope:

- Settings panel labels, helper text, preview labels, and reset actions.
- History panel labels, pending-state labels, empty state, expanded section labels, and action labels.
- Variables panel labels, empty state, and action/status prose.
- No history schema changes.
- No stored localized copies in persisted History entries.

Out of scope:

- no full Settings/History page tabs;
- no variable policy rewrite;
- no History schema migration;
- no solver/readback details.

Acceptance:

- Panels use the language seam for labels/prose.
- History entries still store math/result metadata, not translated display strings.
- Existing panel tests pass with migrated labels.

Suggested verification:

- focused SettingsPanel, HistoryPanel, VariablesPanel UI tests
- persistence tests if settings copy changes
- `npx tsc -b --pretty false`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`

### 5. `LANGUAGE-NAVIGATION-METADATA1`

Goal: migrate route/menu metadata in bounded workspace slices.

Expected scope:

- Move labels/descriptions/help text for one or two selected navigation surfaces first.
- Keep ids, targets, hotkeys, focus targets, route screens, and capability semantics in navigation code.
- Prefer a typed metadata builder or language lookup helper that keeps structural route data close to navigation while prose comes from Language.

Recommended first slice:

- Launcher categories/apps and common soft actions, if not already completed in the shell pilot.
- Then one guided workspace such as Geometry or Statistics, because their navigation metadata is product-facing but not solver core.

Out of scope:

- no all-mode metadata migration in one commit;
- no Guide article content migration;
- no solver/readback text changes.

Acceptance:

- Migrated navigation surfaces remain structurally identical.
- Hotkeys and route behavior are unchanged.
- Tests prove menu entries and soft actions still expose expected text and targets.

### 6. `DISPLAY-TEXT-NOTATION-SEAM1`

Goal: make mixed prose plus math notation-faithful without making Language a renderer.

Expected scope:

- Add or extend structured display-text helpers using existing `DisplayDetailLinePart` patterns.
- Start with selected cards/lines that currently show ASCII math in prose while Display/MathNotation could render math fragments.
- Keep exact LaTeX, copy payloads, To Editor payloads, result block scheduling, and solver output semantics unchanged.
- Add tests for rendered/plain-text/LaTeX modes where relevant.

Candidate examples:

- result/detail prose with generated equations;
- explanatory lines containing `d/dx`, `x^2`, `sin^2(theta)`, `l^2 = r^2 + h^2`, or similar math fragments;
- Display labels that combine static prose and computed LaTeX.

Out of scope:

- no arbitrary natural-language math parsing;
- no solver output rewrite;
- no full Guide conversion;
- no Display renderer replacement.

Acceptance:

- Mixed text/math fragments render math through Display-owned components.
- MathNotation modes are honored.
- Existing copy/history/replay semantics are unchanged.

### 7. `LANGUAGE-RTL-FOUNDATION1`

Goal: apply direction metadata narrowly and safely before Arabic content.

Expected scope:

- Apply `direction` metadata at a safe shell root or language provider boundary.
- Add CSS/layout tests for selected shell/panel surfaces.
- Explicitly isolate MathLive and rendered math behavior from broad RTL flips where needed.
- Keep English as current content unless a small pseudo-RTL or test pack is needed.

Out of scope:

- no Arabic translation wave;
- no math semantic changes;
- no solver/readback changes;
- no broad redesign.

Acceptance:

- Direction metadata can drive shell direction without breaking editor/display math.
- Tests document which surfaces inherit direction and which opt out.

### 8. Later Language Packs And Content Work

Only after foundation, settings, shell/panels, and RTL safety:

- add first non-English pack candidates;
- consider Arabic pack strategy;
- split Guide metadata from article content if needed;
- decide solver/readback message-code strategy;
- support distro/fork language packaging if a real distribution need appears.

## Testing Strategy

Use test breadth proportional to risk:

- foundation: TypeScript shape, fallback, interpolation, metadata, validation;
- shell/panels: focused UI tests plus existing workflow tests;
- settings seam: schema/persistence/hydration/reset tests;
- display-text seam: notation-mode rendering tests and result copy/replay guard tests;
- RTL foundation: browser/UI layout tests only for changed surfaces.

Implementation milestones that touch `src/` should generally run:

- `npx tsc -b --pretty false`
- focused unit/UI tests for touched surfaces
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `npm run lint`
- `npm run build`
- `git diff --check`

Docs-only milestones may use:

- `npm run test:memory-protocol`
- `git diff --check`

## Open Design Decisions

- Persisted setting name: `language`, `locale`, or `languageCode`.
- Settings UI before multiple languages: visible English-only selector, hidden setting, or no UI until a second pack exists.
- Solver/readback localization model: stable message codes plus data, or producer-owned English until a later pass.
- First guided navigation metadata slice after shell: Launcher/common actions, Geometry, Statistics, or Settings/History page labels.
- RTL scope: which shell roots inherit direction, and which math/editor surfaces opt out.

## Roadmap Exit Criteria

The language foundation can be considered mature when:

- English strings for shell, panels, common navigation, and Display section labels are owned by Language;
- settings can persist and reset the language preference safely;
- invalid language state always falls back to English;
- Display has a clear structured mixed text/math path;
- RTL metadata can be applied without changing math semantics;
- Guide and solver/readback localization have explicit follow-on policies rather than being mixed into foundation work.
