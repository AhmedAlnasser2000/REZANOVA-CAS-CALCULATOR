# Calculus Guide Domain Compatibility Audit

## Summary

`CALCULUS-GUIDE-DOMAIN-COMPAT-AUDIT0` audits the Guide surfaces that still carry `advancedCalculus` or `advancedCalc*` names after the current app-shell Calculus identity cleanup.

The current product identity remains one visible workspace: `Calculus`. The Guide keeps legacy `advancedCalculus` ids and `advancedCalcScreen` / `advancedCalcSeed` launch fields as compatibility aliases for saved Guide links, article ids, old launch metadata, and replay paths.

This audit is docs-only. It does not move Guide content, rename article ids, change Guide examples, or alter Guide routing.

## Current Guide Surface

### Active Current Identity

- `GUIDE_DOMAINS` exposes the active `calculus` domain with title `Calculus`.
- The active `calculus` domain includes both introductory Calculus articles and legacy advanced article ids:
  - `calculus-derivatives`
  - `calculus-integrals-limits`
  - `advanced-integrals`
  - `advanced-limits`
  - `advanced-series`
  - `advanced-partials`
  - `advanced-odes`
- `GUIDE_MODE_REFS` includes a current `calculus` mode reference that presents the full guided Calculus workspace.
- `getActiveGuideDomains` and `getActiveGuideModeRefs` filter out the legacy `advancedCalculus` surface from the active home and active mode guide lists.
- `DOMAIN_BY_CAPABILITY` maps `advanced-calculus-core` symbols to the current `calculus` Guide domain.

### Legacy Compatibility Surface

- `GUIDE_DOMAIN_CAPABILITY.advancedCalculus` remains mapped to `advanced-calculus-core`.
- `GUIDE_DOMAINS` still includes `advancedCalculus` with title `Calculus` and summary text that identifies it as a legacy guide domain.
- `GUIDE_MODE_REFS` still includes `advancedCalculus` with a legacy summary for saved guide links and old launch metadata.
- `articles-advanced-calculus.ts` still exports the subset of guide articles whose domain id is `advancedCalculus`.
- `getGuideArticlesForDomain('advancedCalculus')` and `getGuideModeRef('advancedCalculus')` remain supported.
- Guide launch payloads keep `advancedCalcScreen` and `advancedCalcSeed` fields, even when `targetMode` is current `calculus`.
- App launch dispatch accepts both `calculus` and legacy `advancedCalculus`, then routes to the visible Calculus workspace.

## Article And Selector Map

- Current Calculus entry articles:
  - `calculus-derivatives`
  - `calculus-integrals-limits`
- Legacy advanced article ids now included by the current Calculus domain:
  - `advanced-integrals`
  - `advanced-limits`
  - `advanced-series`
  - `advanced-partials`
  - `advanced-odes`
- Legacy filtered article export:
  - `src/lib/guide/content/articles-advanced-calculus.ts`
- Compatibility tests:
  - `src/lib/guide/content.test.ts` explicitly verifies current Calculus examples still launch with `advancedCalcScreen` / `advancedCalcSeed`.
  - The same test verifies the legacy `advancedCalculus` Guide domain and mode reference remain queryable.

## Compatibility Decisions

- `advancedCalculus` Guide domain id: keep as a stable compatibility alias for saved Guide domain links and old article-domain callers.
- `advancedCalculus` Guide mode ref: keep as a stable compatibility alias, filtered from active mode guide listings.
- `advancedCalcScreen` / `advancedCalcSeed` launch fields: keep until a schema-backed Guide launch migration exists.
- `advanced-*` article ids: keep. These ids are content addresses and should not be renamed casually.
- `advanced-calculus-core` capability id: keep as a compatibility capability id that now maps symbols into the current `calculus` Guide domain.
- `articles-advanced-calculus.ts`: keep as a compatibility content export unless a future content index migration proves there are no external or test consumers.

## Future Cleanup Candidates

1. Add explicit redirect metadata for `advancedCalculus` Guide domain and mode refs so future code can distinguish hidden compatibility aliases from active domains.
2. Add a canonical `calculusScreen` / `calculusSeed` Guide launch field pair only if the runtime schema and Guide launch types migrate together.
3. Rename article source files only if article ids remain stable and imports are updated behind tests.
4. Retire `articles-advanced-calculus.ts` only after a root facade/import compatibility audit proves no durable caller needs that grouped export.

## High-Risk Contracts

- Saved Guide links targeting `advancedCalculus` must continue to resolve.
- Old Guide examples with `advancedCalcScreen` and `advancedCalcSeed` must continue to open the visible Calculus workspace.
- Active Guide home and active Guide mode lists must not show a separate `Advanced Calculus` workspace.
- Article ids must remain stable for content search, tests, and saved references.
- `advanced-calculus-core` capability-backed symbols must remain findable under the visible Calculus domain.
- Guide example dispatch must continue to normalize legacy `advancedCalculus` target modes to current `calculus`.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/guide/content.test.ts src/lib/guide/content.contract.test.ts src/lib/guide/search.test.ts src/lib/guide/symbols.test.ts`
- `npm run test:ui -- src/app/runtime/useGuideRuntime.ui.test.tsx src/AppMain.ui.test.tsx`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Stop if a Guide cleanup requires removing `advancedCalculus` from runtime types, schemas, or history replay compatibility.
- Stop if an article rename would change article ids, saved links, search results, or test fixtures.
- Stop if a launch-field rename would require changing persisted `advancedCalcScreen` / `advancedCalcSeed` semantics.
- Stop if a Guide cleanup would expose a second visible `Advanced Calculus` workspace.
- Stop if content movement starts changing Guide article wording or example behavior; that belongs to a content-edit milestone, not a compatibility cleanup.
