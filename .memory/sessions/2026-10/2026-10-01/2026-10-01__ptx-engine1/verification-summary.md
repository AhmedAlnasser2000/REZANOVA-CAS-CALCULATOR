# PTX-ENGINE1 verification

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

## Evidence (2026-10-01)

- `tsc -b` clean for graphing and app code, scoped ESLint 0 errors, file sizes within caps (`implicit.ts` 827, `analyze.ts` 655), graphing boundary ratchet passes (109 files), graph contracts/parser/sampling/scene/ooe/gpu suites pass.
- **Unit:** graph and app graphing 373/373, including: AD against symbolic derivatives to 1e−14; interval enclosure fuzz (values and slopes, 7 seeds × 4 000 expressions run locally, 400 in the suite) and tight-range fuzz (8 seeds × 5 000 locally); affine x − x = 0 and x(10 − x); Krawczyk proves √2, refuses a double root, proves x³ − 3x extrema and a circle crossing; touching line, isolated point, x² = y² crossing joined with topology evidence, a loop far smaller than a cell; a spike 0.002 wide drawn to height > 0.95; argument-principle counts for (z² − 1)/z, z³ − 1, (z − 1/2)², eᶻ − 1 and tan z; double-double e, ln 2 and sin 1 to ~29–31 digits and (eˣ − 1)/x at 10⁻¹² with its hole's limit exactly 1. Graph UI 41/41.
- **Playwright Chromium (vite build):** new `graphing-engine1` 4/4 (proved badge on sin x; (x − y)² = 0 traced at (2, 2) and x² = y² drawn; a narrow spike traced at its peak; Analyze "exactly 2 zeros and 1 pole"); all other graph specs pass after updating badge expectations from verified to proved; PTX, PTX2, PTX3, ENGINE1 rerun 19/19. Screenshot inspected: the touching line along y = x and the crossing of x² = y² at the origin.
- **Performance spec:** editor feedback 47–51 ms; first preview and settled scene bimodal (see completion report); budgets unchanged.
- **Desktop (packaged WebKitGTK):** `test:desktop-smoke` passes after a debug rebuild with a new step: (x − y)² = 0 drawn and a trace on sin x carries the proved badge; every earlier step passes; screenshots taken.
