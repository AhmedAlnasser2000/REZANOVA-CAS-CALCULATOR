# Codex Handoff — Integration Pipeline: All 5 Layers

**Scope:** Symbolic and numeric integration only. This is a parallel lane to
the equation work. It lives entirely in:
- `src/lib/symbolic-engine/integration/`
- `src/lib/calculus/engine/`
- `src/lib/calculus/workspace/`

Zero overlap with `src/lib/equation/`. Both agents commit independently.

**What already exists (do not rebuild, extend):**
- `dispatch.ts` — multi-strategy dispatcher, needs the classifier added at top
- `rules.ts` — chain rule, u-substitution, integration by parts, key outer functions
- `rational.ts` — partial fractions decomposition
- `antiderivative-rules.ts` — basic direct rules (power, trig basics)
- `verification.ts` — back-checks antiderivative by differentiating the result
- `adaptive-simpson.ts` — numeric fallback via adaptive Simpson's rule
- All five symbolic primitives in `src/lib/symbolic-engine/primitives/` —
  expansion, substitution, factorization, simplification, elimination

---

## The Five-Layer Integration Pipeline

Every integration request passes through these layers in order. Each layer
returns a result or `null`. On `null`, the next layer is tried. On a result,
execution stops and the result is returned with its layer provenance attached.

```
Layer 1 — Rubi (rule-based, decision tree)
  Covers ~99% of textbook integrals
  Static tier-1 always loaded; tier-2 and tier-3 lazy on miss

Layer 2 — Risch-Norman (transcendental heuristic)
  Handles transcendental cases Rubi misses
  < 200 lines, one-pass, NOT a decision procedure

Layer 3 — Full Transcendental Risch
  Decision procedure: proves elementary result exists OR proves it does not
  Non-existence certificates for ∫e^(x²)dx, ∫sin(x)/x dx, etc.

Layer 4 — Algebraic Integration
  4A: Euler substitutions (genus 0, always elementary)
  4B: Pseudo-elliptic genus 1-2 (derivative-divides + Laurent substitution)
  4C: Genus recognition → EllipticF/E/Pi + honest message

Layer 5 — Numeric Fallback (OOE)
  Adaptive Simpson for definite integrals
  Never a dead end — always returns something useful
  Result clearly labeled approximate
```

---

## MANDATORY FIRST: The classifyIntegrandForm() Dispatcher

**This must be built before any Rubi rules are added.**

The current `dispatch.ts` tries strategies sequentially:
```typescript
if (inverseTrig) return result;
if (derivativeRatio) return result;
if (partialFractions) return result;
if (substitution) return result;
if (basic) return result;
if (byParts) return result;
```

This is the same sequential-search bottleneck already fixed in the equation
domain. Adding 350+ Rubi rules on top of sequential search means every failed
match pays a per-strategy cost. The classifier fixes this: one AST scan at the
entry point, direct route to the applicable rule family, no exhaustive search.

**Add this as the first call in `resolveSymbolicIntegralFromAst`:**

```typescript
export function classifyIntegrandForm(
  node: unknown,
  variable: string
): IntegrandClass {
  // Read the outermost AST node ONCE and classify:
  // 'monomial'       x^n, ax^n
  // 'polynomial'     sum of monomials
  // 'rational'       polynomial / polynomial
  // 'sqrt-linear'    R(x, sqrt(ax+b))
  // 'sqrt-quadratic' R(x, sqrt(ax²+bx+c))
  // 'exponential'    e^(ax+b), a^(f(x))
  // 'logarithm'      ln(f(x)), log_a(f(x))
  // 'trig-basic'     sin, cos, tan, sec, csc, cot of linear arg
  // 'trig-product'   product of two trig functions
  // 'exp-trig'       product of exponential and trig
  // 'inverse-trig'   arcsin, arccos, arctan of f(x)
  // 'product-poly-*' polynomial × exponential/trig/log
  // 'hyperbolic'     sinh, cosh, tanh, etc.
  // 'compound'       deeper structure, try tier-2 Rubi
  // 'unknown'        no pattern recognized, proceed to Layer 2
}
```

