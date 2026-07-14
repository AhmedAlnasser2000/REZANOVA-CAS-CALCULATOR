# CANONICAL-RESULT-V2-TRIGONOMETRY1

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

- kind: ui
- result: pass
- committed: `94ea5c52`
- production V2 route: Trigonometry Period & Phase
- residual change: the compound-primary exemption is removed; 10 exemptions remain
- protected state: concurrent Notebook video and Rust OOE work plus untracked `test-results/` were excluded

## Implemented

- Promoted Period & Phase to a default V2 route with a typed compound primary containing the normalized equation, period, and phase shift as producer-proven standard MathJSON.
- Preserved the existing combined primary LaTeX as adapter-owned presentation. Normalized consumers render the same primary and details without reconstructing or parsing presentation output.
- Threaded the existing Period & Phase parser's native coefficient, offset, carrier, vertical-shift, and angle-unit evidence into exact equation/period/phase trees. Symbolic affine offsets remain V2 through producer-owned input parsing rather than output parsing.
- Converted tangent cycle-window and asymptote detail carriers to typed text plus standard mathematical relations while retaining their existing visible line presentation.
- Kept workers, host selection, capability IDs, replay seeds, runtime shell, History identity, and OOE ownership unchanged. Missing V2 evidence fails explicitly and never falls back to V1.

## Verification

- All 13 Trigonometry test files pass: 75 tests covering parser, functions, identities, equations, triangles, runtime, and Period & Phase core behavior.
- `npm run test:result-contract`: 14 files / 87 tests pass, including four new sine/cosine/tangent, DEG/RAD/GRAD, and symbolic-affine V2 proof cases plus all 43 golden and 100 replay executions.
- MathJSON coverage: 143 executable cases, 457 leaves, 447 producer-proven, 10 exempt, zero missing; Period & Phase is 15/15/0 proven/exempt/missing.
- Incremental TypeScript and the production Vite build pass. Display inversion passes with 404 producer boundaries, 150 native documents, 59 canonical reads, zero compatibility projections, and zero legacy reads.
- Chromium: 1/1 focused scenario passes against the real app, covering sine/RAD, cosine/DEG, tangent/GRAD, primary cards, Wave Facts, First Cycle Landmarks, three V2 History rows, replay, and no observed horizontal overflow.
- Diff hygiene passes. Exact staged-index file-size validation checks all 1,849 tracked TypeScript files and passes the committed caps. The mutable shared-tree command is presently blocked only by concurrent Notebook video work growing `src/app/shell/notebook/canvas/NotebookRichCanvas.tsx` to 1,120 lines; that foreign file is not in this commit tree.

## Recovery Notes

- The first compound-primary proof pass exposed negative-degree relation structure and tangent's presentation-only asymptote carrier. Negative degrees now use a standard negated degree value inside relations, and tangent labels are typed prose around proven relations.
- A Gate 5 no-behavior cleanup removed an obsolete type alias and was folded into that existing checkpoint before this gate, preserving one commit per named gate. Gate 5's final hash is `ffaf4f2a`.
