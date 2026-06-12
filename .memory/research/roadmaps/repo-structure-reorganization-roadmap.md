# Repo Structure Reorganization Roadmap

date: 2026-06-12
primary_agent: codex
primary_agent_model: gpt-5.5
status: active roadmap

## Purpose

Calcwiz needs another organization pass after the OOE/runtime-shell widening and display-rendering work. The goal is not a new architecture layer and not a broad rewrite. The goal is to make the current architecture easier to navigate, safer to extend, and harder for future agents to regrow into monolithic files or crowded flat folders.

This roadmap follows the rule now recorded in `AGENTS.md`: internal slices are verification gates/checkpoints first, not automatic `a/b/c` commit boundaries. Each implementation milestone should keep behavior stable unless a separate capability plan explicitly says otherwise.

## Current Problem

The repo is better than the pre-slim state, but density has shifted:

- `src/AppMain.tsx` is still the main orchestration monolith.
- `src/lib/equation/` is a crowded flat solver district with many distinct families mixed at one level.
- `src/lib/algebra/` is a crowded flat shared-core district.
- `src/lib/display/` and `src/lib/ooe/` now have stronger contracts, but their files are also beginning to form subfamilies that should not drift into another flat pile.

## Non-Goals

- No solver capability changes.
- No OOE behavior changes.
- No display-policy changes.
- No Supercarrier implementation.
- No Surface Protocol, bus, plugin platform, SDK, or remote-compute protocol.
- No broad stale-code deletion during structure moves.
- No import churn unless it is needed for a planned move-only slice.

## Guiding Rules

- Preserve public behavior and existing tests during move-only slices.
- Prefer move-only directory splits with import updates over mixed refactor/capability changes.
- Keep worker hosts, capability IDs, replay seeds, OOE metadata, and history schemas unchanged unless a named milestone owns that change.
- Keep tests beside their implementation when moving files.
- Avoid barrel exports unless they reduce import churn without hiding ownership.
- Use file-size ratchet and memory protocol as gates.
- Update durable memory before commits for meaningful structure work.

## Proposed Milestones

### REPO-STRUCTURE-AUDIT1

Read-only audit. Map repo density by ownership before moving anything.

Questions:

- Which AppMain state clusters are still direct state ownership versus orchestration?
- Which files in `src/lib/equation/` belong to target selection, parameterized solving, complex solving, inequality solving, numeric solving, guarded routing, readback, history, or runtime?
- Which files in `src/lib/algebra/` belong to polynomial, inequality, assumptions, domain, variable, transform, rational/radical/abs, or readback cores?
- Which display and OOE subfamilies are stable enough for later folder splits?
- Which paths are compatibility seams that should not be deleted during reorganization?

### APPMAIN-SLIM6

Extract the next cohesive AppMain-owned state/runtime cluster after audit. Candidate clusters include workspace-specific state groups for Trigonometry, Statistics, Geometry, Calculus, Equation, or Calculate, but the audit should decide the safest next cut.

Rules:

- Keep AppMain as the orchestration root.
- Do not introduce a reducer or global app bus.
- Do not merge per-workspace runtime shells.
- Preserve keyboard, history replay, OOE tickets, stale gates, and display behavior.

### EQUATION-DISTRICT-SPLIT1

Move-only split of `src/lib/equation/` into ownership folders. Likely districts:

- `target/`
- `parameterized/`
- `complex/`
- `inequality/`
- `numeric/`
- `guarded/`
- `composition/`
- `polynomial/`
- `readback/`
- `runtime/`
- `history/`
- `shared/`

The exact folder map should be locked by the audit before implementation. This slice should not change solver behavior.

### ALGEBRA-DISTRICT-SPLIT1

Move-only split of `src/lib/algebra/` into shared-core ownership folders. Likely districts:

- `polynomial/`
- `inequality/`
- `assumptions/`
- `domain/`
- `variables/`
- `transform/`
- `rational/`
- `radical/`
- `abs/`
- `readback/`

This slice should not change math behavior or broaden any solver.

### DISPLAY-DISTRICT-SPLIT1

If display files keep growing, split display by current contracts:

- notation and formatting
- result blocks
- branch readback
- render scheduling/profiling
- size policy
- result-detail policy
- symbolic display hygiene

This should remain display-only.

### OOE-DISTRICT-SPLIT1

If OOE files keep growing, split by contract rather than workspace:

- pilots
- runtime envelopes/coordinator
- job contract/registry/tickets
- host adapter/bridge
- diagnostics/trace
- runtime-shell metadata

This should preserve OOE behavior and host descriptors.

### COMPAT-RETIREMENT1

Separate future cleanup milestone after structure stabilizes. It may remove proven-unused legacy compatibility only after tests and migrations prove there are no consumers.

## Preferred Sequence

1. `REPO-STRUCTURE-AUDIT1`
2. `EQUATION-DISTRICT-SPLIT1` if the active pain is solver-folder clutter and daily navigation
3. `APPMAIN-SLIM6` if the active pain is orchestration risk and AppMain state ownership
4. `ALGEBRA-DISTRICT-SPLIT1`
5. `DISPLAY-DISTRICT-SPLIT1` if needed
6. `OOE-DISTRICT-SPLIT1` if needed
7. `COMPAT-RETIREMENT1`

Audit update: the current recommendation after `REPO-STRUCTURE-AUDIT1` is to start with `EQUATION-DISTRICT-SPLIT1`, specifically the parameterized selected-target family, because the user-visible maintenance pain is the crowded `src/lib/equation/` / `src/lib/algebra/` view. AppMain remains important, but it already has several extracted hooks and an enforced file-size ratchet.

## Acceptance Standard

A successful reorganization pass should make the repo easier to navigate without changing product behavior. The first visible win should be that a future agent can tell where to add a new Equation family, shared algebra core, display renderer policy, or OOE pilot without scanning dozens of unrelated top-level files.
