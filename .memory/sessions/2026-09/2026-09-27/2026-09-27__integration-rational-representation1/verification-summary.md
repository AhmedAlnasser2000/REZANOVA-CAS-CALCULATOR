# Rational representation verification

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Backend evidence

- `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2`: 11 files / 84 tests pass, final run 9.58s; includes the production import isolation test and all 60 prior tests.
- `npx tsc -b --pretty false`: pass.
- `npx eslint src/lib/symbolic-engine/integration/core`: pass, no warnings.
- `npm run test:compartments-boundaries`: 36 tests plus validation pass.
- `npm run test:ooe-boundaries`: 8 tests plus validation pass.
- `npm run test:memory-protocol`: 22 tests plus validation pass after correcting the no-commit dossier wording (the validator treated an earlier checkpoint hash in commit-log.md as a newly recorded commit).
- `npm run test:file-sizes`: 10 tests plus validation pass; no baseline changes.
- `git diff --check`, new-file whitespace and local integration-document link checks: pass.
- Retained logs: `.task_tmp/integration-rational-representation1/`.

## Independent checks and interpretation

- Test-only Leibniz determinants of small Sylvester minors over Q and Q[z] check all available indices, including unequal-degree highest boundaries, and both input orders. Seeded Q fixtures use seed 9143. PRS production never uses this oracle.
- The abnormal-degree-drop fixture has successive remainder degrees 4, 2, 1, 0, then zero. The equal-quadratic fixture distinguishes PRS tail -2 from resultant 4. Common factors, constants, zero inputs and degree-dropping specialization are covered.
- Quotient tests check reducible z²-1 over Q and Q(x), units, zero, nonunits, proper factors, component projection and arbitrary CRT recombination. Repeated-root/nonmonic/constant/foreign moduli are rejected.
- Known targets are 1/(x²+1), x/(x²-1), and (5x⁴-1)/(x⁵-x-1). The quintic target is literal, not obtained by resolving roots. Derivative verification checks inverse/Bézout identities, quotient multiplication columns and Newton sums.
- Mutation tests reject scaling factors, principal scalars, indices, omitted PRS termination, content, split factors, inverse witnesses, weights, trace evidence, target integrands and omitted conditions. Cancelling log terms retain both norms plus the rational-part denominator.
- Private codec tests reject malformed keys/accessors/arrays, stored proof flags, incompatible variables, noncanonical/redundant representations, repeated roots, component-zero arguments, lost conditions and oversized artifacts. Exact JSON replay creates fresh domains and then separately verifies the target.
- Shared work exhaustion is checked both in nested operations and one work unit before final verification completes. Exhaustion yields no successful proof.
- No dependency, source outside the private core, public contract or application caller was added. No full integration/UI suite, Playwright evidence or production performance claim accompanies this backend gate.
- Initial implementation did not run repository lint/build because no commit was then authorized; the subsequent approved checkpoint below supplies that evidence.

## 2026-09-27 user-approved commit checkpoint

- User explicitly authorized this gate commit and discussion of INTEGRATION-RATIONAL-DECISION1. No next-gate implementation or push authorized.
- Focused core rerun: 11 files / 84 tests pass, 9.14s, two workers, including isolation.
- `npm run lint`: pass with 0 errors and two existing Graphing react-hooks warnings at useGraphWorkspaceController.ts:865,867.
- `npm run build`: incremental TypeScript and Vite production build pass, 34.32s.
- Refreshed memory/file-size checks and staged diff hygiene pass. Only integration-owned changes are staged.
- Concurrent Graphing research checkpoint completed separately before staging this gate. Shared current-state and journal preserve that checkpoint; no Graphing code or research artifact is included here.
- Logs: commit-vitest.log, commit-lint.log and commit-build.log in the existing temporary task folder. No full suite or Playwright gate was run for this isolated backend.
