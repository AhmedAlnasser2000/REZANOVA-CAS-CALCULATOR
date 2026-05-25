# Multivariable And Variable Target Policy Roadmap

status: active planning roadmap
created: 2026-05-23
source_context: post-`POLY-ELIM1` planning
related_roadmaps:
- `.memory/research/roadmaps/poly-rat-native-roadmap.md`
- `.memory/research/roadmaps/incubation-infrastructure-roadmap.md`
- `.memory/research/roadmaps/equation-parameterized-solving-roadmap.md`
- `.memory/research/roadmaps/variable-values-and-substitution-roadmap.md`
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
- Identifier handling is explicit: case-sensitive single-symbol variables are allowed by raw name, explicit multi-character variables require `@name` or `var(name)`, and raw adjacent letters such as `hello` remain multiplied single-character symbols with a hint.
- Raw adjacent letters should not be inferred as one named variable. They are treated as multiplied single-character symbols where the parser supports that, or stopped as ambiguous/unsupported where it cannot.
- `0` milestones remain study/readiness only; implementation starts at `1`.
- Graphing remains deferred until the calculator is broadly stabilized.

## Vocabulary

The eventual internal model should distinguish:

- `symbol`: a raw identifier found in an expression or equation
- `single-symbol-variable`: one case-sensitive math symbol such as `x`, `K`, or `k`
- `implicit-character-product`: adjacent raw letters interpreted as multiplied single-character symbols, not one coding-style name
- `named-variable`: an explicit multi-character variable written as `@name` or `var(name)` and normalized to an upright internal variable token
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
- Explicit multi-character named variables now have bounded syntax and UX follow-through through `NAMED-VARIABLES1` and `NAMED-VARIABLES2`; raw `hello` still must not silently become one variable.

## Identifier Shape Policy

Locked policy:

- Variable identifiers are case-sensitive. `K` and `k` are distinct symbols.
- Single-symbol variables are automatically recognized by raw name.
- Multi-character named variables are supported only through explicit syntax, `@name` or `var(name)`, and normalize to one internal upright variable token.
- Adjacent letters such as `xy` or `hello` are not treated as one coding-style identifier by default.
- When the existing parser can represent adjacent letters as multiplication, `hello` should mean `h*e*l*l*o` rather than one named variable.
- When the parser cannot safely prove multiplication, the expression should stop as ambiguous/unsupported instead of guessing a named variable.
- Variables panel accepts raw single-letter names but requires `@name` or `var(name)` for multi-character stored values.

## Semantic Hinting Policy

Reserved-token highlighting was deliberately kept out of `VARIABLE-CORE1`; the first visible UX layer is now `EDITOR-VARIABLE-HINTS1`.

- Editor/readback hints should use the variable core classification as the source of truth.
- Reserved functions such as `sin`, `cos`, `tan`, `log`, `ln`, and `sqrt` should be visually distinct from variables.
- Reserved constants such as `\pi` and `e` should be visually distinct from both functions and variables.
- Ambiguous or unsupported identifiers should use a calm warning/hint style rather than pretending they are valid named variables.
- `EDITOR-VARIABLE-HINTS1` owns the first visible chip surface; `VARIABLE-READBACK2` owns the paired unsupported-guidance wording. Future inline token coloring remains optional and should avoid fragile MathLive DOM hacks.

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

Status: implemented locally.

Goal:

- add a small internal core that detects symbols and classifies their roles before mode-specific execution

Expected capabilities:

- collect symbols from supported parsed expressions/equations
- filter reserved constants and function names
- classify identifier shapes:
  - case-sensitive single-symbol variables
  - adjacent-character multiplication
  - reserved names
  - explicit named variables
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
- raw `hello` is not silently accepted as one variable; use `@hello` or `var(hello)` for one named variable
- classifications are suitable for future reserved-token semantic highlighting
- no automatic stored-value substitution exists yet unless explicitly added later

Non-goals:

- no broad solver widening
- no variable memory UI
- no visible semantic highlighting
- no raw coding-style multi-letter variables
- no bivariate elimination

What it achieved:

