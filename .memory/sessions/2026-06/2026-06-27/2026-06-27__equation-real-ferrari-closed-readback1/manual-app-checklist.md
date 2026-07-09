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

What is achieved now:
- Non-generic Real Ferrari primary answers are closed instead of helper-backed.
- Real wrapper formula outputs that delegate to Ferrari inherit the closed case rows.

Manual app steps:
- In Equation Real Exact, solve `\sqrt[3]{\sqrt{z^4+z+1}}=b`.
- In Equation Real Exact, solve `z^4+z+1=b^6`.
- In Equation Real Exact, solve `x^4+m*x+2=0`.
- In Equation Real Exact, solve `a*x^4+b*x^3+c*x^2+d*x+f=0`.
- In Equation Complex Exact, solve `x^4+m*x+2=0`.

Expected results:
- The first three Real non-generic cases show primary rows without helper symbols such as `Y`, `F_\sigma`, `P`, `Q`, `\Delta`, or row-local `t=...` definitions.
- The generic Real template may still show helper-symbol Ferrari definitions.
- The Complex case keeps the existing PrincipalRoot/helper readback.
- No Display, Formula Viewer, OOE, History, app-state, schema, Tauri, or Copy Result contract changes should be visible.
