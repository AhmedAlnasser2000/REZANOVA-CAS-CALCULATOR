# Equation Parameterized Solving Roadmap

status: active implementation roadmap
created: 2026-05-23
source_context: post-`EQUATION-TARGET1` planning
related_roadmaps:
- `.memory/research/roadmaps/multivariable-variable-policy-roadmap.md`
- `.memory/research/roadmaps/poly-rat-native-roadmap.md`
primary_agent: codex
primary_agent_model: gpt-5.5

## Purpose

This roadmap defines how Calcwiz should grow from explicit solve-target selection into bounded parameterized Equation solving.

`EQUATION-TARGET1` answered the question "solve for whom?" It did not answer "how do we solve for the selected target while preserving the other symbols as parameters?"

This roadmap owns that second question.

The goal is not broad transcendental algebra and not multivariable CAS parity. The goal is to reuse Calcwiz's existing single-variable solving strengths, but make them target-aware so equations such as `x+z=5` can eventually solve for `z` as `z=5-x` instead of stopping.

## Relationship To Other Roadmaps

This roadmap sits between:

- `VARIABLE-CORE1` and `EQUATION-TARGET1`, which provide variable discovery and selected-target UI.
- `POLY-ELIM2`, which remains blocked until target, parameter, and variable-role semantics are stable enough for bivariate work.
- `VARIABLE-MEMORY1`, which remains separate because stored numeric values are not symbolic parameters.
- future named-string variable work, which remains separate because `hello` as one variable is a different identifier policy from `h*e*l*l*o`.

The roadmap is related to POLY/RAT because polynomial and rational equation solving will consume algebra substrates, but it is not a POLY/RAT subtask. It is an Equation-mode product capability lane with app-wide variable semantics.

## Locked Principles

- The selected solve target is explicit when more than one supported symbol appears.
- Non-target symbols are symbolic parameters unless a future explicit stored-variable feature says otherwise.
- Stored numeric variables must never silently override symbolic parameters.
- `K` and `k` are distinct variables.
- Reserved functions and constants are never solve targets or symbolic parameters.
- Raw multi-character string variables remain deferred. For now, adjacent letters are multiplication where parseable or ambiguity/unsupported where not.
- Every parameterized family must preserve candidate checking, denominator exclusions, branch facts, and trust metadata.
- Family support should grow from existing one-variable solving strengths, not from broad search or CAS imitation.
- No step in this roadmap should claim arbitrary transcendental solving.
- Graphing remains deferred and should not be proposed as part of this lane.

## Current Baseline

Available now:

- `VARIABLE-CORE1` discovers symbols and classifies variable roles internally.
- `EQUATION-TARGET1` shows a compact target selector for multi-symbol equations and solves safe single-variable non-`x` equations.
- Equation already has strong one-variable support across bounded linear, polynomial, rational, absolute-value, radical, exponential/logarithmic, and trigonometric families.
- Assumption facts and readback now exist for exclusions, interval hazards, branch/principal-range facts, candidate rejection, and trust notes.

Missing now:

- No target-aware parameterized isolator exists.
- `x+z=5` solved for `z` still stops because preserving `x` as a symbolic parameter is not implemented.
- Existing one-variable solvers are mostly `x`-centric and cannot safely treat original `x` as a parameter while solving for another target.
- No stable result contract exists for parameterized branches such as `z=\pm\sqrt{a}` or `z=a+n\pi`.
- No variable memory feature exists, and this roadmap must not accidentally introduce hidden substitution.

## Architectural Direction

Parameterized solving should use a small target-aware Equation boundary rather than blindly renaming symbols into `x`.

The first implementation should:

- parse the equation with the selected target and parameter set
- collect terms by powers or supported carriers of the selected target
- treat non-target expressions as opaque symbolic coefficient expressions when the family supports that
- use existing exact algebra cores when they can operate safely
- return structured stops when parameter expressions exceed a family boundary
- validate generated candidates against the original equation where that is already possible
- attach assumption facts for denominators, branches, and candidate checks

