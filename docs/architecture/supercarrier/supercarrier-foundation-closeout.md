# Supercarrier Foundation Closeout

Milestone: `SUPERCARRIER-FOUNDATION-CLOSEOUT0`

Date: 2026-06-16

Purpose: close the current Supercarrier foundation lane after the contract manifest and reporting work. This is a docs-only checkpoint. It does not add a bus, runtime registry, plugin layer, Surface Protocol, graphing compartment, source rewrite, generated source, validator rule, OOE event type, diagnostics behavior change, solver behavior change, Display policy change, schema change, worker-host change, or routing change.

## Current Foundation State

The current repo has enough Supercarrier foundation to pause infrastructure work and use the system as intended:

- OOE remains runtime traffic control.
- OOE Event Outbox reports OOE lifecycle facts.
- Supercarrier compartments define ownership, damage containment, import boundaries, and diagnostics labels.
- The manifest is the declarative contract source for compartment ids, labels, ownership paths, public seams, private paths, dependency policies, OOE fact mappings, state surfaces, and Surface candidacy metadata.
- The read-only validator consumes the manifest for ids, path labels, and private district checks while keeping rule semantics in code.
- Diagnostics can show per-compartment state from existing facts rather than from a second truth store.
- `npm run report:compartments` gives a static contract report plus validator pass/fail summary.

The foundation is deliberately not a runtime brain. Supercarrier does not listen, route, cancel, retry, commit, select hosts, or understand facts. OOE owns runtime decisions; Supercarrier owns the contract that makes those decisions and failures inspectable by compartment.

## Report Snapshot

Command run:

```bash
npm run report:compartments
```

Result:

- validator: pass
- validated source files: 651
- validated OOE files: 26 TypeScript, 6 Rust
- graphing: absent by design; no graphing compartment, route, workspace, pack, or Surface candidate is present.

The report confirms the contract is load-bearing enough for current development. It names every committed compartment, emits ownership/public/private seams, and keeps future Surface candidates descriptive only.

## Messy Areas Found

These are not immediate failures. They are the areas that still look broad or awkward from the report and should guide future work only when they start costing real development time.

### App Shell

`app-shell` owns `src/AppMain.tsx`, `src/app/shell/`, `src/app/workspaces/`, `src/components/`, and `src/styles/app/`. That is intentionally broad for now. The validator protects the biggest hazards, and recent seams closed direct OOE and UI-boundary internals.

Next useful work here should be driven by actual component pressure, not Supercarrier theory. Candidate slices are AppMain visual orchestration cleanup, workspace component prop-model cleanup, or DisplayPanel ergonomics if they become noisy again.

### App Runtime

`app-runtime` is now much cleaner after persistence and workspace-request facades, but it remains an important boundary because it builds requests and coordinates mode hooks. It should continue to avoid private solver districts, worker internals, app-shell component trees, and direct app-state persistence internals.

No new validator rule is needed from the closeout report.

### App State / History / Variables

This compartment combines app-state schemas, persistence seams, history parsing, calculator memory, variable memory, hints, and named-variable policy. It is coherent but dense. The public seams are now declared, and private persistence/schema/store paths are protected.

Future work should be behavior-driven: only split further if persistence, History compatibility, or variable memory starts blocking a specific change.

### Table

`table` remains a small flat surface with `src/lib/modes/table.ts` and `src/lib/modes/table-core.ts`. This is not a problem yet. It is worth revisiting only if Table grows a richer guided workspace, more parser/runtime request helpers, or graph/table coupling later.

### Navigation / Input

`navigation-input-kernel` aggregates navigation, input, kernel, editor, numeric, and virtual keyboard surfaces. It is a practical shared primitives compartment, but it is broad enough that future keypad/editor work should audit before adding stricter validator rules.

### Playground And Source Mirrors

`playground` and `reference-mirrors` are correctly isolated as static/reference compartments. Production source must not import or embed source-mirror paths. No action is needed unless a future incubation workflow promotes code into product source.

## Foundation Closeout Decision

The Supercarrier foundation is complete enough for the current repo:

- OOE facts are load-bearing.
- Manifest and validator are converged into one declarative contract source.
- Diagnostics/reporting can answer "what is wrong with this compartment?" from existing runtime and UI-boundary evidence.
- App shell, app runtime, app-state, workspace request, OOE diagnostics, and UI-boundary exceptions have narrow seams and validator coverage.

Further Supercarrier work should now be demand-driven. Do not add a broader bus, Surface Protocol, plugins, packs, generated contracts, runtime registries, or new compartment state infrastructure until a concrete product or contributor need appears.

## Deferred Work

Graphing remains explicitly deferred. The graphing mental model remains a scene/runtime system over trustworthy solver outputs: domains, restrictions, branches, parameter ranges, discontinuities, and failure reasons. It should not be added as a compartment or Surface candidate in this closeout.

Surface Protocol remains future context. It should expose filtered, stable facts only after there is a real embedding or integration need.

Plugins, distro packs, external SDKs, and broad bus/nervous-system layers remain demand-driven later work.

## Recommended Next Moves

Short term:

- Use `npm run report:compartments` as the static health check when planning boundary-sensitive work.
- Use the OOE Diagnostics `Compartments` tab when runtime behavior feels wrong and the issue may be compartment-local.
- Prefer product-facing or correctness work over more Supercarrier scaffolding.

If the next architecture slice is needed, start from a real messy compartment:

- App shell component pressure.
- Navigation/Input/keypad/editor breadth.
- Table growth.
- A future graphing/product scene milestone after solver contracts are ready.

## Stop Rules

- Stop if a proposed follow-up creates a bus, runtime registry, plugin layer, Surface Protocol, command authority, source generator, or new execution authority without a concrete need.
- Stop if graphing is added before a product plan that consumes validated solver/domain/branch state.
- Stop if a new validator rule would require behavior changes rather than import-boundary cleanup.
- Stop if the report is treated as runtime truth. It is a static contract report; runtime truth still comes from OOE and UI-boundary evidence.
