# Composition gate verification (parts A and B)

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

- **Environment**: cloud container, Node v22.22.2 (the repository requires 24.x); tools invoked directly with `node`.
- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 30 files / 427 tests (40 new) in about 75 s. The isolation test and the no-caps ratchet cover `composition/`.
- **Reference digits** (Python mpmath): point ranges of atan 1 + e, sin e + √2 and ln 3·cos 2.
- **Real bugs found and fixed**:
  1. Candidate generation called the zero finder on the expression itself when it was a constant multiple of a sum, which overflowed the stack.
  2. The worklist cut unbounded tails outward before deciding bounded pieces, without end. This affected dependent radicals.
  3. Monotonicity was lost where the derivative touches 0 at a cut point (sin|x| + x) and through π rounding (atan x + eˣ ≥ −π/2). Fixed by weak monotonicity on analytic pieces with an identity guard, and by exact tail limits.
  4. The u-level periodic set was mapped before normalization, which split one interval family into two.
- **Intended behavior changes in existing tests**: three routing rows are now decided exactly (2ˣ + 3ˣ = 5, √x + √(x+1) = ln 2, sin|x| + x = 0). They are replaced by variants whose roots are not closed forms.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed. Every file is under 1000 lines.
- **Not run**: no full suite and no UI gate, because there is no product caller.

## Documentation checks

- See commit-log.md.

## Part B backend gate: pass

- **Tests**: `node node_modules/vitest/vitest.mjs run src/lib/symbolic-engine/equation/core --maxWorkers=2` passed 31 files / 445 tests (18 new) in about 143 s. The depth-25 periodic chain alone takes about 100 s.
- **Real bugs found and fixed**:
  1. Depth-25 chains exhausted 5·10⁸ work units in enclosure gcds (rational atan and alternating series on long points). Fixed with a fixed-point atan series and outward rounding of long points for atan, asin, sin and cos.
  2. The first positivity check in the algebraic log zero test read an isolating interval that may straddle 0. It now compares exactly.
- **Other checks**: `tsc -b`, scoped ESLint, compartment boundaries, OOE boundaries and file sizes passed. Every file is under 1000 lines.
