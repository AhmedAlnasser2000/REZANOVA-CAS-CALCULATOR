# Equation capability ledger (EQUATION-RECONSTRUCTION-CLOSEOUT1)

This ledger records New Equation's core on the stage-17 corpus. The details of the stage are in the [stage specification](equation-reconstruction-closeout1-spec.md).

**Corpus** (`tools/equation-parity/corpus.json`, frozen 2026-10-14)
- 1,540 problems:
  - the 50 baseline cases of the [inventory](equation-reconstruction-inventory.md);
  - every equation-like string in the old Equation engine's tests.
- Each problem runs over ℝ and over ℂ: 3,080 runs.
- The 60-second rule applies: a run still going at 60 s is killed and counted.

**Final run:** branch `claude/confident-goodall-fbqe99-stage17`, 2026-10-15. The default limits apply (2·10¹⁰ work units), with decision and verification sharing one budget.

To reproduce:

```
node tools/equation-parity/run.mjs 4 --fresh --tag=final
node tools/equation-parity/report.mjs --tag=final
```

## Result

| Class | ℝ | ℂ | Meaning |
| --- | ---: | ---: | --- |
| Exact | 1,053 | 694 | Decided and verified: closed forms, algebraic numbers, families, case lists |
| Certified | 16 | — | Isolated real roots or points with certificates |
| Refused (typed) | 383 | 758 | A typed outcome naming its owner; includes 247 inputs the row reader rejects with a typed message |
| Failed | 0 | 0 | Verification failed, a crash or an internal error |
| Killed at 60 s | 0 | 0 | |
| Unreadable | 88 | 88 | Corpus strings that are not equations (answers and prose in the old tests) |

**Timing**
- Median 6 ms per run; 90th percentile 131 ms; 99th percentile 4.6 s.
- 2,990 runs finish under 1 s and 3,066 under 10 s.
- 14 runs take 10–60 s (listed below).

**Progress during the stage**
- Runs killed at 60 s went from 38 to 0.
- The 25 internal errors and the 4 verification failures the corpus exposed are fixed.
- The machinery is listed in the stage specification.

## Refusals and the rows that own them

