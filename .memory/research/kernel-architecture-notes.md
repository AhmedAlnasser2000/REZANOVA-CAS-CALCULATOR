# Kernel Architecture Notes

## Context

- Date captured: `2026-04-08`
- Source context:
  - direct discussion with the user about strengthening Calcwiz's internal architecture before continuing deeper algebra work
  - external local reference pack: `C:\Users\ahmed\Downloads\calcwiz_kernel_architecture.zip`
  - pack files reviewed:
    - `INDEX.md`
    - `01_kernel_map.md`
    - `02_kernel_vs_microkernel.md`
    - `03_evolution_roadmap.md`
    - `04_module_contract_sketches.md`
- Important handling rule for future recall:
  - do not collapse this note into a vague "Calcwiz should maybe become plugin-based"
  - the actual recommendation is more specific and more staged than that

## High-level takeaway

The external pack is directionally strong. Its main recommendation is correct for Calcwiz:

- Calcwiz should become a **kernel-centered modular monolith first**
- Calcwiz should be **designed for microkernel-like extensibility later**
- Calcwiz should **not** jump directly into a full plugin/microkernel platform while internal contracts are still moving

This matches the current state of the repo much better than either extreme:

- not "keep everything as ad hoc app-local orchestration forever"
- not "rewrite everything immediately into a plugin platform / Rust-only microkernel"

The correct interpretation for Calcwiz is:

- internal kernel contracts now
- internal extensibility now
- external/plugin-style extensibility later
- gradual Rust runtime authority later, not forced all at once

## What the external pack says

The pack's core argument is that Calcwiz should stop being thought of only as a calculator UI and should instead be treated as a math runtime with a flagship UI client.

The strongest points from the pack:

- a kernel should be the single source of truth for:
  - expression contracts
  - result envelopes
  - job lifecycle
  - progressive solver semantics
  - policy/profile routing
  - capability gating
  - stable local/external API surfaces
- a microkernel is a later-stage evolution, useful when installable packs, capability registries, daemon/service mode, remote adapters, or third-party extension surfaces become worth the cost
- the recommended order is:
  - kernel-first modular monolith now
  - stronger slice/registry boundaries later
  - true microkernel traits only when they pay for themselves

The pack also proposes useful contract concepts:

- result envelopes carrying provenance/runtime context, not only raw math text
- explicit job models with states and policy metadata
- progressive event contracts with provisional vs committed semantics
- capability registries
- later pack manifests

## What we agree with

These are the parts of the external pack that should be preserved as adopted direction:

### 1. Kernel-centered modular monolith first

This is the right immediate architecture target for Calcwiz.

Reason:

- we already have enough shared math/runtime logic that the repo is asking for stronger internal boundaries
- we do **not** yet have sufficiently stable contracts to justify a true plugin platform or broad external module lifecycle

### 2. Shared contracts should become the center of gravity

Calcwiz should keep moving away from app-local invented semantics and toward shared typed contracts for:

- requests
- results
- diagnostics
- provenance
- stop reasons
- capabilities
- runtime job state

This is already consistent with the recent shared-core direction in algebra:

- `src/lib/polynomial-core.ts`
- `src/lib/polynomial-factor-solve.ts`
- `src/lib/radical-core.ts`

The same principle should now begin to shape runtime/orchestration boundaries, not only bounded algebra cores.

### 3. Progressive runtime should eventually be infrastructure, not UI behavior

The pack is right that progressive solving is more valuable when the runtime semantics live in a kernel contract instead of being inferred per UI flow.

Future kernel-owned runtime concepts should include:

- job submission
- job states
- partial vs committed result semantics
- pause/cancel/resume
- checkpoint semantics
- capability-aware policy routing

### 4. Internal extensibility should come before external extensibility

We should not jump straight to:

- public plugin APIs
- marketplace concepts
- independently shipped packs
- remote orchestration frameworks

We should first make internal boundaries strong enough that later extension surfaces are not built on accidental current app shapes.

### 5. Profiles/policies are a real architectural axis

