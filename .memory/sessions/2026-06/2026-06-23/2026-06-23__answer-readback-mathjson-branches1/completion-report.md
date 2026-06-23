# ANSWER-READBACK-MATHJSON-BRANCHES1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Routed finite Equation root/branch readback through existing MathJSON nodes when producers already have them. Node-backed branch expressions now run through the Symbolic Simplification primitive recursively before rendering to LaTeX, with the LaTeX readback normalizer kept as final polish and fallback.

## Completed Work

- Added `src/lib/equation/readback/mathjson-branches.ts` and focused tests.
- Made `EquationExactFiniteRoot.node` load-bearing in root-set exact and branch readback.
- Preserved and consumed branch nodes from parameterized quadratic/polynomial roots.
- Preserved and consumed branch nodes from polynomial/complex carrier follow-on roots.
- Kept Complex exact-form override behavior intact for branches that already carry `exactComplex`.
- Extended safe LaTeX final polish for plus-negative exact fraction groups.
- Extended final polish for non-leading additive fractions with raw or wrapped unary-negative numerators, so symbolic quadratic branches render `-\frac{\sqrt{D}}{2a}` instead of `+\frac{-\sqrt{D}}{2a}` without rewriting multi-term symbolic numerators.

## Boundaries

- No Display/History schema changes.
- No OOE, app-state, Tauri, or Calculate action changes.
- No broad LaTeX parser and no arbitrary `exactLatex` algebra.
- Periodic families, inequalities, facts, supplements, details, Complex rectangular exact coordinates, and symbolic principal-branch Complex roots remain out of scope.

## Rust Boundary

Rust is not a solution for this readback problem. MathJSON already supplies the expression tree and the TypeScript Symbolic Primitives already traverse it recursively. Rust is explicitly not for MathJSON ASTs, expression trees, readback normalization, symbolic dispatch, simplification rewriting, rule matching, ODE/PDE/integration matching, or current target-size linear algebra. Future Rust candidates are limited to measured homogeneous flat-array inner loops such as Groebner S-polynomial reduction or Risch rational-function reduction; expression trees, MathJSON, and AST fragments must not cross Tauri IPC.
