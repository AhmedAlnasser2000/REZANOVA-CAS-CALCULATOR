# PGL-VIS Roadmap

Date captured: 2026-04-14

Status: post-`PGL` roadmap recommendation only. This is not yet an implementation commitment.

Related roadmap:
- `.memory/research/roadmaps/playground-incubation-roadmap.md`

Related architecture note:
- `docs/architecture/playground-incubation-ladder.md`

## Why this exists

The current `PGL` roadmap treats Playground as a code-and-workflow incubation system:
- repo boundary
- experiment records
- lab pilots
- bounded prototype contracts
- graduation by extraction into stable architecture

That is the right first sequence.

But there is a second question that the base `PGL` roadmap does not answer:

- should Playground ever become visibly present inside the calculator UI, instead of existing only in repo structure, test harnesses, and engineering workflow?

This document answers that question by separating it into a follow-on roadmap:

- `PGL` = build and prove the incubation system
- `PGL-VIS` = only after `PGL` is complete, decide whether and how any Playground capability should become calculator-visible

The separation is deliberate. A visible Playground surface changes the trust model much more than the boundary/records/pilot work does.

## Core conclusion

If Calcwiz ever exposes Playground inside the calculator, it should happen through a separate post-`PGL` roadmap.

It should not be treated as an implied part of `PGL1` through `PGL6`.

That means:
- the existing `PGL` sequence stays focused on incubation infrastructure and experiment proof
- any calculator-visible Playground surface starts only after the core incubation model has already been proven
- the first visible surface should be developer- or operator-facing, not normal-user-facing

## Entry gate for starting `PGL-VIS`

`PGL-VIS` should not start merely because Playground exists in code.

Recommended start gate:
- `PGL1` boundary scaffold is complete
- `PGL2` records/checklists/index are complete
- `PGL3` and later pilots have produced real evidence
- at least one experiment has completed the graduation workflow from incubation into stable architecture, proving that Calcwiz can adopt ideas without importing from Playground directly
- the one-way dependency law is still intact and enforced

In short:
- `PGL-VIS` starts after Playground has already proved that it can stay architecturally subordinate

## Locked guardrails

These constraints should stay fixed across the whole `PGL-VIS` sequence:
- stable calculator behavior must not depend on Playground code becoming visible in the UI
- a visible Playground surface must not become a second runtime authority
- visible Playground results must be explicitly labeled as experimental when they are not stable product behavior
- any successful experiment still graduates by extraction into stable architecture rather than by directly becoming permanent UI-backed Playground behavior
- the first visible Playground surface should be internal-only or developer-only
- a user-facing experimental mode is a later, higher-bar decision, not the default first step

## Roadmap thesis

The purpose of `PGL-VIS` is not to "ship Playground."

Its purpose is to answer a narrower question:

- can Calcwiz benefit from a calculator-visible interface for incubation work
- without weakening trust in the stable calculator
- and without turning Playground into a parallel product layer

That means `PGL-VIS` should start by improving observability and operator workflow, not by exposing unstable features to ordinary users.

## Recommended sequence

### `INCUBATION-LABS0` — Dev-Only Labs Catalog Bridge

Status: completed on 2026-04-30.

Purpose:
- make incubation visible enough to inspect without letting Playground become a runtime authority

Scope:
- generate a committed catalog snapshot from `playground/manifests/*.yaml` and `playground/records/INDEX.md`
- import only the stable `src/lib/labs` snapshot from the app
- show a `VITE_SHOW_LABS=1` developer-only Labs section with experiment status and metadata
- keep `playground/...` paths as inert display text only

Out of scope:
- no experiment execution from the calculator
- no remote controls
- no stable result delegation
- no history mixing
- no normal-user experimental mode

Relationship to `PGL-VIS1`:
- this is a bridge and observability proof, not the full internal console originally imagined for `PGL-VIS1`
- future `PGL-VIS1` should build on the same one-way snapshot discipline if it ever adds richer inspection or controlled execution

### `PGL-VIS1` — Dev-Only Interactive Labs Console

Status: implemented on 2026-05-21.

Purpose:
- create the first calculator-visible Playground surface as a developer/operator console that can run approved local experiments visually

Scope:
- hidden development-only surface inside the calculator
- enabled only with `VITE_SHOW_LABS=1` plus `VITE_ENABLE_LAB_RUNNERS=1`
- dev-server bridge lists approved runners and runs local Playground experiments server-side
- Labs UI supports runner-gated equation, expression, and corpus-case input
- first runners are `sym-search-planner-ordering` and `expression-baseline-probe`
- view experiment metadata, corpus runs, traces, comparison summaries, warnings, and raw runner envelopes
- no normal-user entrypoint

Good examples:
- run a symbolic-search lab corpus from an internal panel
- compare baseline vs alternate planner traces
- run a stable-expression baseline probe from the same visual Labs channel
- inspect experiment records and linked artifacts without leaving the app

Out of scope:
- no user-facing experimental mode
- no stable feature delegation into Playground
- no normal calculator history/result-provenance mixing
- no remote compute control, source-mirror execution, or FriCAS execution

Exit criteria:
- Calcwiz has a visible internal Playground console that improves experiment inspection
- the stable calculator remains architecturally unchanged and authoritative