The pack is right that Calcwiz's future "learner vs engineering vs safe/aggressive/local/remote" differences should become policy/profile bundles over one runtime, not fragmented mini-apps with divergent logic.

## What we should qualify or adapt for Calcwiz

This is the most important section to preserve accurately, because this is where the repo-grounded interpretation differs from a naive reading of the pack.

### 1. Rust should become authoritative gradually, not immediately

The external pack frames the Rust-side kernel as the eventual authoritative math runtime.

That is a good **destination**.

It should **not** be treated as an immediate implementation mandate.

Current repo reality:

- meaningful math/runtime truth still lives in TypeScript
- recent algebra/shared-core work is TypeScript-first
- the current Tauri app is still the main product surface
- a forced "Rust authority now" push would likely create migration theater before the contracts are stable enough

So the adapted rule is:

- define the contracts now
- centralize semantics now
- keep implementations where they are while contracts settle
- move authority into Rust progressively after those contracts prove out

### 2. We should not build a full microkernel/plugin platform yet

The pack is careful about this, and Calcwiz should stay careful too.

For now, do **not** build:

- plugin lifecycle management
- external pack installation/update/uninstall
- third-party module governance
- multi-process engine slicing by default
- remote-worker orchestration as a near-term prerequisite

These are future-platform concerns.

They become realistic only after:

- internal kernel contracts exist
- result/job/capability semantics are stable
- internal engine slices actually respect those boundaries

### 3. Architecture work should not replace product/math work for too long

The right move is not "pause everything and spend a long stretch rewriting the app around architecture diagrams."

The right move is:

- do one or two bounded architecture milestones
- make the core seams stronger
- then continue algebra/composition/solver work on top of the cleaner base

This keeps momentum while still reducing future entropy.

## Repo-grounded evidence behind this recommendation

These observations are specific to the current Calcwiz codebase and are the reason the kernel-first recommendation is well-timed now.

### Existing proto-kernel / shared-runtime shapes

#### `src/lib/math-engine.ts`

This is already acting like a broad execution kernel for `Calculate`, but it still mixes too much:

- normalization
- Compute Engine calls
- app-owned algebra fallbacks
- factoring
- output shaping

That makes it a good candidate for later kernel extraction and contract cleanup.

#### `src/lib/equation/guarded/run.ts`

This is already a staged Equation runtime.

It sequences:

- bounded algebra
- guarded solve routing
- composition stages
- validation
- result assembly

This is very close to a kernel-style pipeline already, but the boundary is still feature/runtime-local rather than explicitly generalized.

#### `src/types/calculator/runtime-types.ts`

This is already a strong seed for shared contracts:

- typed result/output vocabularies
- diagnostics
- provenance/badges
- runtime-facing data structures

This should be strengthened and treated as an intentional kernel-contract zone, not only a growing type bucket.

### Existing shared math cores prove the pattern works

Recent shipped work already validates the shared-core principle:

- `src/lib/polynomial-core.ts`
- `src/lib/polynomial-factor-solve.ts`
- `src/lib/radical-core.ts`

These prove an important architectural point:

- centralizing shared bounded math logic improved consistency
- it reduced duplication across solver paths
- it made later milestones easier to implement cleanly

That same principle should now be applied one level up, to runtime/orchestration contracts.

### App-shell orchestration is still too app-local

#### `src/app/logic/modeActionHandlers.ts`

This remains one of the clearest architecture smells in the repo:

- very large
- dependency-heavy
- still `@ts-nocheck`
- too much orchestration gravity sits near the app shell

If we want stronger modularity and later extensibility, this kind of file should shrink in importance and be fed by clearer kernel/controller contracts.

#### `src/app/logic/primaryActionRouter.ts`

This remains a large application-level switchboard.

That is not inherently wrong today, but it is one of the places where a pillar-based refactor could make the system easier to evolve.

## Working definitions for Calcwiz

To avoid future ambiguity, these terms should mean the following inside this project.

### Kernels

