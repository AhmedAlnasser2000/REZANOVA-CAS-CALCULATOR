# EQUATION-FACTS-SURFACE-AUDIT0

Date: 2026-06-20

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Calcwiz already has several fact-like surfaces, but they are split between structured domain constraints, typed exact-supplement entries, rendered supplement LaTeX, periodic-family metadata, branch-readback metadata, candidate-validation evidence, and prose detail sections.

The next implementation should not invent a second parallel facts system. It should first consolidate around the existing typed bridges:

- `SolveDomainConstraint` from `src/types/calculator/solver-types.ts`
- `ExactSupplementEntry` from `src/types/calculator/exact-supplement-types.ts`
- `mergeExactSupplementLatex(...)` and `mergeExactSupplementEntries(...)` from `src/lib/algebra/exact-supplements.ts`
- the new internal root representation seam at `src/lib/equation/roots/representation.ts`

## Scope

This audit inspected live Equation/Display fact surfaces only. It did not change code, solver behavior, cap constants, Display/History schemas, OOE, app-state, Tauri, UI, graphing, step-by-step, source mirrors, or Exact/Isolate semantics.

## Existing Fact Surfaces

| Surface | Owner | Current Shape | Audit Finding |
| --- | --- | --- | --- |
| `DisplayOutcome.exactSupplementLatex` | Display/result contract | `string[]` rendered as Valid When / supplement lines | Render surface only. It is not canonical fact storage. |
| `DisplayOutcome.branchReadback` | Display readback | finite branch metadata | Branch display aid, not fact storage. |
| `DisplayOutcome.periodicFamily` | Display + Equation periodic producers | `PeriodicFamilyInfo` with branches, parameter constraints, representatives, intervals, principal ranges, structured stop reasons | Richest current structured family/fact surface; should be adapted, not replaced. |
| `DisplayOutcome.detailSections` | Producer readback + Display | prose/math detail lines | Method/proof/readback surface. Do not parse it for facts. |
| `candidateValues`, `rejectedCandidateCount`, `substitutionDiagnostics`, `numericMethod` | Guarded/numeric solvers | validation evidence metadata | Useful evidence, but not enough to describe branch/domain facts by itself. |
| `SolveDomainConstraint` | Solver/domain validation | typed interval, nonzero, positive, nonnegative, expression interval, trig range, exp-positive constraints | Strongest existing internal domain-fact substrate. |
| `ExactSupplementEntry` | exact supplement bridge | typed condition, exclusion, branch condition, principal range, note with source | Existing bridge from structured facts to current rendered supplements. |
| `EquationRootSet` / `EquationRootRepresentation` | Equation roots | typed roots, factor-derived roots, exact-rational factor roots, dormant numeric/implicit/stops | New correct place to attach root/group-local facts later, but v1 still stores supplements/detail strings for factor-derived roots. |

## Producer Matrix

| Producer Area | Current Fact Emission | Classification | Notes |
| --- | --- | --- | --- |
| Parameterized linear | nonzero coefficient supplement as LaTeX string | semi-structured string | Can become `ExactSupplementEntry` condition/exclusion without behavior change. |
| Parameterized quadratic | nonzero leading coefficient and discriminant facts as strings; finite branch readback | semi-structured string + branch metadata | Discriminant/radicand facts are good early typed-fact candidates. |
| Parameterized rational | denominator facts collected as expression strings, then rendered as `\ne0`; conditional target-family text in details | semi-structured string | Denominator exclusions should become typed exclusions before broader rational/factor adoption. |
| Parameterized factorable | delegated factor supplements stored in root groups; multiplicity is detail prose; exact-rational factor metadata is typed in root seam | mixed typed roots + string facts | Best first root-local fact consumer after a facts seam exists. |
| Parameterized exp/log | `domainFacts: string[]` from carrier generation/finalizers | semi-structured string | Positive base/argument facts should adapt to typed conditions later. |
| Parameterized trig | range facts, nonzero argument coefficients, integer parameters as strings; finite branch readback | semi-structured string + branch metadata | Integer-parameter and range facts exceed the current simple relation set and need explicit modeling. |
| Carrier/mixed algebraic | radicand/carrier facts and generated branch supplements as strings | semi-structured string | Should not be rewritten until root/fact adapters are stable. |
| Guarded algebra rational/radicals/absolute-value | `SolveDomainConstraint[]` threaded through transforms and candidate validation, rendered through `mergeExactSupplementLatex` at boundaries | structured | This is the strongest model and should be preserved. |
| Substitution/composition guarded stages | domain constraints, candidate validation, periodic-family metadata, supplement merging | structured + periodic metadata | Facts are already closer to the desired future shape here. |
| Numeric interval | validates candidates against `SolveDomainConstraint[]`; emits numeric method/candidate evidence | structured validation evidence | Should stay separate from exact root facts. |
| Complex rational/exact | converts domain constraints to supplement strings manually in places | semi-structured | Could later reuse the same exact-supplement bridge. |
| Inequality outcomes | `exactSupplementLatex` for valid-when facts | rendered string | Related but should not be folded into Equation root facts in the first implementation. |

## Findings

1. `SolveDomainConstraint` and `ExactSupplementEntry` already cover much of the fact problem. A new facts milestone should reuse/adapt them instead of creating an unrelated `EquationFact` universe immediately.
2. `exactSupplementLatex` is a compatibility/rendering surface. It can stay public while producers move toward typed facts internally.
3. Parameterized solvers are the main string-heavy area. Guarded algebra/composition already has better typed domain constraints and candidate validation.
4. Root representation should eventually carry facts by attachment scope: global result facts, root-set facts, root-group/factor facts, and branch/root facts.
5. Detail sections should remain method/readback text. They can mention facts for humans, but they must not be the canonical fact source.
6. Periodic facts need special care: integer parameters, principal ranges, sawtooth/piecewise branches, and parameter constraints do not fit only `expression relation` triples.
7. Candidate-validation facts are evidence of filtering, not domain facts by themselves. They should reference constraints and rejected reasons rather than replacing them.

## Recommended Next Milestone

`EQUATION-BRANCH-DOMAIN-FACTS1`

Recommended scope:

- Add a small internal Equation facts adapter/seam, likely under `src/lib/equation/facts/`.
- Use existing `ExactSupplementEntry` and `SolveDomainConstraint` as primary source shapes.
- Add attachment scope metadata only if needed for roots:
  - `global`
  - `root-set`
  - `root-group`
  - `branch`
- Preserve adapters back to current `exactSupplementLatex`.
- First adoption should be narrow:
  - factorable root groups and multiplicity/factor-domain facts;
  - parameterized rational denominator exclusions;
  - optionally parameterized polynomial discriminant facts if the first two stay small.
- Keep guarded algebra/composition behavior intact; those paths already use typed constraints and should be adopted only through parity tests.

## Do Not Do Next

- Do not change DisplayOutcome or History schemas.
- Do not parse `detailSections` to recover facts.
- Do not expose new user-visible fact blocks.
- Do not add graphing contracts yet.
- Do not resolve Exact/Isolate semantics yet.
- Do not move all parameterized solvers to the seam in one milestone.
- Do not turn facts into a broad solver authority or planner.

## Verification Notes

- Audit-only milestone.
- Source inspected: Display/result types, exact supplement types, domain constraints, exact supplement renderer, parameterized solvers, guarded algebra/composition paths, candidate validation/rejection, and root representation.
- Verification gate: memory protocol and diff whitespace only.
