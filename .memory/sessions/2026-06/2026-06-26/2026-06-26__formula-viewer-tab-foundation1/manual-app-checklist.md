# FORMULA-VIEWER-TAB-FOUNDATION1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Heavy formula `caseMath` answers can remain compact in the source Equation result.
- A dedicated in-app Formula Viewer tab can inspect the full structured formula answer without turning the source tab into a huge render surface.
- Formula Viewer tabs are session-only surfaces and do not change calculator mode or OOE runtime behavior.

## Manual App Steps

- In Real Exact Equation mode, enter `sin((z^3+z+1)/(z-m))=b`.
- Confirm the source answer card stays compact and shows `Open Formula Viewer`.
- Click `Open Formula Viewer`.
- Confirm a Formula Viewer tab opens with source context, row/group counts, global facts, Copy Result, and Back to source.
- Click `Open Formula Viewer` again from the same source result and confirm the existing viewer tab is focused instead of creating a duplicate.
- Solve a different heavy formula result and confirm it can open a separate viewer tab.
- Switch away from the viewer tab and back, confirming the source result remains compact and normal calculator tabs still behave like calculator workspaces.
- Revisit a history/replayed formula result and confirm raw `\substack` text is not exposed.

## Expected Results

- The source result does not mount full giant formula rows just to make them inspectable.
- Copy Result remains unchanged from the source card and the viewer.
- Back to source focuses the source workspace when it is still open.
- Viewer tabs do not launch jobs, alter Equation runtime state, or appear as normal calculator modes.
- Wrappers remain paused for widening until viewer stability and later virtualization are verified.
