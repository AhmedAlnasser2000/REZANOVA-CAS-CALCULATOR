# EQUATION-RECONSTRUCTION-CLOSEOUT1: corpus, capability ledger, retirement

This is stage 17, the last stage of Phase 1 of the [reconstruction roadmap](equation-reconstruction-roadmap.md). The user approved it on 2026-10-14.

The stage has two parts:
- **PR A** runs New Equation's core on a corpus of every equation the old engine was tested on. It fixes what the corpus exposes and records the evidence in the [capability ledger](equation-capability-ledger.md).
- **PR B** retires the old Equation workspace and engine.

## User decisions

**2026-10-14**
- **Retirement.** Both the old workspace and its engine are retired. New Equation becomes "Equation".
- **No parity features.** New Equation gains no feature just to match the old workspace.
- **History.** All History is wiped once, with a notice.
- **No parity bar.** The comparison with the old engine is dropped as a bar: that engine is almost defunct, often solved for a parameter instead of the unknown, and gave unconditioned answers. The corpus tests the new core alone.
- **Runs past 60 s are fixed.** Every corpus run killed at 60 s is fixed with exact methods and no caps. A fix ends in an answer, or in a typed stop that arrives in seconds.

**2026-10-15**
- **All five last cases fixed before PR A.**
- **Many parameters.** The complete case list is the answer, merged where possible (no typed stop for size).
- **The constant i in Real mode.** Real mode restricts the unknown, not the constants, as in Mathematica: the problem is decided over ℂ and intersected with ℝ.
- **Galois groups and a shared factorization layer** need the user's approval first. Neither was needed.

## PR A: corpus, fixes, capability ledger

### A1. Corpus and harness (`tools/equation-parity/`)

- `corpus.json` (committed) holds 1,540 problems:
  - the 50 cases of the baseline table in the [inventory](equation-reconstruction-inventory.md);
  - every equation-like string literal in the old engine's tests (their expectations are not used).
  - `mine-corpus.mjs` produced it. `String.raw` literals keep their backslashes.
- `run.mjs` runs the corpus over ℝ and over ℂ in four batch processes:
  - a parent watchdog kills a run still going at 60 s (SIGKILL, so a busy loop cannot ignore it);
  - runs resume after the last recorded result;
  - results are keyed by problem text.
- `runner.ts` decides, verifies and records each run's outcome, values, verification and timing.
- `report.mjs` sorts the runs into classes:
  - exact;
  - certified;
  - refused, a typed outcome (input the lowering rejects with a typed message counts here);
  - failed;
  - killed;
  - unreadable, meaning strings that are not equations.
  It also groups the refusals and lists the runs that took 10–60 s.

### A2. Fixes (`src/lib/symbolic-engine/equation/core/`)

Everything below is exact: no time limit, cap or rounding decides anything.

**Exact zeros that sign tests refined forever**
- `representation/angles.ts` `expandDeep`: expansion inside function arguments, so the builders' folds apply.
- `log-zero.ts`: sums of logarithms combined on the positive reals.
- `kernel-identity.ts`: values as rational functions of their kernels, with these parts:
  - exponentials grouped by direction (exp(2 + 2i) = exp(1 + i)²);
  - radical relations reduced in one pass per relation;
  - a normal form with gcd cancellation;
  - denominator rationalization over square-root kernels (i = √−1).
- `defined-folds.ts`: folds of defined values that the builders keep for domain reasons:
  - 0·t;
  - (u^a)^n;
  - e^{c·ln A};
  - odd symmetry;
  - principal-branch inverses, certified by enclosures;
  - kernel normal forms of arguments.
- `periodic/rectangular.ts`: the complex zero test.
  - A 64-bit enclosure that excludes 0 settles "nonzero".
  - Otherwise field arithmetic on the complex form, with log(exp a) = a when |Im a| < π.

**Angles**
- `arc-unit.ts`: e^{i·arc u} from a direct annihilator:
  - degree 2d for acos;
  - the norm of a Gaussian one, degree 4d, for asin and atan.
- `unit-circle.ts`: cos θ and sin θ of a unit point.
  - They come from its self-reciprocal minimal polynomial (Dickson polynomials).
  - |W| = 1 is certified by root identity.

**Algebraic numbers**
- `algebraic/arithmetic.ts`:
  - αⁿ from one resultant of degree deg α;
  - q·α by scaling the minimal polynomial.
- `root-identity.ts`: the root index is memoized per root.
- `decision/number-field-zeros.ts`: zeros of a polynomial whose one algebraic coefficient is γ.
  - Uses dynamic evaluation in ℚ(γ)[y]: a gcd with each norm factor, and the split h = G·(h/G).
  - No Liouville bound is needed.
- `parameters/verify.ts`: conditions at algebraic samples.
  - Signed modulo the sample's minimal polynomial.
  - Otherwise by a certified enclosure before exact evaluation.

**Parameters**
- `parameters/shift.ts`: the shift test (decomposition with a linear inner component), and closed forms of binomial roots.
  - (x + a)¹³ = b gives x = b^{1/13} − a.
- `parameters/product.ts`: the zero-product split (factor first).
- `parameters/exclusions.ts`: exclusion splitting for one equation with denominators.
  - The complete case list.
- `parameters/outer-power.ts`: outer-power decomposition, u(x)ⁿ = b through u = w.
  - It falls back to the previous route where it cannot express an answer.

**Radicals**
- `constraints/radical-chain.ts`: chains of square roots, by isolating and squaring.
  - Polynomial sign conditions are decided exactly by `signAtReal`.
  - Used both by the decision and by the verifier.

**Routing and verification**
- `real-restriction.ts`: equations with i in Real mode.
  - Decided over ℂ, then intersected with ℝ by exact imaginary-part tests.
- `decision/rules.ts`: the polynomial conversion goes to its fixed point.
- `parameters/specialize.ts`: samples with transcendental constants go to the constants slice.
- `composition/families.ts`: points where φ′ is undefined cut the monotone pieces.
- `generators/closed-form-set.ts`: a point where an atom is undefined does not satisfy it.
- `generators/verify.ts`: samples inside narrow members come from refined enclosures.

**Tests**
- `core/closeout/slow-cases.test.ts` and `core/parameters/shift.test.ts` cover every fixed corpus case.

### A3. Capability ledger

- [equation-capability-ledger.md](equation-capability-ledger.md) records the final corpus run:
  - counts by class over ℝ and ℂ;
  - the refusal groups, each mapped to the Phase 2 ledger row that owns it;
  - the runs that take 10–60 s.
- The old engine's numbers are an informative appendix, not a bar.

### Verification (PR A)

- The equation core and New Equation unit suites, typecheck and ESLint.
- The final corpus run: no run killed at 60 s, no failed run.
- The probe tool `tools/equation-slow-case-probe.mjs` for single cases.

## PR B: retirement

PR B follows PR A as planned. These items are recorded here when PR B is delivered:
- workspace availability;
- the History wipe;
- Graphing's complex sampling moving under New Equation (marked "temporary, must be replaced later", C5);
- the shared input policy;
- the deletions;
- the ratchet changes the user approves.
