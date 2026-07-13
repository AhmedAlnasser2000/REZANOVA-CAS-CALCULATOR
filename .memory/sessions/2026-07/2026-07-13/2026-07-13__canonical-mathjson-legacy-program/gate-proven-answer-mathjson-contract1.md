# PROVEN-ANSWER-MATHJSON-CONTRACT1 Gate

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

- kind: backend canonical MathJSON proof contract
- result: pass
- runtime behavior changed: no
- intentional mathematical or visible output change: no
- push: not authorized

## Contract Evidence

- Candidate declaration records exact workspace, route, source, canonical LaTeX, and producer-owned MathJSON.
- Proof rejects ownership drift, malformed or over-bound values, clone failures, private operator heads, semantic mismatch, and canonical-printer mismatch.
- Compute Engine parsing and boxing provide validation evidence only. The successful proof retains the original producer-owned tree.
- Canonical math values can be assembled from proof without reparsing formatted output or promoting normalized input.

## Verification

- Focused contract: 5 tests pass.
- Result contract: 11 files and 47 tests pass across the full golden/replay evidence.
- Coverage registry remains exactly at its accepted 262-leaf baseline.
- Printer, seam, compartments, TypeScript, lint, build, file-size, and diff-hygiene gates pass.

## Exclusions

- Concurrent Notebook source/styles/tests and untracked `test-results/` remain unstaged and untouched.