In Calcwiz, a kernel should mean:

- a pure execution/contract layer
- typed request/result semantics
- no React state ownership
- no UI presentation authority
- no feature-local ad hoc result formats

Examples of likely kernels or kernel-owned slices:

- equation runtime kernel
- calculate execution kernel
- expression/normalization kernel
- numeric/progressive job kernel
- notation/serialization kernel

### Microkernels

In Calcwiz, a microkernel should **not** immediately mean:

- dynamic runtime plugin loading everywhere
- external marketplace
- process-per-engine
- message bus for everything

For this repo, "microkernel later" should mean:

- a small stable host
- capability-based routing
- registries/manifests where justified
- stronger separable engine slices
- optional pack/module lifecycle only after internal contracts are stable

### Pillars

Pillars are the top-level durable architecture boundaries of the repo.

The current best framing is:

- Input / Planning pillar
- Math Core pillar
- Solver Runtime pillar
- Domain Application pillar
- UI / Presentation pillar
- Integration / Binding pillar

These are not mode screens. They are architecture ownership zones.

## Recommended near-term architecture milestone

The right next architecture move is **not** "build the whole future platform."

It is a bounded internal milestone, tentatively named:

## `ARCH1 — Pillars and Kernel Contracts`

### Goals

- define the shared runtime contract language more explicitly
- make stage sequencing and ownership clearer
- reduce app-shell orchestration gravity
- create stable internal extension seams before more large math expansions

### Best initial targets

If `ARCH1` is chosen, the highest-value places to work first are:

- `src/lib/math-engine.ts`
- `src/lib/equation/guarded/run.ts`
- `src/types/calculator/runtime-types.ts`
- `src/app/logic/modeActionHandlers.ts`
- `src/app/logic/primaryActionRouter.ts`

### Likely deliverables

The following would be appropriate for a bounded first milestone:

- stronger shared result envelope shape
- clearer job/result/diagnostic vocabulary
- capability metadata skeleton
- explicit runtime/pillar boundaries
- smaller app-facing controller seams over existing execution kernels
- no public plugin API yet
- no destructive cross-language rewrite

### What `ARCH1` should explicitly not try to do

- no plugin marketplace
- no third-party extension governance
- no multi-process engine slicing as a default architecture
- no broad remote execution framework
- no forced Rust-authority migration in the same milestone

## Build-now vs defer

This distinction should be preserved clearly.

### Build now

- internal kernel contracts
- stronger shared result/job/capability semantics
- clearer pillar boundaries
- internal registries where they reduce hardcoded orchestration
- better separation of UI presentation from runtime truth

### Defer until later

- full plugin lifecycle
- external pack installation
- independently shipped engine modules
- daemon/service-first architecture
- remote execution adapters as a core dependency
- public extension SDK governance

## Relationship to ongoing algebra/solver work

The recommendation is **not** "stop math work indefinitely."

The recommendation is:

- the shared-core direction in algebra has gone well
- the next generalization of that idea should happen at the architecture/runtime layer
- do a bounded architecture pass soon
- then continue algebra/composition/solver work from a cleaner base

This keeps the project from repeating the same problem at a higher level:

- first we had duplicated bounded polynomial logic
- then we fixed it with shared polynomial/radical cores
- now we should avoid creating the runtime/orchestration equivalent of that same duplication

## Recommended wording to preserve for future recall

If this discussion needs to be summarized later, the summary should preserve these exact distinctions:

- "kernel-centered modular monolith first"
- "microkernel later, only when justified"
- "internal extensibility now, external extensibility later"
- "Rust-authoritative runtime is a destination, not an immediate forced rewrite"
- "do not let architecture work outrun the algebra/runtime work that still makes the product compelling"

Anything shorter than that risks losing the real intent.

## Status

- This is a **captured architecture direction and recommendation**, not yet a locked implementation roadmap.
- The next unresolved choice is timing:
  - whether to do `ARCH1` before the next major algebra/composition/abs milestone
  - or to land one more algebra milestone first and then do the architecture pass
