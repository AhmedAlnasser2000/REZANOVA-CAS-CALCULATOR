# CLIPBOARD-CANONICAL1 Gate

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

- Kind: `backend` contract with `ui` browser and Tauri evidence.
- Result: pass.
- Runtime behavior changed: Display Copy Result now preserves canonical math through a lossless envelope where supported and exact text fallback everywhere else. Computation, History persistence, OOE, and Surface Protocol are unchanged.

## Capability Audit Evidence

- Real Chromium supports `web application/x-calcwiz-math+json`, `text/html`, and `text/plain` read/write in one clipboard item.
- The official Tauri v2 plugin is installed in JavaScript and Rust and initialized in the app.
- Tauri capability authority is exactly `allow-read-text`, `allow-write-text`, and `allow-write-html`; image, clear, default, HTML-read, and arbitrary-MIME permissions are absent.
- A real Linux plugin test wrote HTML with canonical alternate text and read the exact text back through X11.
- The live Tauri dev WebView ran `2+2`, invoked Copy Result through JavaScript IPC, displayed `Result copied`, and exposed `text/html` plus UTF-8 text targets. External X11 readback returned canonical `4`; no custom MIME target was advertised.

## Contract Evidence

- `MathClipboardEnvelopeV1` contains only schema/version, canonical LaTeX, optional bounded validated MathJSON, and coarse surface/mode metadata.
- Unknown fields, personal identifiers, malformed schema/version, invalid MathJSON, invalid metadata, and oversized canonical or total payloads fail closed.
- Browser rich copy uses custom MIME, escaped HTML with a base64url envelope attribute, and visible text. Rich-write failure falls back to canonical LaTeX.
- Tauri writes the same inert HTML envelope with canonical alternate text and falls back to write-text if HTML fails.
- Rich custom/HTML disagreement is reported as mismatched; malformed rich content uses safe text when available.
- Display derives canonical truth from `canonicalMath`, then compatibility `exactLatex`, and uses visible notation only for the rich browser representation.
- AppMain text fallback moved into the shared adapter; AppMain shrank from 3,356 baseline lines to 3,348 and its cap lowered to 3,348.
- Remaining direct reads in AppMain and `expressionRouting.ts`, native `MathEditor` event decoding, Formula Viewer, History, Guide/workspace expressions, and diagnostics are reserved for `CLIPBOARD-PIPELINE-RATCHET1`.

## Verification Evidence

- `npm run test:clipboard-contract`: 21 focused checks passed.
- `npm run test:clipboard-capability`: two real Chromium tests passed against the rebuilt app.
- `npm run test:clipboard-tauri`: one real Linux/Tauri clipboard test passed; `cargo check` passed.
- Full unit: 3,531 passed; full UI: 447 passed after updating the one intentional canonical-fallback expectation.
- Printer: 12; golden: 44; print hygiene: seven across 185 fragments; all 100 replay fixtures passed.
- Feature probes: 124 native plus 37 UI; runtime probes: 19; workspace runtime: 74; app runtime: 54 native plus 140 UI; Display: 132 native plus 21 UI; app-state: 52.
- Surface Protocol, OOE, compartment, CI alignment, seam selector, printer migration, app identity, file size, TypeScript, build, lint, memory protocol, and `git diff --check` passed.
- All 19 Chromium workspace canaries passed in 1.2 minutes.
- Chromium and Tauri result/copy surfaces were visually inspected with no overlap or overflow.

## Durable Memory Updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/journal/2026-07/2026-07-11.md`
- `.memory/research/roadmaps/printer-detail-clipboard-roadmap.md`
- `.memory/sessions/2026-07/2026-07-11/2026-07-11__printer-detail-clipboard-program/`
