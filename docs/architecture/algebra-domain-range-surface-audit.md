# Algebra Domain Range Surface Audit

Status: audit

Purpose: document the current Algebra domain/range, sampling readiness, value-domain metadata, and simplification trust surface before any future split. This surface is shared by Equation, Calculus, Table, symbolic-engine, display readback, and capability metadata.

## Current Public Surface

- `domain-range-core.ts`: real range proofs, interval formatting, domain-constraint collection, point/one-sided/interval domain checks, domain fact detail sections, and bounded sample policy.
- `domain-sampling-readiness.ts`: Table-facing expression parsing, sampled-point hazard detection, undefined-sample counting, and assumption facts for sampling readiness.
- `value-domain-core.ts`: answer-domain and solution-kind metadata, value-domain summaries, inequality facts, complex-domain notes, and domain-constraint metadata.
- `simplify-policy.ts`: simplification form intent, equivalence trust, preserved domain facts, antiderivative backcheck trust mapping, and adoptability policy.

## Responsibility Map

- Domain constraints: `domain-range-core.ts` owns collecting real-domain constraints for divides, logs, roots, negative powers, inverse trig ranges, trig carriers, and interval checks.
- Range proofs: `domain-range-core.ts` owns bounded exact range proofs for constants, positive exponentials, trig carriers, trig squares, roots, absolute values, sums, products, negation, and unknown fallbacks.
- Sampling readiness: `domain-sampling-readiness.ts` owns Table sampling metadata, hazard/undefined sample counts, and conversion to interval-hazard assumption facts.
- Value-domain metadata: `value-domain-core.ts` owns answer-domain summaries and fact aggregation; it does not choose solver routes.
- Simplify trust: `simplify-policy.ts` owns display-side equivalence/adoption trust and preserved fact metadata; it does not prove algebraic transformations by itself.

## Current Consumers

- Equation range impossibility, domain guards, mode tests, and guarded/shared solve readback.
- Calculus core and advanced-calculus integral checks.
- Table mode sampling readiness.
- Algebra assumptions/adapters, capability readiness, polynomial-domain, inequality, and assumption readback tests.
- Symbolic-engine integration simplification policy.

## Future Split Candidates

- `ALGEBRA-DOMAIN-RANGE-DISTRICT-SPLIT1`: split `domain-range-core.ts` into private modules for range proofs, constraint collection, constraint checking, interval formatting, and detail-section rendering if the file grows further.
- `ALGEBRA-DOMAIN-SAMPLING-TIDY1`: keep Table sampling readiness separate unless sampling grows beyond current expression/point metadata.
- `ALGEBRA-VALUE-DOMAIN-TIDY1`: tidy value-domain helpers only if new answer domains or solution kinds are added.
- `ALGEBRA-SIMPLIFY-POLICY-TIDY1`: keep simplification trust policy stable unless display/readback owns wording or adoption changes.

## High-Risk Contracts

- Preserve `SolveDomainConstraint` shapes and violation messages used by Equation, Calculus, Table, and assumption adapters.
- Preserve `domain-range-core`, `value-domain-core`, and `simplify-policy` source labels in assumption facts/readback.
- Preserve sampled/hazard/unknown status semantics for Table sampling readiness.
- Preserve real-range proof fallback behavior: unsupported proofs return unknown rather than speculative bounds.
- Preserve simplify trust levels and `canAdoptPolicyResult` semantics; do not turn display trust into solver proof.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/algebra/domain-range-core.test.ts src/lib/algebra/domain-sampling-readiness.test.ts src/lib/algebra/value-domain-core.test.ts src/lib/algebra/simplify-policy.test.ts`
- `npm run test:unit -- src/lib/algebra/assumption-adapters.test.ts src/lib/algebra/assumption-readback.test.ts src/lib/modes/equation.test.ts`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not move code or tests during this audit.
- Do not change domain/range proof behavior, sample hazard policy, answer-domain metadata, simplify trust, source labels, display/readback wording, solver behavior, schemas, capabilities, OOE/runtime policy, or replay/history contracts.
- Do not add graphing hooks, broad real-analysis solving, or a generic domain framework.
