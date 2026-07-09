# FORMULA-PRESENTATION-PIPELINE2 Manual App Checklist

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

- Heavy formula case answers are compact-first so large Cardano/Ferrari wrapper results do not keep a huge MathLive-rendered DOM surface alive while the user types or navigates.
- Row-local guards remain row-local and render as `when` conditions only in the expanded full formula view.
- Global `Valid When` facts continue to render normally.
- Collapsed math-heavy detail sections do not mount their math until opened.

## Manual App Steps

- Real Exact: enter `\ln((z^4+z+1)/(z-m))=b`, solve for `z`.
- Click `Show full formula cases` on the compact formula preview.
- Real Exact: enter `x^3+p*x+2=0`, solve for `x`.
- Real Exact: enter `x^4+p*x^2+r=0`, solve for `x`.
- Real Exact: enter `|z^3+z+1|=b`, solve for `z`.
- Real Exact: enter `(z^3+z+1)^2=b`, solve for `z`.
- Real Exact: enter `\sqrt[4]{z^4+z+1}=b`, solve for `z`.
- Real Exact: enter `\sqrt{x+1}=x-1`, solve for `x`.
- Real Exact: enter `x^3+p*x^2*q+x=1`, solve for `x`.
- Real Exact: enter `x^3+p*x+2=0`, solve for `x`.

## Expected Results

- The rational-log quartic wrapper starts with a compact formula-cases summary plus normal global facts such as the denominator exclusion.
- Expanding reveals the full Ferrari case rows and their row-local `when` guards.
- Small direct formula cases remain fully visible without a compact summary when under threshold.
- Heavy grouped wrapper cases compact first, then expand on demand.
- The dense direct Cardano case `x^3+p*x^2*q+x=1` starts compact instead of freezing the app.
- The smaller direct Cardano case `x^3+p*x+2=0` remains fully visible without a compact summary.
- Copy Result remains the same before and after expansion.
- The extraneous-solutions card for `\sqrt{x+1}=x-1` remains visible and unchanged.
