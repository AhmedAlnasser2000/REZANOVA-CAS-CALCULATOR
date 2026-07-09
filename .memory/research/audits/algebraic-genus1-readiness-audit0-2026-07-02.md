# ALGEBRAIC-GENUS1-READINESS-AUDIT0

Date: 2026-07-02

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Audit only. This milestone plans the first practical genus-1 algebraic integration push after the live genus-0 layer. It does not change runtime behavior, solver dispatch, public Calculus schemas, Display schemas, Equation code, History, OOE, Tauri, persistence, or integration code.

The current screenshot error for `sqrt(x^3+x+1)` is intentionally not treated as a failure to fix here. The boundary message is expected for the current genus-0 layer; this audit treats cubic and quartic square-root curves as future elliptic/genus-1 candidates.

## Current Baseline

The current implementation already has the prerequisites that make a genus-1 push plausible:

- One-radical profiling under `src/lib/symbolic-engine/integration/algebraic-genus0/profile.ts`.
- Standard genus-0 radical integration and inverse readback under `algebraic-genus0/`.
- Boundary classification for squarefree cubic/quartic radicals under `algebraic-genus0/genus1-boundary.ts`.
- Shared exact-rational and target-free symbolic coefficient primitives from the RN/LRT work.
- Symbolic polynomial, resultant, squarefree, algebraic-root descriptor, Hermite, and LRT/logarithmic infrastructure for rational reductions.
- Exact supplement/fact readback for nonzero, positivity, branch, and denominator facts.
- Exact antiderivative verification/backcheck.
- Special-function input/readback patterns for `erf`, `erfi`, `Si`, `Ci`, `Ei`, `li`, `FresnelS`, and `FresnelC`.

What is not present yet:

- Elliptic integral heads and differentiation rules.
- Genus-1 curve normal forms and branch/domain facts.
- A differential-basis reduction for `R(x, y) dx` on `y^2 = P_3(x)` or `y^2 = P_4(x)`.
- Exact readback from curve normal forms back to the user's variable.
- UI evidence discipline for large case/fact/readback cards in the algebraic integration lane.

## Readback Polishing Prerequisite

Before visible genus-1 answers, fix scalar product readback such as `2*1/a*sqrt(a*x+b)` into `2/a * sqrt(a*x+b)` or `\frac{2}{a}\sqrt{a x+b}`. This is not mathematically hard, but it matters because elliptic answers will be visually denser than genus-0 answers.

This polish should be scoped to generated exact algebraic/integration readback, not broad Display simplification. It should include UI verification because the problem is presentation credibility, not only symbolic equality.

## UI Verification Policy

For future live algebraic integration milestones, unit tests are not enough. Each live milestone that changes answer readback, facts, casewise rows, or result cards must include:

- focused symbolic-engine/integration tests,
- focused Calculus workspace tests where request shape or variable threading is involved,
- Playwright e2e/UI smoke for at least one representative successful answer and one stop/certificate case,
- screenshot or locator evidence that `Answer`, `Valid When`, detail cards, and copy/replay affordances remain readable,
- `npx tsc -b --pretty false`,
- `node tools/validate-file-sizes.mjs`,
- `npm run test:memory-protocol`,
- `git diff --check`.

Audit-only milestones do not need Playwright unless they inspect or document UI evidence. Runtime milestones that touch only internal proof substrate can use direct tests first, but the first visible consumer must include Playwright.

## Genus-1 Target

The practical first target is real-variable elliptic integration for one square-root extension:

- `R(v, y) dv`, where `y^2 = P(v)`.
- `P` is squarefree cubic or quartic.
- First live coefficients should be exact-rational.
- Target-free symbolic coefficients can be profiled early, but live symbolic branches should wait until normal-form, root-order, discriminant, and branch facts are safe to state.

This is not full algebraic-function-field Risch. It is a practical genus-1 layer that can honestly return named elliptic-integral answers or controlled genus-1 boundary/certificate messages.

## Required Function Heads

The first visible genus-1 answers require elliptic integral heads:

- `EllipticF(phi, m)`.
- `EllipticE(phi, m)`.
- `EllipticPi(n, phi, m)`.

Before these heads appear in main answers, the repo needs:

