# SYMBOLIC-PRIMITIVES-SURFACE-AUDIT0

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

## Scope

Audit the live Calcwiz repo for reusable symbolic primitive pressure after the Equation frontier run.

This is documentation and memory only. It does not move code, change solver behavior, add new public APIs, alter OOE, touch Display/History schemas, or create a broad CAS engine.

## Verdict

Calcwiz should name the five reusable algebraic building blocks **Symbolic Primitives** and promote them under dedicated folders instead of letting each solver family grow route-local mini-CAS mechanics.

Recommended future owner shape:

```text
src/lib/symbolic-engine/primitives/
  expansion/
  substitution/
  factorization/
  simplification/
  elimination/
```

The existing repo already has useful substrate pieces. The right move is promotion and adoption of proven seams, not a rewrite:

- `src/lib/symbolic-engine/` already owns normalized MathJSON helpers, factoring, rational/radical/power-log modules, integration/limits helpers, and pattern utilities.
- `src/lib/algebra/` already owns exact-rational polynomial, factorization, rational-function, radical, branch, assumption, and bivariate elimination cores.
- `src/lib/equation/` now owns frontier adapters that clearly expose repeated primitive pressure: symbolic factor patterns, carrier elimination, special-form roots, symbolic polynomial coefficients, product decomposition, branch/domain facts, and root readback.

## Primitive Surface Map

### Expansion

Current anchors:

- `src/lib/symbolic-engine/normalize.ts`
- `src/lib/symbolic-engine/patterns/structure.ts`
- `src/lib/algebra/radical/math-json.ts`
- `src/lib/equation/polynomial/carrier-follow-on.ts`
- `src/lib/equation/parameterized/mixed-algebraic.ts`
- `src/lib/equation/parameterized/symbolic-factor-patterns.ts`

Finding:

- There is no single general expansion primitive yet.
- Local expansion currently exists as route-specific MathJSON expansion, ComputeEngine `expand(...)` calls, and pattern flattening.
- Input canonicalization and implicit-product fixes are input hygiene, not algebraic expansion.

Recommended next primitive role:

- Produce bounded canonical sum/product forms that feed coefficient maps, factor discovery, carrier detection, and elimination.
- Stay deterministic and capped; do not become an unrestricted simplify engine.

### Substitution

Current anchors:

- `src/lib/algebra/variable-memory/substitution.ts`
- `src/lib/calculus/workspace/engine.ts`
- `src/lib/equation/substitution/`
- `src/lib/equation/parameterized/carrier-elimination.ts`
- `src/lib/equation/parameterized/special-form-roots.ts`
- `src/lib/equation/composition/periodic-resolution.ts`

Finding:

- Calcwiz has several substitution-like mechanisms with different meanings: stored-value substitution, carrier substitution, inverse/back-substitution, selected-target peeling, and Calculus parameter substitution.
- These should not collapse into one blind replace function.

Recommended next primitive role:

- Own structural substitution, protected-symbol policy, invertibility/domain facts, back-substitution evidence, and branch/fact propagation.
- Let route owners decide when substitution is semantically valid.

### Factorization

Current anchors:

- `src/lib/algebra/polynomial-factor/`
- `src/lib/symbolic-engine/factoring.ts`
- `src/lib/symbolic-engine/mixed-factor/`
- `src/lib/equation/parameterized/product-decomposition.ts`
- `src/lib/equation/parameterized/symbolic-factor-patterns.ts`
- `src/lib/equation/parameterized/factorable-polynomial.ts`

Finding:

- Algebra already owns exact-rational polynomial factorization.
- Symbolic Engine already owns expression factoring for user-facing transform work.
- Equation frontier work now carries bounded symbolic factor discovery for solving.
- This is a promotion opportunity, not permission to invent broad CAS factoring.

Recommended next primitive role:

- Generalize product decomposition, common-factor discovery, safe difference-of-powers, exact-rational factorization adapters, and carrier-pattern factoring behind a reusable primitive with clear caps and owner-specific consumers.

### Simplification

Current anchors:

- `src/lib/symbolic-engine/normalize.ts`
- `src/lib/symbolic-engine/rational/`
- `src/lib/symbolic-engine/radical/`
- `src/lib/symbolic-engine/power-log/`
- `src/lib/algebra/simplify-policy.ts`
- `src/lib/equation/parameterized/math-json.ts`
- `src/lib/equation/isolation/math-json.ts`
- `src/lib/trigonometry/normalize.ts`
- `src/lib/trigonometry/identities.ts`

