# Manual checklist: Graphing Moves 1-26 closure and Move 27 GPU feasibility

## What is achieved now

- Graphing Moves 1-26 (Codex) are complete: real/complex relations, adaptive CPU samplers, SVG 2D, private Three 3D, Analyze, real surfaces, and complex mappings.
- Move 27 proves the desktop app can run GPU graph rendering and adds a Graphics Diagnostics readout, desktop smoke, GPU probe, and benchmark tooling. No graph is GPU-rendered yet.

## Manual app steps

1. Launch the desktop app (`npm run tauri:dev`) and confirm the calculator loads, not a blank window.
2. Open Settings (toolbar) → Open Full Settings → Runtime and scroll to Graphics Diagnostics.
3. Click "Run check again".
4. Open a New Graph, type `z=x^2+y^2`, and click 3D.

## Expected results

- Step 1: the Calculate workspace appears with your saved settings.
- Step 2: "WebGL2 available (GPU name hidden by the webview)" on desktop, or "Hardware GPU" with the RTX renderer in Chrome; "Field test: Passed"; "Float targets yes".
- Step 3: the card briefly shows "Checking…" and returns the same result.
- Step 4: a shaded paraboloid appears in the Three view without the SVG fallback notice.
