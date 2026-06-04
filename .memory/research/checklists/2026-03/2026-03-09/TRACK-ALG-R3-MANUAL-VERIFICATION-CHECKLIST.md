# Track ALG-R3 Manual Verification Checklist

## Achieved Now
- `Equation > Symbolic` now clears supported LCDs for bounded rational equations and solves the resulting exact equation while preserving denominator exclusions.
- `Equation > Symbolic` now isolates supported radicals, applies bounded exact power transforms, and validates candidate roots back against the original equation.
- `Equation > Symbolic` now supports bounded affine-radicand and simple nth-root solve cases when the transformed equation lands inside the existing guarded solver.
- `Equation > Symbolic` now recognizes bounded square-root-binomial conjugate families and reports them with explicit algebra provenance instead of silently pretending to solve unsupported cases.
- Shared solve provenance now includes:
  - `LCD Clear`
  - `Radical Isolation`
  - `Conjugate Transform`
  - `Candidate Checked` when transformed candidates were validated

## App Steps
1. In `Equation > Symbolic`, enter `\frac{1}{x}+\frac{1}{x+1}=1` and solve.
Expected:
- a symbolic solution set appears with `\sqrt{5}`
- a second exact line shows exclusions including `x \ne 0` and `x+1 \ne 0`
- provenance includes `LCD Clear`

Pass/Fail Notes:
- Pass. Browser automation returned `x ∈ { (1-√5)/2, (1+√5)/2 }`, showed `Exclusions: x ≠ 0, x+1 ≠ 0`, and displayed `LCD Clear` plus `Candidate Checked`.

2. In `Equation > Symbolic`, enter `\frac{x^2-1}{x-1}=0` and solve.
Expected:
- result is `x=-1`
- excluded `x=1` is not returned
- second exact line preserves the original exclusion for `x-1`

Pass/Fail Notes:
- Pass. Browser automation returned `x = -1`, preserved `Exclusions: x-1 ≠ 0`, and did not surface the excluded root `x = 1`.

3. In `Equation > Symbolic`, enter `\sqrt{x}=3` and solve.
Expected:
- result is `x=9`
- no false extra root appears

Pass/Fail Notes:
- Pass. Browser automation returned `x = 9` with `Conditions: x ≥ 0`. No extra root appeared.

4. In `Equation > Symbolic`, enter `\sqrt{x+1}=x-1` and solve.
Expected:
- only the valid root `x=3` remains
- no extraneous root is shown

Pass/Fail Notes:
- Pass. Browser automation returned only `x = 3`. No extraneous root appeared.

5. In `Equation > Symbolic`, enter `\frac{1}{\sqrt{x}}=2` and solve.
Expected:
- result is `x=\frac{1}{4}`
- no invalid root is shown
- the condition line remains mathematically compatible with the original equation

Pass/Fail Notes:
- Pass. Browser automation returned `x = 1/4` with `Conditions: x ≠ 0, x ≥ 0`. No invalid root appeared.

6. In `Equation > Symbolic`, enter `\sqrt[3]{2x-1}=3` and solve.
Expected:
- result is `x=14`
- provenance includes `Radical Isolation`

Pass/Fail Notes:
- Pass. Browser automation returned `x = 14` and displayed `Radical Isolation` plus `Candidate Checked`.

7. In `Equation > Symbolic`, enter `\frac{1}{x+\sqrt{2}}=0` and solve.
Expected:
- no false symbolic solution is claimed
- if unresolved, the result still stays controlled and shows the preserved denominator condition
- if a conjugate transform message/badge appears, it must remain mathematically honest

Pass/Fail Notes:
- Pass. Browser automation returned a controlled error: `This recognized radical conjugate family is outside the current exact bounded solve set. Use Numeric Solve with an interval in Equation mode.` The condition line preserved `x + √2 ≠ 0`, and `Conjugate Transform` appeared without claiming a fake solution.

8. In `Trigonometry > Equation Solve`, re-run a previously supported trig equation such as `\sin(x)=\frac{1}{2}`.
Expected:
- existing trig exact behavior remains unchanged
- `Send to Equation` still appears only for unresolved-but-numeric-eligible trig cases

Pass/Fail Notes:
- Pass. Browser automation re-ran `sin(x)=1/2` and the exact solve still succeeds. The unresolved trig handoff rule remains covered by the existing QA1 smoke (`cos(x)=x` shows `Send to Equation` only when unresolved and numeric-eligible).

## Evidence Commands
- `npm run test:gate`