Then restructure `resolveSymbolicIntegralFromAst` as:

```typescript
export function resolveSymbolicIntegralFromAst(
  node: unknown,
  variable = 'x'
): IntegralResolution {
  const form = classifyIntegrandForm(node, variable);

  // Layer 1: Rubi decision tree — routes by form, O(depth) not O(n rules)
  const rubiResult = rubiTier1.integrate(node, variable, form);
  if (rubiResult) return rubiResult;

  // Tier 2 and 3 loaded lazily (see Layer 1 section below)
  // ...rest of layers
}
```

**Performance target:** classification is O(1) — reads the root AST node and
at most 2-3 child nodes. No recursion. No rule scanning. Every failed match
costs microseconds, not milliseconds.

---

## Layer 1 — Rubi (Rule-Based Integration)

### What Rubi is

Rubi is a complete integration rule base by Albert Rich (creator of Derive /
TI-89 math engine). It contains 6,700+ rules organized as a decision tree.
It outperforms Mathematica and Maple on a 72,000-case test suite.

**Key properties:**
- NOT a flat list of rules to search sequentially
- A decision tree: each node answers a true/false question about the integrand
- Reaches the correct rule in 5-15 questions regardless of which rule applies
- Each rule returns `null` on no-match, passing to the next branch
- Step-by-step is natural: each rule that fires is one named step

### Where to get the rules

**PDF rule files (primary source):**
`github.com/RuleBasedIntegration/IntegrationRules`
All rules as human-readable PDFs organized by integrand category.
These are the agent context. Feed them section by section.

**Mathematica reference implementation:**
`github.com/RuleBasedIntegration/Rubi`
Useful for understanding rule conditions and structure.

**BSD-licensed Python reference (translation reference only, do not copy):**
`github.com/sympy/sympy/tree/master/sympy/integrals/rubi`
Useful for seeing how Mathematica pattern conditions translate to code.
BSD license means reading it as reference is safe. Do not copy code.

### Tiered loading structure

```typescript
// src/lib/symbolic-engine/integration/rubi/tier1/index.ts
// STATIC IMPORT — always loaded at startup
// ~350 rules covering 99% of textbook integrals
export { rubiTier1Integrate } from './dispatcher';

// src/lib/symbolic-engine/integration/rubi/tier2/index.ts
// DYNAMIC IMPORT — loaded on first tier-1 miss
// ~500 rules covering engineering and advanced calculus
const tier2 = await import('./rubi/tier2');

// src/lib/symbolic-engine/integration/rubi/tier3/index.ts
// DYNAMIC IMPORT — loaded on first tier-2 miss
// ~2,850 rules covering research/exotic cases
const tier3 = await import('./rubi/tier3');
```

**Why tiered:** SymPy's Rubi port takes minutes to load all rules eagerly.
Tier-1 static ensures zero startup cost. Tiers 2-3 are lazy: the first time
a user integrates something tier-1 misses, tier-2 loads (~100ms, invisible
against computation time) and stays cached for the session.

**Bundle size is NOT a concern.** All 6,700 rules compiled and minified
are roughly 800KB-1.5MB — acceptable for a Tauri desktop app.

### Implementation order — section by section from the PDFs

Implement one PDF section at a time. Each section is one milestone. Verify
against Rubi's test cases for that section before moving to the next.

**Section 1 — Algebraic functions: polynomial and monomial (start here)**
- `∫xⁿ dx = xⁿ⁺¹/(n+1)` for n ≠ -1
- `∫(ax+b)ⁿ dx` — affine argument
- `∫(ax²+bx+c)ⁿ dx` — quadratic argument
- These cover the highest-frequency textbook cases

**Section 2 — Exponential functions**
- `∫eˣ dx`, `∫e^(ax+b) dx`, `∫aˣ dx`
- Products of polynomial and exponential

**Section 3 — Trigonometric functions**
- `∫sin(x)dx`, `∫cos(x)dx`, `∫tan(x)dx`, `∫sec²(x)dx`
- Basic trig with linear arguments: `∫sin(ax+b)dx`
- Products of trig functions