- MathJSON node representation.
- canonical input/paste/readback names,
- exact differentiation rules,
- notation-safe copy and history replay,
- Display/readback support,
- branch/fact details,
- verification tests.

Raw `RootOf` should not appear in the main answer. Named algebraic roots may appear in details only when definitions are visible and copy-safe.

## Curve And Branch Facts Needed

Genus-1 work needs facts beyond current genus-0 facts:

- squarefree cubic/quartic discriminant nonzero,
- repeated-root degeneration to genus 0,
- real root count and root ordering for real branch readback,
- radicand sign interval constraints,
- substitution denominator exclusions,
- pole exclusions for third-kind terms,
- branch row caps and controlled over-cap stops,
- exact-rational versus symbolic coefficient scope.

The first live exact-rational slice can avoid much of symbolic branch explosion by computing concrete root descriptors and producing named-root definitions. Symbolic branches should remain readiness/test-facing until branch rows are readable and capped.

## Recommended Thirteen-Milestone Push

The user asked for an aggressive genus-1 push with major gated milestones. The audit recommends thirteen milestones. The first two are prerequisites; the final one is audit-only closeout.

### 1. `ALGEBRAIC-GENUS1-READINESS-AUDIT0`

This audit. Docs and memory only.

### 2. `ALGEBRAIC-READBACK-SCALAR-PRODUCT-NORMALIZATION1`

Fix generated exact algebraic readback such as `2*1/a` and scalar-times-radical products.

Internal gates:

- Gate A: identify producer paths for genus-0 algebraic exactLatex.
- Gate B: add scoped product/fraction normalization.
- Gate C: unit tests for algebraic readback.
- Gate D: Playwright UI smoke for `1/sqrt(a*x+b)` and `x^2/sqrt(4-x^2)`.

### 3. `ELLIPTIC-FUNCTION-SUBSTRATE1`

Add behavior-invisible `EllipticF`, `EllipticE`, and `EllipticPi` MathJSON/readback/differentiation support.

Internal gates:

- Gate A: node/readback names.
- Gate B: exact differentiation formulas.
- Gate C: copy/history notation tests.
- Gate D: derivative workspace Playwright smoke if the heads are user-enterable.

### 4. `ALGEBRAIC-GENUS1-CURVE-PROFILER1`

Extend the algebraic profiler to classify squarefree cubic/quartic one-radical curves.

Internal gates:

- Gate A: exact-rational cubic/quartic radicands.
- Gate B: symbolic readiness profile without adoption.
- Gate C: repeated-root degeneration detection.
- Gate D: stop reasons for nested radicals, multiple radicals, degree `5+`, decimals, and `Abs`.

### 5. `ALGEBRAIC-GENUS1-REAL-BRANCH-FACTS1`

Add branch/fact evidence for real square-root curves.

Internal gates:

- Gate A: squarefree/repeated-root facts.
- Gate B: real interval sign facts for exact-rational roots.
- Gate C: named-root detail readback.
- Gate D: UI smoke for fact cards and controlled boundary stops.

### 6. `ALGEBRAIC-GENUS1-NORMAL-FORM-EXACT-RATIONAL1`

Convert exact-rational cubic/quartic radical curves to a bounded elliptic normal form.

Internal gates:

- Gate A: cubic normalization.
- Gate B: quartic normalization.
- Gate C: root-descriptor definitions.
- Gate D: inverse map/readback readiness.

### 7. `ALGEBRAIC-GENUS1-DIFFERENTIAL-BASIS-REDUCTION1`

Reduce `R(v, y) dv` into rational derivative terms plus first/second/third-kind elliptic basis obligations.

Internal gates:

- Gate A: parse rational-in-radical differential.
- Gate B: exact derivative/rational part removal.
- Gate C: first-kind basis detection.
- Gate D: second/third-kind basis readiness evidence.

### 8. `ALGEBRAIC-GENUS1-FIRST-KIND-LIVE1`

Make first-kind elliptic cases live, such as reciprocal square roots of squarefree cubic/quartic polynomials.

Examples:

- `1/sqrt(x^3+x+1)`.
- `1/sqrt((x-a)*(x-b)*(x-c))` only when facts/readback are safe.

