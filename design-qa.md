**Comparison Target**

- Source visual truth: `/home/ahmed/Pictures/Screenshots/Screenshot from 2026-07-20 19-22-05.png`
- Browser-rendered implementation: `/home/ahmed/Downloads/Calculator/test-results/graphing-minimum-visible-G-382cf-yle-edits-presentation-only-chromium/graphing-move21-piecewise-reference-2020x1077.png`
- Full-view comparison: `/home/ahmed/Downloads/Calculator/.task_tmp/graphing-appearance-styling1/piecewise-reference-comparison.png`
- Focused comparison: `/home/ahmed/Downloads/Calculator/.task_tmp/graphing-appearance-styling1/piecewise-focused-comparison.png`
- Viewport: 2020 x 1077 CSS pixels, Chromium desktop.
- State: Technical theme; collapsed `y={x if x<0; -x if x>0}` item; allowed-gap diagnostic visible; curve rendered.

**Findings**

- No actionable P0, P1, or P2 mismatch remains in the approved compact piecewise surface.
- Typography: both states use the product MathLive rendering for the cases expression and the established condensed UI face for controls and diagnostics. The focused comparison preserves the same hierarchy and readable two-line warning.
- Spacing and layout: the swatch, rendered brace/cases expression, expand control, visibility control, delete control, and diagnostic follow the same compact horizontal and vertical rhythm. The full-page implementation includes the current Calcwiz shell around the Graph page, while the source is cropped to the Graph surface; this is an expected framing difference.
- Colors and tokens: the dark technical canvas, blue item token, muted borders, white mathematics, and amber diagnostic remain consistent. Paper was separately exercised as a warm light canvas without changing the outer Calcwiz chrome.
- Image and icon fidelity: no decorative raster asset is needed for this component. Existing Calcwiz product assets and the established Lucide control icons are retained.
- Copy and content: the piecewise branches and the allowed-gap diagnostic match the source meaning and wording.

**Open Questions**

- None for Move 21. The source includes a legacy reorder gutter outside the approved compact-row control list; this implementation intentionally retains the current Graph ordering model rather than reintroducing that withdrawn behavior.

**Implementation Checklist**

- [x] Restore collapsed rendered-cases presentation.
- [x] Keep branch editing behind the expand control.
- [x] Place gap/overlap diagnostics directly below the expression.
- [x] Verify theme and curve-style commands in the browser.
- [x] Confirm style-only edits do not resample mathematics.
- [x] Check browser console and page errors.

**Comparison History**

- Initial comparison: no P0/P1/P2 issue was found, so no visual correction iteration was required.
- Focused post-build evidence confirms the compact row control order, cases rendering, and diagnostic placement at the reference state.

**Primary Interactions Tested**

- Create a structured two-branch piecewise relation.
- Keep the completed item collapsed and expand it through its keyboard-accessible button.
- Open and close the style popover; change width and dash style.
- Switch to Paper and verify only the graph canvas changes.
- Verify no browser console or page errors.

**Follow-up Polish**

- None required for Move 21.

final result: passed
