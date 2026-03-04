# Symbolic Engine Runtime Validation

## Environment setup
1. Run `npm install` from the repo root.
2. Start the desktop runtime with `npm run tauri:dev`.
3. Confirm you are testing the desktop window, not `Browser preview`, before validating any ODE Rust-backed behavior.

## What this runbook validates
- symbolic-first factoring
- BIDMAS / precedence behavior in real editors
- stronger derivative, integral, limit, and partial-derivative flows
- guide-driven expression loading without side effects
- result cards, provenance badges, and warnings in the desktop runtime

## Acceptance criteria
- no crashes
- no blank result cards
- no raw parser syntax leakage
- provenance and warnings match actual engine behavior
- symbolic grouping happens before numeric GCD extraction
- unsupported symbolic cases fail with controlled messages

## Calculate

### Symbolic-first factoring
1. Enter `56u+27xu+27`.
Expected:
- grouped symbolic factorization appears before numeric-only factoring
- acceptable forms include `u(27x+56)+27` or `u(56+27x)+27`
- no numeric GCD is extracted ahead of the symbolic grouping

2. Enter `ab+ac`.
Expected:
- factors to `a(b+c)`

3. Enter `3xy+5x`.
Expected:
- factors to `x(3y+5)`

4. Enter `14x+21`.
Expected:
- factors to `7(2x+3)`

5. Enter `x+y+1`.
Expected:
- no simpler factorization found
- expression stays readable and unchanged

### BIDMAS / precedence
1. Enter `2+3*4`.
Expected:
- result behaves as multiply before add
- no need for extra grouping to get `14`

2. Enter `(2+3)*4`.
Expected:
- grouping changes the evaluation order
- result behaves as `20`

3. Enter `-x^2` and compare with `(-x)^2`.
Expected:
- unary minus and powers remain distinct
- grouped version changes the meaning

### Expression reuse
1. Use `Copy Expr`, `Copy Result`, and `To Editor` on a completed calculation.
Expected:
- copied content matches the displayed expression or result
- loading back into the editor does not auto-run evaluation

## Calculus

### Derivatives
1. Open `Calculus > Derivative`.
2. Enter `x sin x`.
Expected:
- derivative uses the product rule and returns a symbolic result

3. Enter `(x^2)/(x+1)`.
Expected:
- derivative uses the quotient rule and stays symbolic

4. Enter `ln(3x+1)`.
Expected:
- derivative uses the chain rule through `ln`

5. Enter `log(5x)`.
Expected:
- derivative respects the app's supported `log` rule

### Derivative at a point
1. Open `Calculus > Derivative at Point`.
2. Enter body `x^2` and point `3`.
Expected:
- result is `6`
- warning only appears if numeric fallback is actually used

### Integrals
1. Open `Calculus > Integral`.
2. Use `Definite`, bounds `0` to `1`, body `sin(x^2)`.
Expected:
- symbolic attempt first
- numeric fallback may appear
- result card stays non-blank and safe

### Limits
1. Open `Calculus > Limit`.
2. Check a finite target case such as `(x^2-1)/(x-1)` at `1`.
Expected:
- finite removable singularity resolves cleanly

3. Check infinity-target behavior such as `(3x^2+1)/(2x^2-5)` at `+infinity`.
Expected:
- end behavior resolves without crashing

### UI expectations
- route-aware empty states appear when inputs are incomplete
- `Guide: This tool` and `Guide: Advanced version` chips appear where expected
- `To Editor` and `Copy Expr` remain available on generated-expression cards

## Advanced Calc

### Integrals
1. Open `Advanced Calc > Integrals > Indefinite`.
2. Enter `2x cos(x^2)`.
Expected:
- supported substitution succeeds symbolically

3. Enter `x e^x`.
Expected:
- supported integration by parts succeeds symbolically

4. Enter `x cos x`.
Expected:
- supported integration by parts succeeds symbolically

5. Enter `1/(1+x^2)`.
Expected:
- supported inverse-trig family succeeds symbolically

6. Enter `1/sqrt(1-x^2)`.
Expected:
- supported inverse-trig family succeeds symbolically

7. Enter an unsupported indefinite case such as `sqrt(1+x^4)`.
Expected:
- controlled symbolic failure
- no numeric indefinite fallback

### Limits
1. Open `Advanced Calc > Limits > Finite Target`.
2. Enter `(1-cos(x))/x^2` at `0`.
Expected:
- supported removable-singularity limit resolves

3. Enter `|x|/x` at `0`.
Expected:
- one-sided behavior is respected
- mismatch or directional behavior is reported cleanly

4. Open `Advanced Calc > Limits > Infinite Target`.
5. Enter `(x+1)/(x^2+5)` at `+infinity`.
Expected:
- rational end behavior resolves

6. Enter `e^x/x^3` at `+infinity`.
Expected:
- growth-comparison behavior resolves or fails with a controlled message

### Series
1. Open `Advanced Calc > Series > Maclaurin`.
2. Enter `sin(x)` with order `5`.
Expected:
- generated series is symbolic

### ODE
1. Open `Advanced Calc > ODE > Numeric IVP`.
2. Enter a supported RHS such as `x+y` with valid numeric initial values.
Expected:
- desktop runtime uses the Rust-backed path
- browser preview note does not appear in the desktop runtime

### Partials
1. Open `Advanced Calc > Partials > First Order`.
2. Leave the variable on `∂/∂x` and enter `x^2y+y^3`.
Expected:
- result is `2xy`

3. Switch to `∂/∂y` for the same body.
Expected:
- result is `x^2+3y^2`

### Guide and reuse expectations
- `Guide: This tool` and `Guide: Advanced Calc` chips appear on the partial-derivative screen
- `To Editor` and `Copy Expr` work without auto-running evaluation

## Guide launch validation
1. Open the Guide article that teaches factoring, then launch an example.
Expected:
- example loads into the correct tool
- no evaluation happens automatically
- history and `Ans` do not change from launch alone

2. Open the new partial-derivative guide article and launch both examples.
Expected:
- they open `Advanced Calc > Partials > First Order`
- the selected variable and body seed are applied correctly

## Non-goals to confirm
- unsupported symbolic cases may still fail cleanly
- the engine is not expected to solve arbitrary theorem-prover-grade calculus
- no mixed or higher-order partial derivatives are expected in this pass
