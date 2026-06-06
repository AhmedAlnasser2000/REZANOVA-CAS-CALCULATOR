# TRACK-OOE-RS29 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Verify `OOE-RS29: Developer OOE Diagnostics Inspector`.

## Manual Checks

- Launch web preview with `VITE_SHOW_OOE_DIAGNOSTICS=1 npm run dev`, then open `http://localhost:1420/`.
- Confirm the `OOE` header utility button appears only with the flag enabled.
- Launch without the flag and confirm the `OOE` button and diagnostics surface are absent.
- For the desktop window path, launch with `VITE_SHOW_OOE_DIAGNOSTICS=1 npm run tauri:dev`.
- Open the inspector and confirm recent diagnostics records and active/recent OOE jobs render as compact readable rows.
- Run at least one Calculate/Equation/Table OOE job and confirm a new diagnostics record appears.
- Select a diagnostics record and verify route, status, plan/capability/host, timing, commit assessment, trace events, provenance, and cancellation/helper evidence where present.
- Use status and capability/route filters and confirm rows update deterministically.
- Copy a selected diagnostics record and confirm the clipboard JSON is pretty printed and does not include full result payloads or table rows.
- Clear diagnostics and recent jobs from the panel and confirm the in-memory rows disappear without affecting solver state.
- Trigger an Equation cancellation path from RS26/RS27/RS28 and confirm cancellation/helper evidence is visible in the selected record.

## Boundaries

- No public user UI.
- No persisted diagnostics.
- No export files.
- No Tauri diagnostics commands.
- No MCP endpoint.
- No solver behavior change.
- No scheduling change.
- No result schema change.
- No history schema change.
- No table rows or full result payloads in diagnostics records.
