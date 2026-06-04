# TRACK-PRL3 Manual Verification Checklist

Use this after the automated gate for a quick visual pass on bounded symbolic powers, roots, and logs.

## Calculate
- `\sqrt[3]{\sqrt{x}}`
  - `Simplify`
  - expected exact raw result: `x^{1/6}`
  - expected rendered result:
    - `Auto` / `Prefer Powers`: `x^{1/6}`
    - `Prefer Roots`: `\sqrt[6]{x}`
  - expected condition line: `x \ge 0`

- `(\sqrt{x})^3`
  - `Simplify`
  - expected exact raw result: `x^{3/2}`
  - expected condition line: `x \ge 0`

- `\ln(x)+\ln(x+1)`
  - `Simplify`
  - expected exact result: `\ln(x(x+1))`
  - expected condition line includes:
    - `x > 0`
    - `x+1 > 0`

- `\log_{4}(x)`
  - open `F4 Algebra`
  - expected chip: `Change Base`
  - tap it
  - expected exact raw result: `\frac{\ln(x)}{\ln(4)}`
  - expected condition line: `x > 0`

- `x^{1/6}`
  - open `F4 Algebra`
  - expected chip: `Rewrite as Root`
  - tap it
  - expected `To Editor` result: `\sqrt[6]{x}`
  - rendered math may still appear power-leaning in `Auto`

## Equation
- `x^{1/2}=3`
  - `Solve`
  - expected exact result: `x=9`
  - confirms preprocessing into an already-supported root carrier

- `\log_{e}(2x+1)=3`
  - `Solve`
  - expected exact solve success
  - confirms preprocessing to `\ln(2x+1)=3`

- `x^{1/2}=3`
  - open `F4 Algebra`
  - expected chip: `Rewrite as Root`
  - tap it
  - expected transformed equation: `\sqrt{x}=3`
  - expected behavior: transform only, not auto-solve

## Copy / Editor contract
- For a PRL3-normalized result such as `\sqrt[3]{\sqrt{x}} -> x^{1/6}`:
  - rendered math may vary with `Symbolic Display`
  - `Copy Result` and `To Editor` should use the PRL3 raw exact output, not the original input spelling

## Gate
- Required automated close-out:
  - `npm run test:gate`
