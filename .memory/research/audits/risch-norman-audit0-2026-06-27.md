# RISCH-NORMAN-AUDIT0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Scope

Audit readiness for a bounded Risch-Norman layer after the agreed Rubi Tier I closeout. This is a backend/docs readiness audit only:

- no runtime behavior change
- no new integration rule
- no public Calculus result or strategy schema change
- no Display, History, OOE, Tauri, persistence, or Equation-lane edit
- no Rubi/SymPy/source-mirror runtime dependency

The goal is to decide what must exist before Calcwiz starts implementing Risch-Norman-style ansatz integration, so the next track does not become another pile of route-local rules.

## Current Repo Snapshot

- Rubi Tier I is closed for the agreed exact-rational plus target-free symbolic scope by `RUBI-TIER1-CLOSEOUT-GATED1`.
- The current symbolic integration dispatch is classifier-driven: `classifyIntegrandForm()` builds a route plan, and `resolveSymbolicIntegralFromAst()` tries known route families in precedence order.
- Calculus verification already differentiates antiderivatives and can prove many exact cases, but numeric-confidence adoption is not acceptable for symbolic Risch-Norman results.
- The live worktree has active dirty Equation-lane files. This audit did not edit or stage them.

## Existing Substrates

### Route Discipline

Current evidence:

- `src/lib/symbolic-engine/integration/classifier.ts`
- `src/lib/symbolic-engine/integration/dispatch.ts`

Readiness:

- Ready for an internal bounded Risch-Norman branch after higher-precedence direct, substitution, inverse-trig, and rational families.
- Not ready for a public `risch-norman` strategy label without a separate product/readback decision.
- The classifier should stay a route-family profiler, not become the ansatz engine.

Recommended policy:

- Add Risch-Norman as an internal integration attempt behind a narrow eligibility profile.
- Preserve existing visible strategies until the user explicitly approves public strategy wording.

### Differentiation

Current evidence:

- `src/lib/symbolic-engine/differentiation.ts`
- `src/lib/calculus/engine/verification.ts`

Readiness:

- Supports polynomial, product, quotient, chain, powers, logs, basic trig, reciprocal trig, inverse trig, inverse hyperbolic, square roots, and positive exact numeric-base exponentials.
- Falls back to Compute Engine for unknown derivative heads.
- Good enough for existing exact backchecks.

Gap for Risch-Norman:

- Risch-Norman proof should not depend on Compute Engine fallback.
- The engine needs a derivative-closed internal basis model, such as:
  - `D(e^(a*x+b)) = a*e^(a*x+b)`
  - `D(sin(a*x+b)) = a*cos(a*x+b)`
  - `D(cos(a*x+b)) = -a*sin(a*x+b)`
  - `D(ln(a*x+b)) = a/(a*x+b)`
- This derivative closure must be explicit and test-facing before adoption.

### Polynomial And Rational Cores

Current evidence:

- `src/lib/algebra/polynomial-core/`
- `src/lib/algebra/rational-function/`
- `src/lib/algebra/rational-function-core.ts`

Readiness:

- One-variable exact-rational polynomial parsing, arithmetic, division, GCD, factorization, and rational normalization are available under strict caps.
- Partial fractions support bounded linear and irreducible quadratic denominator families.
- This is enough for rational-in-selected-variable subproblems inside a first bounded Risch-Norman slice.

Gap for Risch-Norman:

- The current polynomial/rational cores are not a general coefficient field over target-free symbolic expressions.
- A Risch-Norman ansatz with symbolic parameters needs coefficient comparison and solving over a target-free expression domain, not only exact numeric rationals.

### Linear Solving

Current evidence:

- `src/lib/linear-algebra/exact-matrix-core.ts`
- `src/lib/symbolic-engine/integration/exact-parts.ts`
- `src/lib/algebra/rational-function/partial-fractions.ts`

Readiness:

- A bounded exact-rational matrix core exists for small square systems.
- Integration-by-parts already has a local exact-rational Gaussian solve for polynomial times affine trig.
- Rational partial fractions use the shared exact linear solver in a capped numeric-rational setting.

Gap for Risch-Norman:

- There is no general symbolic linear-system solver over target-free coefficient expressions.
- A safe first implementation should either:
  - build a tiny integration-local linear solver over a deliberately small target-free expression domain, or
  - first promote a shared algebra-level symbolic linear-system primitive with explicit caps and facts.

Do not create another private Gaussian solver per Risch-Norman family.

### Facts, Exclusions, And Valid-When Readback

Current evidence:

- `src/types/calculator/solver-types.ts`
- `src/types/calculator/exact-supplement-types.ts`
- `src/lib/algebra/exact-supplements.ts`
- `src/lib/algebra/assumption-adapters.ts`

Readiness:

- Domain-neutral `SolveDomainConstraint` and `ExactSupplementEntry` paths exist.
- Calculus already uses exact supplements for visible `Valid When` facts.
- Equation-specific branch wrappers are not needed for the first Risch-Norman substrate.

Policy:

- Reuse domain-neutral constraint/supplement helpers.
- Do not import Equation-owned branch-domain wrappers into Calculus.
- If a missing fact helper is genuinely shared, factor it under algebra/symbolic code before Calculus consumes it.

### Verification

Current evidence:

- `src/lib/calculus/engine/verification.ts`
- exact rational, radical, and trig identity normalizers under `src/lib/calculus/engine/`

Readiness:

