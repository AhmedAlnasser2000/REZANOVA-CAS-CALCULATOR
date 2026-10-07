# Architecture Docs

Architecture notes are grouped by ownership area so the folder stays navigable. These files are historical audit and split records unless an individual note says otherwise; moving them here does not change Calcwiz runtime, solver, display, OOE, or workflow policy.

## Overview
- `overview/facade-compat-audit.md`: repo-wide map of public facades, compatibility shims, active roots, and retirement rules
- `overview/import-cycle-audit.md`: one-off import-cycle scan and classification for current TypeScript source cycles
- `overview/kernel-first-boundary-map.md`: current kernel-first architecture guidance
- `overview/playground-incubation-ladder.md`: staged path for playground-to-product promotion

## App Shell
- `app-shell/appmain-orchestrator-surface-audit.md`: audit map for the remaining AppMain cross-mode orchestration surface
- `app-shell/styles-app-shell-surface-audit.md`: audit map and final decomposition record for the app shell CSS surface
- `app-shell/workspace-tabs-page-foundation-audit.md`: readiness audit for future full-page tab surfaces over the current workspace-tab foundation

## Algebra
- `algebra/algebra-abs-district-audit.md`: audit and split record for the Algebra absolute-value district
- `algebra/algebra-branch-assumption-surface-audit.md`: audit map for the Algebra branch and assumption surface
- `algebra/algebra-domain-range-surface-audit.md`: audit and split record for the Algebra domain/range surface
- `algebra/algebra-inequality-surface-audit.md`: audit and split record for the Algebra inequality surface
- `algebra/algebra-polynomial-core-district-audit.md`: audit and split record for the Algebra polynomial core district
- `algebra/algebra-polynomial-elimination-district-audit.md`: audit and split record for the Algebra polynomial elimination district
- `algebra/algebra-polynomial-surface-audit.md`: audit and split record for the Algebra polynomial surface
- `algebra/algebra-radical-district-audit.md`: audit and split record for the Algebra radical district
- `algebra/algebra-rational-function-district.md`: audit and split record for the Algebra rational-function district
- `algebra/algebra-root-surface-audit.md`: audit map for the current Algebra shared capability surface
- `algebra/algebra-transform-core-district-audit.md`: audit and split record for the Algebra transform core district
- `algebra/algebra-variable-memory-district-audit.md`: audit and split record for the Algebra variable memory district
- `algebra/algebra-variable-surface-audit.md`: audit and split record for the Algebra variable surface

## Calculus
- `calculus/calculus-engine-path-audit.md`: audit map for the guided Calculus workspace district and shared Calculus engine paths
- `calculus/calculus-guide-domain-compat-audit.md`: compatibility audit for Calculus Guide domain ids, article ids, and legacy launch fields
- `calculus/calculus-identity-surface-audit.md`: audit map for canonical Calculus identity and legacy compatibility
- `calculus/calculus-root-surface-audit.md`: audit map for the post-merge Calculus root surface and shared engine district split

## Display
- `display/display-root-surface-audit.md`: audit map for the Display helper root surface and planned result/notation districts
- `display/display-result-scheduling-district.md`: split record for Display result block/readback and render scheduling helpers
- `display/display-notation-district.md`: split record for Display notation and formatting helpers
- `display/display-panel-surface-audit.md`: audit map for the app-shell DisplayPanel component surface

## Language
- `language/language-compartment-display-text-memory.md`: durable design memory for a future typed Language compartment, English fallback, RTL metadata, and the Language/Display text boundary
- `language/language-compartment-foundation.md`: implementation record for the English-only typed Language compartment foundation, fallback APIs, React seam, and manifest entry
- `language/language-surface-audit.md`: initial repo-grounded audit of user-facing text surfaces before a Language compartment implementation

## Linear Algebra
- `linear-algebra/linear-system-ownership-audit.md`: docs-only boundary lock for Matrix-owned structured linear systems, Equation-owned free-form solving, and explicit Equation handoff posture

## Notebook
- `notebook/object-frame-authority-v1.md`: contract-only Schema 15 design for one persisted object frame, ingress migration, command/undo ownership, derived layout, interaction overlay, registry/layers, publication, and legacy deletion

## Engine
- `engine/engine-root-surface-audit.md`: audit map for the Engine execution and planning bridge surface
- `engine/engine-semantic-planner-district-audit.md`: audit map for the Engine semantic planner surface

