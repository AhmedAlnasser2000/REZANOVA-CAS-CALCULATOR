# CLIPBOARD-PIPELINE-RATCHET1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- Kind: `backend` routing contract with `ui` browser evidence.
- Result: pass.
- Runtime behavior changed: every production copy/paste surface now delegates host access and envelope decoding to `src/lib/clipboard/`. Computation, OOE, worker topology, History persistence, and visible mathematical output are unchanged.

## Routing Evidence

- Display retains its proven canonical payload route.
- Formula Viewer and History copy canonical saved LaTeX with explicit coarse surface metadata.
- Guide and workspace expression copies use the canonical envelope pipeline; diagnostics use the shared plain-text adapter.
- `expressionRouting.ts` is the sole app-level programmatic Paste authority; the duplicate AppMain implementation was removed.
- Native `MathEditor` paste hands the event to the shared decoder and does not inspect clipboard formats itself.
- Validated custom-MIME or HTML envelopes insert canonical LaTeX without reparsing. Text-only and mismatched-safe fallbacks use the existing mode-aware canonicalizer; Matrix and Vector retain their naturalization functions.
- AppMain shrank from 3,348 to 3,306 lines and its hard cap lowered to 3,306.

## Ratchet Evidence

- The capability audit scans production TypeScript/TSX outside `src/lib/clipboard/`.
- Direct `navigator.clipboard`, raw `clipboardData`, `ClipboardItem`, legacy `execCommand('copy')`, and Tauri clipboard-plugin imports fail the gate outside the adapters.
- Current direct production violation count: zero.
- The clipboard seam selects focused Clipboard, app-runtime, and Display evidence without replacing baseline CI gates.

## Verification Evidence

- `npm run test:clipboard-contract`: 27 native, 32 UI, and three audit checks passed.
- `npm run test:clipboard-capability`: two Chromium tests passed, including visible `x^(1/6)` copy and exact `x^{\frac{1}{6}}` app Paste.
- `e2e/linear-algebra-paste-naturalization.spec.ts`: four Matrix/Vector native and programmatic paste cases passed.
- `npm run test:clipboard-tauri`: one Linux/Tauri fallback test passed; `cargo check` passed.
- Full unit: 3,537 passed. Full UI: 448 passed.
- All 19 Chromium canaries passed in 1.2 minutes; all nine History create/replay browser flows passed.
- Printer: 12; golden: 44; print hygiene: seven across 185 fragments; all 100 replay fixtures passed.
- Feature probes: 124 native plus 37 UI; runtime probes: 19; workspace runtime: 74; app runtime: 59 native plus 140 UI; app-state: 52.
- Surface Protocol, OOE, compartments, app identity, CI alignment, seam selector, printer migration, file size, TypeScript, production build, lint, memory protocol, and `git diff --check` passed.
- Calculate canonical copy/paste and Matrix/Vector naturalized paste/result screenshots were visually inspected with no overlap, stale preview, or overflow.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/printer-detail-clipboard-roadmap.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__printer-detail-clipboard-program/`
