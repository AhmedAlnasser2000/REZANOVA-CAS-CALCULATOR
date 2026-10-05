# Presentation gate verification

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Part A gate: pass

- **Environment**: cloud container, Node v22.22.2; gate scripts run as `node` commands, because npm refuses Node 22.
- **Tests**: `presentation/values.test.ts`, 13 tests (rewrites with independent exact checks, power extraction, mpmath decimals, order) and the core isolation test all pass.
- **Real issue found and fixed**: tie rounding went toward +∞ (−5/8 → −0.62); it is now half away from zero.

## Part B gate: pass

- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation src/lib/result-contract src/lib/display/printer --maxWorkers=2` passed 68 files / 983 tests (1 skipped: the opt-in medians) in about 3.3 min wall. This includes the printer (20) and layout (76) tests; `node tools/result-contract-runner.mjs` passed.
- **Corpus**: all 67 cases present. In each, the V6 document is byte-identical afterwards, copy LaTeX contains no decimals, and every root mentioned in copy is defined.
- **Issues found by reading every corpus presentation, all fixed**:
  - doubled parentheses on sum numerators;
  - family term order;
  - condition layout;
  - factor order;
  - a parameter breakpoint root described in the target variable;
  - a missing LaTeX space after `\pi`;
  - uncancelled common content;
  - decimals leaking into copy LaTeX;
  - an inverted fallback flag.
- **Other checks**: `tsc -b`, ESLint (Equation, printer), OOE, compartment, file sizes, memory protocol, codex agent-workflow, the V2 enforcement checker and the display-contract inversion test and ratchet all passed.

## Follow-up commit (no decisions from rendered text): pass

- **Scope**: the six text-driven layout decisions were replaced by structural facts or exact engine facts, and a source-scan guard test was added. I confirmed that the guard regex matches every replaced line.
- **Tests**: the presentation and printer tests (111) pass with unchanged goldens. The Equation, result-contract and printer suites pass: 68 files / 985 tests (1 skipped). `tsc -b`, ESLint, OOE, compartment, file sizes, memory protocol, codex agent-workflow, display-contract inversion and V2 enforcement all passed.
