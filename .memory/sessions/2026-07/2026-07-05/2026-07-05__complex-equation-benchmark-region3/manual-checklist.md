## Manual Checklist

- Gate: backend.

## What Is Achieved Now

- Benchmark automation has a runner-only Complex region fallback seam.
- Exact symbolic families and global Complex polynomial/rational roots still win before bounded-region search.
- Bounded-region results carry ledger-shaped evidence, including region bounds, engine, verification status, branch policy, contour root count, and candidate count.

## Manual App Steps

- None required for this frontier; no app-visible behavior changed.
- To inspect existing manual behavior, use Equation > Symbolic, turn Complex On, open Complex Region controls, and run `e^z+z=0` with `[-2,2] x [-2,2]`.

## Expected Results

- The app manual Complex Region route should still show a local approximate root card and contour verification details.
- The app should not auto-run region solving when Complex On is enabled without an explicit region.
