# AREA-POLY-ELIM0 Calcwiz Fit Evaluation

## Fit

Near-term direct elimination implementation is a poor fit.

Calcwiz has the right engineering posture for bounded algebra cores, but not the exact linear-algebra and multivariate representation prerequisites that resultants/Grobner work expects.

## Owner Layer

Future ownership should be split:

- `src/lib/algebra/` for multivariate polynomial representation and resultants/elimination helpers
- `src/lib/linear-algebra/` for exact rational matrix operations if approved after study
- equation/calculus modes as consumers only
- Playground area studies and labs for benchmark exploration before stable adoption

## Bounded Version

The first possible implementation after prerequisites should be narrow:

- two-variable rational-coefficient resultants under strict degree caps, or
- a tiny lex-order elimination prototype over exact rational polynomials

That should be named `POLY-ELIM1`, not `POLY-ELIM0`.

## Stop Reasons

Likely stops:

- multivariate-polynomial-model-missing
- exact-linear-algebra-missing
- unsupported-coefficient-domain
- monomial-order-unsupported
- degree-limit
- term-growth-limit
- candidate-validation-required
- domain-fact-loss

## User Value

The eventual value is real:

- solving small polynomial systems more honestly
- deriving elimination polynomials for bounded workflows
- future exact algebra and equation capabilities
- better benchmark families for algebra growth

But the first user-visible value should wait until the substrate can explain and validate what it did.
