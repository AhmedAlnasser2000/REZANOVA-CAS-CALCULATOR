# GUIDE-EDUCATION-PLATFORM-AUDIT0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: claude, user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: mixed

## Scope

This audit records the product and architecture boundary for turning Guide into an authorable educational platform later. It is docs/memory-only: no runtime code, UI, schema, import/export command, package format, community service, cloud flow, or Guide page implementation changes here.

## User Decision Input

- Do not build a universal generated step-by-step engine.
- Replace that ambition with proof/evidence cards plus learner/teacher-authored reasoning around live, verifiable computation.
- Do not frame the platform as student-only. Teachers, self-learners, advanced users, and community authors all matter.
- Do not depend on embedding external books or websites. External resources may inspire, link, or seed content only under their licenses.
- Import/export is the platform boundary: a teacher should be able to export guidance, and a student or community user should be able to import and work from it.

## Current Repo Findings

- Current Guide is a calculator-mode help/reference workspace, not a full app-page notebook. `src/app/workspaces/GuideWorkspace.tsx` renders static articles, concepts, where-to-find-it notes, and hand-authored worked examples with launch/copy actions.
- Guide runtime state is owned by `src/app/runtime/useGuideRuntime.ts`; it handles route, search, selection, article, mode reference, and example launch helpers. It does not own document editing, persistence, import/export, or per-block computation.
- The page-surface model already exists for Settings, History, and Formula Viewer through `ActiveSurfaceHost`, app-page workspace kinds, singleton page policies, and page tab action policy. This is the right host family for any future Guide notebook surface.
- History is the personal computation ledger. It can feed a future notebook, but it should not become the notebook schema.
- Formula Viewer is the dense-output viewer for current huge results. It should remain separate and may be linked from notebook computation blocks when a result is too large to inline.
- The solver side already emits reusable evidence patterns: route evidence, domain facts, interval validity, singularity candidates, trust labels, proof cards, Matrix method cards such as eigenvalue discovery, and Calculus/Limits proof details. These are better source material for explanations than a separate generated step script.

## Locked Boundary

The future learning platform should not be a generated universal step-by-step system. Generated steps would need to mirror every solver route, every branch policy, every special-case proof, and every future algorithm upgrade. That is a second solver with a permanent maintenance tax.

The sustainable contract is:

- solvers produce answers, facts, evidence, warnings, certificates, and method/proof summaries as byproducts of real computation;
- Guide notebooks let humans author reasoning around those verifiable computation artifacts;
- imported/exported guidance packages move authored educational material between teachers, students, and community users;
- rerun or verification status is explicit when a computation block is reopened under a newer engine.

## Artifact Model Recommendation

The platform should use three portable artifact classes, all versioned and validated:

- Notebook: one authored lesson, solution, problem walkthrough, lab, or exploration.
- Guidance Pack: a bundle of notebooks plus topic ordering, prerequisites, author metadata, license metadata, compatibility metadata, and optional assets.
- Learner Copy: an imported editable copy of a notebook or pack, optionally preserving teacher guidance, hidden hints, locked reference sections, or answer visibility policy.

Potential block kinds:

- text block with bounded formatting;
- MathLive math-input block;
- computation block with workspace kind, input LaTeX, selected settings snapshot, compact result summary, evidence/proof snapshot, and optional rerun handle;
- evidence/proof block attached to a computation or manually placed by the author;
- Formula Viewer reference block for dense output;
- asset/reference block with explicit attribution and license metadata;
- ink annotation block later, storing strokes only in v1. Handwriting-to-math recognition stays deferred.

## Import/Export Safety Rules

- Import should validate a package manifest before rendering any content.
- Export should include authored notebook data and safe assets only; it must not include private History, Variables, local paths, raw Display block trees, MathJSON internals, solver objects, Order of Execution envelopes, diagnostics, host commands, or app-state snapshots.
- Computation blocks should store stable Data Transfer Object-like snapshots, not live solver internals.
- Package metadata should include schema version, producer app version, author fields, license/attribution fields, dependency/compatibility notes, and content-size limits.
- Imported computation blocks should distinguish original verified output from rerun output. Silent drift is forbidden; changed results should become visible integrity events.
- No executable code belongs in notebook packages.

## Platform Roles

- Teacher: authors notebooks or packs, exports them to students/community, controls visibility of hints/reference answers where the format supports it.
- Student or learner: imports material, edits a personal copy, reruns computation blocks, writes reasoning, and may export a completed or annotated copy.
- Community author: publishes reusable packs without needing REZANOVA to host or own the content.
- App: validates package boundaries, runs computations through the existing workspace/Order of Execution model, and presents evidence honestly.

## Non-Goals

- No universal generated step engine.
- No external textbook embedding dependency.
- No cloud/community marketplace.
- No permissions, accounts, sync, grading, classroom management, or submissions.
- No History schema migration.
- No Formula Viewer-from-records expansion.
- No Surface Protocol adapter.
- No plugin system or external software development kit.
- No handwriting recognition.
- No Graphing or Spreadsheet work.

## Recommended Sequence

1. `GUIDE-NOTEBOOK-DOCUMENT-MODEL1`: define versioned notebook/guidance-pack Data Transfer Object shapes and validation tests only.
2. `GUIDE-PAGE-SURFACE-SHELL1`: make Guide notebook a protected app page surface while preserving the current quick Guide/reference entry points.
3. `GUIDE-COMPUTATION-BLOCK1`: add session-only computation blocks that run through existing workspace/Order of Execution paths and store compact result/evidence snapshots.
4. `GUIDE-HISTORY-INSERT1`: insert selected History entries into a notebook as frozen/rerunnable computation blocks without turning History into the notebook schema.
5. `GUIDE-IMPORT-EXPORT-CONTRACT1`: add package manifest validation, safe export shape, and import rejection tests before any broad UI.
6. `GUIDE-PERSISTENCE1`: add local notebook save/load after the document and import/export contract is stable.
7. `GUIDE-INK-ANNOTATION1`: add bounded stroke-only annotation blocks later.

## Open Questions

- What file extension and package container should notebooks/packs use first: plain JSON, zipped package, or another local artifact shape?
- Should teacher-authored answers/hints be lockable or merely marked as reference content in v1?
- How should author identity, signatures, and tamper evidence work before any community hosting exists?
- Which exact result/evidence summary vocabulary should computation blocks store so they stay stable across solver upgrades?
- Should Guide remain a dual surface: quick reference panel/workspace plus full notebook page, or should the existing Guide workspace gradually migrate into the page surface?
