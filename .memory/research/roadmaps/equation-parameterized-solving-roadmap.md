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

- Trigonometric selected-target parameterized families are not implemented yet.
- Existing periodic one-variable solvers are still mostly `x`-centric and cannot safely treat original `x` as a parameter while solving for another target.
- No stable result contract exists yet for parameterized periodic branches such as `z=a+n\pi`.
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

### 2. `EQUATION-PARAM2` - Real-Guarded Quadratic Parameterized Target Solving

Status: implemented.

Goal:

- extend target-aware solving to bounded quadratic equations in the selected target, with parameter expressions as coefficients only where safe and real-domain facts preserved.

Examples:

```text
z^2 - a = 0
z^2 + x z + 1 = 0
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

What it achieved:

- added a target-aware quadratic collector for Equation mode
- solves selected-target forms such as `z^2-a=0`, `z^2+x z+1=0`, `a z^2+b z+c=0`, and `K^2-k=0`
- preserves non-target symbols as symbolic parameters
- emits symbolic leading-coefficient nonzero facts such as `a\ne0`
- emits real-domain discriminant facts such as `a\ge0`, `x^2-4\ge0`, or `b^2-4ac\ge0`
- keeps raw adjacent-letter products such as `xz` unsupported until variable hints or named-variable policy can make the meaning explicit

Non-goals:

- no multivariate polynomial system solving
- no bivariate resultants
- no Grobner bases
- no arbitrary factorization over symbolic coefficient fields
- no higher-degree parameterized polynomial solving

### 3. `EQUATION-PARAM3` - Rational Parameterized Equations

Status: implemented.

Goal:

- solve bounded rational equations in the selected target while preserving denominator exclusions involving parameters.

Examples:

```text
1 / (z - a) = b
(z + 1) / (z - a) = 2
(z - a) / (z + b) = c
1 / (z - a) + 1 / (z + b) = c
```

Expected capability:

- detect rational functions in the selected target
- cross-multiply only when denominator exclusion facts are preserved
- validate candidates against original denominators
- reuse rational-function-core facts where applicable

Acceptance:

- supported rational equations solve with visible denominator facts
- unsafe cancellations or unsupported denominator families stop

What it achieved:

- added `src/lib/equation/equation-parameterized-rational.ts`
- clears LCDs for bounded selected-target rational equations and delegates the cleared degree-1/degree-2 equation back through `EQUATION-PARAM1` or `EQUATION-PARAM2`
- solves examples such as `1/(z-a)=b`, `(z+1)/(z-a)=2`, `(z-a)/(z+b)=c`, `1/(z-a)+1/(z+b)=c`, and case-sensitive `K/(K-k)=2`
- preserves original denominator exclusions such as `z-a\ne0`, `z+b\ne0`, or `K-k\ne0`
- preserves simple derived nonzero facts from the cleared equation such as `b\ne0`, `1-c\ne0`, or `c\ne0`
- keeps raw adjacent-letter products such as `xz` unsupported unless multiplication is explicit

Non-goals:

- no broad rational equation simplifier
- no hidden assumption that parameter denominators are nonzero
- no cleared equations above degree 2
- no nested target-denominator rational families
- no source-mirror or external CAS runtime

### 4. `EQUATION-PARAM4` - Absolute-Value, Radical, And Power Carrier Parameters

Status: implemented.

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

What it achieved:

- added `src/lib/equation/equation-parameterized-carrier.ts`
- detects one selected-target nonperiodic carrier, optionally inside a simple affine shell
- supports absolute-value, square-root, and square-power carriers such as `|z-a|=b`, `sqrt(z+a)=b`, `sqrt(z-a)+c=b`, and `(z-a)^2=b`
- generates branch equations and delegates them to `EQUATION-PARAM1`, `EQUATION-PARAM2`, or `EQUATION-PARAM3` where safe
- preserves branch/domain facts such as `b\ge0`, `b-c\ge0`, and denominator exclusions from delegated rational branches
- keeps deep or periodic `COMP`-style composition out of scope even though the milestone is historically related to the old composition roadmap

Non-goals:

- no general piecewise algebra
- no inequality solver
- no multi-layer radical towers unless a later explicit milestone allows it
- no periodic or deep composition reopening from the old `COMP` lane

### 5. `EQUATION-PARAM5` - Bounded Exponential And Logarithmic Target Isolation

Status: implemented.

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

What it achieved:

- added `src/lib/equation/equation-parameterized-exp-log.ts`
- detects one selected-target exponential or logarithmic carrier, optionally inside a simple affine shell
- supports natural exponential, `exp`, common logarithm, natural logarithm, explicit positive numeric bases not equal to `1`, and same-base direct reductions
- solves examples such as `e^z=a`, `e^(z+a)=b`, `ln(z+a)=b`, `log(z+a)=b`, `2^(z+a)=b`, `e^(z+a)=e^b`, and `ln(z+a)=ln(b)`
- delegates isolated generated equations to `EQUATION-PARAM1`, `EQUATION-PARAM2`, `EQUATION-PARAM3`, or `EQUATION-PARAM4` where safe, including cases like `ln(z^2+a)=b`, `ln(1/(z-a))=b`, and `e^(|z-a|)=b`
- preserves domain facts such as positive exponential outputs, positive log arguments, denominator exclusions, and delegated branch facts
- avoids log-combine sums/quotients and symbolic-base solving

Non-goals:

- no Lambert W
- no arbitrary transcendental algebra
- no numerical parameterized solving
- no symbolic bases
- no log-combine/product/quotient expansion

### 6. `EQUATION-PARAM6` - Bounded Trigonometric Parameterized Families

Status: implemented.

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

What it achieved:

- added `src/lib/equation/equation-parameterized-trig.ts`
- detects one selected-target `sin`, `cos`, or `tan` carrier, optionally inside a simple target-free affine shell
- supports direct affine target arguments such as `sin(z)=a`, `cos(z+a)=b`, `tan(2z+a)=b`, `2sin(z+a)+c=d`, and `sin(A z+B)=c`
- preserves symbolic parameters, range facts such as `-1\le a\le1`, nonzero argument-coefficient facts such as `A\ne0`, and the integer family fact `n\in\mathbb{Z}`
- honors the active angle unit by rendering inverse-trig principal values with explicit conversion factors: radians use `arcsin(a)+2πn`, degrees use `(180/π)arcsin(a)+360n`, and gradians use `(200/π)arcsin(a)+400n`
- keeps multiple trig carriers, nonlinear target arguments, nested trig, deep carrier composition, raw adjacent-letter products, symbolic target ambiguity, variable memory, `POLY-ELIM2`, graphing, source mirrors, and broad trig identity solving out of scope

Non-goals:

- no arbitrary trigonometric identity solving
- no general transcendental solver
- no graphing

### 7. `EQUATION-PARAM7` - Parameterized Readback, Replay, Guide, And Roadmap Reset

Status: implemented.

Goal:

- make parameterized equation outputs teachable and replayable without adding a new solving family.

What it achieved:

- added a shared parameterized readback helper that preserves existing family section titles while normalizing selected-target/symbolic-parameter wording
- normalizes readback-only restriction notation such as outer inverse powers into clearer fraction form where safe
- stores optional `equationSolveTarget` on successful Equation history entries and restores it during replay
- allows Guide examples to carry `equationSolveTarget` so selected-target examples open with the intended target preselected
- refreshes Equation Guide examples for PARAM1 through PARAM6: affine, quadratic, rational, nonperiodic carrier, exp/log, and trig

Non-goals:

- no new solving family
- no variable memory
- no graphing
- no broad composition or mixed-carrier solving

### 8. `EQUATION-PARAM8` - Stronger Rational Parameterized Handling

Status: implemented.

Goal:

- strengthen rational selected-target equations after PARAM3's first LCD-clearing slice.

What it achieved:

- normalizes nested rational structures into a selected-target `N/D` envelope before LCD clearing
- handles parameter-only denominators, rational quotients, and bounded rational sums when the cleared equation remains degree 2 or lower
- preserves original denominator exclusions and easy derived nonzero facts through existing supplement/detail surfaces
- returns a conditional parameter result when rational clearing cancels the selected target instead of inventing a target value
- intentionally leaves Guide content unchanged

Non-goals:

- no higher-degree cleared solving
- no broad rational simplification
- no mixed-carrier or composition solving
- no variable memory
- no graphing

### 9. `EQUATION-PARAM9` - Higher-Degree/Factorable Polynomial Parameters

Status: implemented.

Goal:

- extend polynomial selected-target solving beyond the current real-guarded quadratic slice only where bounded factorable forms stay honest.

What it achieved:

- supports explicit selected-target zero-products up to degree 4
- delegates supported linear and quadratic factor branches to PARAM1/PARAM2
- dedupes repeated roots while preserving multiplicity detail
- reuses the existing exact-rational bounded cubic/quartic factor core for expanded helper cases
- keeps arbitrary symbolic-coefficient cubic/quartic formulas out of scope

Non-goals:

- no degree greater than 4
- no partial solution sets from unsupported factors
- no Guide update
- no composition or mixed-carrier solving

### 10. `EQUATION-PARAM10` - Symbolic-Base Exp/Log Policy

Status: future capability/policy.

Goal:

- decide and implement bounded symbolic-base exponential/logarithmic selected-target solving only if assumptions, positivity, and branch facts can be stated clearly.

Expected direction:

- symbolic-base facts such as base positivity and base not equal to one
- no Lambert W, log-combine search, or arbitrary exponential-polynomial solving

### 11. `EQUATION-PARAM11` - Bounded One-Layer Composition Handoff

Status: future capability.

Goal:

- introduce one deliberately bounded composition handoff for selected-target parameterized solving.

Expected direction:

- reuse earlier `COMP` learnings without reopening deep composition
- require one carrier layer, explicit target occurrence, and safe delegation to PARAM1-10 families

### 12. `EQUATION-PARAM12` - Mixed-Carrier/Composition Handling

Status: future capability.

Goal:

- handle selected mixed-carrier equations only after single-family and one-layer composition policies are stable.

Expected direction:

- bounded combinations such as polynomial plus absolute/radical/rational carrier structures
- controlled stops for multiple competing inverse choices
- no broad CAS-style mixed transcendental solving

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

Plan `EQUATION-PARAM10` when the next Equation capability/policy milestone is desired.

Reason:

- `EQUATION-PARAM1` now covers affine/linear target isolation and proves the selected-target parameter-preservation boundary.
- `EQUATION-PARAM2` now covers the real-guarded quadratic slice and proves the first formula-style target-aware result contract.
- `EQUATION-PARAM3` now covers bounded rational LCD clearing and proves denominator exclusions can survive selected-target parameter solving.
- `EQUATION-PARAM4` now covers bounded nonperiodic carriers and proves branch equations can hand off to existing selected-target solvers without reopening deep composition.
- `EQUATION-PARAM5` now covers bounded exp/log inverse-pair isolation and proves generated equations can hand off into linear, quadratic, rational, and nonperiodic carrier selected-target solvers.
- `EQUATION-PARAM6` now covers direct affine trig carriers and proves selected-target periodic family readback can honor angle units without reopening the old deep `COMP` lane.
- `EQUATION-PARAM7` closes the product polish gap: teachable Guide entries, calmer restrictions/facts, history replay checks for target context, and consistent readback across PARAM1 through PARAM6.
- `EQUATION-PARAM8` closes the first rational-normalization gap: nested rational structures, quotients, parameter-only denominators, bounded rational sums, and target-cancel parameter conditions are handled under the same degree-2 cap.
- `EQUATION-PARAM9` now closes the factorable-polynomial gap: explicit zero-products up to degree 4 can solve through existing branch solvers, and exact-rational cubic/quartic factor cases reuse the existing bounded factor core.
- The next capability pressure is symbolic-base exp/log policy, followed by one-layer composition and mixed-carrier work.
- `EQUATION-PARAM10` should still avoid Lambert W, log-combine search, arbitrary exponential-polynomial solving, hidden positivity assumptions, variable memory, bivariate elimination, Grobner bases, and graphing.

Deferred polish:

- Some deeper restriction/readback formatting may still need polish, but PARAM7 handles the obvious outer inverse-power constraint case without changing solver behavior.

`POLY-ELIM2` should remain blocked until target/parameter preservation is stable beyond these single-target slices and the product has a clearer story for rational equations, branch families, and variable-role persistence.