**Section 4 — Logarithmic functions**
- `∫ln(x)dx`, `∫ln(ax+b)dx`
- Products of polynomial and logarithm (by parts pattern)

**Section 5 — Inverse trig functions**
- `∫arcsin(x)dx`, `∫arctan(x)dx`
- These are already partially in the existing `rules.ts`

**Section 6 — Hyperbolic functions**
- `∫sinh(x)dx`, `∫cosh(x)dx`, `∫tanh(x)dx`

**Section 7 — Products and compositions**
- Products of two different function families (largest, deepest section)
- Implement last within tier-1

**Sections 8+ → Tier 2 and Tier 3**

### Rule function structure

Each Rubi rule is a function with this pattern:

```typescript
function integrateMonomial(
  node: unknown,
  variable: string
): string | null {
  // 1. Check structural conditions
  // 2. Extract coefficients using patterns.ts helpers
  // 3. Return LaTeX result string, OR null if conditions not met
  // 4. Never throws — always returns string or null
}
```

Use the existing `patterns.ts` helpers:
- `parseAffine(node, variable)` — detects ax+b form
- `flattenMultiply(node)` — extracts factors from product
- `toPolynomialTerms(node, variable)` — polynomial coefficient extraction
- `numericNodeValue(node)` — gets numeric value from AST node

Use the five primitives where mechanics match:
- `expandMathJsonNodeOrOriginal` — normalize before pattern matching
- `simplifyMathJsonNodeOrOriginal` — clean up results
- `substituteMathJsonSubtree` — apply u-substitution transformations

### Verification

Every Rubi result MUST pass `verification.ts` before being returned.
The `backcheckAntiderivative` function differentiates the result and
checks it matches the integrand. This is the safety net that catches
wrong rules or implementation errors silently.

```typescript
const backcheck = backcheckAntiderivative(result, node, variable);
if (!trustedAntiderivative(backcheck)) {
  return null; // rule fired but result is wrong — try next layer
}
```

---

## Layer 2 — Risch-Norman (Transcendental Heuristic)

**What it does:** Handles transcendental cases Rubi misses. Works by making
an educated guess (ansatz) about the form of the antiderivative, setting up
a system of linear equations, and solving for coefficients.

**Key properties:**
- Under 200 lines of Mathematica code (see pmint.m for reference)
- NOT a decision procedure — on failure it says "couldn't find it" but
  cannot prove no elementary form exists
- Handles nested exponential/logarithmic towers Rubi patterns miss
- Much faster than full Risch for the cases it handles

**Location:** `src/lib/symbolic-engine/integration/risch-norman.ts` (new file)

**Implementation:**
1. Determine the differential extension tower from the integrand
   (which exponentials and logarithms appear)
2. Construct an ansatz: a polynomial combination of the tower elements
   with undetermined coefficients
3. Differentiate the ansatz and equate with the integrand
4. Solve the resulting linear system for the coefficients
5. If the system has a solution → return the antiderivative
6. If not → return `null`, pass to Layer 3

