# Periodic gate verification (parts A and B)

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

## Backend gate: pass

- **Environment**: cloud container, Node v22.22.2 (the repository requires 24.x); tools invoked directly with `node`.
- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 26 files / 338 tests (63 new). The isolation test and the no-caps ratchet cover `core/periodic/`.
- **Reference digits** come from Python mpmath, never a runtime dependency:
  - enclosures of sin 1, cos 1, sin 10⁶, cos(−7/3), tan ½, atan 2, asin(1/3), acos(−2/3) and asin(99/100) (40 digits);
  - atan x + atan 2x = π/4 gives (−3 + √17)/4 = 0.280776406404415137455352463994 (30 digits).
- **Real bugs found and fixed**:
  1. Exact zero products (0·asin(1/3), (π − a) − (π − a)) were not recognized, and refinement ran to the budget. The fix: asin/acos of rationals in [−1, 1] are real constants, exact evaluation gives 0 for a zero factor, and the angle zero test expands products over sums.
  2. With transcendental coefficients the half-angle roots of sin(x+1) + cos x differ by exactly π, which hid a period halving. The fix: the harmonic form R·sin(w + φ) + γ.
  3. Clearing (1 + t²) denominators through `rationalForm` inflated the half-angle degree. The fix: they are cleared exactly by homogeneous parts.
- **Intended behavior changes in existing tests**:
  - a slice-2 routing row (e^{sin x} = 2) and a slice-3 routing row (sin|x| = 0) are now solved here; they are replaced by eˣ + sin x and sin|x| + x, which still name certified numerics;
  - the slice-2 complex refusal message now names trig.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed. Every file is under 1000 lines.
- **Not run**: no full suite and no UI gate, because there is no product caller.

## Documentation checks

- See commit-log.md.

## Part B backend gate: pass

- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 28 files / 387 tests (49 new) in about 68 s.
- **Reference digits** (Python mpmath, 40 digits): exp(1 + i), Log(1 + i), sin(1 + 2i), cos(2 − i), Log(−3 + 4i) and √(ln 2 + 2πi), each enclosed in both parts.
- **Real bugs found and fixed**:
  1. Log(e^{1+i}) was rebuilt from |w| = e·√(cos²1 + sin²1), an identity only refinement could confirm, so the decision ran to the budget. Log∘exp is now structural (Im reduced into (−π, π] by an exact turn floor).
  2. 0·i terms survived (i is undefined over ℝ, so the store keeps them); zero multiples are no longer built.
  3. (√A)² stayed unsimplified in rectangular parts, so the verifier refined forever on e^{z²} = 2; (B^r)ⁿ = B^{r·n} under the principal value.
- **Intended behavior changes in existing tests**: two routing rows (complex eˣ = 2, complex sin x = 1/2) that expected the part-A refusal now expect exact families.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed. Every file is under 1000 lines (the largest changed file is `representation/expression.ts` at 688).
