# Equation Reconstruction Inventory and Baseline

Date: 2026-10-03
Scope: design investigation at `main` / `6a93236`. The old engine is not edited. This file records its caps and its observed behaviour as lessons and as a "before" baseline. Old code is not reused; old tests are a problem corpus only.

Companion: [design](equation-reconstruction-design.md), [blueprint](equation-reconstruction-blueprint.md), [roadmap](equation-reconstruction-roadmap.md).

## Why a new private core

The old engine routes a request through eight guarded stages (`src/lib/equation/guarded/run.ts:46-120`): Numeric Interval, Bounded Polynomial, Algebra Transform, Composition, Direct Trig, Rewrite Trig, Substitution and Direct Symbolic. Capability is decided by which matcher fires and by fixed bounds. Raising the bounds moves the wall, but the architecture still has walls. When a cap is hit, the result is usually reported as `kind: 'unsupported'` (for example `src/lib/equation/polynomial-boundary.ts:287,306`) or as a failed numeric search. That conflates "cap reached" with "mathematically unsupported" and, as the baseline shows, sometimes with "no roots".

## Cap classes

- **Shape cap**: limits problem structure (depth, count, degree). The new core has no equivalent; cost is governed only by the shared budget.
- **Exponential algorithm**: the cap exists because the algorithm is exponential where a polynomial-time one exists. Replace the algorithm.
- **Output size**: rejects a correct answer for its printed size. Use structural answers; overflow is a resource condition.
- **Math boundary**: a real mathematical fact handled wrongly as a refusal. Use the correct exact representation instead (for example RootOf).
- **Numeric control**: a parameter of an approximate method. The new core uses certified methods with error control, under the budget.

## Caps in the old engine

Runtime profile budgets, `src/lib/kernel/runtime-profile.ts:20-24`: `maxRecursionDepth` 4, `maxCompositionInversionDepth` 3, `maxPeriodicReductionDepth` 3, `maxRadicalTransformSteps` 2 and `maxRepeatedClearingSteps` 1. All are shape caps. Their real purpose is termination, which the new core gets from progress measures, a visited set and iterative deepening.

