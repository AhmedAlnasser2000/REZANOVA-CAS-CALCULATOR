# DISPLAY-PROFILING0 Render Profiling Audit

Date: 2026-06-10

## Purpose

`DISPLAY-PROFILING0` adds dev-gated render profiling so large committed results can be diagnosed without changing OOE, solver output, history, or copy/editor semantics.

OOE still decides whether a result may commit. The display layer decides how much of an already committed result should render immediately.

## Gate

Enable with:

```bash
VITE_DISPLAY_RENDER_PROFILING=1 npm run dev
```

The app logs `[display-render-profile]` samples for:

- `math-static-convert`: time spent converting a LaTeX string through the `MathStatic` path.
- `math-static-visible`: time from React render of that block to the first post-commit timer tick.

Samples include block/inline mode, notation mode, deferred status, class name, and LaTeX length.

## Scenarios

Use these scenarios to classify the bottleneck:

- Calculate expansion: `(x+c+a+s+d)^8`; if the UI can tolerate it, also try `^10`.
- Equation symbolic result with nested radicals/logs/powers.
- A result with many `Valid when` facts or expanded branch detail sections.

## Initial Classification

The current freeze class is expected to be mixed:

- Very long monolithic answer strings still enter `MathStatic` as one block.
- Conversion cost can come from `convertLatexToMarkup`.
- Visible lag can also come from DOM insertion, layout, paint, or React reconciliation after conversion.
- Collapsed detail sections should avoid most cost until opened, while main answer and visible `Valid when` blocks still need a size policy.

`RESULT-SIZE-POLICY1` should therefore avoid immediate full rendering of oversized visible blocks. A structural cost estimator can wait until profiling proves that simple size policy is insufficient.