## Equation
- `equation/equation-algebraic-numbers1-spec.md`: factorization, certified real/complex isolation and RootOf arithmetic for the private Equation core
- `equation/equation-complex-district-audit.md`: audit map for the current Equation complex district
- `equation/equation-direct-symbolic-worker-district.md`: audit and split record for the Equation direct-symbolic worker district
- `equation/equation-exact-algebra1-spec.md`: first implementation specification for the private Equation core's exact-algebra substrate
- `equation/equation-generators1-spec.md`: slice 2 of the private Equation core: exact real exp/log/Lambert-W equations, inequalities and nested chains via exponent lattices, certified enclosures and a proof-log verifier
- `equation/equation-composition1-spec.md`: slice 5 of the private Equation core: injective cancellation, certified ranges with exact candidates for mixed kernels, and interval families through a non-affine trig argument (part A); several principal logs over ℂ, an exact algebraic-log zero test and depth-25 evidence (part B)
- `equation/equation-parameters1-spec.md`: gate 10 of the private Equation core: case trees over ℚ(p…) for polynomial and rational relations (one parameter by exact cells with parametric roots, several by sign-condition trees, a specialization verifier) and Liouville-bound zero tests for algebraic coefficients (part A); single kernels with parameters, transcendental constant coefficients by Sturm isolation, and the all-gates follow-up ledger in the roadmap (part B)
- `equation/equation-systems1-spec.md`: slice 6 of the private Equation core: systems in several targets; linear systems with parameters by fraction-free elimination with pivot cases, parametric answers in the free targets and a Bareiss completeness check (part A); Gröbner bases with cofactor certificates, exact points via Hermite counts and the rational univariate representation, triangular infinite sets and kernel elimination (part B)
- `equation/equation-proof-performance1-spec.md`: gate 12 of the private Equation core: a fixed benchmark corpus with recorded before/after medians; cost accounting without string conversion, dyadic rationals, fixed-point trig series and per-store caches (part A); certificates-first verification, fixed-point disk evaluation and a smaller parameter grid (part B)
- `equation/equation-result-contract1-spec.md`: gate 13 of the Equation reconstruction: canonical-result V6 with typed Equation outcomes and solution sets, root binders, a restricted math grammar with canonical LaTeX and binding rules (part A); the Equation adapter with replay (part B)
- `equation/equation-adoption1-spec.md`: stage 14 of the Equation reconstruction: the New Equation workspace (rows, automatic unknowns, assumptions applied exactly and recorded in V6, worker service and OOE runtime, drafts per tab) and its page, menu entry, Guide article and Playwright evidence
- `equation/tests-legacy-equation-inert1.md`: old Equation engine tests inert in every full run (unit, UI, e2e, CI, golden) and runnable on demand with `npm run test:legacy-equation*`; golden cases for New Equation and New Integration
- `equation/equation-certified-numerics1-spec.md`: stage 15 (slice 8) of the Equation reconstruction: certified isolated real roots as the schema-7 `isolated-real-root` binder, range rows, the exclusion-cover verifier and the "Certified" line (PR A, one variable); square systems by Krawczyk (PR B)
- `equation/new-equation-responsive1.md`: New Equation fixes: rows read off the main thread (no typing freeze), the answer shown first as not checked yet and then verified or withdrawn, finite systems verified in one number field (the complex test system went from over two minutes to about one second), and the development-only 60-second slow-case probe
- `equation/equation-presentation1-spec.md`: stage 13b of the Equation reconstruction: proven display rewrites, certified decimals and numeric order (part A); the V6 printer (ring-identity layout, readable relations) and the presentation read model with Exact/Decimal/Both, roots as decimal plus definition and an exact copy (part B)
- `equation/equation-constraints1-spec.md`: slice 3 of the private Equation core: exact real absolute values (lazy branching, zero intervals) and radicals (same-base lattice, tower-norm elimination with exact confirmation), mixed with exp/log
- `equation/equation-periodic1-spec.md`: slice 4 of the private Equation core: exact real trig and inverse trig, periodic families, periodic inequalities with half-line tails, composition chains and families in integer parameters (part A); complex exp/log/power/trig lattice families with exact intersections and exclusions (part B)
- `equation/equation-polynomial-decision1-spec.md`: slice 1 of the private Equation core: exact univariate polynomial/rational equations, inequalities and conjunctions over R and C, with proof logs and a verifier
- `equation/equation-reconstruction-blueprint.md`: machinery and native representation for the private Equation core rebuild
- `equation/equation-reconstruction-design.md`: locked design decisions for the private Equation core rebuild
- `equation/equation-reconstruction-inventory.md`: old-engine cap inventory and 50-equation baseline probe
- `equation/equation-reconstruction-roadmap.md`: provisional gate sequence for the private Equation core rebuild
- `equation/equation-representation1-spec.md`: expression graph, relation problems, transform proof logs, search, solution sets, MathJSON and wire for the private Equation core
- `equation/equation-domain-shared-surface-audit.md`: audit map for remaining active/shared Equation root surfaces
- `equation/equation-guarded-district-audit.md`: audit map for the current guarded Equation solve district
- `equation/equation-inequality-district-audit.md`: audit map for the current Equation inequality district
- `equation/equation-numeric-interval-district.md`: audit and split record for the Equation numeric interval district
- `equation/equation-polynomial-surface-district.md`: audit and split record for the Equation polynomial surface district
- `equation/equation-root-closure-audit.md`: closure audit for the current Equation root surface
- `equation/equation-root-facade-audit.md`: audit map for the current Equation root facade and active surface split
- `equation/equation-root-surface-map.md`: current intended Equation root import surface and facade map

