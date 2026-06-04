# TRACK-EDITOR-KEYFLOW1 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- attribution_basis: direct

## Scope

- [ ] `x^3` keeps the cursor in the exponent after typing `3`.
- [ ] Plain physical Space inserts visible math spacing and remains usable while typing.
- [ ] Solve/Evaluate trims only harmless trailing math spacing before execution.
- [ ] Left/right arrows wrap only at whole-field boundaries.
- [ ] Keypad cursor-left/cursor-right use the same whole-field wrap behavior.
- [ ] MathLive keypress/plonk sounds are disabled so Tauri does not emit GStreamer sound-path warnings.

## Manual Checks

- [ ] Type `x^3`; cursor remains in the exponent until the user exits intentionally.
- [ ] Press right arrow from the exponent end; MathLive exits the exponent normally.
- [ ] Press left at the whole-field start; the cursor wraps to the end.
- [ ] Press right at the whole-field end; the cursor wraps to the start.
- [ ] Press Space between terms; a visible math gap is inserted.
- [ ] Press Space at the end of `1/3+1/6`; execution still evaluates after trimming the trailing spacing command.
- [ ] Press Space and boundary arrows in Tauri; no MathLive sound/GStreamer warnings appear.

## Boundaries

- [ ] No parser, solver, variable-policy, result-origin, history-schema, graphing, `POLY-ELIM2`, or source-mirror behavior changes.
- [ ] Space cleanup does not rewrite the live editor while typing.
- [ ] Nested MathLive navigation inside fractions, roots, and exponents remains MathLive-owned except for whole-field boundary wrapping.
