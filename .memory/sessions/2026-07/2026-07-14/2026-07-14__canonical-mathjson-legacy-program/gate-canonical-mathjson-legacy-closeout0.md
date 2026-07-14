# CANONICAL-MATHJSON-LEGACY-CLOSEOUT0 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- kind: backend and ui closeout
- result: pass for program-owned scope
- authority: 401 producers, 57 direct canonical consumers, 149 native documents, 0 compatibility projections, 0 legacy reads, 0 violations
- coverage: 458 leaves, 394 proven MathJSON, 64 bounded exemptions, 0 missing
- browser: 156 cases accounted for, including all 19 canaries and nine History journeys
- native: `cargo check`, 51 Rust unit tests, and one Linux clipboard integration test pass

## Resource-Safe Deltas

- The two-worker unit run exposed six stale fixtures after the compatibility symbols were removed; 34 affected tests pass after repair. The broad suite was not repeated.
- The two-worker UI run exposed five stale fixtures; all five pass after repair. The broad suite was not repeated.
- The E2E run passed 155 cases. The Numeric Interval route was still legitimately computing when its generic ten-second locator wait expired; the same strict assertions pass in isolation with a route-specific 30-second wait.

## Visual Evidence

- Re-inspected retained Calculate, Equation, Calculus, Trigonometry, Geometry, Statistics, Matrix, Vector, and Table screenshots.
- Result cards, facts, details, workspace identity, Table rows, and overflow remain visually sound.
- No mathematical, wording, or formatting change was accepted.

## Residual

- Program-owned lint passes.
- Repository-global lint has one error and one warning in the separately committed Notebook lane: `react-hooks/set-state-in-effect` and `react-hooks/exhaustive-deps` in `src/app/shell/NotebookPage.tsx`.
- An extra bundle-size audit fails the old budgets at 5,293.51 kB eager raw, 1,423.26 kB eager gzip, and a 2,732.82 kB largest app chunk. The required production build passes; a separate investigation must identify ownership before changing chunk topology or budgets.
- Notebook files and untracked `test-results/` are excluded from this gate and commit.