This is different from multivariable solving. A parameterized solve still has exactly one solve target. Other symbols are not unknowns to solve; they are preserved parameters.

## Roadmap Sequence

### 1. `EQUATION-PARAM1` - Affine And Linear Parameterized Target Solving

Status: implemented.

Goal:

- support selected-target linear equations with symbolic parameters.

Examples:

```text
x + z = 5        solve for z -> z = 5 - x
K + k = 8        solve for K -> K = 8 - k
2z + a = 7       solve for z -> z = (7 - a) / 2
a z + b = c      solve for z -> z = (c - b) / a, with a != 0
```

Expected capability:

- collect affine forms `A*target + B = 0`
- allow `A` and `B` to contain non-target symbolic parameters when representable
- produce denominator exclusion facts such as `A != 0`
- preserve existing one-variable `x` behavior
- keep multi-target selector behavior from `EQUATION-TARGET1`

Acceptance:

- visible Equation mode can solve simple parameterized linear equations for the selected target
- result details identify non-target symbols as symbolic parameters
- cases that need nonlinear parameter reasoning stop cleanly

What it achieved:

- added a target-aware affine collector for Equation mode
- solves selected-target forms such as `x+z=5`, `K+k=8`, `2z+a=7`, `a z+b=c`, `a z+b=c z+d`, and explicit products such as `x\cdot z=1`
- preserves non-target symbols as symbolic parameters
- surfaces symbolic nonzero coefficient facts such as `a\ne0`, `a-c\ne0`, and `x\ne0`
- keeps raw adjacent-letter products such as `xz=1` unsupported until variable hints or named-variable policy can make the meaning explicit

Non-goals:

- no quadratic formula over parameter expressions
- no variable memory
- no systems of equations
- no broad simplification

### 2. `EQUATION-PARAM2` - Polynomial-In-Target Parameter Families

Status: future implementation after `EQUATION-PARAM1`.

Goal:

- extend target-aware solving to bounded polynomial equations in the selected target, with parameter expressions as coefficients only where safe.

Examples:

```text
z^2 - a = 0
z^2 + xz + 1 = 0
a z^2 + b z + c = 0
```

Expected capability:

- classify equations as polynomial in the selected target
- preserve non-target symbols as parameterized coefficients
- reuse polynomial-core readiness where possible
- return exact formula-style results only for bounded supported degrees/families
- attach discriminant and denominator facts where needed

Acceptance:

- quadratic-in-target cases with symbolic coefficients produce bounded formula readback only when the output contract is honest
- over-degree or unsupported parameterized coefficients stop cleanly

Non-goals:

- no multivariate polynomial system solving
- no bivariate resultants
- no Grobner bases
- no arbitrary factorization over symbolic coefficient fields

### 3. `EQUATION-PARAM3` - Rational Parameterized Equations

Status: future implementation.

Goal:

- solve bounded rational equations in the selected target while preserving denominator exclusions involving parameters.

Examples:

```text
1 / (z - a) = b
(z + 1) / (z - a) = 2
(z - a) / (z + b) = c
```

Expected capability:

- detect rational functions in the selected target
- cross-multiply only when denominator exclusion facts are preserved
- validate candidates against original denominators
- reuse rational-function-core facts where applicable

Acceptance:

- supported rational equations solve with visible denominator facts
- unsafe cancellations or unsupported denominator families stop

Non-goals:

- no broad rational equation simplifier
- no hidden assumption that parameter denominators are nonzero
- no source-mirror or external CAS runtime

### 4. `EQUATION-PARAM4` - Absolute-Value, Radical, And Power Carrier Parameters

Status: future implementation.

Goal:

- make existing bounded absolute-value, radical, and power carrier solving target-aware when parameters are present.

Examples:

```text
|z - a| = b
sqrt(z + a) = b
(z - a)^2 = b
```

Expected capability:

