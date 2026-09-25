# Scientific source mirror capture

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

## Scope and outcome

- Backend gate; DIRECT root-only. User authorized NumPy, SciPy, FLINT, Singular, and BLAS/LAPACK capture for specialty-focused study across the app. BLAS/LAPACK is represented by OpenBLAS and Reference LAPACK (which includes reference BLAS). No commit requested or performed.
- All six were registered before cloning, then captured with depth 1, single branch, no tags, no submodule recursion, and hooks disabled. All worktrees are clean and shallow; payloads remain ignored. No mirror builds, tests, scripts, dependencies, source reuse, or product changes.
- Metadata records upstream, license notices, study focus, exact revision, and static-only restrictions. These are source snapshots, not full histories or build-ready dependency closures. Default branches are captured, not selected stable releases.

## Captures and omitted submodules

| Mirror | Branch | Revision | Uninitialized submodule paths |
| --- | --- | --- | --- |
| numpy | `main` | `b76063c87d57b6c33364fc349170852fe7b7a1a9` | `doc/source/_static/scipy-mathjax`, `numpy/_core/src/common/pythoncapi-compat`, `numpy/_core/src/highway`, `numpy/_core/src/npysort/x86-simd-sort`, `numpy/_core/src/umath/svml`, `numpy/fft/pocketfft`, `vendored-meson/meson` |
| scipy | `main` | `e74a47b1d6c1041d05344dded035d22dc851f4f2` | `doc/source/_static/scipy-mathjax`, `subprojects/array_api_compat`, `subprojects/array_api_extra`, `subprojects/boost_math/math`, `subprojects/cobyqa`, `subprojects/highs`, `subprojects/unuran`, `subprojects/xsf` |
| flint | `main` | `e269d38061d7a42070ddcffe6eb114466ed4aa7e` | none |
| singular | `spielwiese` | `cca73e3ef1deb1b75c8bbd112dab699fd4fcb888` | none |
| openblas | `develop` | `803f36bcaabba43ddee84bf455dfcc24dc7aa0eb` | none |
| lapack | `master` | `64ca1efc5a7dd7e5a899af3f1c75a2c4eca93c60` | none |

## Wolfram assessment

- User clarified: clone Wolfram Engine if useful to study and applicable as a mirror. The engine is proprietary binary software, not a public source implementation available to clone. Public documentation remains useful for function semantics, mathematical examples, algorithm references, and capability comparisons; source unavailability does not imply no research value. No Engine clone, download, installation, activation, or execution was performed.
- Official references checked 2026-09-08: https://www.wolfram.com/engine/faq/ and https://www.wolfram.com/legal/terms/wolfram-engine.html . Free developer licensing is not open-source licensing; terms prohibit reverse engineering. Any future licensed behavior experiment is separate from this static-source capture.

## Durable memory files updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md`
- `.memory/journal/2026-09/2026-09-08.md`
- This session: `completion-report.md` and `verification-summary.md`.
