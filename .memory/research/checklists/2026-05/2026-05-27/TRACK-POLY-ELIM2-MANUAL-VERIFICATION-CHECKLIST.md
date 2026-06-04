# TRACK-POLY-ELIM2 Manual Verification Checklist

## What Is Achieved Now

- `POLY-ELIM2` adds a backend-only bivariate resultant projection core.
- It projects two exact rational polynomial expressions from an eliminated variable to a retained variable.
- Stored finite numeric constants may substitute as exact rational constants while retained/eliminated variables stay protected.
- Product-facing Equation/system UI, Grobner bases, graphing, complex symbolic solving, and inequality solving are not added.

## Manual App Steps

- No visible app workflow is expected for this backend-only gate.
- Run the focused unit verification for `src/lib/algebra/polynomial-bivariate-elimination.test.ts`.
- Confirm regular Equation/Calculate behavior does not show new polynomial-system UI or bivariate-resultant claims.

## Expected Results

- Projection examples such as eliminating `y` from `x+y-3` and `x-y-1` produce the retained-variable condition `x-2`.
- Stored constants are used only when they are not the retained or eliminated variable.
- Unsupported third symbolic parameters, non-polynomial input, cap overflows, and projection ambiguity stop cleanly.
