# Transcendental Risch Roadmap

status: active roadmap draft
created: 2026-07-01
primary_agent: codex
primary_agent_model: gpt-5-codex

## Purpose

This roadmap organizes Calcwiz work on theorem-backed transcendental integration after the Rubi Tier-I and bounded Risch-Norman/Rothstein-Lazard-Rioboo-Trager tracks.

The goal is not to claim full formal Risch prematurely. The goal is to separate three things that can otherwise blur together:

- practical named special-function answers for student and engineering workflows
- bounded Risch-Norman search for elementary antiderivatives
- formal transcendental Risch certificate infrastructure for proving non-elementarity in a stated differential field

## Current Baseline

Calcwiz already has a useful practical certificate layer:

- `e^(a*v^2+b*v+c)` can produce certificate-backed `erf`/`erfi` answers.
- Affine quotient families can produce `Si/Ci` and `Ei/li` answers.
- Bounded RN owns selected elementary depth-2 substitutions such as `e^x e^(e^x)`, `cos(x)e^(sin(x))`, `e^x/(1+e^x)`, and `1/(x ln(x))`.
- `FresnelS/FresnelC` have proof-safe differentiation/readiness substrate, but live Fresnel integration is deferred.
- General formal Risch remains future: broad tower solving, Risch differential equations, algebraic extensions, complex branch constants, and formal non-existence certificates outside the admitted families are not complete.

There was no dedicated transcendental Risch roadmap before this file. The previous source of truth was scattered across certificate audits/checkpoints and the broader Calculus/Rubi/RN memory notes.

## Guardrails

- Keep public Calculus result schemas and public strategy labels stable unless a dedicated milestone approves a public contract change.
- Do not expose a public `risch` strategy label until there is a deliberate UX decision for it.
- No Compute Engine fallback, numeric sampling, or numeric-confidence status may count as theorem-backed certificate proof.
- Every live certificate family must state:
  - selected variable
  - differential field/tower scope
  - exact differentiation closure
  - proof obligation or obstruction
  - visible facts and branch policy
  - controlled stop reasons
- Named special-function formulas are allowed as main answers when exact differentiation verifies them; certificate details remain proof support, not generic error text.
- RN and transcendental Risch may share tower profiling and exact algebra primitives, but their purposes stay distinct:
  - RN searches for an elementary antiderivative.
  - transcendental Risch proves whether an elementary antiderivative exists in a stated field.
- Equation must not import or expose RN/Risch/LRT method narratives. Shared algebra primitives may later be consumed only through Equation-owned routes and readback.
- Textbook benchmarks should be used as credibility and regression suites, not as proof substitutes for theorem-backed certificates.

## Major-Milestone Convention

For this track, ordinary fixes may be single-gate milestones.

Large Risch milestones should be internally gated:

- Gate A, Gate B, Gate C, etc. are verified checkpoints inside one milestone.
- Each gate records evidence.
- The milestone is committed once after all approved gates pass, unless the user explicitly requests separate gate commits.

This matches the repo policy that internal slices are not automatic commit boundaries.

## Required Substrates

Before claiming broader formal Risch coverage, Calcwiz needs these infrastructure layers:

- special-function input canonicalization so user-facing Derivative and Integral workspaces parse names such as `Si`, `Ci`, `Ei`, `li`, `erf`, `erfi`, `FresnelS`, and `FresnelC` as functions rather than symbol products
- a reusable transcendental field/tower descriptor
- exact proof-local differentiation closure over supported tower heads
- coefficient and constant-field discipline for target-free symbolic parameters
- Risch differential equation solving over bounded towers
- Liouville decomposition and log-derivative obstruction objects
- branch/domain fact readback for real and later complex branches
- node-first or node-backed readback for generated special-function/certificate answers
- theorem-backed stop messages that distinguish unsupported, named special-function, elementary, and proven non-elementary outcomes

## Immediate Roadmap

### 1. `SPECIAL-FUNCTION-INPUT-CANONICALIZATION1`

Single-gate implementation milestone.

Repair the user-facing input path before adding more special functions:

- canonicalize `erf`, `erfi`, `Si`, `Ci`, `Ei`, `li`, `FresnelS`, and `FresnelC`
- cover Calculus Derivative and Integral screens
- cover paste, Copy Expr, To Editor/Focus Editor, and History replay where they pass through shared editor/canonicalization paths
- avoid Equation behavior changes

This fixes the current problem where typed `Si(2x+1)` is treated as `S*i*(...)` rather than a function application.

### 2. `TRANSCENDENTAL-FIELD-TOWER-CORE1`

Major gated milestone.

- Gate A: base differential-field descriptor for selected variable and target-free constants.
- Gate B: extension descriptors for exp, log, trig/sin-cos, and named special-function heads.
- Gate C: tower-depth classifier with explicit depth-1/depth-2/depth-3 stop reasons.
- Gate D: proof-safe normalization of equivalent tower spellings such as `Exp(u)` and `e^u`.

No live integration adoption.

Status: implemented 2026-07-01 as behavior-invisible infrastructure. The profiler records selected variable, coefficient scope, exp/positive-base-exp/log/trig/special-function descriptors, depth-1/depth-2 readiness, depth-over-cap and unsupported-composition stops, and proof-safe exponential spelling normalization without changing dispatch.

### 3. `TRANSCENDENTAL-CONSTANT-FIELD-AND-FACTS1`

Major gated milestone.

Harden the constant-field and fact layer that formal transcendental Risch needs:

