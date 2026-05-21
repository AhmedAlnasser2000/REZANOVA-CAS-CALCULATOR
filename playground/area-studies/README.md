# Area Studies

Area studies are the durable research unit for Calcwiz capability work.

They compare a Calcwiz capability area across relevant sources such as FriCAS, SymPy, Maxima, SageMath, Giac/XCAS, SymEngine, GeoGebra, Calcwiz shipped behavior, papers, and targeted experiments.

## Purpose

Use area studies to decide what Calcwiz should translate into native bounded architecture.

Area studies are not:

- feature parity plans
- product promises
- source-mirror adoption
- direct code reuse
- runner permissions

## Synthesis Levels

- Lite synthesis: small wording, readback, diagnostic, or UX refinement.
- Standard synthesis: one subsystem with moderate architecture risk.
- Full synthesis: foundational capability areas such as simplification, assumptions, exact linear algebra, symbolic integration, graphing, expression IR, and external compute.

## Missing-Capability Gate

Every study must classify missing prerequisites before proposing adoption:

- `blocker`
- `bounded-workaround`
- `playground-only`
- `deferred`

If a blocker is real, the study should stop cleanly or propose a smaller prerequisite milestone.

## Boundary

Research outputs can inform Playground experiments or stable milestones only after translation into Calcwiz-native bounded form.