### 9. `ALGEBRAIC-GENUS1-SECOND-KIND-LIVE1`

Make second-kind cases live, such as square-root numerators and selected polynomial-over-root cases after reduction.

Examples:

- `sqrt(x^3+x+1)`.
- `x^2/sqrt(x^3+x+1)` when reduction is clean.

### 10. `ALGEBRAIC-GENUS1-THIRD-KIND-LIVE1`

Make third-kind cases live for simple poles over a genus-1 radical.

Examples:

- `1/((x-r)*sqrt(P3(x)))`.
- bounded exact-rational pole cases with visible exclusions.

### 11. `ALGEBRAIC-GENUS1-RATIONAL-IN-RADICAL-HERMITE1`

Generalize the rational-in-radical reduction to mixed rational functions over one genus-1 radical.

This should reuse Hermite/LRT-style rational reductions where valid and keep adoption proof-based.

### 12. `ALGEBRAIC-GENUS1-SYMBOLIC-PARAMETER-SLICE1`

Admit a small symbolic parameter slice only after exact-rational readback is stable.

Likely first symbolic scope:

- monic cubic with target-free symbolic lower coefficients,
- or cubic with named roots and explicit distinct-root facts.

Do not attempt broad symbolic quartic branch splitting here.

### 13. `ALGEBRAIC-GENUS1-PRACTICAL-CHECKPOINT0`

Audit-only closeout. Record live elliptic coverage, UI evidence, remaining gaps, and whether to proceed to genus-1 certificates, genus-2 boundary, or the Stewart/Thomas benchmark sweep.

## Future Acceptance Matrix

These are future test targets, not claims about current runtime behavior.

| Input | Future expected class |
| --- | --- |
| `sqrt(x^3+x+1)` | genus-1 second-kind elliptic answer or controlled first implementation stop |
| `1/sqrt(x^3+x+1)` | genus-1 first-kind elliptic answer |
| `x/sqrt(x^3+x+1)` | reduced first/second-kind elliptic combination |
| `1/((x+1)*sqrt(x^3+x+1))` | third-kind elliptic answer with pole exclusion |
| `sqrt(x^4+x+1)` | quartic genus-1 second-kind answer after quartic normal form |
| `1/sqrt(x^4+x+1)` | quartic first-kind answer |
| `sqrt((x-1)^2*(x+2))` | repeated-root degeneration; should route to genus 0 or controlled degeneration stop |
| `sqrt(x^5+x+1)` | beyond genus 1 / hyperelliptic deferred |
| `sqrt(x^3+x+1)+sqrt(x^2+1)` | multiple independent radical stop |
| `sqrt(sqrt(x)+1)` | nested radical stop |

## Explicit Deferrals

- Full algebraic-function-field Risch.
- Genus 2 and hyperelliptic adoption.
- Broad symbolic quartic branch splitting.
- Complex branch cuts and periods.
- Equation consumption of integration-owned genus/Risch machinery.
- Public `algebraic-risch`, `elliptic`, or `genus` strategy labels.
- Runtime dependency on Rubi, SymPy, FriCAS, or source mirrors.

## Audit Conclusion

Genus 1 is not a small extension of genus 0. It is a named-special-function layer with heavier branch facts, normal forms, and UI readability obligations. The current repo is ready to start because genus 0 now has a profiler, facts, inverse readback, exact verification, and controlled genus-1 boundary stops. The safe aggressive path is thirteen major gated milestones: one audit, one readback polish prerequisite, one elliptic-function substrate, nine implementation/proof milestones, and one checkpoint.

The next implementation should not begin with `sqrt(x^3+x+1)` directly. It should first fix scalar-product readback and add elliptic head/differentiation/readback support, then make the first-kind exact-rational reciprocal-root family live with Playwright evidence.

## Post-Audit Roadmap Addendum

After the audit, the follow-on roadmap was expanded at user request to sixteen future moves, excluding this completed audit. The expansion adds stronger readback normalization, a dedicated UI evidence harness, degeneration facts, named-root readback, and an antiderivative quality gate before definite-integral work.

The superseding sequence is recorded in `.memory/research/roadmaps/algebraic-genus1-integration-roadmap.md`.
