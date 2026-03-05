# Track B1 Manual Verification Checklist

Date: 2026-03-05
Status: Pending user run

## Achieved Now
- Bounded trig equation matching now supports affine arguments (`kx+b`) and linear wrappers (`a*f(kx+b)+d=c`) for `sin`, `cos`, and `tan`.
- Shared direct trig solve path now maps solutions from `y=kx+b` back to `x`.
- Trig rewrite matching accepts affine arguments for selected rewrite families.
- Bounded mixed same-argument linear trig family was added: `a*sin(A)+b*cos(A)=c`.

## Manual Steps
1. Open `Equation > Symbolic`.
Expected:
- Solve `sin(x+30)=1/2` and confirm non-error symbolic output for `x`.
- Badge row includes trig backend provenance.
Pass/Fail: ___

2. In `Equation > Symbolic` solve `cos(2x-\frac{\pi}{3})=0` with angle unit `RAD`.
Expected:
- Equation solves in bounded mode without unsupported-family error.
- Output is shown in radian form.
Pass/Fail: ___

3. In `Trigonometry > Equations > Solve`, run `3sin(x+45)-1=0`.
Expected:
- Equation solves directly in Trigonometry via shared backend.
- No forced handoff to Equation when symbolic solve succeeds.
Pass/Fail: ___

4. In `Trigonometry > Equations > Solve`, run `2sin(x)+2cos(x)=2`.
Expected:
- Mixed linear family solves.
- Result includes bounded trig provenance and no unsupported-family message.
Pass/Fail: ___

5. Regression sanity in app:
Expected:
- Existing cases still solve: `sin(2x)=0`, `sin(x)cos(x)=1/2`, `2cos^2(x)-1=0`, `tan^2(x)-1=0`.
Pass/Fail: ___
