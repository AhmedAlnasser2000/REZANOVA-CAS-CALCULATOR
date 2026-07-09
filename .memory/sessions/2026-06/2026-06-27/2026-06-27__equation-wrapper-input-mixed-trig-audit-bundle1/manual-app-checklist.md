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
- Pasted function-argument quotients that were explicitly grouped stay grouped as LaTeX fractions before MathLive can reinterpret them.
- Real Exact trig wrappers can produce formula output for affine single-carrier shells and same-argument mixed sine/cosine shells when the generated selected-target branch is cubic or quartic.
- Wrapper readback still uses existing grouped formula sections and copy artifacts.

Manual app steps:
- In Equation, paste `ln((z^4+z+1)/(z-m))+c=b` through native paste.
- Use the app `Paste` action with `\ln\left((z^4+z+1)/(z-m)\right)+c=b`.
- In Equation, Real Exact, target `z`, solve `a\sin(z^3+z+1)+c=d`.
- Solve `a\cos(z^4+z+1)+c=d`.
- Solve `a\tan(z^4+z+1)+c=d`.
- Solve `A\sin(z^3+z+1)+B\cos(z^3+z+1)=C`.
- Solve `A\sin((z^4+z+1)/(z-m))+B\cos((z^4+z+1)/(z-m))=C`.
- Open Formula Viewer for one large formula result and use Copy Result.
- Try boundary cases `\sin(z^3+z+1)+z=b`, `\sin(z^3+z+1)\cos(z^3+z+1)=b`, `\sin(z^3+z+1)+\cos(z^4+z+1)=b`, nested trig, and Complex Exact `a\sin(z^3+z+1)+c=d`.

Expected results:
- The pasted log quotient appears as `\ln(\frac{z^4+z+1}{z-m})+c=b`.
- Enabled Real trig cases render `caseMath` answers with `Trig Formula Cases`.
- `a\ne0`, sine/cosine range facts, mixed amplitude facts, `n\in\mathbb{Z}`, and denominator exclusions appear when applicable.
- Ferrari-backed visible rows are closed in the original symbols rather than helper-backed by `Y`, `F_\sigma`, `P`, `Q`, `\Delta`, or row-local `t` definitions.
- Formula Viewer copy preserves the result `exactLatex`.
- Boundary cases remain unsupported and show no `Trig Formula Cases`, `Real Cardano Cases`, or `Real Ferrari Cases`.
