# TRACK-COMP11 Manual Verification Checklist

## What Is Achieved Now
- Direct periodic and inverse/direct trig sawtooth families can now return exact reduced-carrier results when the reduced carrier is an exact one-variable polynomial of degree `<= 4` on the existing bounded surface.
- Shared Equation composition budgets now allow one more bounded inversion/reduction step (`3` instead of `2`) without opening unrestricted recursive search.
- Selected direct-trig-on-affine continuations can now emit exact two-parameter periodic families with `k,m \in \mathbb{Z}`.
- Broader composition families that would need a third parameter, exceed the new depth caps, or leave the shipped sink set still stop honestly with structured guidance.

## Manual App Steps
1. In `Equation > Symbolic`, solve `\ln(\sqrt{\log_3((x+1)^2)})=2`.
2. In `Equation > Symbolic`, solve `\sin(\tan(x))=\frac{1}{2}` in radian mode.
3. In `Equation > Symbolic`, solve `\arcsin(\sin(\tan(x)))=\frac{1}{2}` in radian mode.
4. In `Equation > Symbolic`, solve `\sin(x^3+x)=\frac{1}{2}` in radian mode.
5. In `Equation > Symbolic`, solve `\arcsin(\sin(x^3+x))=\frac{1}{2}` in radian mode.
6. In `Equation > Symbolic`, solve `\sin(\cos(\tan(x)))=0.00002`.
7. In `Equation > Symbolic`, solve `\arcsin(\sin(x^5+x))=\frac{1}{2}`.

## Expected Results
- `\ln(\sqrt{\log_3((x+1)^2)})=2` closes exactly instead of stopping at the old two-step inversion cap.
- `\sin(\tan(x))=\frac{1}{2}` returns an exact two-parameter periodic family with `k,m \in \mathbb{Z}` and explicit `x` branches.
- `\arcsin(\sin(\tan(x)))=\frac{1}{2}` returns an exact two-parameter sawtooth family and still shows principal-range/piecewise details.
- `\sin(x^3+x)=\frac{1}{2}` returns a reduced-carrier exact family over `x^3+x`, not a structured guided stop.
- `\arcsin(\sin(x^3+x))=\frac{1}{2}` returns a reduced-carrier sawtooth family over `x^3+x` with preserved principal-range/piecewise metadata.
- `\sin(\cos(\tan(x)))=0.00002` remains unresolved exactly and reports that the family would require more periodic parameters than the current bounded exact set supports.
- `\arcsin(\sin(x^5+x))=\frac{1}{2}` remains unresolved exactly because the reduced polynomial carrier exceeds the bounded degree-4 surface.
