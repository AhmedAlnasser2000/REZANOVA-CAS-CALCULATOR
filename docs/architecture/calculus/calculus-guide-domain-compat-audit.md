# Calculus Guide Domain Compatibility Audit

## Summary

`CALCULUS-GUIDE-DOMAIN-COMPAT-AUDIT0` originally documented the legacy Guide compatibility surface that kept `advancedCalculus`, `advancedCalcScreen`, `advancedCalcSeed`, `advanced-*` Calculus article ids, and `advanced-calculus-core` available while the visible product identity was already `Calculus`.

`CALCULUS-GUIDE-COMPAT-REMOVAL1` intentionally retires that compatibility surface. The Guide now uses canonical Calculus domain, article, launch, and capability ids only. Old Guide links or launch payloads that used the legacy names are not redirected.

## Final Guide Surface

- `GUIDE_DOMAINS` exposes only the active `calculus` domain for guided Calculus content.
- The canonical Calculus domain owns:
  - `calculus-derivatives`
  - `calculus-integrals-limits`
  - `calculus-integrals`
  - `calculus-limits`
  - `calculus-series`
  - `calculus-partials`
  - `calculus-odes`
- Guide launch payloads use `calculusScreen` and `calculusSeed`.
- `ACTIVE_CAPABILITIES`, `MILESTONE_LABELS`, Guide symbol mapping, and keyboard page specs use `calculus-core` for all Calculus keys.
- `articles-advanced-calculus.ts` has been removed.
- `getGuideArticlesForDomain('advancedCalculus')`, `getGuideModeRef('advancedCalculus')`, and `advanced-calculus-core` are no longer live API contracts.

## Final Removal Record

- Removed the `advancedCalculus` Guide domain and hidden mode ref compatibility.
- Removed the `advanced-calculus-core` virtual-keyboard/Guide capability.
- Renamed legacy article ids with no redirects:
  - `advanced-integrals` to `calculus-integrals`
  - `advanced-limits` to `calculus-limits`
  - `advanced-series` to `calculus-series`
  - `advanced-partials` to `calculus-partials`
  - `advanced-odes` to `calculus-odes`
- Renamed related internal Guide/key ids that were part of the same guided Calculus surface.
- Updated AppMain, workspace route metadata, Guide search/symbol tests, Guide runtime UI tests, and mode-guide routing to use the canonical ids.

## High-Risk Contracts

- Active Guide home and mode-guide listings must show one visible Calculus workspace.
- Calculus Guide examples must still load the same Calculus workspace screens and seeds.
- Guide search results must keep surfacing integrals, limits, series, partial derivatives, and ODE content through canonical article ids.
- Virtual keyboard Calculus keys must remain visible in the same modes through `calculus-core`.
- Article content meaning, example LaTeX, and launch behavior must not change as part of id cleanup.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/guide/content.test.ts src/lib/guide/search.test.ts src/lib/guide/symbols.test.ts src/lib/guide/navigation.test.ts`
- `npm run test:unit -- src/lib/virtual-keyboard/*.test.ts src/lib/navigation/launcher.test.ts`
- `npm run test:ui -- src/app/runtime/useGuideRuntime.ui.test.tsx src/AppMain.ui.test.tsx`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Stop if canonical Guide ids require replay/history/schema compatibility aliases to return.
- Stop if article-id cleanup changes article wording, example meaning, or launch destinations.
- Stop if `advanced-calculus-core` removal hides Calculus keyboard keys from supported modes.
- Stop if Guide routing starts exposing a second Calculus-like workspace.
