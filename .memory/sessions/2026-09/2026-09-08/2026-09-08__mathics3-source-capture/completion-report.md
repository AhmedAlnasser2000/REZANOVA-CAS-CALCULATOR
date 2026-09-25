# Mathics3 source capture and static inspection

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- contributors: none
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live

## Outcome

- Backend gate; DIRECT root-only. User authorized Mathics3 clone and explicitly requested source inspection afterward. No commit.
- Registered before capture; master HEAD `8f983a314d70a1461b790a259d328faf9834c39e`. Depth 1, single branch, no tags, hooks disabled, no recursive submodules. Clean shallow mirror; Combinatorica gitlink remains uninitialized. Rubi appears in .gitmodules but has no tracked payload or gitlink at this revision; neither package was fetched. Core only: no scanner, frontend, omnibus, or dependency capture/install.
- No mirror execution, source reuse, production code changes, benchmark, or app-visible output gate.

## Source findings

All paths below are relative to `playground/sources/mirrors/mathics3/`.

- `pyproject.toml`: required dependencies include Mathics3_Scanner, SymPy, mpmath, NumPy, SciPy, Pint, Pillow, and other support libraries. llvmlite is an optional full extra. License declares GPL-3.0-or-later; README uses GPL3 wording. Do not infer current requirements from the older README terminal transcript.
- `mathics/core/expression.py:1181`: owned recursive rewrite/apply/evaluate step evaluates the head and honors evaluation attributes such as HoldAll.
- `mathics/core/pattern/`: pattern code is now a package (base, ordered, orderless, deferred, common), not the older web-indexed pattern.py file.
- `mathics/core/rules.py`: owns RewriteRule and FunctionApplyRule, including Python-handler fallback when a handler returns None. Its comments explicitly describe avoiding expensive pattern matching in low-level paths; this is design evidence, not a measured benchmark.
- `mathics/builtin/numbers/calculus.py:1086`: Integrate converts input to SymPy, calls sympy.integrate, and converts the result back, including subsequent condition handling. This is substantial delegation plus Mathics semantics, not an independent integration engine.
- `mathics/eval/arithmetic.py:48`: mpmath calls run under an explicit workprec context, convert numerical arguments/results, and support precision-sensitive sums/products.
- `mathics/eval/numbers/calculus/integrators.py:57`: contains an internal adaptive Simpson implementation, evidence that not all mathematical algorithms are delegated.
- No whole-repository ownership percentage or speed/parity claim was established. Useful study focus remains evaluator, patterns, extension dispatch, and conversion contracts; arithmetic backends should also be studied directly.

## mpmath explanation

- Official reference checked 2026-09-08: https://mpmath.org/ . Python arbitrary-precision real/complex numerics, special functions, quadrature, roots, ODEs, and linear algebra. Useful for studying precision management and numerical algorithms; more precision is not automatically a correctness proof. No mpmath clone or runtime adoption authorized/performed in this task.

## Durable memory updated

- `.memory/current-state.md`
- `.memory/journal/2026-09/2026-09-08.md`
- This session: `completion-report.md` and `verification-summary.md`.
- Existing static-only policy remains unchanged; no new architecture decision or unresolved roadmap choice introduced.