| Path | Constant | Value | Class | Lesson |
| --- | --- | --- | --- | --- |
| `equation/polynomial-boundary.ts:53` | `MAX_DEGREE` | 4 | Math boundary | Degree ≥ 5 is exact via RootOf; no radical formula is needed |
| `equation/polynomial-boundary.ts:54` | `MAX_PARAMETERS` | 6 | Shape | Parameters are a coefficient field; case trees cost budget, not a count |
| `equation/parameterized/formula-rational-normalization.ts:52` | `MAX_RATIONAL_FORMULA_DEGREE` | 4 | Math boundary | As above |
| `equation/parameterized/carrier-elimination.ts:49` | `MAX_CARRIER_ELIMINATION_TARGET_DEGREE` | 12 | Shape | Elimination by subresultants has polynomial cost |
| `equation/parameterized/mixed-algebraic.ts:33` | `MAX_MIXED_CARRIERS` | 2 | Shape | Radicals are generators; any number are eliminated by resultants |
| `equation/parameterized/mixed-algebraic-branches.ts:26` | `MAX_GENERATED_BRANCHES` | 8 | Shape | Lazy branching with propagation; real branch counts can be 2ⁿ legitimately |
| `equation/parameterized/special-form-roots.ts:40` | `MAX_SPECIAL_FORM_TOTAL_DEGREE` | 12 | Shape | General factorization replaces special forms |
| `equation/parameterized/factorable-polynomial.ts:37-38` | `MAX_EXPANDED_EXACT_RATIONAL_FACTORABLE_DEGREE`, `MAX_EXPLICIT_PRODUCT_TARGET_DEGREE` | 12, 12 | Shape | Zassenhaus/Hensel factorization at any degree |
| `equation/parameterized/cubic-cardano.ts:63-64` | `MAX_CARDANO_EXACT_LATEX_LENGTH`, `…_BRANCH_…` | 4200, 1600 | Output size | Correct formulas are rejected for their LaTeX length; RootOf plus optional radical presentation |
| `equation/parameterized/quartic-ferrari.ts:57-58` | `MAX_FERRARI_EXACT_LATEX_LENGTH`, `…_BRANCH_…` | 5200, 1400 | Output size | As above |
| `equation/isolation/selected-target.ts:101` | `DEFAULT_MAX_PEELS` | 6 | Shape | The expression graph plus range/injectivity replaces peeling |
| `equation/isolation/selected-target.ts:102` | `DEFAULT_COMPACT_TARGET_MAX_LATEX_LENGTH` | 220 | Output size | Size is never a solvability criterion |
| `equation/isolation/algebraic-power.ts:39-40` | `MAX_COMPLEX_ALGEBRAIC_POWER`, `MAX_REAL_AFFINE_ALGEBRAIC_POWER` | 4, 12 | Shape | Powers are polynomial relations |
| `equation/composition/targets.ts:32` | `MAX_TRIG_BRANCHES` | 12 | Shape | A family restricted to an interval is a k-range, not an enumeration |
| `equation/composition/trig-carrier.ts:47` | `MAX_TRIG_BRANCHES` | 12 | Shape | As above |
| `equation/inequality/types.ts:78` | `DEFAULT_MAX_REDUCTION_DEPTH` | 4 | Shape | Termination by measure |
| `equation/readback/normalization.ts:19-20` | `MAX_NORMALIZATION_PASSES`, `MAX_RADICAND_NORMALIZATION_DEPTH` | 6, 4 | Shape | Canonical forms by construction, not by repeated passes |
| `equation/polynomial/system.ts:46,48` | `DEFAULT_MAX_CANDIDATE_PAIRS`, `FRONTIER_PROJECTED_POLYNOMIAL_MAX_DEGREE` | 24, 12 | Shape | Gröbner bases, then RUR, give exact zero-dimensional output |
| `equation/numeric-domain-constraint-facts.ts:10` | `MAX_BOUNDARY_DEGREE` | 64 | Shape | Root isolation handles any degree |
| `equation/complex/special-form-carrier.ts:18` | `MAX_COMPLEX_SPECIAL_FORM_DEGREE` | 12 | Shape | Complex root isolation |
| `equation/complex/meromorphic-policy.ts:43` | `MAX_POLE_POLYNOMIAL_DEGREE` | 64 | Shape | As above |
| `equation/complex/contour-moments.ts:38` | `MAX_SUPPORTED_MOMENT_ROOT_COUNT` | 2 | Shape | Certified isolation instead of contour moments |
| `equation/complex/locus-evidence.ts:46` | `MAX_CANDIDATE_LINES` | 6 | Shape | Out of the first scope; revisit with complex loci |
| `equation/complex/seed-grid-newton.ts:57` | `DEFAULT_MAX_ITERATIONS` | 40 | Numeric control | Certified iteration with proof of enclosure |
| `equation/guarded/numeric-stage.ts:15` | `MAX_VISIBLE_NUMERIC_INTERVAL_ROOTS` | 64 | Output size | Structural results, with overflow as a resource condition |
| `equation/numeric-interval/types.ts:11` | `ADAPTIVE_MAX_EXTRA_SAMPLES` | 2048 | Numeric control | Exclusion proofs replace sampling |
| `equation/numeric-interval/newton-pruning.ts:19` | `MAX_DERIVATIVE_SPREAD_RATIO` | 8 | Numeric control | As above |
| `equation/solve-result/contract.ts:12-17` | `EQUATION_SOLVE_RESULT_MAX_NODES/DEPTH/BYTES/CANDIDATES/VALIDATIONS/ANALYSIS_EVIDENCE` | 20 000 / 64 / 1.28 MB / 2048 / 4096 / 2048 | Output size | V6 must report overflow as a resource condition |
| `symbolic-engine/primitives/simplification/simplification.ts:40` | `DEFAULT_MAX_NODE_COUNT` | 2000 | Shape | The expression graph shares nodes; cost is budgeted |
| `symbolic-engine/primitives/substitution/substitution.ts:4` | `DEFAULT_MAX_NODE_COUNT` | 2000 | Shape | As above |
| `symbolic-engine/primitives/expansion/expansion.ts:51` | `maxNodeCount` | 2000 | Shape | As above |
| `symbolic-engine/primitives/coefficient-domain.ts:65` | `COEFFICIENT_SIMPLIFY_LIMIT` | 700 | Shape | Exact coefficient fields need no simplifier |
| `symbolic-engine/primitives/symbolic-polynomial/types.ts:7` | `DEFAULT_SYMBOLIC_POLYNOMIAL_MAX_DEGREE` | 8 | Shape | Dense/sparse exact polynomials at any degree |
| `symbolic-engine/primitives/symbolic-polynomial/types.ts:8` | `…_MAX_SYLVESTER_DIMENSION` | 6 | Exponential algorithm | Subresultants |
| `symbolic-engine/primitives/symbolic-polynomial/types.ts:9` | `…_MAX_DETERMINANT_TERMS` | 720 = 6! | Exponential algorithm | `resultant.ts:91-118` expands Sylvester determinants by cofactors (n! work); Bareiss or subresultants are polynomial |

