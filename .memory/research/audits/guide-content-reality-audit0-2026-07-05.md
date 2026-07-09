# GUIDE-CONTENT-REALITY-AUDIT0

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Scope
- Date: 2026-07-05
- Gate: audit-only
- Files inspected: `src/lib/guide/**`, `src/app/shell/GuidePage.tsx`, `src/app/workspaces/GuideWorkspace.tsx`, `.memory/current-state.md`, `docs/app_summary_latest.md`
- No Guide content, routing, or runtime source was changed in this gate.

## Current Guide Posture
- Guide is now a singleton app-level page surface outside `.calculator-shell`.
- Guide keeps null Order of Execution runtime context and page-tab policy.
- Current Guide content is a reference/catalog layer, not a Notebook system, import/export system, teacher package system, or generated step-by-step engine.
- The current Guide page shell uses the primary public identity `REZANOVA CLASSWIZ CALCULATOR`.

## Must Fix
- Trigonometry domain navigation omits the live `trig-period-phase` article.
  - Evidence: `src/lib/guide/domains.ts` lists Trigonometry articles without `trig-period-phase`, while `src/lib/guide/content/selectors.ts` includes the article and the Trigonometry mode reference links it.
  - Risk: users can reach the article through mode/search/related paths but not through the domain page, so the Guide taxonomy is inconsistent.
- Statistics domain navigation omits the live `statistics-inference` article.
  - Evidence: `src/lib/guide/domains.ts` lists Statistics articles without `statistics-inference`, while `src/lib/guide/content/selectors.ts` defines the article and the Statistics mode reference links it.
  - Risk: if Statistics Guide content is exposed, inference is discoverable through mode/search/related paths but missing from the domain page.
- Guide content coverage tests do not enforce domain-to-article parity.
  - Evidence: `src/lib/guide/content.contract.test.ts` checks only a small required-id set and mode-ref titles; it does not assert that domain article lists include all intended active articles or that mode refs and related links are reachable from their owning domain.
  - Risk: this exact class of stale Guide taxonomy can recur.
- `docs/app_summary_latest.md` is stale relative to `.memory/current-state.md` and should not be used as Guide truth source until refreshed.
  - Evidence: it still says there are no full Settings/History pages and no Surface Protocol, while current state records full Settings/History page surfaces and the hostless Surface Protocol spine.
  - Risk: future Guide copy could accidentally reintroduce stale public claims if it copies from the overview document instead of current-state/source.

## Should Fix
- Normalize first-use identity inside article prose.
  - Evidence: Guide content uses `Calcwiz` in several article-body sentences. Friendly aliases are allowed, but the primary public name should anchor public-facing or first-use prose.
  - Recommended handling: use `REZANOVA CLASSWIZ CALCULATOR` in page-level or first-use contexts, then allow `Calcwiz`/`Classwiz` as friendly aliases where the sentence benefits from compact wording.
- Decide whether Statistics is currently Guide-visible.
  - Evidence: Statistics Guide content and mode references exist, but `ACTIVE_CAPABILITIES` does not include `statistics-core`, so the Statistics domain is gated out of Guide home/domain listings.
  - Recommended handling: either expose `statistics-core` when the Statistics workspace is considered live, or document that Statistics Guide content is staged but intentionally hidden.
- Verify broad Calculus and Statistics claims against app-visible behavior before any public content rewrite.
  - Evidence: Guide articles mention derivative rule families, first-order partial derivatives, probability distributions, mean inference, and regression. These may be true in code, but the audit did not perform app-visible math verification.
  - Recommended handling: a future content-fix milestone should pair copy edits with targeted UI or backend checks for each public capability claim.
- Keep Equation/Calculus language bounded when adding future content.
  - Evidence: current-state records bounded Risch-Norman and Rothstein-Lazard-Rioboo-Trager posture, but Guide currently does not cover those advanced integration internals.
  - Recommended handling: if added later, use full names and bounded wording: no broad Risch completeness, no full Rothstein-Lazard-Rioboo-Trager algebraic-log promise, and no universal step-by-step engine.

## Accurate And Current
- Guide shell identity uses `REZANOVA CLASSWIZ CALCULATOR`.
- Guide content scan found no `Advanced Calc` identity claim.
- Guide content scan found no shorthand-first public wording for `OOE`, `RN`, or `LRT`.
- Guide content does not currently claim live Graphing, Spreadsheet, Notebook, website, import/export packages, external software development kit, or Surface Protocol adapters.
- Guide mode references correctly frame Graphing/sketch-based data/CAD workflows as not current Guide-owned behavior.
- Existing Guide unit/content tests pass for the current content model.

## Future Content Opportunities
- Add a short Guide article explaining Formula Viewer as the route for extremely dense current-result formulas, not as a History record feature.
- Add a user-facing `when to use Guide versus Notebook` page only after the Notebook/document model exists.
- Add teacher/community package and import/export guidance only after the import/export contracts are designed.
- Add educational platform language around authorable notebooks, computation/evidence snapshots, and learner copies without promising generated step-by-step derivations.
- Add Surface Protocol or Model Context Protocol discussion only if it remains internal-agent/developer documentation; user-facing Guide content should not expose internal protocol machinery prematurely.

## Suggested Next Gate
- `GUIDE-CONTENT-REALITY-FIX1`
  - Add missing domain article ids for `trig-period-phase` and `statistics-inference`, or explicitly gate/stage them.
  - Add parity tests for domain article lists, mode refs, related article links, and search reachability.
  - Normalize identity wording where article prose reads public-facing.
  - Refresh stale overview docs in a separate public-doc gate if needed.
