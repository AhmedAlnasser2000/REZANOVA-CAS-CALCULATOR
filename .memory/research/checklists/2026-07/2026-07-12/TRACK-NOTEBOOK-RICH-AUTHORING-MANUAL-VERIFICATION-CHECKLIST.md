# Notebook Rich Authoring Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: terra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: terra
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: terra
- attribution_basis: live

## What Is Achieved Now

- One continuous rich Notebook canvas mixes authored prose, inline math, display math, lists, academic containers, and compact evidence.
- A Notebook-only keyboard provides searchable beginner-friendly math templates without changing calculator keyboards.
- The outline organizes headings and academic containers, supports reordering, and becomes a drawer with the inspector on narrow layouts.
- Notebook remains a session draft with no solver, persistence, import/export, or external protocol authority.

## Manual App Steps

1. Open the plus menu, create a Notebook, and choose `Worked Example`.
   - Expected: one Notebook app tab opens with a hierarchical outline, central authored document, and selected-block inspector.
2. Select inline and display math, then use the floating templates and bottom Math authoring dock.
   - Expected: the keyboard remains visible, the active equation stays above it, and inserting Fraction/Root/Integral retains math-field focus.
3. Insert Theorem, Proof, Exercise, Hint, Answer, and Warning containers; add labels and numbers in the inspector.
   - Expected: the outline updates; only Hint and Answer expose collapse behavior.
4. Reorder a top-level container by drag/drop and by Move Up/Down.
   - Expected: document and outline order stay synchronized.
5. Resize around 1,100 pixels and open both drawer buttons in turn.
   - Expected: the canvas remains dominant, only one drawer is open, and no drawer or keyboard overlaps Workspace Tabs.
6. Check high contrast plus 80% and 130% UI scale.
   - Expected: content changes scale and contrast while the Notebook frame stays within the viewport with no horizontal overflow.
7. Switch away from and back to the Notebook tab.
   - Expected: the session draft remains attached to that tab; restarting the app is not promised to restore it.

## Expected Results

- Authored content remains editable and non-destructive.
- Document-only notation stays writable but does not enable `Open in Tool`.
- Calculate and Equation handoff remains explicit; Notebook never runs a calculation itself.
- Long documents scroll inside the canvas while the formatting toolbar, app tabs, footer, and side rails remain stable.
