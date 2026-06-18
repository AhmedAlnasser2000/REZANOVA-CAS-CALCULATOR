# WORKSPACE-TABS-LAUNCHER-ACTIONS1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

- Added explicit launcher `current-tab` and `new-tab` launch intents.
- Kept primary launcher row click, Enter/hotkey flows, and existing Open behavior as current-tab retarget.
- Added a visible `Open in new tab` row action plus a leaf-row context menu with `Open Here` and `Open in New Tab`.
- Routed new-tab launches through the existing workspace-tab state host so a fresh workspace instance is created and focused before applying the launcher entry route.
- Kept `AppMain.tsx` under its ratchet cap by extracting launcher-entry routing into a small app-logic helper.
- Kept new-tab actions limited to hosted runtime workspaces: Calculate, Equation, Matrix, Vector, Table, Calculus, Trigonometry, Statistics, and Geometry.
- Kept Labs open-here only and did not add Guide launcher tab behavior.
- Deferred `WORKSPACE-TABS-DEFAULTS1`; the `+` tab button still creates a blank Calculate tab.
- Applied a no-behavior one-line formatting trim in `useTrigonometryRuntime.ts` after the file-size ratchet exposed a 901-line file against the 900-line default cap.

## Scope Notes

- No default-new-tab settings.
- No `Open Blank Tab` or `Open from Current Input`.
- No projects/files, saved tab documents, second `AppMain`, second OOE authority, Supercarrier work, bus, Surface Protocol, runtime registry, or plugin layer.
