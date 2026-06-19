# Language Compartment And Display Text Memory

Date: 2026-06-19

Status: durable architecture memory. This is not an implementation record.

## Core Decision

Calcwiz should eventually have a dedicated Language compartment rather than a single loose translation file or scattered ad-hoc strings. The language system affects the whole product experience: app shell labels, workspace tabs, launcher actions, settings, history, variables, diagnostics, Guide content, Labs catalog text, display cards, mode panels, runtime status, and future full-page management surfaces.

English is the safe default and fallback. If the user resets settings, if a local or modified language pack is invalid, if a key is missing, or if a runtime-loaded language resource fails, Calcwiz should fall back to English rather than crash, show blanks, or mix broken partial strings.

The near-term goal is not to translate the app. The goal is to prepare the architecture so translation, Arabic/RTL support, display-text consistency, and fork/distro customization can happen later without hunting scattered strings across the repo.

## Why It Needs A Compartment

Language is broad enough to deserve an owned district with typed contracts and smaller surface files. A single giant `translations.ts` file would become a new monolith and would fight the file-size ratchet. A likely future shape is:

```text
src/lib/language/
  types.ts
  registry.ts
  fallback.ts
  interpolate.ts
  direction.ts
  display-text.ts
  validation.ts
  languages/
    en/
      shell.ts
      workspaces.ts
      settings.ts
      history.ts
      diagnostics.ts
      guide.ts
      display.ts
      errors.ts
      index.ts
```

This shape is guidance, not implementation law. The durable principle is that language ownership should be centralized, typed, validated, split by surface, and kept separate from solver/runtime authority.

Without this foundation:

- UI strings remain scattered in JSX, runtime hooks, mode metadata, display cards, diagnostics, settings, Guide content, and solver readback helpers.
- Arabic or other language support becomes a risky late rewrite.
- RTL support becomes a set of one-off CSS/layout patches instead of a root language-direction contract.
- Some cards keep showing plain ASCII math in prose while the app is in rendered MathNotation mode.
- Developers fix wording in one surface while leaving stale copies elsewhere.
- Forks or custom distributions cannot cleanly provide a supported language surface.

With this foundation:

- User-facing strings become an owned product surface.
- Missing keys can fail TypeScript or validation early.
- English remains the known-good fallback.
- Language metadata can drive `ltr` / `rtl` behavior deliberately.
- Display text can become notation-aware instead of patched per card.
- Future language packs can be added incrementally.

## Typed Contract

The language contract should be typed. Translation modules should satisfy the same shape as English so missing keys fail early.

The language system should eventually cover:

- app shell labels;
- workspace and mode labels;
- workspace tab menu labels;
- launcher row actions and context-menu labels;
- settings labels, helper text, and reset actions;
- history labels, pending-state labels, and duration metadata labels;
- variables-panel labels and validation prose;
- diagnostics labels and developer-facing empty states;
- Guide article metadata and, later, content;
- display result headings, detail labels, and common actions;
- common commands such as Run, Stop, Clear, Copy, Paste, To Editor, Open, Close, Rename, Duplicate, and Back.

The default language should delegate to English rather than copy it, so default strings cannot silently drift from the English source.

## Interpolation Policy

Dynamic strings need one consistent interpolation convention. Two viable approaches are:

- function-based typed strings such as `solvedFor(variable: string): string`;
- placeholder strings such as `Solved for {{variable}}` plus one typed interpolation helper.

The final choice can be made during `LANGUAGE-COMPARTMENT-FOUNDATION1`. The durable rule is not to mix ad-hoc template literals, manual concatenation, and unrelated placeholder systems across the app.

## RTL Metadata

Language metadata should include at least:

- language code;
- display label;
- `direction: 'ltr' | 'rtl'`;
- optional locale/script metadata later.

Arabic support is strategically important. RTL UI direction must not be an afterthought, but UI direction is not the same as math semantics. MathLive behavior, LaTeX, symbolic output, and formula layout need careful handling. The language compartment should provide direction metadata; editor and display surfaces should decide how to apply it safely.

## Display Text And MathNotation

Language owns prose. Display owns math rendering and notation fidelity. Mixed prose plus math should use structured tokens or a shared display-text helper instead of embedding ASCII math inside ordinary strings.

Example future shape:

```ts
[
  { kind: 'text', key: 'calculus.secondDerivative' },
  { kind: 'math', latex: '\\frac{d^2}{dx^2}' },
]
```