- added a shared internal variable core for MathJSON/LaTeX symbol discovery
- classified reserved functions, reserved constants, case-sensitive variables, indexed variables, implicit character products, explicit named-variable tokens, and unsupported identifiers
- represented solve-target, active-variable, bound-variable, symbolic-parameter, stored-value-candidate, and unsupported-symbol roles
- exposed richer `math-analysis` metadata beside the existing `containsSymbolX` flag without changing mode behavior
- marked `variable-core` as `ready-with-adapter` in capability readiness

### 3. `EQUATION-TARGET1` - Explicit Solve-Target Selection

Status: complete.

Goal:

- make Equation mode ask “solve for whom?” or require a target when multiple valid symbols appear
- support safe single-variable non-`x` equations without rewriting the whole solver stack

Expected behavior:

- single-symbol equations keep current frictionless flow
- safe single-symbol non-`x` equations retarget through the existing `x` backend and rewrite results back to the real target
- multi-symbol equations do not silently pick `x`
- target selection is visible in Equation symbolic mode
- unsupported parameterized families stop clearly

Examples:

```text
x + z = 5
```

If target is `z`, `EQUATION-PARAM1` now solves this affine/linear family as `z=5-x` while preserving `x` as a symbolic parameter. `EQUATION-PARAM2` extends the same selected-target policy to real-guarded quadratic cases such as `z^2+x z+1=0`, `EQUATION-PARAM3` extends it to bounded rational LCD-clearing cases such as `1/(z-a)=b`, `EQUATION-PARAM4` extends it to bounded nonperiodic carrier cases such as `|z-a|=b`, `EQUATION-PARAM5` extends it to bounded exp/log inverse-pair cases such as `ln(z+a)=b`, and `EQUATION-PARAM6` extends it to direct affine trig cases such as `sin(z)=a`. `EQUATION-PARAM7` preserves the selected target through history replay and Guide examples, `EQUATION-PARAM8` strengthens rational selected-target normalization for nested/quotient rational forms, `EQUATION-PARAM9` supports factorable polynomial zero-products up to degree 4, `EQUATION-PARAM10` supports symbolic-base exp/log cases such as `a^z=b`, `EQUATION-PARAM11` adds one-layer composition handoff such as `sin(z^2+a)=b`, `COMP13A` refactors the old composition engine into shared core pieces, `EQUATION-PARAM12` adds bounded two-layer nested composition such as `sqrt(|z-a|)=b` and `sin(sqrt(z+a))=b`, `EQUATION-PARAM14` adds bounded algebraic additive mixed-carrier solving such as `sqrt(z+a)+z=b`, and `EQUATION-PARAM15` closes the current sequence with direct same-argument mixed sine/cosine identities such as `sin(z)+cos(z)=a`.

Single-target examples such as `z+1=3` and `K^2=4` now solve visibly as `z` and `K`, respectively.

Non-goals:

- no multi-equation system solving
- no implicit stored-variable substitution
- no polynomial-system resultant solving yet
- no additive exp/log, broad transcendental, or polynomial-system parameterized target solving yet

Follow-on:

