# Calcwiz App Summary

## Snapshot
- Date: 2026-05-27
- Context: post selected-target Equation expansion, variable memory/named-variable lane, editor analysis/runtime containment, app memory, and backend polynomial-elimination substrate work.

## Product State
- Calcwiz is a Linux-first Tauri desktop math workspace with React/TypeScript UI, Rust/Tauri desktop integration, MathLive input/rendering, and repo-owned validation.
- The launcher keeps dedicated workspaces for Calculate, Equation, Calculus/Advanced Calc, Trigonometry, Geometry, Statistics, Matrix, Vector, Table, Guide, Settings, History, and Variables.
- The app remains an early preview and does not claim full CAS parity.

## Current User-Facing Capabilities
- Calculate evaluates expressions, runs simplify/factor/expand, supports free-form calculus workflows, and visibly applies stored numeric variables in safe standard evaluation.
- Equation supports explicit selected targets beyond `x`, including case-sensitive single-letter targets and explicit named targets through `@name` / `var(name)`.
- Equation preserves non-target symbols as symbolic parameters, keeps stored values out of symbolic solving, and shows target/parameter policy in hints and details.
- Equation selected-target solving now covers bounded affine/linear, quadratic, rational, factorable polynomial, carrier, exp/log, trig, composition, mixed algebraic, mixed trig, and one-island isolation families.
- Equation numeric solving may use stored non-target values while protecting the solve target.
- Variables panel stores finite real numeric values, supports explicit named variables, and provides insert/edit/clear controls.
- Table, Basic Calculus, and Advanced Calc adopt stored values only where active and bound variables can be protected.
- Result cards now separate answer content from visible validity restrictions such as denominator exclusions, branch facts, and range facts.
- The editor runtime defers heavy live analysis, guards huge input, and exposes Run, Stop, and Restart Editor controls for MathLive-adjacent analysis work.
- Core calculator memory persists settings, history, stored variables, and `Ans`, while avoiding stale draft/result restoration.

## Internal Architecture Status
- `src/lib/kernel/*` owns capability, runtime-host, execution-profile, runtime-policy, and envelope metadata.
- `src/lib/algebra/*` owns shared variable, polynomial/rational, exact-matrix, capability-readiness, and related algebra substrates.
- `src/lib/equation/*` owns selected-target, guarded, composition, parameterized, and isolation solving helpers.
- Internal exact rational matrix support and polynomial-elimination substrates exist for bounded backend use, while product-facing polynomial systems and Grobner bases remain future work.
- Source mirrors and area studies remain research context only; stable product code must not depend on mirror source trees.

## Active Boundaries
- No full Mathematica/Maple/Sage/FriCAS-style CAS parity claim.
- No raw multi-letter variable parsing: `mass` is adjacent multiplication; one named variable requires `@mass` or `var(mass)`.
- No Equation symbolic stored-value substitution.
- No graphing, broad inequality solving, complex-domain solving, product-facing Grobner systems, or general transcendental solving yet.
- OOE is recorded as the future Rust-first execution-order contract; editor performance/runtime containment is already a separate immediate responsiveness boundary.

## Validation Posture
- Public release language is guarded by README, release docs, pillars, and CI gates.
- Core validation uses unit tests, UI tests, golden tests, memory-protocol checks, lint, build, and Rust `cargo check`.
- `npm run test:gate` remains the strongest single local validation command.
