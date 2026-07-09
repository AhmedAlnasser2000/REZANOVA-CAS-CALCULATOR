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
- Nested algebraic wrapper formula readiness is available internally for exact depth-2 selected-target wrapper chains.
- Visible nested formula output is intentionally unchanged.

Manual app steps:
- In Equation Real Exact, solve `\sqrt{\sqrt{z^3+z+1}}=b`.
- In Equation Real Exact, solve `\sqrt{\left|z^3+z+1\right|}=b`.
- In Equation Real Exact, solve `\sqrt[3]{\sqrt{z^4+z+1}}=b`.
- In Equation Complex Exact, solve `\sqrt{\sqrt{z^3+z+1}}=b`.
- In Equation Real Exact, solve `\sin(\sqrt{|z-a|})=b` and `\sin(z)+\sqrt{z}=a`.

Expected results:
- The nested cubic/quartic examples remain unsupported or otherwise non-formula; they must not show `Real Cardano Cases`, `Real Ferrari Cases`, or grouped wrapper formula sections.
- The Complex, depth-3, and additive mixed-carrier examples remain deferred.
- No Display, OOE, History, Tauri, app-state, schema, Copy Result, or Formula Viewer behavior changes should be visible.
