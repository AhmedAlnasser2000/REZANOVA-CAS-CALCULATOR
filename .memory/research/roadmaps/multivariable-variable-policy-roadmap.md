# Multivariable And Variable Target Policy Roadmap

status: active planning roadmap
created: 2026-05-23
source_context: post-`POLY-ELIM1` planning
related_roadmaps:
- `.memory/research/roadmaps/poly-rat-native-roadmap.md`
- `.memory/research/roadmaps/incubation-infrastructure-roadmap.md`
primary_agent: codex
primary_agent_model: gpt-5.5

## Purpose

This roadmap defines the app-wide path from today’s mostly one-variable calculator semantics to safe multivariable recognition, explicit solve-target selection, and eventual polynomial-system or bivariate-elimination adoption.

It exists separately from the POLY/RAT roadmap because variable meaning is not a polynomial implementation detail. It affects Calculate, Equation, Calculus, Table, future variable memory, history replay, assumption facts, exact linear algebra consumers, and any future polynomial-system work.

## Core Problem

Calcwiz currently has many surfaces that intentionally behave as one-variable or one-active-variable workflows. That has been a strength: it keeps results honest and prevents broad CAS claims.

After `POLY-ELIM1`, Calcwiz has a bounded scalar univariate resultant core. The tempting next elimination step would be bivariate resultants. That is dangerous unless the app first knows what variables mean.

For example:

```text
x + z = 5
```

This expression can mean several different things:

- solve for `x`, treating `z` as a parameter
- solve for `z`, treating `x` as a parameter
- solve for `z`, substituting a stored numeric value for `x`
- solve for `x`, substituting a stored numeric value for `z`
- reject because the current mode requires exactly one active variable
- route to a future system-solving workflow if paired with another equation

The calculator must not silently choose among those meanings.

## Locked Principles

- Stored variables are not the same thing as unknowns.
- Solve targets are explicit when more than one valid symbol appears.
- Stored variable values must never silently override a solve target.
- Non-target symbols must be classified as stored numeric values, symbolic parameters, bound variables, reserved constants, or unsupported symbols.
- Mode behavior remains bounded. Calculate, Equation, Calculus, Table, Matrix, Vector, and future polynomial-system flows may use different variable policies, but each policy must be explicit.
- Multivariable support should begin with recognition and honest stops, not with broad solving.
- Identifier handling stays conservative: case-sensitive single-symbol variables are allowed, but coding-style multi-character string variables such as `hello` are deferred to a later named-variable milestone.
- Until that later milestone, adjacent raw letters should not be inferred as one named variable. They should be treated as multiplied single-character symbols where the current parser supports that, or stopped as ambiguous/unsupported where it cannot.
- `0` milestones remain study/readiness only; implementation starts at `1`.
- Graphing remains deferred until the calculator is broadly stabilized.

## Vocabulary

The eventual internal model should distinguish:

- `symbol`: a raw identifier found in an expression or equation
- `single-symbol-variable`: one case-sensitive math symbol such as `x`, `K`, or `k`
- `implicit-character-product`: adjacent raw letters interpreted as multiplied single-character symbols, not one coding-style name
- `named-string-variable`: a future explicit multi-character variable such as `hello`; deferred from the first implementation slice
- `reserved-constant`: `\pi`, `e`, and other protected constants
- `function-name`: protected identifiers that are not variables
- `solve-target`: the symbol the user is asking Calcwiz to solve for
- `active-variable`: the current independent variable for a mode such as Table or Calculus
- `bound-variable`: a variable bound by syntax, such as the `x` in `\int f(x)\,dx`
- `stored-value`: a user-managed numeric value associated with a symbol
- `symbolic-parameter`: a non-target symbol intentionally preserved as symbolic
- `unknown-tuple`: a future set of solve targets for system solving
- `unsupported-symbol`: a symbol that a mode cannot safely interpret

## Current Baseline

Current strengths:

- Equation mode already owns explicit solving behavior rather than letting Calculate solve implicitly.
- Calculus has strongly bounded variable expectations and verification policies.
- Table has a clear independent-variable feel today, even if the internal model is not yet generalized.
- Assumption facts now exist, so future variable policy can preserve domain, exclusion, and trust facts per variable.
- `POLY-ELIM1` provides scalar univariate resultants, so elimination no longer needs to invent exact matrix machinery locally.

Current gaps:

- There is no shared symbol-discovery and role-classification core.
- There is no app-wide distinction between stored numeric variables and solve targets.
- There is no general “solve for whom?” workflow for multi-symbol equations.
- Variable memory, if added, would need explicit visibility and opt-in substitution rules.
- Calculus and Table do not yet share a general active-variable policy.
- Bivariate polynomial systems have no product surface or result contract.
- History replay does not yet preserve variable-role decisions in a stable typed way.
- Multi-character string variables need a future explicit policy; `VARIABLE-CORE1` should not silently treat `hello` as one variable.

