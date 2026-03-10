# Track ALG R4 Manual Verification Checklist

## Achieved now
- `Calculate` standard exposes an inline `Algebra` tray on `F4` when bounded algebra transforms are available.
- `Equation > Symbolic` exposes the same transform tray shape, but applying a transform rewrites the equation without auto-solving it.
- Transform results now show:
  - transform badges
  - a short `Transform` summary line
  - exclusions / conditions as the second exact line

## Optional app smoke

### 1. Calculate explicit transforms
- Step: Enter `1/3 + 1/(6x)` in `Calculate`, open `F4 Algebra`, press `Combine Fractions`.
- Expected: exact result becomes `(2x+1)/(6x)` and the second exact line preserves `x ≠ 0`.
- Pass/fail:

### 2. Calculate LCD rewrite
- Step: Enter `1/3 + 1/(6x)` in `Calculate`, open `F4 Algebra`, press `Use LCD`.
- Expected: result rewrites over the LCD without cancellation and shows a `Use LCD` transform badge/summary.
- Pass/fail:

### 3. Calculate factor cancel
- Step: Enter `(x^2-1)/(x^2-x)` in `Calculate`, open `F4 Algebra`, press `Cancel Factors`.
- Expected: result simplifies to `(x+1)/x` while preserving exclusions from the original denominator structure.
- Pass/fail:

### 4. Calculate radical transform
- Step: Enter `1/(1+sqrt(2))` in `Calculate`, open `F4 Algebra`, press `Conjugate`.
- Expected: result becomes `sqrt(2)-1` with a short transform summary.
- Pass/fail:

### 5. Equation transform-only flow
- Step: Open `Equation > Symbolic`, enter `1/x + 1/(x+1) = 1`, open `F4 Algebra`, press `Use LCD`.
- Expected: result shows the cleared equation, preserves exclusions, and does not auto-run the solve.
- Pass/fail:

### 6. Equation deliberate solve after transform
- Step: With the same equation, press `Solve` directly from the symbolic screen.
- Expected: bounded symbolic solve still works and shows `LCD Clear` in solve provenance.
- Pass/fail:

## Automated evidence
- `npm run test:gate`
