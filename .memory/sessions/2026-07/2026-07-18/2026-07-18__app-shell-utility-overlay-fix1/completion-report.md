# APP-SHELL-UTILITY-OVERLAY-FIX1 completion report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Completed gate

- gate: `APP-SHELL-UTILITY-OVERLAY-FIX1`
- gate_type: ui
- date: 2026-07-18
- behavior_change: compact utility overlays no longer dim the calculator document and shared panel motion is faster.

## Delivered

- Settings, History, Variables, and the left Menu Inspector keep the existing overlay click-catcher and outside-click dismissal while rendering the click-catcher transparent.
- Shared presence motion now uses 180ms entry and 140ms exit with unchanged distance/easing and reduced-motion behavior.
- OOE diagnostics retains the base dimmed overlay and immediate lifecycle because the transparent rule is limited to motion-enabled utility surfaces.
- Existing outboard/overlay selection, local panel state, z-indexes, and ownership are unchanged.

## Durable memory updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/closed-questions.md`
- `.memory/journal/2026-07/2026-07-18.md`
- this session dossier

## Commit posture

- Verified implementation is uncommitted pending explicit user approval.
