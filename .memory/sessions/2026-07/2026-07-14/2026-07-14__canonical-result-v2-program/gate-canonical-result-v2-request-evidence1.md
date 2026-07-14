# CANONICAL-RESULT-V2-REQUEST-EVIDENCE1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- kind: ui
- result: pass
- production V2 routes: Calculus `derivativePoint`, Trigonometry angle conversion, and Trigonometry `rightTriangle`
- residual change: four reviewed request-evidence exemptions removed; 19 exemptions remain
- protected state: concurrent Notebook image-layout work and untracked `test-results/` were excluded

## Implemented

- Added a structural V2 adapter for workspace producer drafts that preserves existing presentation while requiring a producer-owned standard MathJSON resolver for every real math leaf.
- Migrated derivative-at-point requests to typed body, applied variable path, point, and substituted result evidence. The reviewed `x^2` at `x=3` correction now displays primary `6`, request `\left.\frac{d}{dx}\left(x^2\right)\right|_{x=3}`, and title `Derivative` while retaining the existing details and badges.
- Migrated angle conversion to typed value/source/target units and right triangles to typed proven known quantities. Guided `?` placeholders remain presentation-only and never become semantic quantities.
- Preserved sine-rule and cosine-rule producers on frozen V1 routes and made every selected V2 path fail explicitly if producer proof is incomplete; no V1 fallback was added.
- Routed the Calculus display title and request readback through normalized canonical presentation so V2 semantics remain the authority.

## Verification

- Focused Calculus, Trigonometry, V2 contract, and guided-producer suites pass, including stored values, negative points, higher-order derivatives, DEG/RAD/GRAD conversion directions, guided triangle placeholders, and V1 sine/cosine-rule freezes.
- `npm run test:result-contract`: 12 files / 75 tests pass, including all 43 golden and 100 replay executions.
- MathJSON coverage: 143 executable cases, 458 leaves, 439 producer-proven, 19 exempt, zero missing; Calculus derivative, angle-conversion, and right-triangle routes have zero exemptions.
- History replay: 3 files / 6 tests pass; Surface Protocol boundary plus 9 files / 40 tests pass.
- Display inversion: 401 producer boundaries, 150 native documents, 59 canonical reads, zero compatibility projections, and zero legacy reads.
- Focused Display UI title regression passes; incremental TypeScript, production build, file-size validation, and diff hygiene pass.
- Chromium: 2/2 focused scenarios pass against the rebuilt app, covering derivative `6`, retained derivative details/title, V2 History replay, angle conversion, right triangle, normalized request presentation, persisted V2 semantics, and no observed horizontal overflow.

## Recovery Notes

- The first browser pass exposed that the Calculus route label overrode the canonical `Derivative` title. Display precedence now keeps the approved canonical title and has focused UI coverage.
- The first guided right-triangle browser pass exposed serialized `?` placeholders entering the adapter. The core now threads its already parsed native quantity evidence, so only proven numeric inputs enter V2 semantics.