- Gate A: classify target-free symbolic constants versus selected-variable-dependent expressions.
- Gate B: normalize nonzero, positivity, branch, and denominator facts used by tower/RDE proof objects.
- Gate C: connect certificate facts to existing exact supplement/readback paths without Equation-owned leakage.
- Gate D: stop cleanly when a required constant-field fact cannot be represented safely.

Textbook elementary families such as `z*(ln(z))^2` should be deferred to the later benchmark-driven batch unless a formal proof milestone needs them as regression consumers.

### 4. `TRANSCENDENTAL-RDE-SOLVER-CORE1`

Major gated milestone.

- Gate A: bounded first-order linear Risch differential equation representation.
- Gate B: rational-base and affine-extension solving cases needed by current certificate families.
- Gate C: exact proof evidence and stop reasons for unsupported towers.
- Gate D: tests showing no numeric or Compute Engine proof leakage.

This is a prerequisite for moving beyond named family recognition.

### 5. `TRANSCENDENTAL-LIOUVILLE-DECOMPOSITION1`

Major gated milestone.

- Gate A: Liouville-form proof object for elementary antiderivative candidates.
- Gate B: rational part plus logarithmic-derivative residual decomposition.
- Gate C: connection to existing Hermite/LRT rational infrastructure where valid.
- Gate D: certificate readback that separates input facts from proof obligations.

No broad full-Risch claim yet.

### 6. `TRANSCENDENTAL-RISCH-REDUCED-EQUATION1`

Major gated milestone.

Add the reduced-equation layer used after tower profiling and Liouville decomposition:

- Gate A: represent reduced Risch equations over the bounded tower descriptor.
- Gate B: solve the first bounded exponential/logarithmic reduced cases needed by certificate proofs.
- Gate C: produce proof-readable obstruction data when no rational solution exists under the stated caps.
- Gate D: reject depth/branch/coefficient cases that require later algebraic or depth-3 machinery.

Practical log-substitution textbook cases such as `sin(ln(x))` and `cos(ln(x))` can later use this substrate, but they are not the reason to build it now.

### 7. `TRANSCENDENTAL-BRANCH-FACT-AND-CERTIFICATE-UX1`

Major gated milestone.

- Gate A: normalize real-domain branch facts for `log`, `Ci`, `Ei`, `li`, Fresnel, and nested log carriers.
- Gate B: separate input conditions, branch exclusions, and proof obligations in result details.
- Gate C: keep casewise rows readable and copy-safe for named special functions and non-elementary certificates.
- Gate D: add controlled stop cards for branch/field gaps that are theorem boundary issues, not generic failures.

This is not a Display schema change; it is producer/readback discipline for the certificate families.

### 8. `TRANSCENDENTAL-DEPTH2-COMPOSITION-CERTIFICATES1`

Major gated milestone.

First research-push depth-2 adoption using the formal substrate:

- Gate A: classify depth-2 candidates into elementary substitution, named special-function, certificate-ready, and unsupported.
- Gate B: admit bounded examples such as `e^(e^x)`, `sin(e^x)`, and `cos(e^x)` only when proof/readback obligations are explicit.
- Gate C: ensure RN can reuse the tower profile without changing public labels.
- Gate D: preserve honest stops for `e^(sin(x))`, depth-3 towers, and unresolved nested logarithms.

### 9. `TRANSCENDENTAL-FRESNEL-LIVE1`

Major gated milestone.

Make Fresnel answers live for quadratic trig families:

- Gate A: scaling normalization to the chosen `FresnelS/FresnelC` convention.
- Gate B: exact-rational quadratic trig cases.
- Gate C: target-free symbolic quadratic leading coefficient branch/readback policy if it stays proof-clean.
- Gate D: certificate details plus notation-safe copy/history coverage.

### 10. `TRANSCENDENTAL-QUOTIENT-POWER-RECURRENCES1`

Major gated milestone.

Lift already live affine quotient special-function families:

- Gate A: `sin(u)/u^n` and `cos(u)/u^n` integer-power recurrences.
- Gate B: `e^u/u^n` integer-power recurrences.
- Gate C: exact facts and singularity exclusions.
- Gate D: controlled stops for over-cap powers and non-affine kernels.

## Post-Batch Checkpoint

After the ten moves above, add a docs-only checkpoint such as `TRANSCENDENTAL-RISCH-CHECKPOINT0`.

It should record what the track covers, what is still not full formal Risch, which textbook benchmark families are covered, and which next layer is warranted:

- depth-3 tower infrastructure
- algebraic extensions
- complex branch constants
- formal non-existence certificates for another family
- textbook-benchmark-driven cleanup

## Expected Position After The Immediate Roadmap

After these moves, Calcwiz should be much stronger than the current practical certificate layer:

- special-function input and derivative surfaces should be trustworthy
- Fresnel-style quadratic trig answers should be live
- quotient-power recurrences should reduce many engineering/asymptotic examples
- formal proof infrastructure should have real field/tower, RDE, reduced-equation, constant-field/fact, and Liouville pieces rather than family-only detectors
- branch/fact readback should be strong enough that certificate rows do not look like ordinary input conditions

Textbook elementary catchup such as log-power by-parts and log-substitution examples should be handled in a later benchmark-driven sweep when the user supplies Stewart/Thomas material, not one-by-one inside the formal Risch infrastructure batch.

This would still not be unrestricted formal transcendental Risch. Remaining research-grade gaps would include broad recursive tower solving, depth-3+ towers, algebraic extensions, constant-field algebra, complex branch cuts/constants, and full decision-procedure completeness across arbitrary elementary extensions.
