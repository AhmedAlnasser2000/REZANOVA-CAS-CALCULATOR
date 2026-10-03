# Exact-algebra gate verification

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

## Backend gate: pass

- Environment: cloud container, Node v22.22.2 (the repository requires 24.x); dependencies were already installed with `npm ci --force --ignore-scripts`. npm scripts refuse to run under Node 22 (EBADDEVENGINES), so each tool was invoked directly with `node`.
- `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2`: 8 files / 48 tests passed, about 4 s.
- `node node_modules/typescript/bin/tsc -b --pretty false`: passed after removing one redundant, impossible domain comparison that the compiler flagged in `wire.ts`.
- `node node_modules/eslint/bin/eslint.js src/lib/symbolic-engine/equation`: passed.
- Compartment boundaries: 36 tests plus repository validation passed (1,635 source files). OOE boundaries: 8 tests plus validation passed.
- Karatsuba crossover probe (`.task_tmp/equation-reconstruction-design1/karatsuba.test.ts`): Karatsuba is faster than schoolbook from 32 coefficients on (64-bit: 16.3 ms vs 39.5 ms at 256; 512-bit: 37.8 ms vs 96.9 ms). The crossover was kept at 24.
- During development, four test expectations were corrected because the code was right and the fixture was wrong:
  - a reduced rational (−12345/6789 → −4115/2263);
  - a reconstruction example that actually has a solution (now replaced by an exhaustive check over a modulus of 97);
  - a scaled resultant (4, not 2);
  - a "mutated" solution that was in fact valid.

  No production logic was changed to fit a test.
- No full suite and no UI gate: there is no product caller.

## Documentation checks

- See the commit log for the memory-protocol, file-size and diff-hygiene results recorded at commit time.