Finding:

- Simplification is the riskiest primitive to define too broadly.
- The repo already separates bounded policy layers: normalization, rational normalization, radical transforms, power/log transforms, trig identity simplification, and Equation MathJSON arithmetic.

Recommended next primitive role:

- Start as a policy-governed simplification toolkit, not a universal reducer.
- Reuse expansion and factorization rather than duplicating them.
- Preserve route-owned semantics where simplification affects domains, branches, assumptions, or readability.

### Elimination

Current anchors:

- `src/lib/algebra/polynomial-elimination/`
- `src/lib/algebra/polynomial-bivariate-elimination.ts`
- `src/lib/equation/polynomial/system.ts`
- `src/lib/equation/parameterized/carrier-elimination.ts`
- `src/lib/linear-algebra/exact-matrix-core.ts`

Finding:

- Algebra already has bounded bivariate resultant/Sylvester cores.
- Equation now has both product-facing polynomial 2x2 system elimination and selected-target carrier elimination.
- These are related but not the same: systems elimination operates on variables; carrier elimination operates on explicit single-expression carriers and then back-substitutes through existing branch solvers.

Recommended next primitive role:

- Promote resultant and sequential substitution/elimination mechanics only after expansion and substitution primitives are stable.
- Keep Groebner/general multivariable CAS out of v1.

## Current Duplication Pressure

Highest-pressure Equation files:

- `src/lib/equation/parameterized/symbolic-factor-patterns.ts` - 825 lines.
- `src/lib/equation/parameterized/special-form-roots.ts` - 849 lines.
- `src/lib/equation/parameterized/carrier-elimination.ts` - 654 lines.
- `src/lib/equation/parameterized/symbolic-polynomial.ts` - 438 lines.
- `src/lib/equation/parameterized/product-decomposition.ts` - 116 lines.

Useful existing Symbolic Engine/Algebra substrate:

- `src/lib/symbolic-engine/factoring.ts` - 398 lines.
- `src/lib/symbolic-engine/normalize.ts` - 68 lines.
- `src/lib/symbolic-engine/patterns/structure.ts` - 169 lines.
- `src/lib/algebra/polynomial-factor/factorization.ts` - 131 lines.
- `src/lib/algebra/polynomial-elimination/solve.ts` - 78 lines.

Interpretation:

- Equation has accumulated frontier-specific adapters because the reusable primitive layer is not yet formalized.
- Symbolic Engine and Algebra already contain the seeds of the primitive layer.
- The next work should promote and govern these seams before adding many more frontier solver families.

## Governance Rule

Future code that needs expansion, substitution, factorization, simplification, or elimination should:

1. consume the relevant Symbolic Primitive when it exists;
2. add the primitive first if repeated mechanics are emerging;
3. or document why route-local logic is semantic/owned and should not be generalized yet.

This is an architecture rule for future work, not a current validator.

## Recommended Sequence

1. `SYMBOLIC-PRIMITIVES-COMPARTMENT-ROADMAP0`
   - Lock manifest posture, folder ownership, public/private seams, and adoption rules.
2. `SYMBOLIC-EXPANSION-PRIMITIVE1`
   - First implementation because coefficient maps, factor discovery, and elimination need canonical expanded forms.
3. `SYMBOLIC-SUBSTITUTION-PRIMITIVE1`
   - Promote protected substitution, carrier substitution, invertibility/domain facts, and back-substitution evidence.
4. `SYMBOLIC-FACTORIZATION-PRIMITIVE1`
   - Promote product decomposition, common factors, difference-of-powers, exact-rational adapters, and carrier-pattern factoring.
5. `SYMBOLIC-SIMPLIFICATION-PRIMITIVE1`
   - Compose normalization, rational, radical, power/log, and route-safe policies.
6. `SYMBOLIC-ELIMINATION-PRIMITIVE1`
   - Promote bounded resultant and substitution-based elimination after the earlier primitives exist.

## Non-Goals

- No source-mirror imitation.
- No broad CAS engine.
- No DAG/e-graph/search graph.
- No new solver capability in this audit.
- No OOE authority change.
- No Display/History/app-state/Tauri schema change.
- No graphing, step-by-step, Rust migration, or plugin system.
- No deletion of route-local logic before primitive parity tests exist.

## Closeout

`SYMBOLIC-PRIMITIVES-SURFACE-AUDIT0` is complete when this audit, durable memory, and session verification are recorded. Implementation should wait for a planned `1` milestone.
