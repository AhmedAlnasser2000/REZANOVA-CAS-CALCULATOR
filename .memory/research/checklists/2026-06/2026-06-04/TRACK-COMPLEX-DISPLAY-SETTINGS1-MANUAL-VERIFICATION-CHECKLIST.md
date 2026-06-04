# TRACK-COMPLEX-DISPLAY-SETTINGS1 Manual Verification Checklist

Milestone: `COMPLEX-DISPLAY-SETTINGS1`
Date: 2026-06-04

## Scope

- [ ] Confirm `i` / `\imaginaryI` displays as an imaginary unit, never numeric `1`, in Equation preview, accepted expression, resolved form, result cards, copy/editor output, and replay.
- [ ] Confirm `i` remains visible as `i reserved unit` in editor analysis and is not offered as a target, parameter, stored ignored value, or ambiguity hint.
- [ ] Confirm `j` and `k` remain ordinary symbols.
- [ ] Confirm Settings exposes a `Complex` section with `rectangular`, `polar`, and `cis` exact branch forms.
- [ ] Confirm `complexExactForm` persists across reload/restart.
- [ ] Confirm the top-header `Complex On/Off` button remains only the complex-domain intent toggle.

## Equation Spot Checks

- [ ] With `Complex On`, run `x^4+i=0`; `i` should remain `i`, and the answer should not look like the `x^4+1=0` answer.
- [ ] Run `x^4+i=0` in `rectangular`, `polar`, and `cis` complex exact forms.
- [ ] Run `x^4+1=0`, `x^4-16=0`, and `x^3+8=0` in all three exact forms.
- [ ] Run `x+i=0` and `x-(2+3i)=0` in all three exact forms.
- [ ] Confirm `EXACT`, `DECIMAL`, and `BOTH` output styles still behave as expected.
- [ ] Confirm `Complex Off` still gives controlled real-first guidance for explicit imaginary input.

## Boundaries

- [ ] No new complex solver family was added.
- [ ] No complex `Approximate` search was added.
- [ ] No complex `Isolate` solving was added.
- [ ] No stored complex values were added.
- [ ] No reserved-symbol override syntax was added.
- [ ] No non-Equation complex adoption was added.
- [ ] No OOE runtime behavior changed.
