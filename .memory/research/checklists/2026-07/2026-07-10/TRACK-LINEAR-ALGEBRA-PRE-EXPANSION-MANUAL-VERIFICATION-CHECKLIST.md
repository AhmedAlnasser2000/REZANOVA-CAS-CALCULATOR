# Linear Algebra Pre-Expansion Manual Verification Checklist

Date: 2026-07-10

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
  - user
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## What Is Achieved Now

- Matrix and Vector are separate workspaces with separate OOE capability identities and one enforced public runtime-request facade.
- Friendly pasted list syntax and MathLive matrices naturalize into textbook notation.
- Named Matrix/Vector libraries support multiple values while F-keys use the selected two active operands.
- The Matrix editor can compose arbitrary named or inline matrices; the Vector editor can compose arbitrary named or inline vectors.
- Exact structural answers, readable answer rows, proof cards, Copy Result, and History replay are available for the current Linear Algebra feature set.

## Manual App Steps

1. Open Matrix, paste `eigen([[2,1],[1,2]])`, and confirm it naturalizes before or on execution.
2. Add matrices `C`, `D`, and `E`; run a main-editor expression such as `det(CD)` while confirming the F-key labels still reflect only Left/Right.
3. Insert a MathLive 3 by 3 matrix and run `rank`, `rref`, or another dimension-compatible operation.
4. Open Vector, add vectors `p`, `q`, and `r`; run `proj(p,q)`, `cross(p,q)` for length 3, and `triple(p,q,r)`.
5. Rename or delete a live named value after a run, then replay that result from History.
6. Inspect answer, facts, and proof cards; collapse and expand detail cards; use Copy Result and To Editor.

## Expected Results

- Successful imports and results use natural matrix/vector notation, never raw list syntax.
- Main-editor expressions may use values beyond the active pair; F-key labels and operations remain intentionally pair-based.
- Dimension mismatches and unsupported forms stop with controlled errors rather than guessed results.
- History replay preserves the named-value snapshot and natural expression used at run time.
- Cards remain readable without clipped matrices, tiny vectors, duplicate headers, or nonnumeric `APPROX` leakage.
