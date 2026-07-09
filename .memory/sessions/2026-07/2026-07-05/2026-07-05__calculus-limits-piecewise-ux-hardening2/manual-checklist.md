## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- The Limit piecewise row editor keeps condition spaces while editing inequalities.
- Editing row two or the limit controls no longer refocuses row one.
- Dragging rows swaps row data and clears local selection state.
- Whole-piecewise removal returns to the normal Limit editor.

## Manual App Steps

- Open `Calculus > Limits > Limit`.
- Press the `Piecewise` keypad button.
- In row 1, enter expression `x` and condition `x < 0`.
- In row 2, enter expression `-x` and leave condition as `Otherwise`.
- Evaluate.

## Expected Results

- Condition text remains `x < 0` with spaces visible in the field.
- The body readback renders as a cases expression, not mashed `xifx` text.
- The result is `0` with one Answer card.
- `Remove Piecewise` clears the structured editor.
