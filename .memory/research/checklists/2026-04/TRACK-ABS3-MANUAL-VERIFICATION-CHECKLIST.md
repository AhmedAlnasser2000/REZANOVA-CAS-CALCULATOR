# TRACK-ABS3 Manual Verification Checklist

## What Is Achieved Now
- Stronger bounded absolute-value carrier families now close exactly through the existing shared `u = \pm v` branch model when each branch lands in already-shipped sinks.
- Supported exact closure now explicitly includes stronger polynomial, radical, rational-power, and stronger `|u| = |v|` carrier families.
- Recognized stronger-carrier families that still exceed the bounded sink set now report stronger branch-aware guidance instead of falling back to the older generic abs-family message.
- Transformed branch solving no longer leaks complex-only branch roots into merged exact real-output lines.

## Manual App Steps
1. In `Equation > Symbolic`, solve `|x^2+x-2|=3`.
2. In `Equation > Symbolic`, solve `2|x^2-1|+1=7`.
3. In `Equation > Symbolic`, solve `|\sqrt{x+1}-2|=1`.
4. In `Equation > Symbolic`, solve `|x^{1/3}-1|=2`.
5. In `Equation > Symbolic`, solve `|x^2-1|=|x+1|`.
6. In `Equation > Symbolic`, solve `|x^2+1|+1=e^x`.
7. In `Equation > Numeric Solve`, retry `|x^2+1|+1=e^x` on an interval like `[3, 5]`.

## Expected Results
- `|x^2+x-2|=3` returns the two real exact roots only, with bounded branch provenance.
- `2|x^2-1|+1=7` returns `x \in {-2, 2}` only; no complex roots appear in the exact line.
- `|\sqrt{x+1}-2|=1` returns `x \in {0, 8}` with the preserved `x+1 \ge 0` condition.
- `|x^{1/3}-1|=2` returns `x \in {-1, 27}` through the existing bounded power/root follow-on.
- `|x^2-1|=|x+1|` returns `x \in {-1, 0, 2}`.
- `|x^2+1|+1=e^x` stays unresolved exactly, but the symbolic stop text identifies it as a stronger absolute-value carrier family.
- Numeric follow-up for `|x^2+1|+1=e^x` reports stronger-carrier branch-aware guidance rather than the older generic abs-family wording.