Shared output caps that any Equation result meets at adoption: `src/lib/result-contract/validation.ts:12-14` (`CANONICAL_RESULT_MAX_NODES` 10 000, depth 64, 640 KB) and `src/lib/display/printer/math-json.ts:5` (`MATH_JSON_MAX_NODES` 2000). V6 and the New Equation display must treat overflow as a resource condition.

The repository's own cap review, `src/lib/equation/cap-hit-evidence.test.ts`, classifies 12 caps:

- `recalibration-candidate`: peel depth and composition branch count;
- `algorithm-boundary`: symbolic polynomial degree, rational cleared degree and algebraic power degree;
- `readback-boundary`: compact formula length, factorable degree and formula size;
- `semantic-boundary`: mixed carrier count, composition depth and composition periodic parameter count;
- `static-guard`: mixed generated branch count.

Its "algorithm-boundary" and "semantic-boundary" entries are exactly the ones the new core removes by algorithm choice.

## Baseline probe

The command was a read-only Vitest probe in `.task_tmp/equation-reconstruction-design1/`, calling `runEquationMode` (`src/lib/modes/equation/run.ts:219`) with:

- `equationScreen: 'symbolic'`, target `x`;
- `equationAnswerMode: 'exact'`, `equationDomainIntent: 'real'`;
- `angleUnit: 'rad'`.

Interval cases (T6, N1, N2) pass `numericInterval`. There were 50 equations, run serially, with a total runtime of about 165 s. A secondary probe sent the same corpus through the lower-level `runGuardedEquationSolve`. Differences from the app path:
- It refuses polynomials of degree ≥ 5, symbolic parameters and the exp/log cases outright. The app path falls back to numeric answers or to its separate parameterized route.
- It reports sin 2x = cos x as a finite set, with the periodic families only in warning text. Timings are from a cloud container with Node 22 (the repository targets Node 24) and are indicative only.

| Class | Count | IDs |
| --- | --- | --- |
| Exact, correct | 27 | P1–P3, P5–P8, P10, P11, R1, R2, Q1, S1–S3, A1, A4, E9, T1, T2, T4, T5, T7, C1, C2, C4, C5 |
| Approximate only, although an exact or RootOf answer exists | 13 | P4, P9, E2–E8, C3, C6, C7, T6 |
| Numeric, appropriately | 2 | N1, N2 |
| Refused or mislabelled, although solvable | 6 | E1, Q2, S4, T3, M1, R3 |
| False "no roots" | 2 | A2, A3 |

Observations the new core must not repeat:

- **False negatives.** ||x−1|−2| = 3 (roots −4, 6) and |||x|−1|−2|−3| = 1 (six roots) are reported as having no validated real roots.
- **Decimals inside "exact" answers.** In C3, `arcsin(0.100504)` should be arcsin(arcsin(arcsin(1/10))). In C6 and C7, `e^{15.154…}` should be e^{e^{e}}.
- **Exact mode returning decimals.** E2–E8 and P4/P9 return `x ≈ …` in exact mode. E1 (e^{2x}−5e^{x}+6 = 0, answer ln 2, ln 3) fails outright, while the structurally identical E2 returns decimals after 22.7 s.
- **Unsimplified exact values.** P3 shows {60/−20, 20/−20, 1, −60/−20}.
- **Status conflation.** R3 has no solutions (its numerator root is excluded), but it reports a failed numeric search and deferred complex display. T3 has the exact family x = π/2 + kπ, but it asks for an interval.
- **Cost from search, not mathematics.** The cubic in ln x (E6) takes 38.6 s; generator algebraization reduces it to a cubic with roots 1, 2, 3.

Per-case results (output truncated to 90 characters):