## Identifier Shape Policy

Locked interim policy:

- Variable identifiers are case-sensitive. `K` and `k` are distinct symbols.
- Single-symbol variables are the only automatically recognized variable names in the first implementation slice.
- Adjacent letters such as `xy` or `hello` are not treated as one coding-style identifier by default.
- When the existing parser can represent adjacent letters as multiplication, `hello` should mean `h*e*l*l*o` rather than one named variable.
- When the parser cannot safely prove multiplication, the expression should stop as ambiguous/unsupported instead of guessing a named variable.
- Explicit multi-character named variables remain future work because they interact with variable memory, reserved functions/constants, UI entry, history replay, and solve-target choice.

## Future Semantic Hinting Policy

Reserved-token highlighting is future visible UX work, not part of `VARIABLE-CORE1`.

- Future editor/readback hints should use the variable core classification as the source of truth.
- Reserved functions such as `sin`, `cos`, `tan`, `log`, `ln`, and `sqrt` should be visually distinct from variables.
- Reserved constants such as `\pi` and `e` should be visually distinct from both functions and variables.
- Ambiguous or unsupported identifiers should use a calm warning/hint style rather than pretending they are valid named variables.
- A future visible milestone such as `EDITOR-VARIABLE-HINTS1` or `VARIABLE-READBACK1` should own this UX; `VARIABLE-CORE1` only supplies internal classifications.

## Relationship To POLY/RAT And Elimination

`POLY-ELIM1` is complete as a scalar univariate resultant substrate.

Further elimination work beyond scalar univariate resultants is blocked on this roadmap because Calcwiz must distinguish solve targets, symbolic parameters, stored numeric variables, and active/bound variables before bivariate polynomial elimination can become product-safe.

The POLY/RAT roadmap may continue with internal algebra substrates, but `POLY-ELIM2` should not become a product-facing bivariate solver until at least `VARIABLE-CORE1` and `EQUATION-TARGET1` are complete.

## Roadmap Sequence

### 1. `AREA-MULTIVAR0` - Variable Semantics And Multivariable Readiness Study

Status: complete.

Goal:

- audit current variable behavior across the app and decide the exact variable-role policy

Scope:

- Calculate expression evaluation
- Equation solving
- Calculus derivative/integral/limit variable expectations
- Table independent variable and sampled-domain facts
- Statistics and Geometry names that are UI labels rather than algebraic variables
- Matrix/Vector notation surfaces
- history replay and typed context
- assumption facts and detail readback
- future variable memory
- future polynomial-system and resultant workflows

Decision output:

- selected `VARIABLE-CORE1`

Non-goals:

- no variable memory implementation
- no multivariable solving
- no bivariate resultants
- no graphing
- no UI redesign

### 2. `VARIABLE-CORE1` - Symbol Discovery And Variable Role Core

Status: future implementation.

Goal:

- add a small internal core that detects symbols and classifies their roles before mode-specific execution

Expected capabilities:

- collect symbols from supported parsed expressions/equations
- filter reserved constants and function names
- classify identifier shapes:
  - case-sensitive single-symbol variables
  - adjacent-character multiplication
  - reserved names
  - deferred explicit named-string variables
- represent role choices:
  - solve target
  - active variable
  - bound variable
  - symbolic parameter
  - stored value candidate
  - unsupported symbol
- produce controlled stops for ambiguous or unsupported variable roles
- preserve selected roles in optional typed metadata for history replay

Acceptance:

- existing one-variable behavior remains unchanged
- multi-symbol inputs receive better internal classification or honest stops
- `K` and `k` are distinct
- raw `hello` is not silently accepted as one variable
- classifications are suitable for future reserved-token semantic highlighting
- no automatic stored-value substitution exists yet unless explicitly added later

Non-goals:

- no broad solver widening
- no variable memory UI
- no visible semantic highlighting
- no coding-style named string variables
- no bivariate elimination

### 3. `EQUATION-TARGET1` - Explicit Solve-Target Selection

Status: future implementation.

Goal:

- make Equation mode ask “solve for whom?” or require a target when multiple valid symbols appear

Expected behavior:

- single-symbol equations keep current frictionless flow
- multi-symbol equations do not silently pick `x`
- target selection is visible and replayable
- non-target symbols are shown as parameters or stored-value candidates depending on later policy
- unsupported parameterized families stop clearly

Examples:

```text
x + z = 5
```

