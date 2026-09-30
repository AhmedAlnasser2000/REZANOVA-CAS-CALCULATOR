# INTEGRATION-RATIONAL-PRESENTATION1

Started 2026-09-29; updated 2026-09-30. UI, CRITICAL, root-only. User-approved implementation; no dependencies, staging, commit or push.

## Contract and ownership

New Integration reads validated producer-owned V2 arithmetic and V5 all-roots bindings through its canonical-derived presentation read model. It uses an integration-specific printer adapter; shared printer behavior, canonical serialization, producer documents, the exact kernel, mandatory proof requirements and version-1 artifacts are unchanged. Rendering is never mathematical authority. No display LaTeX is reparsed as proof.

Structural formatting removes zero summands/unit factors, flattens additive groups, handles negative signs, orders recognized polynomials by descending integration-variable powers then root-variable powers, groups exact integer digits with thin spaces and renders bound subscripts. Multiplication uses explicit dots to avoid adjacent-number ambiguity. Fraction clearing, algebraic cancellation, factorization, residue extraction, pole-form transformations and real-branch conversion remain separate work.

## Views, conditions and copying

Compact is the default: rational part, L_i terms, integration constant and readable q_i/G_i definitions. Full view expands every abbreviation into all-roots sums in aligned additive rows. Root constraints use readable text-sized math; long rows scroll inside the answer panel. Following the user's visual feedback, continuation plus signs use a bold glyph at 120% size with explicit spacing. The root semantics note appears once. Ordinary V2 answers use structural cleanup without a toggle. Copy LaTeX always contains the expanded answer and its cleaned retained restrictions, regardless of view. Exported derivations remain byte-identical.

The main Conditions list omits only structurally proven nonzero constants and merges only identical normalized structures while retaining every origin category. Algebraically equivalent but structurally different restrictions remain separate. Original condition entries preserve all canonical entries, including constant truths and duplicates, in nested details. Source exclusions remain independent mathematical data even after cancellation.

## Preference and failure boundaries

`formulaView: compact | full` belongs to tab surface state and the existing bounded draft save record, not IntegrationDraft, worker requests, response snapshots or artifacts. Missing/invalid preferences restore compact. New tabs and opened saved problems start compact. Source/limit edits and new results preserve the choice. Preference updates neither abort jobs nor advance request revisions. Restored drafts never restore results or trusted proof state.

Formatting validates traversal against the existing canonical bounds (10,000 nodes, depth 64, 640,000 bytes); generated notation and normalized structural keys are bounded too. It performs no BigInt arithmetic, has no access to ExecutionContext and cannot consume mathematical work. Read models are memoized per result; the full formula is built lazily. Optional formatting failures fall back to original exact leaves without replacing success. Invalid canonical documents still fail validation.

## Acceptance

Evidence is recorded in the 2026-09-30 presentation dossier. It includes seeded exact identity checks, signs/nesting, huge integer strings, bounds/fallbacks, binding and condition fixtures, all three supplied examples, repeated poles/residues, the generic quintic, V2 source exclusions, immutable response/artifact comparisons, request isolation and draft restoration. The largest supplied example reaches the pre-existing 2,048-bit integer-product limit; its presentation fixture uses an explicit 8,192-bit test profile with unchanged other limits. Application defaults remain unchanged.

Required closeout: focused core/printer/result/UI suites with two workers, incremental TypeScript, scoped lint, authority/display/isolation/compartment/OOE/memory/file-size gates, diff hygiene, and npm-dev Playwright inspection. No full suite or production build is required until a separately authorized commit.

Verified 2026-09-30: 170 core/printer/draft tests, 157 result-contract tests, 3 runtime UI tests, targeted formatting deltas and six npm-dev Playwright scenarios. See the milestone dossier for exact runs and final hygiene evidence.

## 2026-09-30 user-requested sigma spacing correction

The expanded root-sum condition now uses the normal mathematical subscript style rather than forcing full-size textstyle. This avoids an oversized operator box separating sigma from its logarithmic summand, especially for 1/(x^2+1). The complete root condition is preserved. Screen and copy continue to share the same presentation model; authority, derivations and mathematical semantics are unchanged. Real npm-run-dev Playwright evidence is in the differential-arithmetic-performance1 dossier.