| ID | Equation | Expected | Old engine (exact mode, real) | Class | ms |
| --- | --- | --- | --- | --- | --- |
| P1 | `x^2-5x+6=0` | x=2,3 | x\in\left\{2,\ 3\right\} | exact, correct | 1032 |
| P2 | `x^3-6x^2+11x-6=0` | x=1,2,3 | x\in\left\{1, 2, 3\right\} | exact, correct | 312 |
| P3 | `x^4-10x^2+9=0` | x=±1,±3 | x\in\left\{\frac{60}{-20}, \frac{20}{-20}, 1, \frac{-60}{-20}\right\} | exact, correct | 304 |
| P4 | `x^5-x-1=0` | one real RootOf (not solvable in radicals) | x\approx 1.167304 | approximate only | 590 |
| P5 | `x^5-2=0` | x=2^{1/5} (solvable quintic) | x=\sqrt[5]{2} | exact, correct | 401 |
| P6 | `x^6-1=0` | x=±1 real | x\in\left\{1,\ -1\right\} | exact, correct | 145 |
| P7 | `x^8-17x^4+16=0` | x=±1,±2 real | x\in\left\{-2,\ 2,\ -1,\ 1\right\} | exact, correct | 161 |
| P8 | `x^5+x^4-5x^3-x^2+8x-4=0` | x=1 (mult 3), x=-2 (mult 2) | x\in\left\{-2,\ 1\right\} | exact, correct | 237 |
| P9 | `x^7-3x+1=0` | 3 real RootOf | x\approx\left\{-1.249223, 0.333486, 1.133197\right\} | approximate only | 613 |
| P10 | `x^{20}-1=0` | x=±1 real | x\in\left\{1, -1\right\} | exact, correct | 293 |
| P11 | `x^9-9=0` | x=9^{1/9} | x=\sqrt[9]{9} | exact, correct | 407 |
| R1 | `\frac{x^2-1}{x-1}=2` | no solution (x=1 excluded) | error: No valid real symbolic solution remains after applying denominator exclusions. | exact, correct | 669 |
| R2 | `\frac{1}{x}+\frac{1}{x+1}=1` | x=(1±√5)/2 | x\in\left\{\frac{1}{2}-\frac{\sqrt{5}}{2}, \frac{1}{2}+\frac{\sqrt{5}}{2}\right\} | exact, correct | 2714 |
| R3 | `\frac{x^3+1}{x^2-1}=0` | no solution (x=-1 excluded) | error: No validated real numeric roots were found. Complex numeric root display is deferre | refused / mislabelled | 934 |
| Q1 | `ax^2+bx+c=0` | quadratic formula with cases | x\in\left\{-\frac{b}{2a}-\frac{\sqrt{b^2-4ac}}{2a},\ \frac{\sqrt{b^2-4ac}}{2a}-\frac{b}{2a | exact, correct | 3157 |
| Q2 | `x^5+ax+1=0` | RootOf in parameter a | error: This equation has more than one selected-target island. | refused / mislabelled | 822 |
| S1 | `\sqrt{x+1}=x-2` | x=(5+√13)/2 | x=\frac{5}{2}+\frac{\sqrt{13}}{2} | exact, correct | 2056 |
| S2 | `\sqrt{x}+\sqrt{x+1}=3` | x=16/9 | x=\frac{16}{9} | exact, correct | 3225 |
| S3 | `\sqrt[3]{x}+\sqrt{x}=2` | x=1 | x=1 | exact, correct | 2986 |
| S4 | `\sqrt{x}+\sqrt{x+1}+\sqrt{x+2}=5` | one real root (≈1.7) | error: This recognized radical family is outside the current exact bounded solve set. Use  | refused / mislabelled | 3605 |
| A1 | `\|x-1\|=3` | x=-2,4 | x\in\left\{4, -2\right\} | exact, correct | 1117 |
| A2 | `\|\|x-1\|-2\|=3` | x=-4,6 | error: No validated real numeric roots were found after guarded piecewise branch solving. | **false no-roots** | 793 |
| A3 | `\|\|\|x\|-1\|-2\|-3\|=1` | x=±1,±5,±7 (6 roots) | plain bars: parse error; with `\left\|…\right\|` input: "No validated real numeric roots were found in the bounded automatic search windows." | **false no-roots** | 221 |
| A4 | `\|x-1\|+\|x+2\|=5` | x=-3,2 | x\in\left\{2, -3\right\} | exact, correct | 4610 |
| E1 | `e^{2x}-5e^x+6=0` | x=ln2, ln3 | error: Exact answer mode could not produce a trustworthy exact closed form. | refused / mislabelled | 1081 |
| E2 | `e^{4x}-5e^{2x}+4=0` | x=0, ln2 | x\approx\left\{0, 0.693147\right\} | approximate only | 22652 |
| E3 | `e^{x/2}+e^x=6` | x=2ln2 | x\approx 1.386294 | approximate only | 4207 |
| E4 | `e^{3x}-4e^{2x}+5e^x-2=0` | x=0, ln2 | x\approx\left\{0, 0.693147\right\} | approximate only | 19372 |
| E5 | `2^x+4^x=6` | x=1 | x\approx 1 | approximate only | 2171 |
| E6 | `(\ln x)^3-6(\ln x)^2+11\ln x-6=0` | x=e,e^2,e^3 | x\approx\left\{2.718282, 7.389056, 20.085537\right\} | approximate only | 38590 |
| E7 | `(\ln x)^6-5(\ln x)^3+4=0` | x=e, e^{∛4} | x\approx\left\{2.718282, 4.891021\right\} | approximate only | 22186 |
| E8 | `xe^x=1` | x=W0(1) | x\approx 0.567143 | approximate only | 3721 |
| E9 | `e^x=-3` | no real solution | \varnothing | exact, correct | 626 |
| T1 | `\sin x=\frac{1}{2}` | two periodic families | x\in\left\{\frac{\pi}{6}+2\pi n,\ \frac{5\pi}{6}+2\pi n\right\} | exact, correct | 1408 |
| T2 | `3\sin^2x+2\sin x-1=0` | sin x=1/3 or -1 families | x\in\left\{\arcsin(\frac{1}{3})+2\pi n, \ \pi-\arcsin(\frac{1}{3})+2\pi n, \frac{3\pi}{2}+ | exact, correct | 3446 |
| T3 | `\sin^4x-5\sin^2x+4=0` | x=π/2+kπ | error: Periodic numeric solving needs a real interval before it can enumerate local roots. | refused / mislabelled | 1112 |
| T4 | `\sin x+\cos x=1` | x=2kπ, π/2+2kπ | x\in\left\{\arcsin(\frac{\sqrt{2}}{2})-\left(\frac{\pi}{4}\right)+2\pi n,\ \pi-\arcsin(\fr | exact, correct | 317 |
| T5 | `\sin(2x)=\cos x` | cos x=0 or sin x=1/2 families | x\in\left\{\frac{\pi}{2}+\pi n,\ \frac{\pi}{6}+2\pi n,\ \frac{5\pi}{6}+2\pi n\right\} | exact, correct | 374 |
| T6 | `\sin x=0` | 32 roots on [0,100] | x ~= 0, 3.141593, 6.283185, 9.424778, 12.566371, 15.707963, 18.849556, 21.991149, 25.13274 | approximate only | 768 |
| T7 | `\sin x=2` | no real solution | \varnothing | exact, correct | 638 |
| C1 | `\sin\left(\cos\left(x\right)\right)=\frac{1}{2}` | families via arccos(arcsin(1/2)) | x\in\left\{2\pi k+\arccos(\frac{\pi}{6}), 2\pi k-\arccos(\frac{\pi}{6})\right\} | exact, correct | 337 |
| C2 | `\sin\left(\cos\left(e^{x}\right)\right)=\frac{1}{2}` | families in e^x>0 | x\in\left\{\ln(2\pi k+\arccos(\frac{\pi}{6})), \ln(2\pi k-\arccos(\frac{\pi}{6}))\right\} | exact, correct | 349 |
| C3 | `\sin\left(\sin\left(\sin\left(\sin\left(x\right)\right)\right)\right)=\frac{1}{10}` | two families (depth 4, injective inner ranges) | x\in\left\{2\pi k+\arcsin(0.100\,504), 2\pi k+\pi-\arcsin(0.100\,504)\right\} | approximate only | 748 |
| C4 | `\cos\left(\cos\left(\cos\left(\cos\left(\cos\left(\cos\left(\cos\left(x\right)\right)\right)\right)\right)\right)\right)=\frac{1}{2}` | no solution (range argument, depth 7) | error: No real solutions because the proven inner image makes the outer trig target unreac | exact, correct | 377 |
| C5 | `e^{\sin x}=2` | sin x=ln2 families | x\in\left\{2\pi k+\arcsin(\ln(2)), 2\pi k+\pi-\arcsin(\ln(2))\right\} | exact, correct | 510 |
| C6 | `\ln\left(\ln\left(\ln\left(x\right)\right)\right)=1` | x=e^{e^e} | x=\exponentialE^{15.154\,262\,241\,479\,264} | approximate only | 2848 |
| C7 | `\ln\left(\ln\left(\ln\left(\ln\left(x\right)\right)\right)\right)=0` | x=e^{e^e} | x=\exponentialE^{15.154\,262\,241\,479\,264} | approximate only | 4228 |
| M1 | `\sqrt{x}+\sqrt[3]{x}+\sqrt[4]{x}=3` | x=1 | error: This recognized radical family is outside the current exact bounded solve set. Use  | refused / mislabelled | 914 |
| N1 | `\cos x=x` | one real root (≈0.739), numeric only | x ~= 0.739085 | numeric (appropriate) | 323 |
| N2 | `\sin x=x^2` | x=0 and ≈0.877 | x ~= 0, 0.876726 | numeric (appropriate) | 383 |

Raw results stay in `.task_tmp/equation-reconstruction-design1/` (`apppath-results.json`, `baseline-results.json`, `recheck-results.json`); they are git-ignored working evidence.

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live
