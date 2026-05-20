# FriCAS Architecture Context Atlas and Reference Corpora

## Metadata

- experiment_id: `fricas-context-atlas`
- title: `FriCAS Architecture Context Atlas and Reference Corpora`
- owner: `unassigned`
- lane_topic: `source-context`
- current_level: `level-0-research`
- status: `active`
- date_started: `2026-05-01`
- last_reviewed: `2026-05-01`
- next_review: `after the first fit-matrix review chooses a bounded Calcwiz-native prototype candidate`
- candidate_stable_home: `future algebra/kernel/orchestrator/incubation proposals only`
- companion_manifest: `playground/manifests/fricas-context-atlas.yaml`

## Hypothesis

- FriCAS can teach Calcwiz useful architectural and algorithm-family lessons if the work stays context-only and every useful idea is translated into a bounded Calcwiz-native proposal before adoption.

## Why It Matters

- Calcwiz now has source-mirror guardrails and a one-way Labs catalog.
- FriCAS is a broad, mature CAS with a strong algebra library, typed mathematical structures, integration depth, polynomial/elimination machinery, and extensive regression inputs.
- Studying the mirror can help Calcwiz avoid shallow reinvention while preserving its own exact-first, bounded, desktop-first identity.

## In Scope

- Architecture reading across FriCAS algebra, interpreter, docs, and input examples.
- A capability atlas and Calcwiz fit matrix.
- A context-only reference corpus for future challenge families.
- Idea extraction into bounded Calcwiz-native incubation candidates.

## Out Of Scope

- Building or running FriCAS.
- Product dependency on FriCAS.
- Submodules or tracked source mirror payloads.
- Direct code copying into Calcwiz.
- Stable product math behavior changes.
- Feature parity goals.

## Known Stop Reasons

- Any proposed direct code reuse requires an explicit source/license review and stops the normal research flow.
- Any idea that only works by making Calcwiz depend on FriCAS is rejected.
- Any proposal that requires broad unbounded CAS behavior must stay in research or be narrowed.
- Any stable `src` reference to `playground/sources` violates the mirror boundary.

## Success Criteria

- Durable research outputs exist in `.memory/research/`.
- A typed context corpus has 30-50 curated cases with source paths and boundary notes.
- The corpus is validated by a Playground lab test but not wired as product correctness.
- The first prototype candidates are ranked by bounded Calcwiz fit.

## Promotion Criteria

- At least one idea has a small bounded Calcwiz-native version, clear prerequisites, and measurable success criteria.
- The next step can be a Playground feasibility/prototype lane without direct FriCAS dependency.

## Retirement Criteria

- The research only produces feature-parity pressure or architecture drift.
- Useful examples cannot be separated from direct code adoption.
- Another context mirror becomes a better near-term source for bounded Calcwiz work.

## Current Notes

- Local mirror path: `playground/sources/mirrors/fricas/`
- Captured commit: `b10e5fd9cae9fb0e76994452b00ad794a459dfa6`
- The mirror is ignored by Git; committed artifacts are only distilled research, metadata, and context corpora.