## Modes
- `modes/modes-calculate-foundation.md`: split record for the Calculate mode foundation district
- `modes/modes-equation-surface-audit.md`: audit map for the Equation mode orchestration surface
- `modes/modes-root-surface-audit.md`: audit map for the Modes root surface
- `modes/modes-surface-roadmap-audit.md`: post-Equation Modes sweep and next major milestone recommendation
- `modes/modes-worker-client-grouping.md`: final grouping record for Modes worker clients and worker entrypoints
- `modes/modes-worker-client-surface-audit.md`: audit map and future grouping guidance for Modes worker clients and entrypoints

## OOE
- `ooe/ooe-pilot-surface-grouping.md`: final grouping record for the OOE pilot surface
- `ooe/ooe-job-launch-district.md`: final district record for OOE job identity, active lifecycle, cancellation records, and launch tickets
- `ooe/ooe-runtime-coordinator-district.md`: final district record for OOE runtime coordination, envelopes, shell contracts, host adapters, and trace helpers
- `ooe/ooe-diagnostics-district.md`: final district record for OOE diagnostics records, inspector rows, evidence lines, and panel-facing serialization
- `ooe/ooe-diagnostics-district-audit.md`: audit map for OOE diagnostics records, inspector rows, panel consumers, and future diagnostics grouping
- `ooe/ooe-event-outbox-district.md`: implementation record for the internal OOE lifecycle event outbox
- `ooe/ooe-event-outbox-supercarrier-handoff.md`: durable handoff for the OOE event outbox, Supercarrier sequencing, and future Surface Protocol boundary
- `ooe/supercarrier_bus_surface_protocol_handoff_updated_from_repo.md`: verbatim preserved external handoff for the OOE event outbox, Supercarrier, and Surface Protocol direction
- `ooe/ooe-bridge-schema-district.md`: final district record for OOE bridge schemas, descriptor access, fallback handling, commit contracts, and trace schemas
- `ooe/ooe-root-surface-audit.md`: audit map for the OOE root traffic-control surface
- `ooe/ooe-traffic-control-district-audit.md`: audit map for the remaining OOE traffic-control core

## Supercarrier
- `supercarrier/compartment-contracts.md`: `COMPARTMENTS0` contract/audit record for current Calcwiz compartments and future validator scope
- `supercarrier/supercarrier-foundation-closeout.md`: closeout checkpoint for the current Supercarrier foundation, report findings, messy areas, and deferred graphing/Surface work
- `supercarrier/app-runtime-boundary-audit.md`: audit map for `src/app/runtime/` and `src/app/logic/` seams, allowed imports, and future validator candidates
- `supercarrier/workspace-runtime-request-facade-audit.md`: audit map for app-runtime imports into Trigonometry, Statistics, and Geometry request-building surfaces before future runtime-request facades
- `supercarrier/app-state-history-variables-boundary-audit.md`: audit map for app-state schemas, history/display shell state, calculator memory, stored-variable policy, hints, and named-variable seams
- `supercarrier/compartment-state-surface-audit.md`: audit map and first implementation record for the read-only compartment health/state projection over OOE facts, diagnostics, jobs, validator reports, and UI boundary failures
- `supercarrier/app-shell-workspace-boundary-audit.md`: audit map for `AppMain`, app-shell components, workspace components, and reusable React component seams before future shell/workspace validators
- `supercarrier/workspace-tabs-surface-audit.md`: audit map for future session-scoped workspace tabs, workspace-instance identity, History posture, and OOE scoping boundaries

## Surface Protocol
- `surface-protocol/surface-protocol-boundary-audit.md`: `SURFACE0` boundary audit for the future external embedding/integration contract, DTO firewall, read-only event/query posture, and graphing deferral.
- `surface-protocol/hostless-v1-contract.md`: internal-agent contract reference for the landed hostless Surface Protocol v1 fixtures, examples, deferred mount, deferred Graphing, and future Model Context Protocol adapter posture.

## Symbolic Engine
- `symbolic-engine/symbolic-engine-root-surface-audit.md`: audit map for the Symbolic Engine shared backend surface
- `symbolic-engine/symbolic-integration-district.md`: split record for the Symbolic Engine integration district
- `symbolic-engine/symbolic-limits-district.md`: split record for the Symbolic Engine limits district
- `symbolic-engine/symbolic-mixed-factor-district.md`: split record for the Symbolic Engine mixed carrier factorization district
- `symbolic-engine/symbolic-power-log-surface-audit.md`: audit map for the Symbolic Engine power/log normalization surface
- `symbolic-engine/symbolic-radical-district.md`: split record for the Symbolic Engine radical district
- `symbolic-engine/symbolic-rational-district.md`: split record for the Symbolic Engine rational normalization district
- `symbolic-engine/symbolic-shared-primitives-audit.md`: audit map for Symbolic Engine shared primitive helpers
