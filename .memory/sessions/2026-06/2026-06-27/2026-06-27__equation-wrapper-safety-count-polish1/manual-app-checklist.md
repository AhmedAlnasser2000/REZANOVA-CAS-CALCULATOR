# Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## What Is Achieved Now

- Mixed trig rational wrapper formulas should no longer fall into the unsafe symbolic readback error for the screenshot-family inputs.
- The Answer card should show a compact count cue for roots, guarded rows, or branch families.
- Formula Viewer should show the same type-aware count cue in its header while keeping result copy unchanged.

## Manual App Steps

- In Equation Exact Real mode with Complex Off and `RAD`, select target `z` and solve `A\sin((z^4+z+1)/(z-m))+B\cos((z^4+z+1)/(z-m))=C`.
- Repeat with target `z`, `RAD`, and `A\sin\left(\frac{z^4+z+1}{z-m}\right)+B\cos\left(\frac{z^4+z+1}{z-m}\right)=C`.
- Open the Formula Viewer from a compact formula result.
- Copy Result from both the source result card and the Formula Viewer.
- Check a finite-root answer such as `s\in\{a+b,a-b\}`.

## Expected Results

- Both mixed trig inputs show a Real formula answer with `Trig Formula Cases`, no unsafe symbolic-output error, and `z-m\ne0` under Valid When.
- Formula answers show count cues like `2 branch families · 10 guarded rows` or `5 guarded rows`.
- Finite-root answers show `1 root` or `N roots`.
- Formula Viewer shows the count cue plus character count and Copy Result still copies the exact result LaTeX.
