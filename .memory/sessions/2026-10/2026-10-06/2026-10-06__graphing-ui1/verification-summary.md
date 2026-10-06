# GRAPHING-UI1 verification

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Evidence (2026-10-06)

- **Static:** `tsc -b` errors only in Codex's uncommitted `src/lib/modes/calculate/*`; scoped ESLint 0 errors (one existing warning); file sizes within caps (`AppMain.tsx` cap lowered 3306 → 3304, `GraphWorkspacePage.tsx` 860).
- **Unit:** `nextUiScale` and old-save mapping (115 → 110, 130 → 125, 145 → 150), the Ctrl/Cmd shortcut parser, `graphSizeClass`, `graphToolbarLevel` (monotonic in width, stable), session layout with `bothStackSplit`; graph/shell/app-state unit 154; graph-contracts 16 with the boundary ratchet; graph-workspace-runtime 28 + 28.
- **UI:** graph, components (`useLightDismiss` 4), Settings, ActiveSurfaceHost, Notebook page, AppMain, workspace tabs and New Equation: 278 passed, 4 skipped. One AppMain variable-memory test timed out under parallel load and passes alone (Codex's area).
- **Playwright** `e2e/graphing-ui1.spec.ts` (30): size × emulated native zoom (1280×720, 1920×1080, 2560×1440, 1024×768 at 80–200 %): status bar inside the window, no page scroll, toolbar never overflowing, the right size class; short-window rules; a 1 px toolbar sweep around every threshold (level monotonic, page responsive); menus, Escape/Tab, one at a time, swallowed press; rail and Both divider drags; medium drawer; compact stacked Both with its own split; New Equation picker. Notebook, qa1 and graph-minimum-visible specs converted from CSS zoom to emulated native zoom; the full run of the touched areas passed 195.
- **Performance spec** (alone, dev server): first preview 85–110 ms, settled 196–223 ms, editor feedback 49.5–52.8 ms against a 50 ms budget (HEAD baseline the same day 44.7–51.2 ms). Recorded as an open question by the user's choice.
- **Desktop** (`test:desktop-smoke`, debug build, WebKitGTK): layout step, Escape, Complex chip, touching curves; UI scale: Ctrl+= three times gives `innerWidth` ratio 1.5 with the Graph page fitting, Ctrl+0 returns to 100 %, and the person's saved 125 % is restored at the end.
- **Screenshots** in this folder: 1280×720, 1920×1080, Both divider and widened list, the "…" menu, the tablet drawer, the desktop app at 100 % and at native 150 %.
