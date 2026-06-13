# Algebra Inequality Surface Audit

Status: audit + split record

Purpose: document the current Algebra inequality surface before any future split. Algebra inequality code is a shared set/readback and sign-chart capability used by Equation inequality routes; it is not a new solver family by itself.

## Current Public Surface

- `inequality-core.ts`: finite real interval/set contracts, interval normalization, common constructors, set intersection/union/equality/containment, text/Latex readback, periodic inequality readback, assumption facts, and value-domain metadata.
- `inequality-sign-analysis-core.ts`: sign-chart relation contracts, boundary point merge, sample selection, relation testing, equality-point insertion, and stop reasons for invalid boundaries or failed samples.

## Responsibility Map

- Interval normalization: `inequality-core.ts` owns finite bound validation, epsilon normalization, interval sorting, duplicate removal, and merge behavior for overlapping or compatible touching intervals.
- Set operations: `inequality-core.ts` owns intersection, union, equality, containment, all-real, empty, point, open, closed, less-than, and greater-than set helpers.
- Readback: `inequality-core.ts` owns stable text/Latex output for finite unions, empty/all-real sets, point intervals, and periodic intervals with `k\\pi`-style shifts.
- Metadata: `inequality-core.ts` owns `inequality-core` assumption source labels and value-domain metadata for conditional-real inequality solution sets.
- Sign charts: `inequality-sign-analysis-core.ts` owns sign relation symbols, sampled truth, critical-point/exclusion merge, cell sampling, equality handling, and sign-chart stop reasons.

## Current Consumers

- Equation inequality finite sign-chart route and periodic/wrapper/outcome helpers.
- Algebra assumption source labels and readback detail grouping.
- Value-domain metadata tests and Equation mode tests that assert inequality facts.
- Future Equation inequality stability work that depends on finite set semantics and periodic readback.

## Future Split Candidates

- `ALGEBRA-INEQUALITY-DISTRICT-SPLIT1`: completed. `inequality-core.ts` and `inequality-sign-analysis-core.ts` remain root compatibility facades, while implementation ownership now lives under `src/lib/algebra/inequality/`.
- Split private modules into types/constants, finite interval normalization, set operations, finite readback, periodic readback, assumption/value-domain adapters, and sign-chart analysis.
- Keep Equation inequality route orchestration under `src/lib/equation/inequality/`; Algebra should expose set/sign-chart primitives only.

## Final Split Record

- `inequality/types.ts`: finite and periodic inequality contracts plus shared epsilon.
- `inequality/intervals.ts`: finite interval validation, normalization, constructors, set operations, containment, and equality.
- `inequality/finite-readback.ts`: finite inequality text and Latex readback.
- `inequality/periodic-readback.ts`: periodic inequality text and Latex readback.
- `inequality/metadata.ts`: assumption facts and value-domain metadata adapters.
- `inequality/sign-analysis.ts`: sign-chart relation helpers, boundary merging, sampling, equality insertion, and stop reasons.
- `inequality/index.ts`: private district export surface consumed by root facades.

## High-Risk Contracts

- Preserve interval merge semantics, epsilon behavior, finite bound validation, and RangeError messages.
- Preserve text/Latex readback strings for empty/all-real sets, finite unions, points, and periodic intervals.
- Preserve periodic `k\\pi`, `2k\\pi`, and `\\frac{k\\pi}{n}` readback behavior.
- Preserve `inequality-core` assumption source labels, trust labels, scopes, and value-domain summary behavior.
- Preserve sign-chart stop reasons, boundary sorting/merge behavior, equality-point handling, and sample-failed behavior.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/inequality-core.test.ts src/lib/algebra/inequality-sign-analysis-core.test.ts`
- `npm run test:unit -- src/lib/algebra/assumptions-core.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/algebra/value-domain-core.test.ts`
- `npm run test:unit -- src/lib/equation/equation-inequality.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Future work must keep the root facades stable unless a dedicated public-import migration milestone owns the change.
- Do not change interval semantics, set readback, periodic readback, sign-chart sampling, assumption facts, value-domain metadata, Equation inequality behavior, solver behavior, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, or reserved-symbol policy.
- Do not add new inequality families, graphing hooks, broad real-analysis solving, or a generic inequality framework.
