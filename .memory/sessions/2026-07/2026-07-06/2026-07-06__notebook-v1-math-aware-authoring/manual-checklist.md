# Notebook V1 Manual Verification Checklist

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
- Notebook opens as a document-tab app page outside the calculator shell.
- Notebook V1 supports session-only math-aware prose, reviewed inline math spans, rich text marks, optional MathLive editor blocks, and evidence/package contract placeholders.
- Notebook can hand authored math to Calculate/Equation, but does not run jobs itself.

## Manual App Steps
- Open REZANOVA CLASSWIZ CALCULATOR.
- Use the tab plus menu and choose `New Notebook`.
- Confirm the Notebook tab appears as an `App Page` and the calculator shell is not wrapping the Notebook content.
- Select the text block and type a sentence such as `Solve x^2-5x+6=0 before checking roots.`
- Accept the detected math candidate.
- Confirm the original text remains, the accepted span appears as inline MathLive-capable math, and the revert action returns it to editable prose.
- Select a prose range in the text block and apply Bold, Italic, Highlight, and Color.
- Select the Math input block.
- Confirm the Workspace selector in the right inspector has readable dark text on the light control.
- Choose Calculate or Equation, enter a small expression, and use `Open in Tool`.
- Confirm quick Settings/History/Variables/diagnostic inspectors do not overlay Notebook.

## Expected Results
- Notebook remains a page surface with null Order of Execution runtime context.
- Text block math normalization is non-destructive.
- Inline math spans support MathLive behavior through the existing editor wrapper.
- Only Calculate and Equation are live Notebook launch targets in V1.
- The workspace selector remains legible in the right inspector.
