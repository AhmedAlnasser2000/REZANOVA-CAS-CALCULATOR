# RUBI-TIER1-SECTION1-AUDIT0 Verification Summary

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Gate

- label: backend

## Evidence

- Verified the IntegrationRules mirror is registered in `playground/sources/INDEX.md` and metadata records static-only, no-execute usage.
- Verified the local mirror is ignored under `playground/sources/mirrors/**`.
- Verified the captured IntegrationRules mirror commit is `69bc5176fbf1599f10aa2e00803767969ff1ceed`.
- Listed all 49 Section 1 PDF files under `PdfFiles/1 Algebraic functions/`.
- Sampled representative Section 1 PDFs through static `pdftotext` extraction only.
- Compared Section 1 families against current direct, substitution, derivative-ratio, partial-fraction, by-parts, classifier, and expansion primitive code.

## Verification Commands

- Passed: `git -C playground/sources/mirrors/integration-rules rev-parse HEAD`
  - `69bc5176fbf1599f10aa2e00803767969ff1ceed`
- Passed: `git check-ignore -v playground/sources/mirrors/integration-rules/.probe`
  - `.gitignore:17:playground/sources/mirrors/**`
- Passed: `find 'playground/sources/mirrors/integration-rules/PdfFiles/1 Algebraic functions' -type f -name '*.pdf' | wc -l`
  - `49`
- Passed: `npm run test:source-mirrors`
- Passed: `npm run test:memory-protocol`
- Passed: `git diff --check`

## Commit Status

- Not committed; user has not requested a commit for this audit gate yet.