The current repo already has a useful starting point: `DisplayDetailLinePart`, `textPart`, `mathPart`, and `mixedDetailSection` under Display result detail helpers. Future notation-aware display-text work should extend that existing Display path rather than invent a second renderer.

The desired long-term rule:

- prose labels belong to Language;
- math expressions belong to Display/notation helpers;
- mixed prose plus math should be structured so math fragments honor current MathNotation: rendered, plain text, or LaTeX.

This avoids manually hunting every scattered ASCII fragment such as `d/dx`, `x^2`, `sin^2(theta)`, or `l^2 = r^2 + h^2` when those fragments are used as display prose rather than editable examples.

## Settings And Fallback

Eventually settings should include a language preference. English is the default.

On reset:

- language returns to English.

On invalid language selection, missing pack, failed validation, or runtime load failure:

- the app falls back to English;
- developer diagnostics may report the fallback;
- normal users should still get a usable app.

The language setting should be added through the existing app-state/settings seam in its own milestone, not inside the first audit or foundation doc.

## Current Repo Fit

The current repo has the right seams to support this later:

- `Settings` and `settingsSchema` already provide a typed default/persistence path.
- Display notation is already a district under `src/lib/display/notation/`.
- Display result details already have mixed text/math line parts.
- App shell/workspace strings are largely visible in React components and navigation metadata.
- The compartment manifest can later add a `language` compartment without changing runtime behavior.

Important boundary: app runtime request-building files such as `launchWorkspaceRuntimeJob.ts`, `equation-origin-request.ts`, and `geometry-origin-request.ts` should not become translation owners. If runtime code produces user-facing errors, later work should move those through a narrow language/display-output seam or structured message contract rather than importing language packs deep into runtime helpers.

## Distro And Fork Fit

This supports future distro/fork needs. A school, region, or custom distribution could ship one supported language or a small set of languages without editing every component. This does not mean building a plugin ecosystem now. It only means the language contract should not block future language packs.

## Non-Goals

The foundation should not immediately:

- translate the whole app;
- create a plugin or language-pack ecosystem;
- introduce a localization platform;
- rewrite Guide content wholesale;
- change solver behavior;
- change solver output wording without a dedicated audit;
- change Display math rendering semantics;
- change History schemas;
- change OOE event schemas;
- add Graphing or Spreadsheet work;
- introduce a broad bus, registry, code generator, or new runtime authority.

## Candidate Milestones

Detailed roadmap: `.memory/research/roadmaps/language-roadmap.md`.

- `LANGUAGE-SURFACE-AUDIT0`: audit hard-coded user-facing strings, display-text surfaces, diagnostics, history, guide, workspace tabs, and ASCII math fragments.
- `LANGUAGE-COMPARTMENT-FOUNDATION1`: create the language compartment with typed contracts, English default, fallback behavior, metadata, and interpolation helper.
- `LANGUAGE-SETTINGS-SEAM1`: add language preference through app-state/settings with English fallback.
- `LANGUAGE-SHELL-PILOT1`: migrate shell-level labels, workspace tab/menu labels, and launcher actions first.
- `DISPLAY-TEXT-NOTATION-SEAM1`: add structured display-text helpers for prose plus math fragments and start fixing notation-unfaithful cards.
- `LANGUAGE-RTL-FOUNDATION1`: apply direction metadata narrowly and add RTL layout tests before Arabic content work.

## Compact Global-Memory Summary

Calcwiz language-system decision: user wants a dedicated Language compartment/district, not one giant translation file. English is the safe default/fallback for settings reset, invalid language packs, missing keys, or load errors. The compartment should use typed contracts, smaller files, one interpolation convention, and metadata including `ltr`/`rtl`; Arabic/RTL support is strategically important, but UI direction must not blindly change math semantics. Language owns prose/user-facing labels; Display/notation owns math rendering. For mixed prose plus math, future structured display-text helpers should let math fragments honor current MathNotation instead of scattering ASCII text like `d^2`, `d/dx`, or `x^2` across components. Initial work should be audit/foundation/pilot only, not full translation, plugin packs, solver wording changes, Graphing, Spreadsheet, schema rewrites, or broad Guide rewrites. Candidate sequence: `LANGUAGE-SURFACE-AUDIT0`, `LANGUAGE-COMPARTMENT-FOUNDATION1`, `LANGUAGE-SETTINGS-SEAM1`, `LANGUAGE-SHELL-PILOT1`, `DISPLAY-TEXT-NOTATION-SEAM1`, later `LANGUAGE-RTL-FOUNDATION1`.
