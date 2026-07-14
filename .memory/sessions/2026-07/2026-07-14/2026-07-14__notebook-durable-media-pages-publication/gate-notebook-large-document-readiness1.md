# NOTEBOOK-LARGE-DOCUMENT-READINESS1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- committed_by_agent: codex
- committed_by_agent_model: gpt-5.5
- committed_by_agent_family: sol
- attribution_basis: live

## Gate

- kind: ui
- status: verified
- commit approval: standing approval for all twelve named program gates
- push: not authorized

## Outcome

- Notebook block count remains an internal diagnostic, not a user-facing limit. The header now reports authored word count and the honest `Session only` state before persistence lands.
- Committed fixtures cover 100, 1,000, 5,000, and 50,000 text-heavy blocks; the live fixture includes 2,000 inline-math nodes. Fifty thousand blocks is validation/import evidence only.
- Documents above the 5,000-block live target remain untruncated in the continuous Draft view with a performance notice.
- Metrics and structural validation run outside render. Large editor changes synchronize to the app-owned document after 350 ms of settled editing and flush on destruction, preserving the single Tiptap editor, selection, and undo model.
- MathLive fields hydrate only near the viewport; ordinary text-only transactions no longer trigger a full node-ID scan.

## Evidence

- Focused model: 2 files, 11 tests passed.
- Focused UI: 3 files, 24 tests passed.
- Chromium 5,000/2,000 fixture: ready 1,211.80 ms; 100 edits P95 77.47 ms; maximum 113.97 ms; 14 hydrated and 1,986 deferred MathLive fields.
- Cross-workspace Chromium: switching to Calculate takes 472.22 ms, unmounts all Notebook math views, and changes the same exact-solve latency only from a 1,804.21 ms fresh baseline to 1,846.59 ms after the large Notebook.
- Responsive Chromium: 2400px, 1440px, and 1100px plus 80%, 130%, high contrast, and forced colors have no page overflow. The inspected large-document screenshot shows the Draft notice, 32,004 words, readable content, and no clipping.
- Static and repository: incremental TypeScript, Notebook-scoped ESLint, file-size, memory, and diff-hygiene gates pass.
- Rejected path: request-idle-callback serialization starved after a large paste. Final evidence uses the settled-edit scheduler and destruction flush instead.
- Discarded probes: a strict-locator ambiguity and an absolute Calculate threshold below the measured fresh baseline were corrected as harness defects before final acceptance.

## Boundaries

- No persistence, library, ribbon tabs, media, pages, publication, app-state schema, History, Display, solver, Order of Execution, Surface Protocol, `AppMain`, or `ActiveSurfaceHost` changes.
- The development-only performance query seam is diagnostic and does not alter production behavior.
- Untracked `test-results/` and ignored `.task_tmp/` evidence remain outside the commit.
- Next gate: `NOTEBOOK-PERSISTENCE-FOUNDATION1`.
