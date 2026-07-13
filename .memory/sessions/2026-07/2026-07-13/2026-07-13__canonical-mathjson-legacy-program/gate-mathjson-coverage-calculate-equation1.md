# MATHJSON-COVERAGE-CALCULATE-EQUATION1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- kind: backend producer coverage plus app-visible parity
- result: pass for milestone-owned scope
- intentional mathematical or visible output change: no
- push: not authorized

## Coverage Evidence

- All 20 Calculate fixtures and every representable leaf in 25 Equation fixtures carry producer-owned standard Compute Engine MathJSON.
- The 100-probe baseline is 262 leaves: 89 proven, 169 missing, and four exact mixed prose/math Equation exemptions.
- Optional producer trees that fail semantic or printer proof are omitted transactionally. Canonical LaTeX remains authoritative; formatted output is never reparsed to manufacture a tree.
- Complex answer MathJSON is standard while established visible `i` presentation remains unchanged.

## Verification

- MathJSON coverage, Equation solve-result, and result-contract gates pass across all 43 golden executions and 100 replay probes.
- Broad Equation/algebra/engine regression passes 180 files and 1,506 tests.
- Display inversion passes with 134 Equation native documents, zero Equation compatibility, and 265 registered Equation legacy reads.
- Printer, seam, OOE, compartment, TypeScript, build, file-size, and diff-hygiene gates pass.
- Isolated Chromium inspection covers complex roots, a periodic family, a radical controlled boundary, detail/fact cards, and overflow.
- Global lint is blocked only by the concurrent Notebook `extensions.tsx` fast-refresh rule; that file is outside this gate.

## Exclusions

- Concurrent Notebook source, styles, tests, and untracked `test-results/` remain unstaged and untouched.