**Reference:** The `pmint` (poor man's integrator) implements Risch-Norman
in under 200 lines. Search for `pmint.m` or `pmint.py` — multiple clean
implementations exist in the public domain.

---

## Layer 3 — Full Transcendental Risch

**What it does:** The only true decision procedure for elementary integration
of transcendental functions. Proves an elementary antiderivative exists and
finds it, OR proves no elementary antiderivative exists and returns a
non-existence certificate.

**The non-existence certificate is the unique value of this layer:**
```
∫e^(x²)dx    → "Proved: no elementary antiderivative exists"
∫sin(x)/x dx → "Proved: no elementary antiderivative exists"
∫e^x/x dx   → "Proved: no elementary antiderivative exists"
```

No other free tool provides this. When Rubi and Risch-Norman fail, Risch
either finds the answer or proves mathematically that no elementary answer
exists. That proof is shown to the user as an educational fact.

**Key properties:**
- Covers only transcendental case (exponentials, logarithms, trig via exp)
- Does NOT cover algebraic case (see Layer 4)
- The algebraic case has never been fully implemented anywhere — not in
  Mathematica, not in Maple, not in SymPy. Do not attempt it.
- Transcendental Risch covers ~85% of practical non-elementary cases

**Reference:** Bronstein, "Symbolic Integration I: Transcendental Functions"
(Springer). The complete algorithm specification. Feed chapter by chapter
as agent context for implementation.

**Implementation order:**
1. `DifferentialExtension` class — builds the tower of field extensions
2. Hermite reduction — reduces the rational part
3. Lazard-Rioboo-Trager — handles the logarithmic part
4. Risch Differential Equation solver — the core decision procedure
5. Main integration dispatch — orchestrates the above

**Location:** `src/lib/symbolic-engine/integration/risch/` (new directory)

---

## Layer 4 — Algebraic Integration

### Layer 4A — Euler Substitutions (Genus 0, always elementary)

**What it covers:** Integrals of the form `∫R(x, √(ax²+bx+c)) dx` where
R is a rational function. The Euler substitution theorem guarantees these
always have elementary antiderivatives.

**Three substitution types (choose based on coefficient signs):**

**Type 1 (a > 0):** Set `√(ax²+bx+c) = x√a + t`
→ Squaring: `ax²+bx+c = ax² ± 2xt√a + t²`
→ Quadratic terms cancel → `x = (t²-c)/(b ∓ 2t√a)` (rational in t)

**Type 2 (c > 0):** Set `√(ax²+bx+c) = xt + √c`
→ Squaring: `ax²+bx+c = x²t² + 2xt√c + c`
→ Solve: `x = (b - 2t√c)/(t²-a)` (rational in t)

**Type 3 (real roots x₁, x₂):** Set `√(ax²+bx+c) = t(x-x₁)`
→ Express x as rational in t

**Algorithm:**
1. Detect integrand is R(x, √(ax²+bx+c))
2. Choose substitution type (Type 1 if a>0, Type 2 if c>0, Type 3 if real roots)
3. Compute x(t) — rational function of t
4. Compute dx/dt — rational, derived from x(t)
5. Substitute: entire integrand becomes rational in t
6. Integrate rational function via partial fractions (already in Layer 1)
7. Back-substitute t back to x

**Location:** `src/lib/symbolic-engine/integration/algebraic/euler.ts` (new)

**Reference:** Wikipedia "Euler substitution" — complete formulas for all
three types with worked examples.

### Layer 4B — Pseudo-Elliptic Detection (Genus 1-2, sometimes elementary)

**What it covers:** Integrands that look like they require elliptic integrals
but secretly have elementary antiderivatives. These are cases Mathematica
and Maple MISS — REZANOVA catching them is a concrete competitive advantage.

**Method:** Derivative-divides algorithm + Laurent polynomial substitution.
Under 200 lines. Not a decision procedure — on failure, passes to Layer 4C.

**Reference:**
`github.com/stblake/algebraic_integration` — open source, handles
pseudo-elliptic, hyperelliptic, and nested radical cases. Easy to port.

**Location:** `src/lib/symbolic-engine/integration/algebraic/pseudo-elliptic.ts`

### Layer 4C — Genus Recognition + Honest Response

**What it covers:** True elliptic (genus 1) and hyperelliptic (genus 2)
integrals that have NO elementary antiderivative. The correct response is not
an error — it is a named special function result plus numeric evaluation.

**Genus 1 (elliptic integrals):**
Return: `EllipticF(φ, k)`, `EllipticE(φ, k)`, `EllipticPi(n, φ, k)`
Message: *"No elementary antiderivative exists. Result expressed as an
elliptic integral: [form]. Numeric evaluation available."*

**Genus 2 (hyperelliptic integrals):**
Return: hyperelliptic theta function notation
Message: *"No elementary antiderivative exists for this hyperelliptic
integral. Numeric evaluation available."*

**Implementation:** Compute the genus of the algebraic curve defined by
the integrand's radical. Genus = (degree of polynomial - 1) / 2 for simple
square root cases. For genus ≥ 1, return the appropriate special function
placeholder and route numeric to Layer 5.

---

## Layer 5 — Numeric Fallback (OOE)

**Already implemented in `adaptive-simpson.ts`.** This layer needs no new
code — it just needs proper integration into the pipeline dispatcher.

**For definite integrals only.** Indefinite integrals have no numeric
antiderivative in general — do not attempt to return a numeric indefinite
result.

**The honest display when Layer 5 fires:**

```
Symbolic result:  No elementary antiderivative found.
                  [Explanation of what was tried — which layers ran]

Numeric result:   ≈ 2.3561... (adaptive quadrature, 10^-8 precision)
                  [Only for definite integrals with numeric bounds]
```

**OOE routing:** Layer 5 runs as a `heavy` class OOE job on a Web Worker.
The existing `adaptive-simpson.ts` already handles this.

---

## Integration Result Type

Every layer returns the same type:

```typescript
type IntegrationResult = {
  kind: 'success' | 'non-elementary' | 'error';

  // On success:
  antiderivativeLatex?: string;     // The antiderivative
  method?: IntegrationMethod;       // Which layer/rule fired
  ruleId?: string;                  // Specific Rubi rule ID for step-by-step
  backcheck?: BackcheckResult;      // Verification status

  // On non-elementary:
  nonElementaryCertificate?: string; // Proof it has no elementary form
  specialFunctionForm?: string;      // EllipticF/E/Pi or similar
  numericAvailable?: boolean;        // Whether Layer 5 can give a number

  // Provenance for step-by-step (future):
  steps?: IntegrationStep[];        // Named steps this computation took
}
```

The `method` and `ruleId` fields are what will eventually feed the step-by-step
engine. Record them now even if the step-by-step display is not built yet.

---

## Implementation Priority — What to Build First

**Session 1: The classifier (mandatory before any rules)**
Add `classifyIntegrandForm()` to `dispatch.ts`. Restructure the existing
sequential dispatcher to route through the classifier. Existing rules stay
exactly as they are — they just get called through the classifier. Verify
existing tests still pass.

**Sessions 2-4: Rubi tier-1, section by section**
Section 1 (algebraic/polynomial) → verify against Rubi test cases → commit.
Section 2 (exponential) → verify → commit.
Section 3 (trig) → verify → commit.
Continue until tier-1 is complete (~350 rules, 99% of textbook cases).

**Session 5: Risch-Norman**
Under 200 lines. Use pmint as reference. Handles the transcendental cases
tier-1 misses without full Risch.

**Session 6: Euler substitutions (Layer 4A)**
Complete specification in Wikipedia. Reduces to partial fractions (Layer 1).
Always produces elementary results for its input class.

**Session 7+: Transcendental Risch, pseudo-elliptic, genus recognition**
In that order. Each is independently valuable. Transcendental Risch can
be deferred if time is short — Rubi + Risch-Norman + Euler substitutions
already covers ~97% of real-world integrals.

---

## What Explicitly NOT to Build

- Algebraic Risch for general genus ≥ 1 — no CAS has fully implemented this,
  including Mathematica and Maple. Layer 4C (recognition + honest response)
  is the correct answer for these cases.
- Contour integration — graduate-level complex analysis, separate pipeline.
- Path integrals — physics domain, not elementary calculus.
- Symbolic indefinite result for transcendental non-elementary cases — the
  non-existence certificate IS the correct answer, not silence or error.

---

## Parallel Lane Safety

This integration work is completely isolated from the equation lane.
No shared files need modification. Shared files that are READ-ONLY for both:
- `src/lib/symbolic-engine/primitives/` — consume APIs, do not modify
- `src/lib/symbolic-engine/patterns.ts` — consume helpers, do not modify
- `src/lib/symbolic-engine/differentiation.ts` — already used by verification.ts

If both agents happen to need a change to a shared file, coordinate explicitly
before either commits. In practice this should not happen — both lanes consume
the primitives as stable dependencies.