Every refusal is a typed outcome. Each group is owned by a row of the [deferred-items ledger](equation-reconstruction-roadmap.md#deferred-follow-ups-all-gates) or by the Phase 2 and Phase 3 table.

| Runs | Refusal | Example | Owner |
| ---: | --- | --- | --- |
| 224 | Absolute values and radicals of the target over ℂ | `√(x+1) = x − 2` (ℂ) | C1 (Phase 2) |
| 195 | Inequalities over ℂ (input) | `−1 ≤ b ≤ 1` (ℂ) | By design: ℂ is not ordered; regions in ℂ are C2/C3 |
| 160 | Transcendental constants or functions of the parameters with parameters | `Re(z) = 1` | Transcendental constants with parameters (Phase 2); Re, Im, \|z\| on unknowns are C1 |
| 112 | Kernels of the target with parameters over ℂ | `sin(tan z) = a` (ℂ) | Kernels with parameters over ℂ (Phase 2) |
| 66 | Kernel argument not affine in the target, with parameters | `\|1/(z − a)\| = b` | Kernel levels with parameters (Phase 2) |
| 55 | Mixed or nested kernels with parameters | `√(z+a) + √(z+b) + √(z+c) = d` | Mixed kernels with parameters (Phase 2) |
| 34 | Exponentials of non-polynomial arguments (numeric over ℂ) | `sin(cos x) = ½` (ℂ) | C5 (Phase 2) |
| 32 | The target outside its kernel, with parameters | `z + eᶻ = a` | Mixed kernels with parameters (Phase 2) |
| 24 | The variable outside exp/log kernels over ℂ | `x·eˣ = 1` (ℂ) | C5 (Phase 2) |
| 20 | Several relations in the target with several parameters over ℂ | `1/(z−a) + 1/(z−b) + 1/(z−c) = d` (ℂ) | C4 (Phase 2) |
| 14 | A family level for a non-quadratic inner equation | `sin((x−1)/(x+2)) > ½` | Nested families (Phase 2) |
| 13 | The target in an exponent with parameters | `aᶻ + bᶻ = c` | Kernel levels with parameters (Phase 2) |
| 22 | Degree 3–5 equations with transcendental coefficients | `sin((2x+1)³) = 0` (ℂ) | A RootOf expression node (Phase 2) |
| 12 | Work budget (typed `resource` stop) | `sin 4x + sin 6x = 1` (ℂ) | Exact parts off the unit circle (Phase 2, new row); quartics in five parameters |
| 11 | A parameter case bounded by a root of degree ≥ 3 | `((z³+z+1)/(z−m))² = b` | Root values inside conditions (Phase 2) |
| 17 | asin or atan of the variable over ℂ | `arcsin(2x − 1) = 30` (ℂ) | C6 (Phase 2) |
| 10 | No target variable | `0 ≥ 0` | By design (a statement, not an equation) |
| 10 | The constant i in Real mode beyond one unknown without parameters | `xi + index + iota = 0` | i in Real mode (Phase 2, new row) |
| 13 | Families in integer parameters with other families, or outside one equation | `tan(\|x − 4\|) > 1` | Families in several integer parameters (Phase 2) |
| 9 | tan or asin of the target with parameters | `sin(tan z) = a` | Kernel levels with parameters (Phase 2) |
| 3 | A kernel level of degree ≥ 2 with parameters | `b/√(a+c+v+x) = u²` | Kernel levels with parameters (Phase 2) |
| 7 | A non-rational multiple of a logarithm | `log(x² + 9x − 5) = log(8x + ln 4)` (ℂ) | Wider log lattice (Phase 2) |
| 12 | Systems: inequalities, conditions with kernels, several targets | `x + cos y ≠ 0` | Systems with kernels and conditions (Phase 2) |
| 3 | The complement of an infinite family over ℂ | `cos x ≠ 0` (ℂ) | Complex exclusions with families (Phase 2) |
| 11 | Other small groups: a family level for several kernels, an exclusion from a non-affine family, several exponentials behind a family, mixed periodic atoms, independent exponential generators, … | | Composition and certified-numerics rows (Phase 2) |
| 52 | Input forms the row reader rejects (besides the 195 inequalities over ℂ): subscripts, ±, ∪, Max/Min, factorial, degree signs, integrals, overbar, ∞̃ | `\max(x⁷ − x, 0) = 5` | Input vocabulary (Phase 2, new row) |

## Runs that take 10–60 s

None is over 60 s. Nine end in the typed work stop:
- quartics with five parameters through the decomposition;
- (a(z⁴+z+1) + c)/(d(z⁴+z+1) + h) = b;
- (z³+z+1)/(z−m) = b³;
- sin 4x + sin 6x = 1 over ℂ.

The others are decided and verified:

| Time | Problem |
| ---: | --- |
| 53 s | 1/(z−a) + 1/(z−b) + 1/(z−c) = d (ℝ) |
| 35 s, 29 s | y = (x²−1)(x²−4)(x²−9)(x²−16)(x²−25)(x²−36) (ℝ, ℂ) |
| 14 s | b⁴⁵ = n·v·m³ (ℂ) |
| 14 s | \|x⁷ − x\| = 5 (ℝ) |
| 12 s | (z³ + z + 1)¹⁴ = b (ℂ) |

## Appendix: the old engine on the same corpus (informative, not a bar)

The old engine ran on the same problems with a 10-second limit (user decision, 2026-10-14). Its numbers are given for context only:
- it often solved for a parameter instead of the unknown;
- its answers carried no conditions;
- "answered" below does not mean the answer was correct or complete.

| Class | ℝ | ℂ |
| --- | ---: | ---: |
| Answered | 748 | 765 |
| Approximate (numeric fallback) | 25 | 16 |
| Refused or error | 328 | 334 |
| Over 10 s | 437 | 422 |