- reuse existing branch/candidate validation machinery
- preserve branch conditions such as `b >= 0`
- preserve generated branch facts
- reject nested or over-depth parameterized carriers outside current branch policies

Acceptance:

- supported branch families produce candidate sets for the selected target
- branch conditions and candidate rejection details are visible under the existing fact-readback policy

Non-goals:

- no general piecewise algebra
- no inequality solver
- no multi-layer radical towers unless a later explicit milestone allows it

### 5. `EQUATION-PARAM5` - Bounded Exponential And Logarithmic Target Isolation

Status: future implementation.

Goal:

- support selected-target exponential/logarithmic families that reduce through existing inverse pairs and verification.

Examples:

```text
e^z = a
log(z + a) = b
2^(z + a) = b
```

Expected capability:

- isolate target only through recognized inverse-function pairs
- preserve real-domain facts such as log arguments and positive bases
- keep same-base and inverse-family restrictions explicit
- use candidate validation before accepting output

Acceptance:

- supported direct and affine-in-target exponent/log families solve with domain facts
- unsupported mixed exponential-polynomial or arbitrary transcendental equations stop

Non-goals:

- no Lambert W
- no arbitrary transcendental algebra
- no numerical parameterized solving

### 6. `EQUATION-PARAM6` - Bounded Trigonometric Parameterized Families

Status: future implementation.

Goal:

- support target-aware trigonometric solving for direct or affine selected-target carriers under existing periodic/principal-range policies.

Examples:

```text
sin(z) = a
tan(z + a) = b
cos(2z + a) = b
```

Expected capability:

- distinguish principal solutions from periodic families
- preserve branch/principal-range facts
- treat non-target symbols as parameters only inside supported affine carriers
- keep existing trig caps and candidate validation

Acceptance:

- supported trig families solve for the selected target with honest periodic readback
- unsupported nested/mixed/transcendental parameterized equations stop clearly

Non-goals:

- no arbitrary trigonometric identity solving
- no general transcendental solver
- no graphing

### 7. `EQUATION-PARAM7` - Parameterized Equation Readback And Guide Polish

Status: future polish after enough families exist.

Goal:

- make parameterized equation outputs teachable and calm once multiple target-aware families are shipped.

Expected work:

- consistent result wording for selected target and symbolic parameters
- guide examples for linear, polynomial, rational, absolute-value, exponential/logarithmic, and trig parameterized families
- concise vs detailed facts integration
- history replay checks for selected-target context

Non-goals:

- no new solving family by itself
- no variable memory
- no graphing

## Result-Surface Policy

Every parameterized solve should answer three visible questions:

- selected target: what variable was solved for
- parameters: what other symbols were preserved
- facts: what conditions are required for the answer to be valid

For ordinary users, the default should stay concise. Detailed facts should remain opt-in through the existing `Detailed Facts` setting.

## Implementation Risks

- Renaming target symbols into `x` can corrupt meaning when original `x` is a parameter.
- Parameter expressions can grow quickly and make readback unreadable.
- Denominator exclusions can be lost if cross-multiplication is treated as a normal algebra rewrite.
- Branch families can imply conditions that need clear readback.
- Trig and exponential equations can look like a promise of broad transcendental solving if the scope is not named carefully.
- Variable memory can create hidden substitution bugs if introduced before target/parameter policy is stable.

## Recommended Next Move

Plan `EQUATION-PARAM2` when the next Equation widening is desired.

Reason:

- `EQUATION-PARAM1` now covers affine/linear target isolation and proves the selected-target parameter-preservation boundary.
- The next missing family is bounded polynomial-in-target equations with symbolic coefficients, such as `z^2-a=0` or `a z^2+b z+c=0`.
- `EQUATION-PARAM2` should still avoid bivariate elimination, Grobner bases, variable memory, and broad symbolic coefficient-field factorization.

`POLY-ELIM2` should remain blocked until target/parameter preservation is stable beyond the linear slice and the product has a clearer polynomial-in-target result contract.
