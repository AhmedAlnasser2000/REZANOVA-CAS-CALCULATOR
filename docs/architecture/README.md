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

## Engine
- `engine/engine-root-surface-audit.md`: audit map for the Engine execution and planning bridge surface
- `engine/engine-semantic-planner-district-audit.md`: audit map for the Engine semantic planner surface

## Equation
- `equation/equation-complex-district-audit.md`: audit map for the current Equation complex district
- `equation/equation-direct-symbolic-worker-district.md`: audit and split record for the Equation direct-symbolic worker district
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

## Symbolic Engine
- `symbolic-engine/symbolic-engine-root-surface-audit.md`: audit map for the Symbolic Engine shared backend surface
- `symbolic-engine/symbolic-integration-district.md`: split record for the Symbolic Engine integration district
- `symbolic-engine/symbolic-limits-district.md`: split record for the Symbolic Engine limits district
- `symbolic-engine/symbolic-mixed-factor-district.md`: split record for the Symbolic Engine mixed carrier factorization district
- `symbolic-engine/symbolic-power-log-surface-audit.md`: audit map for the Symbolic Engine power/log normalization surface
- `symbolic-engine/symbolic-radical-district.md`: split record for the Symbolic Engine radical district
- `symbolic-engine/symbolic-rational-district.md`: split record for the Symbolic Engine rational normalization district
- `symbolic-engine/symbolic-shared-primitives-audit.md`: audit map for Symbolic Engine shared primitive helpers
