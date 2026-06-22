# SYMBOLIC-SIMPLIFICATION-SURFACE-AUDIT0

Date: 2026-06-22

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live repo inspection

## Summary

Audit-only milestone for the fourth Symbolic Primitive, simplification.

No source implementation landed in this audit. The mistakenly started empty `src/lib/symbolic-engine/primitives/simplification/` scratch directory was removed before writing this record.

The main finding is that Calcwiz has real simplification pressure, but it is not one thing:

- structural MathJSON cleanup and arithmetic helpers are repeated mechanics and are good primitive candidates;
- domain-aware transforms such as radical or power/log normalization already have policy and facts attached and should not be swallowed by a universal reducer;
- final-answer readback polish is a separate later product/readback milestone, not the first simplification primitive;
- route priority can affect readability even when math is correct.

## Surfaces Inspected

| Surface | Current role | Audit conclusion |
| --- | --- | --- |
| `src/lib/symbolic-engine/primitives/factorization/node-helpers.ts` | Local structural helpers: `simplifyNode`, `addNodes`, `multiplyNodes`, `negateNode`, `subtractNodes`, `squareNode`, `splitAdditiveTerms`, and `nodeKey`. | Best first consumer for a simplification primitive because these are reusable mechanics, not route-visible wording. |
| `src/lib/equation/parameterized/math-json.ts` | Shared Equation MathJSON arithmetic helper layer. | Similar mechanics exist here, but migration needs parity after the primitive shape is proven in factorization. |
| `src/lib/equation/complex/math-json.ts` | Complex-route local `simplifyNode`, LaTeX, and target checks. | Candidate later consumer only where semantics match; Complex readback/branch wording must stay route-owned. |
| `src/lib/algebra/polynomial-factor/math-json.ts` | Algebra exact-rational factorization helper over `normalizeAst` plus ComputeEngine simplify. | Algebra-owned exact-rational domain; do not migrate in simplification v1 without a dedicated Algebra parity pass. |
| `src/lib/algebra/simplify-policy.ts` | Readback/trust/fact policy for simplification-style outcomes. | Keep as policy/readback metadata; it is not the primitive's structural engine. |
| `src/lib/symbolic-engine/radical/` | Domain-aware radical normalization/rationalization with constraints. | Do not merge into v1. It carries branch/domain facts and mode policy. |
| `src/lib/symbolic-engine/power-log/` | Power/log/radical notation normalization and log combining with constraints. | Do not merge into v1. It is a specialized transform layer with fact policy. |
| `src/lib/symbolic-engine/normalize.ts` | Stable sorting/flattening normalization used across symbolic code. | Useful baseline, but too small to be the whole simplification primitive. |

## Findings

### 1. First simplification primitive should be structural

The clearest repeated mechanic is structural MathJSON cleanup:

- flatten `Add` and `Multiply`;
- drop additive and multiplicative identities;
- collapse simple `Negate` shapes;
- build bounded helper operations such as add/multiply/subtract/divide/square;
- split additive terms safely;
- produce stable structural keys.

This is the right first `SYMBOLIC-SIMPLIFICATION-PRIMITIVE1` because it can be verified with primitive tests and a single first consumer without changing solver judgment or visible results.

### 2. Do not make simplification a universal reducer

Several existing simplification-like routes carry semantic policy:

- radicals add nonnegative facts or rationalization evidence;
- power/log normalization can introduce domain facts;
- Algebra exact-rational helpers rely on exact polynomial/rational domains;
- Equation readback helpers preserve existing `exactLatex`, `branchReadback`, facts, and stop wording.

The primitive should not absorb those policies in v1. It should provide a shared structural toolkit that those owners may later compose with explicit parity tests.

### 3. Final-answer readback polish is real but later

Manual QA has shown polish defects such as:

- `0 + ...`;
- reducible arithmetic fragments like `(-1+1)/2`;
- equivalent radical spellings;
- sign/fraction cleanup;
- earlier local double-`i` risks.

These are readback/product-polish issues, not the first simplification primitive. They should wait until after all five Symbolic Primitives are established, then use the primitive stack as a route-safe backend for a dedicated readback-polish milestone.

### 4. Grouped-factor readability is route priority, not primitive v1

The example `x*(x+a)+b*(x+a)=0` can be recognized by the factorization primitive as a grouped factor case, but the app's current route order can still let the generic quadratic family claim the answer first. The result is mathematically correct but less readable than the structural factor roots.

That should be recorded as a later route/readback polish candidate:

- prefer a structurally factorable exact route over generic quadratic formula output when both are valid and validated;
- preserve correctness and facts;
- do not change this during simplification primitive v1.

## Recommended `SYMBOLIC-SIMPLIFICATION-PRIMITIVE1`

### Scope

Add a private primitive under:

```text
src/lib/symbolic-engine/primitives/simplification/
```

Recommended v1 API shape:

- bounded `simplifyMathJsonNode(...)` / `simplifyMathJsonNodeOrOriginal(...)`;
- structural arithmetic helpers for add, multiply, negate, subtract, divide, and square;
- `splitAdditiveTerms(...)`;
- stable structural key helpers;
- node-count metadata and capped unsupported reasons.

### First Consumer

Refactor only:

```text
src/lib/symbolic-engine/primitives/factorization/node-helpers.ts
```

Keep the factorization primitive's public behavior unchanged.

### Non-goals

- no broad ComputeEngine simplify pass over final answers;
- no final-answer readback polish;
- no route-priority changes;
- no branch-changing simplification without facts;
- no Algebra exact-rational migration;
- no radical/power-log/trig identity migration;
- no public primitive facade;
- no OOE, Display, History, app-state, Tauri, UI, graphing, or step-by-step work.

## Verification

Audit-only verification:

- `npm run test:memory-protocol`
- `git diff --check`

Source implementation gates remain for the later primitive milestone.
