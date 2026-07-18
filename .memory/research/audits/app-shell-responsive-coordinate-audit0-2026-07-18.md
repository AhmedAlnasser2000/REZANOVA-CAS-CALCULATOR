# APP-SHELL-RESPONSIVE-AUDIT0

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Scope

Audit the dimmed Settings, History, and Variables quick panels reported after
`APP-SHELL-PANEL-MOTION1`. This is source and browser evidence only: no runtime,
CSS, Graphing, OOE, result-contract, or panel-motion behavior changes are made.

## Finding

The darkening is the pre-existing overlay backdrop, not the new slide motion.
`side-surfaces.css` gives every overlay a `rgba(5, 9, 10, 0.46)` click-outside
backdrop. A quick panel reaches overlay whenever `useSideSurfaceRuntime` cannot
find 424px of right slack: a fixed 400px panel plus its 24px gap.

The responsive calculation mixes coordinate systems:

- it gates on unscaled `window.innerWidth >= 1180`;
- it measures available slack from `getBoundingClientRect()`;
- the calculator shell uses `zoom: var(--ui-scale)`.

Consequently a raised UI Scale expands the measured calculator shell and consumes
outboard slack. This is intentional under the current formula, but it makes a
physical fullscreen window look like a constrained overlay layout.

## Browser matrix

Chromium inspection used a fresh context for each combination, opened the compact
Settings panel, selected the stated UI Scale, and sampled the app stage, calculator
shell, host presentation, backdrop, and computed panel transition.

| Viewport | UI scale | Shell width | Right slack | Presentation |
| --- | ---: | ---: | ---: | --- |
| 1440px | 100–145% | 1384px | 0px | overlay |
| 1920px | 100% | 1480px | 192px | overlay |
| 1920px | 115% | 1702px | 81px | overlay |
| 1920px | 130–145% | 1864px | 0px | overlay |
| 2560px | 100% | 1480px | 512px | outboard |
| 2560px | 115% | 1702px | 401px | overlay |
| 2560px | 130% | 1924px | 290px | overlay |
| 2560px | 145% | 2146px | 179px | overlay |

The 2560px / 115% transition is particularly diagnostic: 401px of slack is 23px
short of the fixed 424px outboard requirement, so the entire desktop flips from an
undimmed outboard inspector to a darkened overlay. Every overlay sampled the same
`rgba(5, 9, 10, 0.46)` backdrop. The panel's computed entry transition is 220ms;
the host additionally advances from `entering` to `entered` over two animation
frames. The reported heaviness is therefore principally the large 46% visual veil
and overlay fallback, with the entry duration adding a small visible delay.

## Decision-ready conclusion

Do not retune the animation in isolation. The immediate visual issue is overlay
policy, while the structural issue is using a zoomed shell rectangle as the
outboard-space authority. A true desktop outboard panel at 1440px or 1920px cannot
fit beside a fixed 1480px shell without either shrinking/reserving calculator space
or overlapping it; CSS cannot create that room.

The smallest later correction should choose one product policy explicitly:

1. Utility-overlay policy: retain overlap at constrained widths but make the
   Settings, History, Variables, and left Menu Inspector backdrop transparent or
   very light. Keep its click-outside behavior. This removes the unwanted dimming
   without claiming an outboard layout has room.
2. Reserved-outboard policy: calculate a panel-open calculator width and reserve
   side space before applying UI scale. This gives desktop panels a true dock but
   is a broader calculator-shell layout change.

For the user-reported issue and the desire to begin Graphing promptly, policy 1 is
the appropriate bounded follow-up if a correction is requested. It does not block
Graphing and must not be folded into Graphing's page/canvas design.

## Focused future manual check

After either policy is implemented, verify at 1440x900, 1920x1080, and 2560x1440
at 100%, 130%, and 145% UI Scale:

1. Open Settings, History, Variables, and the Menu Inspector.
2. Confirm the chosen overlay/outboard policy is visually consistent and outside
   click still closes an overlay.
3. Close and rapidly reopen each panel; confirm no flash, blocked control, or
   stale backdrop remains.
4. Switch UI Scale while a panel is open; confirm its local scroll/input state is
   retained and no horizontal clipping occurs.
