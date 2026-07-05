## Manual Checklist

- Gate: ui.

## What Is Achieved Now

- Complex Region solving is pole-aware for denominator, negative-power, and direct tangent carriers that can be isolated in the selected rectangle.
- Principal branch-cut and pole evidence is evaluated per subdivision cell before root-count claims are accepted.
- Display cards show pole policy and contour root-count evidence using the existing result schema.

## Manual App Steps

- Open Equation > Symbolic, turn Complex On, enable Complex Region.
- Run `e^x+x^{-1}=0` over `[-1,1] x [-1,1]`.
- Run `ln(x)+x=0` over `[-2,2] x [-1,1]` with advanced subdivision depth `1` and cell budget `8`.

## Expected Results

- The pole case stops as a controlled no-root Complex Region result and shows `Complex Pole Policy` plus `Zeros minus known poles`.
- The branch-cut case stops with unsafe subdivision evidence, not a raw unsupported wrapper error.
