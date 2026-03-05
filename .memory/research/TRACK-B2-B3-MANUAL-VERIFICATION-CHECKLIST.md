# Track B2-B3 Manual Verification Checklist

Date: 2026-03-05
Status: Pending user run

## Achieved Now
- Trig structural normalization was reused more consistently across identity/equation paths.
- Double-angle identity conversion now handles affine repeated-argument products structurally.
- Bounded same-argument mixed linear trig family was added to the solver toolkit.
- Help/guide copy now reflects affine-argument and bounded log-combine support.

## Manual Steps
1. Open `Trigonometry > Identities > Convert`, target `doubleAngle`, run:
`2sin(x+30)cos(x+30)`.
Expected:
- Conversion succeeds (no unsupported message).
- Output shows bounded affine double-angle form.
Pass/Fail: ___

2. Open `Trigonometry > Equations > Solve`, run:
`sin(x+30)cos(x+30)=1/2`.
Expected:
- Equation is solved through rewrite pathway (no unsupported-family error).
- Solve provenance indicates trig rewrite behavior.
Pass/Fail: ___

3. Open `Equation > Symbolic`, run:
`2sin(x)+2cos(x)=2`.
Expected:
- Solves in bounded symbolic flow.
- No numeric interval prompt is required for this in-scope family.
Pass/Fail: ___

4. Negative-scope check:
`sin(x)+cos(2x)=1`.
Expected:
- Controlled unsupported-family result (no false positive solve).
Pass/Fail: ___