Polish follow-up:
- `PGL-VIS1-POLISH` was implemented on 2026-05-21 to make the console feel like an actual calculator surface rather than a panel attached to stale display state.
- Labs mode now uses the top display as a live runner/input/result preview and suppresses normal calculator result cards while in Labs.
- Comparison tables render case input math through stable display components, with raw LaTeX retained only in details/accessibility surfaces.

### `PGL-VIS2` — Replay and Comparison Workspace

Purpose:
- turn the internal console into a better analysis surface for experiments

Scope:
- side-by-side comparison of:
  - stable baseline behavior
  - experimental behavior
  - trace differences
  - stop-reason differences
- replay of saved experiment corpus cases inside the calculator shell
- lightweight artifact browsing for experiment records/manifests

Why this matters:
- a visible Playground surface is most useful when it makes experimentation easier to understand, not just easier to trigger

Out of scope:
- no normal-user exposure
- no experimental behavior replacing default calculator behavior

Exit criteria:
- developers/operators can inspect experiments inside the calculator with less friction than reading raw files alone

### `PGL-VIS3` — Internal Remote Operations Surface

Purpose:
- provide a calculator-visible operator surface for external-compute experiments, if and only if the external-compute non-visible roadmap has already laid the foundations

Prerequisite:
- external compute foundations must already exist in Playground as a non-product lab contract

Scope:
- internal controls for remote experimental runs
- job-status visibility
- artifact/log retrieval
- explicit trust/cost/runtime display
- local-vs-remote comparison panels

Out of scope:
- no silent remote fallback in product behavior
- no user-facing cloud execution
- no provider-specific UI leaking into stable product surfaces

Exit criteria:
- remote experimental workflows are visible and operable inside Calcwiz for internal use only
- trust boundaries remain explicit

### `PGL-VIS4` — Controlled Preview Surface

Purpose:
- test whether a narrowly bounded experimental workspace can be shown to a limited audience without confusing the stable product contract

Scope:
- explicit experimental workspace labeling
- restricted audience:
  - developer builds
  - internal testers
  - maybe later trusted beta users
- experiments remain opt-in and visibly separate from normal calculator behavior

Requirements:
- strong labeling
- clear "experimental / not authoritative" framing
- no ambiguity about whether a result came from stable product logic or Playground logic

Out of scope:
- no blending of experimental output into standard result cards by default
- no automatic history mixing unless carefully designed later

Exit criteria:
- Calcwiz can show experimental workflows to a limited audience without blurring product trust boundaries

### `PGL-VIS5` — User-Facing Experimental Mode Decision

Purpose:
- make the explicit product decision about whether a broader user-visible Playground mode should exist at all

This is a decision milestone more than an implementation milestone.

Questions it must answer:
- should ordinary users ever see Playground directly?
- if yes, should it be:
  - a separate app/workspace
  - an experimental toggle
  - a dev/beta channel only
- how are trust, support burden, and history/result labeling handled?

Possible outcomes:
- approve a very narrow user-facing experimental workspace
- keep Playground permanently internal-only
- reject user-facing Playground entirely and continue using it only as an internal incubation system

Exit criteria:
- the repo has an explicit answer to whether user-facing Playground belongs in Calcwiz at all

### `PGL-VIS6` — Visible Graduation and Retirement Policy

Purpose:
- ensure that calculator-visible Playground surfaces do not become permanent clutter or hidden product dependencies

Scope:
- define how visible experimental panels retire
- define how visible experiments graduate into stable UI
- define archive behavior for old experiment consoles and controls

Core rule:
- if a visible experiment becomes a real feature, the stable UI should absorb the bounded adopted form
- it should not remain permanently “the Playground version” unless it is intentionally still experimental

Exit criteria:
- visible Playground surfaces have a clean lifecycle instead of accumulating indefinitely

## Recommended first visible milestone

The first visible Playground step should be:

- `PGL-VIS1` internal developer/operator console

It should not be:
- a user-facing experimental mode
- an advanced calculator tab for unstable math
- a visible alternate solver path in ordinary use

That first step gives the project the benefits of visibility without paying the trust cost of exposing instability to normal users.

## What `PGL-VIS` should not become

Warning signs of drift:
- Playground becomes the easiest place to expose unfinished product features
- internal experimental controls start affecting ordinary calculator flows
- result provenance becomes unclear to users
- the app begins to treat Playground as a permanent alternative solver authority
- user-visible Playground ships before the incubation ladder has proven graduation discipline

If those begin to happen, `PGL-VIS` is no longer supporting the architecture. It is weakening it.

## Relationship to the main `PGL` roadmap

The relationship should stay simple:

- `PGL` proves the incubation system
- `PGL-VIS` explores calculator-visible operator and possibly user-visible surfaces only after that proof exists

So `PGL-VIS` is not:
- `PGL4`
- `PGL5`
- or a hidden extension of `PGL6`

It is a follow-on roadmap family that begins after the main `PGL` ladder is complete enough to support it safely.

## Final recommendation

Calcwiz should preserve the current discipline:
- Playground first as backend/workflow incubation
- visible Playground later, only if justified

The right first visible step is:
- an internal Playground console for developers/operators

The wrong first visible step would be:
- exposing unstable Playground behavior directly to ordinary calculator users before the incubation model has already proven that it can stay subordinate to stable architecture