- `.memory/research/roadmaps/equation-parameterized-solving-roadmap.md` now owns the dedicated `EQUATION-PARAM*` sequence for solving selected-target equations while preserving non-target symbols as symbolic parameters.
- `EQUATION-PARAM1` implements affine/linear parameterized target solving, so cases such as `x+z=5` solved for `z` no longer stop.
- `EQUATION-PARAM2` implements real-guarded quadratic parameterized target solving, so bounded formula-style selected-target equations can ship without opening `POLY-ELIM2`.
- `EQUATION-PARAM3` implements bounded rational LCD-clearing parameterized target solving, so denominator-sensitive cases can ship while preserving original exclusions.
- `EQUATION-PARAM4` implements bounded nonperiodic carrier parameterized target solving, so absolute-value, square-root, and square-power selected-target equations can ship while preserving branch/domain facts and keeping deep/periodic `COMP` composition out of scope.
- `EQUATION-PARAM5` implements bounded exp/log inverse-pair selected-target solving, so direct logarithmic/exponential parameterized equations can ship while preserving positivity/domain facts and avoiding log-combine solving.
- `EQUATION-PARAM6` implements direct affine trig selected-target solving, so basic periodic symbolic families can ship while preserving range/nonzero/periodic facts and honoring the active angle unit.
- `EQUATION-PARAM7` implements readback/replay/Guide polish, so selected-target context survives history and Guide launch flows without adding new solver families.
- `EQUATION-PARAM8` implements rational selected-target normalization, so nested rational forms and target-cancel parameter conditions stay inside the selected-target policy instead of falling back to broad multivariable solving.
- `EQUATION-PARAM9` implements factorable polynomial selected-target solving, so explicit higher-degree zero-products can ship without pretending symbolic cubic/quartic formulas are generally supported.
- `EQUATION-PARAM10` implements symbolic-base exp/log selected-target solving, so cases such as `a^z=b`, `\log_a(z+c)=d`, and `\log_z(a)=b` preserve explicit real-domain facts instead of becoming broad transcendental solving.
- `EQUATION-PARAM11` implements one-layer composition handoff, so a single outer nonperiodic, exp/log, or direct trig carrier can generate branch equations.
- `COMP13A` refactors the old composition engine from inside so selected-target composition work can reuse shared carrier, branch, and depth primitives instead of growing a second engine.
- `EQUATION-PARAM12` consumes that shared seam for bounded two-layer nested selected-target composition.
- `EQUATION-PARAM14` implements bounded algebraic additive mixed-carrier solving.
- `EQUATION-PARAM15` implements direct same-argument mixed sine/cosine selected-target solving and closes the current `EQUATION-PARAM*` sequence.
- The next active lane should be `VARIABLE-MEMORY1`; broader transcendental algebra remains deferred and no `PARAM16` is created yet.

### 4. `VARIABLE-MEMORY1` - Explicit Stored Variable Values

Status: next implementation. Detailed ownership moved to `.memory/research/roadmaps/variable-values-and-substitution-roadmap.md`.

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
- `EQUATION-PARAM*` is paused after `EQUATION-PARAM15`; no `PARAM16` is created yet
- `VARIABLE-MEMORY1` is next and starts with finite real numeric stored values plus visible Calculate substitution

Non-goals:

- no global mutable assumptions
- no symbolic parameter memory
- no automatic hidden substitution
- no Equation symbolic substitution in `VARIABLE-MEMORY1`
- no broader transcendental algebra or `POLY-ELIM2`

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

Continue through the dedicated Variable Values And Substitution roadmap before reopening `POLY-ELIM2`.

Reason:

- `VARIABLE-CORE1`, `EQUATION-TARGET1`, `EQUATION-PARAM1` through `EQUATION-PARAM15`, and `COMP13A` now provide symbol roles, target selection, selected-target parameterized solving across the planned bounded families, readback/replay polish, and shared composition reuse.
- `VARIABLE-MEMORY1` now adds explicit finite real numeric stored values, visible standard-Calculate substitution, a Variables side panel, and snapshot-based Calculate history replay.
- `VARIABLE-MEMORY2` now adopts stored values in Table, Basic/Advanced Calculus non-bound parameters, and Equation numeric solve while protecting active variables, bound variables, ODE `x/y`, partial derivative variables, and selected Equation targets.
- `VARIABLE-READBACK1` now makes used stored values, protected variables, replay snapshots, and effective substituted inputs clearer through concise default readback and detailed-only policy notes.
- `VARIABLE-MEMORY3` now centralizes stored-value mode policy, adds detailed ignored-value notes for symbolic surfaces, and closes derivative-at-point / Advanced numeric protection gaps without changing Equation symbolic substitution.
- The next risky area is not bivariate algebra yet; it is editor/readback policy for stored values versus solve targets, active variables, bound variables, and symbolic parameters.
- `POLY-ELIM2` should not start until stored-value policy and variable-role behavior are stable across the product surfaces that will eventually consume multivariable algebra.

This keeps the leap honest: Calcwiz can grow into multivariable algebra without pretending that all existing modes already know what variables mean.
