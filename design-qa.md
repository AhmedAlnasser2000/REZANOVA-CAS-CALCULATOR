# Design QA: GRAPHING-MINIMUM-VISIBLE1

## Source visual truth

- The approved REZANOVA Graphing mockups supplied by the user in the Graphing discussion are the visual authority.
- The interaction and layout interpretation is supported by `/home/ahmed/Downloads/codex-handoff-rezanova-graphing-rebased-latest.md`.
- Move 8 intentionally implements only the base real-function state. Future mock controls such as Analyze, Export, Complex/Both, Presentation, and Three.js are omitted because the production shell exposes only working controls.

## Implementation evidence

- Production screenshot: `test-results/graphing-minimum-visible-G-85523-he-visible-surface-truthful-chromium/graphing-1280x800.png`.
- Additional development comparison: `.task_tmp/graphing-minimum-visible1/1600x940.png`.
- States checked: three real expressions with one trailing blank row; independent Graph tabs; collapsed/expanded expression rail; pan and zoom; invalid typing grace; reduced motion.
- User defect evidence: `/home/ahmed/Videos/Screencasts/Screencast from 2026-07-19 12-01-36.mp4` was inspected for first-character focus transfer, wheel stutter, and the blue native-selection wash.
- Viewports checked: 1280x800 and 1600x940.

## Full-view comparison

- The app-level tab strip remains above a distinct Graph page, matching Calcwiz ownership rather than imitating the mock window chrome.
- Graphing retains the mock's dark green-black hierarchy: identity header, concise toolbar, left expression rail, large Cartesian viewport, and restrained status footer.
- The first three expression rows and curves use blue, green, and violet consistently. The blank row remains visually subordinate.
- The official REZANOVA application icon is used instead of inventing a glyph.

## Fidelity surfaces

### 1. Layout and composition

- Passed at 1280x800 and 1600x940. Rail, viewport, toolbar, and footer remain legible without overlap. The rail collapses and restores without changing document state.

### 2. Typography and hierarchy

- Passed. MathLive expressions provide the intended mathematical texture; labels and status text remain subordinate to the graph. No fake mathematical text is used for authored expressions.

### 3. Color and surfaces

- Passed after correcting successive rows from a repeated blue token to the approved distinguishing palette. Borders and surfaces separate regions without decorative gradients.

### 4. Controls and iconography

- Passed. Every visible control works and has an accessible name. Inert future controls are absent. Official app identity and conventional icon controls replace placeholder glyphs.

### 5. Content and density

- Passed. The plot remains the dominant surface, expression rows are dense but readable, and the footer reports readiness/visible count/gesture guidance without crowding.

## Focused-region review

- Expression rail and canvas were reviewed together because row-color/curve-color identity crosses the boundary. The production screenshot confirms all three mappings and the reciprocal discontinuity.
- No separate crop was needed: the 1280x800 full view renders the relevant rail, toolbar, axes, paths, and footer at readable scale.

## Findings and resolution history

- P1: React Strict Mode cleanup left the first real sample unable to commit. Fixed by restoring mounted lifecycle state during effect setup; real browser plotting then completed.
- P2: Parent runtime-context identity changes restarted settled sampling after OOE tab-status events. Fixed by retaining the context in a ref and keying sampling to primitive workspace identity.
- P2: MathLive accessory chrome, edge tick clipping, and stale tab-running status reduced fidelity. Fixed before production evidence.
- P2: Successive expressions initially reused blue. Fixed with stable new-row palette indexing and a focused regression test.
- P1: The first character promoted a blank row while the newly mounted trailing MathLive row stole focus. Fixed by restoring focus to the promoted row after the new blank mounts; production Playwright verifies continued input remains in that row.
- P1: Plot dragging could trigger a full blue native-selection wash. Fixed by cancelling pointer selection/drag behavior across the viewport and its descendants; production pan verification confirms no non-collapsed selection remains.
- P2: The 90ms wheel timer repeatedly committed viewport revisions during normal scroll bursts, while an SVG-group transform did not guarantee compositor promotion. Fixed with a 180ms coalescing window and one HTML compositor layer around the SVG canvas.
- No open P0, P1, or P2 finding remains for the Move 8 surface.

## Final result

passed