If target is `z`, Calcwiz solves for `z` and treats `x` according to the selected non-target policy.

If target is `x`, Calcwiz solves for `x` and treats `z` according to the selected non-target policy.

Non-goals:

- no multi-equation system solving
- no implicit stored-variable substitution
- no polynomial-system resultant solving yet

### 4. `VARIABLE-MEMORY1` - Explicit Stored Variable Values

Status: future implementation, after solve-target policy is clear.

Goal:

- add a Casio/TI-style variable memory model without confusing stored values with unknowns

Expected behavior:

- users can inspect, set, clear, and use stored numeric values
- substitution is explicit or visibly indicated
- solve targets cannot be replaced by stored values
- history entries record whether stored values were used
- result details can show which values were substituted

Important rule:

- stored variables are values only when the selected mode and action explicitly permit substitution

Non-goals:

- no global mutable assumptions
- no symbolic parameter memory
- no automatic hidden substitution

### 5. `CALC-VARIABLE1` - Calculate-Side Variable Value Use

Status: future implementation.

Goal:

- let Calculate use stored numeric variables in a controlled, visible way while preserving symbolic operations where appropriate

Expected behavior:

- pure numeric evaluation may substitute stored values when enabled or requested
- symbolic actions such as simplify/factor should not silently erase unknowns
- result details can list substituted symbols
- expressions with unresolved variables stop or stay symbolic according to the action

Non-goals:

- no equation solving inside Calculate
- no general multivariable CAS

### 6. `CALCULUS-VARIABLE1` - Explicit Calculus Active/Bound Variable Policy

Status: future implementation.

Goal:

- make derivative, integral, and limit variable choice explicit beyond today’s mostly `x`-first behavior

Expected behavior:

- `d/dt`, `\int ... dt`, and limits in `t` can be recognized as bound/active-variable requests when in scope
- non-active symbols are treated as parameters only when the rule supports parameters
- unsafe parameterized/domain cases stop honestly
- history replay preserves the selected active variable

Non-goals:

- no multivariable calculus expansion
- no partial derivatives unless a separate milestone chooses them
- no broad parameter reasoning

### 7. `POLY-SYSTEM1` - Product-Safe Polynomial System Boundary

Status: future implementation after variable-role policy.

Goal:

- define the first Equation-owned workflow for bounded polynomial systems without relying on free-form broad CAS behavior

Expected behavior:

- guided or structured entry for small polynomial systems
- explicit unknown tuple such as `{x, y}`
- parameters rejected or clearly marked unsupported unless a bounded family supports them
- result envelopes include candidate checking and assumption facts

Non-goals:

- no Grobner basis generality
- no graphing
- no broad multivariate symbolic solving

### 8. `POLY-ELIM2` - Bounded Bivariate Resultant Projection Core

Status: blocked on variable-role policy.

Goal:

- extend the elimination substrate from scalar univariate resultants to bounded bivariate projection resultants

Prerequisites:

- `VARIABLE-CORE1`
- `EQUATION-TARGET1`
- a selected bivariate polynomial representation
- variable ordering policy
- degree and term caps
- assumption-fact propagation policy for projected results

Expected capabilities:

- represent bivariate exact polynomials under strict caps
- choose an elimination variable explicitly
- compute projection resultants into a univariate polynomial in the remaining variable
- return typed stop reasons for unsupported degrees, term growth, coefficient growth, variable mismatch, unsupported parameters, and projection ambiguity

Non-goals:

- no Grobner bases
- no broad polynomial systems
- no Equation adoption unless `POLY-SYSTEM1` is ready
- no graphing

## UI Policy

The app should prefer explicit variable decisions over hidden cleverness.

Recommended UI posture:

- single-symbol workflows remain simple
- multi-symbol workflows show a compact target chooser
- stored-value substitution is visible before execution or in result details
- unsupported roles produce clear stops
- advanced details can use the existing concise/detailed fact setting where assumption facts are involved

The product should not become annoying for ordinary one-variable use.

## Risks

- Silent substitution could make results wrong while looking correct.
- Target selection could add friction to simple workflows if shown too often.
- Variable memory can create replay instability if values change between runs.
- Parameterized equations can look solvable while hiding branch/domain constraints.
- Bivariate elimination can create large expressions quickly.
- Product-facing polynomial systems could imply broad CAS parity if not scoped carefully.

## Recommended Next Move

Implement `VARIABLE-CORE1` before `POLY-ELIM2`.

Reason:

- `AREA-MULTIVAR0` found that Equation target selection, variable memory, calculus variable widening, and bivariate elimination all need one shared role vocabulary first.

This keeps the leap honest: Calcwiz can grow into multivariable algebra without pretending that all existing modes already know what variables mean.