- Exact derivative backcheck is strong for existing bounded families.
- Route-local proof objects are already accepted for symbolic coefficient cases when exact backcheck cannot prove a symbolic identity.

Gap for Risch-Norman:

- Risch-Norman symbolic results must not be adopted through numeric-confidence sampling.
- First Risch-Norman adoption must carry either:
  - route-local proof from a derivative-closed ansatz system, plus visible facts, or
  - existing exact backcheck where it genuinely proves the symbolic case.

## What Risch-Norman Should Mean Here

For Calcwiz, the first Risch-Norman layer should not mean full Risch, transcendental Risch, or non-elementary certificates.

It should mean a bounded ansatz engine for high-frequency transcendental integrals that Rubi Tier I currently handles through separate patterns:

- polynomial times affine exponential
- polynomial times positive-base affine exponential
- polynomial times affine sine/cosine pairs
- selected log-derivative and affine-log cases
- small mixtures where derivative closure gives a finite linear system

The implementation should generate a candidate basis, differentiate the unknown-coefficient candidate symbolically, equate coefficients, solve the bounded system, emit visible facts, and only then adopt.

## Required Building Blocks Before Runtime Adoption

1. **Extension profiler**
   - Detect one selected integration variable.
   - Classify target-free symbols and target-dependent atoms.
   - Recognize allowed primitive extensions, such as affine `exp`, `sin/cos` pairs, positive-base exponentials, and affine logs.
   - Reject nested/non-affine/transcendental towers outside the first profile.

2. **Derivative-closed basis model**
   - Represent each extension with its derivative rule.
   - Prove generated basis derivatives stay inside the selected finite span.
   - Avoid Compute Engine derivative fallback inside the proof path.

3. **Ansatz basis generator**
   - Generate polynomial-coefficient bases under explicit degree/node caps.
   - Keep basis size visible in tests and diagnostics.
   - Refuse over-cap systems quickly.

4. **Coefficient comparison**
   - Normalize expressions into basis coefficients.
   - Distinguish selected-variable powers from target-free coefficient expressions.
   - Avoid broad algebraic simplification or arbitrary expression equality.

5. **Symbolic linear solver**
   - Solve bounded systems over exact rationals and target-free symbolic coefficient expressions.
   - Emit determinant/nonzero facts such as `a\ne0` or `a^2+b^2\ne0` when needed.
   - Stop cleanly on singular, underdetermined, or over-cap systems.

6. **Fact/readback adapter**
   - Reuse `ExactSupplementEntry` and `SolveDomainConstraint`.
   - Render facts through existing `Valid When`.
   - Keep result schema unchanged unless a later UI/product milestone approves a richer proof display.

7. **Verification/adoption gate**
   - No numeric-confidence adoption for symbolic Risch-Norman outputs.
   - Use route-local proof plus exact facts, or exact derivative backcheck.
   - Record unsupported cases through existing controlled metadata.

## Recommended Next Milestones

### `RISCH-NORMAN-SUBSTRATE1`

Backend-only, no integration adoption.

- Add an internal extension profile for selected-variable expressions.
- Recognize affine exp, positive-base affine exp, affine sin/cos pairs, and affine logs.
- Produce a derivative-closure/basis-readiness object for tests.
- Reject nested/non-affine/branch-sensitive forms.

Why first:

- It creates the representation Risch-Norman needs without changing user-visible integration behavior.

### `RISCH-NORMAN-LINEAR-SOLVER1`

Backend-only primitive/support milestone.

- Add or promote a bounded symbolic linear-system helper for target-free coefficient expressions.
- Start with small square systems and explicit nonzero determinant facts.
- Reuse exact-rational matrix solving where the coefficient matrix is purely exact-rational.

Why second:

- Without this, every Risch-Norman family will grow its own mini solver.

### `RISCH-NORMAN-EXP-TRIG-ANSATZ1`

First behavior milestone, still no public strategy/schema change.

- Use the substrate to solve polynomial times affine exponential and polynomial times affine sine/cosine through the ansatz path.
- Keep existing Rubi Tier I direct/by-parts results as precedence-compatible.
- Accept only when proof facts are complete.

Why third:

- It exercises the full pipeline on the highest-frequency Calc II families while overlapping with already-known tests.

### `RISCH-NORMAN-LOG-DERIVATIVE-AUDIT0`

Readiness audit before log-heavy behavior.

- Decide whether the next log slice is simple affine-log by-parts generalization, rational logarithmic derivatives, or a proper Liouville/log-part substrate.
- Document required branch/domain facts and readback policy.

Why audit:

- Logarithmic cases are where accidental false generality becomes easy.

## Explicit Stop Lines

- Do not implement full Risch or transcendental Risch yet.
- Do not claim non-elementary certificates yet.
- Do not handle arbitrary algebraic extensions, elliptic/hyperelliptic cases, special functions, or nested radical towers.
- Do not use Compute Engine as proof for parameter-heavy symbolic Risch-Norman results.
- Do not import Rubi, SymPy, or source-mirror code at runtime.
- Do not add a public `risch-norman` strategy label until product/readback wording is approved.

## Audit Verdict

Calcwiz is ready to start a Risch-Norman substrate track, but not ready to implement a broad Risch-Norman integrator in one jump.

The correct next step is `RISCH-NORMAN-SUBSTRATE1`: build the internal extension profile and derivative-closed basis evidence first. Then add a bounded symbolic linear solver or shared coefficient-domain helper before any new runtime adoption. This keeps the next layer algorithmic and inspectable instead of continuing the Rubi pattern-addition loop.
