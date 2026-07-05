## Manual Checklist

- Gate: ui.

## What Is Achieved Now

- Manual Complex Region solving can adaptively subdivide bounded rectangles before claiming a verified approximate answer.
- Advanced Complex Region controls now persist through requests and history replay.
- Controlled stops show subdivision and contour evidence when the engine cannot verify every terminal cell.

## Manual App Steps

- Open Equation > Symbolic, turn Complex On, enable Complex Region, open Advanced.
- Run `x^2+1+e^x/10=0` with bounds `[-2,2] x [-2,2]`, Grid `1`, Subdivision depth `2`, Cell budget `32`.
- Expand `Complex Subdivision` and `Complex Contour Verification`.
- Run `e^x+x=0` with bounds `[-10,10] x [-10,10]`, Grid `1`, Subdivision depth `2`, Cell budget `32`.

## Expected Results

- The first case shows two region-local roots, `Split cells: 1`, and contour count `2`.
- The second case stays an error card and explains root-count mismatch instead of presenting residual-only candidates as the answer.
