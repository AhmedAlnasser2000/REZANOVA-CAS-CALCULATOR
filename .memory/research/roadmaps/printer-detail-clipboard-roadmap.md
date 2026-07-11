# PRINTER-DETAIL-CLIPBOARD-ROADMAP0

Date: 2026-07-11
Status: approved and active; standing commit approval applies to the named milestones in this session, but no push is authorized

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

## Purpose

Define the next presentation-safety program after the accepted nine-move anti-regression closeout. This roadmap reconciles the original handoff's Printer Core, canonical detail-segment, and canonical clipboard direction with the current repository rather than assuming the older inventory is still exact.

The target is not a big-bang renderer rewrite. It is an additive path from structured solver results to deterministic canonical math, lossless internal copy/paste, and typed detail lines while preserving current workers, OOE authority, History compatibility, and visible output until each migration is accepted.

## Current Baseline

- `main` points to `2bb2f91b` (`DETAIL-SEGMENT-WORKSPACE-DOMAINS1`) and is two commits ahead of `origin/main` at `19ea2ad5` (`DETAIL-SEGMENT-SYMBOLIC-INTEGRATION1`); this session did not push. `DETAIL-SEGMENT-LINEAR-ALGEBRA1` is implemented and verified in the current approved checkpoint. No push is authorized.
- `HISTORY-REPLAY-RATCHET1` is committed as `63d21229`.
- Untracked `test-results/` is unrelated and must remain untouched.
- Production has at least 478 explicit `exactLatex:` assignments across 173 files and 61 explicit `resultLatex:` assignments. These are lower bounds because shorthand and indirect builders are not counted.
- Raw LaTeX-command tokens are too broad for a trustworthy global grep floor: 6,687 production matches also include input parsing, Guide content, keyboard definitions, and other non-result strings.
- `DisplayOutcome` remains LaTeX-first. `MathDocument.mathJson` is optional `unknown`, and `EvaluateResponse.normalizedMathJson` is not consistently the answer tree; some solve paths use it for the input equation while keeping answer roots separately.
- `DisplayOutcome` crosses worker `postMessage` boundaries. Any structured math payload must be plain, bounded, structured-clone-safe data and must not carry boxed Compute Engine objects.
- Equation already has a producer-side presentation IR in `src/lib/equation/presentation/finite-roots.ts`. A new printer must reuse that seam instead of creating a competing Equation renderer.
- Display already has substantial printer-like behavior in `notation/symbolic-display.ts`, `notation/math-notation.ts`, `notation/numeric-output.ts`, and domain serializers such as Linear Algebra exact matrix formatting.
- Detail rendering already prefers `lineParts` and has one shared `DetailLineContent` renderer. The remaining problem is producer adoption and render-time string inference, not the absence of a renderer.
- Static production counts show 18 direct `lineParts:` assignments, 115 `lineKind`/`lineKinds` assignments, and 483 `detailSections:` assignments. Shared `mixedDetailSection()` adds more correct producers, but the legacy surface remains much larger.
- Clipboard math writes are mostly centralized, not scattered across workspaces. Direct production Clipboard API use currently appears in `AppMain.tsx`, `OoeDiagnosticsPanel.tsx`, and the dormant/extracted `expressionRouting.ts`; `MathEditor` reads paste-event `DataTransfer` text.
- A real Chromium check confirmed plain-text mode renders and copies `x^(1/6)` while the canonical result remains `x^{\frac{1}{6}}`. The current copy payload therefore follows visible notation and loses the hidden canonical form.
- Local secure-context Chromium supports `ClipboardItem`, `navigator.clipboard.read/write`, and the custom format `web application/x-calcwiz-math+json` alongside `text/plain` and `text/html`. Tauri Linux WebView support remains unverified and needs a real app capability gate.
- AppMain is at 3,356 lines against a 3,357-line ratchet, and `DisplayResultBlocks.tsx` is at 898 lines against the default 900-line cap. Clipboard and detail work must extract ownership rather than grow either file.

## What Behavioral Ratchets 5-9 Provide

### Move 5: `FEATURE-PROBE-REGISTRY1`

- Exhaustively classifies all 24 live `Settings` keys and ties each to executable native, UI, or persistence evidence.
- Protects angle units, exact/decimal behavior, notation, precision, scaling, contrast, language, History privacy, and calculator-memory behavior while presentation code changes.
- Limit: classification does not make every setting a printer setting. Angle, domain, Complex form, and `outputStyle` participate in computation or result selection and must not be reduced to render-time styling.

### Move 6: `GOLDEN-CORPUS-REGISTRY1`

- Supplies 43 deterministic direct-native executions across all nine computational workspaces.
- Gives printer, detail, and clipboard changes one fast cross-workspace comparison surface.
- Limit: coverage is intentionally shallow outside Calculate and Equation. It is a migration tripwire, not proof that a new serializer handles every domain family.

### Move 7: `PRINT-HYGIENE-BASELINE1`

- Started with 176 accepted mathematical fragments from the 43 golden executions and hard-fails bounded malformed markers. `DISPLAY-MATH-PAYLOAD1` adds nine accepted canonical-payload fragments, bringing the current manifest to 185 without changing primary output.
- The current manifest includes 43 whole-line math details and 29 typed math parts, preserving a before-printer snapshot.
- Limit: it intentionally excludes prose and therefore does not detect math hidden inside plain detail strings. It is evidence and hygiene, not a printer or detail-segment ratchet.

### Move 8: `WORKSPACE-FRESHNESS-REPORT1`

- Keeps weekly real-browser evidence visible for all nine workspaces and publishes deterministic freshness artifacts.
- Gives the new arcs an operational warning when a workspace has not been exercised recently.
- Limit: freshness is warning-only and never proves correctness.

### Move 9: `HISTORY-REPLAY-RATCHET1`

- Freezes launch-time `Ans` plus computation and print settings for new History tickets and supplies 100 sanitized deterministic fixtures.
- Hard-compares identity/cardinality and already records normalized LaTeX drift as report-only evidence. Printer migrations can promote only migrated fixture families to hard LaTeX expectations.
- Limit: visible History replay still uses saved LaTeX/result data, and History does not yet store canonical result MathJSON. The V1 replay snapshot is a deterministic harness foundation, not the final structured-History contract.

## Locked Boundaries

- OOE remains launch, host, cancellation, stale, commit/drop, diagnostics, and History-ticket authority. Printer and Clipboard work must not become execution authorities.
- Display remains a renderer and display-policy owner, not a CAS. Structured math should originate with producers; render-time guessing must fail closed. [ad-hoc note]
- Preserve full canonical exact LaTeX for Copy Result, To Editor, History, replay, stored output, and exact semantics even when visible rendering is transformed or compacted. [ad-hoc note]
- Printer-owned settings are presentation-only: parentheses, serializer style, roots-versus-powers display, plain-text export, and numeric text formatting.
- Angle units, domain intent, Equation answer mode, Complex exact form where it changes branch construction, and exact/decimal result selection remain producer/runtime inputs.
- Do not force Matrix, Vector, Table, Statistics, or Geometry through scalar MathJSON when their native structured values are the more truthful source.
- Keep MathJSON internal and explicitly excluded from Surface Protocol DTOs.
- No broad LaTeX-to-MathJSON reparsing migration. Existing LaTeX remains a compatibility fallback until its producer has a trustworthy structured source.
- Do not remove legacy History parsing. Old `lines`, `lineKind`, `lineKinds`, and string-only results remain loadable.
- No printer redesign may alter mathematical behavior, route selection, worker topology, capability IDs, History ticket behavior, or OOE legality.

## Arc A: Presentation Printer

### A1. `PRINTER-SERIALIZATION-CONTRACT1`

Status: committed as `f4cb2de2` on `2026-07-11`.

- Add a pure internal printer district under `src/lib/display/printer/`.
- Define a strict serializable MathJSON type or validated Compute Engine `MathJsonExpression` boundary; do not use `unknown` as the durable contract.
- Wrap Compute Engine `toLatex()` with explicit serializer options and reuse the existing Symbolic Display and Equation finite-root presentation behavior.
- Keep scalar-expression precedence, signs, grouping, roots/powers, fractions, functions, and plain-text conversion in one policy surface.
- Treat domain serializers as adapters. Linear Algebra exact matrices/vectors and other structured domains keep their native value types.
- Pass formatting context explicitly. Do not read the mutable global numeric-output setting inside the pure printer.
- Support `canonical-latex`, `visible-latex`, and `plain-text` targets. Canonical output must be settings-independent except for producer-selected mathematical form.
- Add bounded parse-back and idempotence properties for the supported scalar-expression subset. Unsupported or non-injective forms fail closed to tested compatibility LaTeX.
- Require output parity against all 43 golden cases and relevant 100 replay fixtures before any visible difference is accepted.

Implemented contract: validated plain MathJSON is capped at 2,000 nodes, 64 levels, and 320,000 serialized bytes; structural Compute Engine serialization uses explicit options; compatibility output remains byte-stable until a producer opts into the pedagogical profile; and typed adapters do not create a runtime registry or merge domain ownership.

### A2. `DISPLAY-MATH-PAYLOAD1`

Status: committed as `93e9b40e` on `2026-07-11`.

- Add one optional internal canonical math payload carrying `canonicalLatex` plus validated optional MathJSON.
- Keep every existing LaTeX field additive and authoritative as compatibility fallback during migration.
- Do not forward `normalizedMathJson` blindly. Audit each route to prove the node represents the displayed answer rather than the input or an intermediate.
- First dual-write candidates: Calculate simplify/evaluate paths that already retain the exact answer node, and Equation finite roots already using the presentation IR.
- Bound node count, depth, and serialized bytes. Omit the node and retain canonical LaTeX when the limit is exceeded.
- Verify structured clone through worker and fallback hosts, diagnostics meaning, result-size behavior, History commit parity, and Surface Protocol exclusion.

Implemented contract: `DisplayMathPayloadV1` carries versioned canonical LaTeX plus optional validated MathJSON. Calculate dual-writes only retained exact answer nodes, including pinned inverse-trig angle nodes; Equation dual-writes node-complete finite-root IR and invalidates the payload on target rewrites. The 43-case golden ratchet enforces canonical/exact parity. History persistence and Surface Protocol deliberately omit the payload, and no visible output changed.

### A3. `PRINTER-MIGRATION-RATCHET1`

Status: committed as `1b83f897` on `2026-07-11`.

- Build the ratchet with the TypeScript compiler API over known output properties/builders rather than a repository-wide raw-string grep.
- Classify expression output, structured-domain output, presentation templates, plain prose, input syntax, and reference content separately.
- Ratchet result-path authored LaTeX per domain; floors may only decrease.
- Permit narrow registered compatibility fallbacks with owner and rationale. Do not grant whole-file exemptions.
- Add the gate to local aggregate CI and relevant seam lanes without weakening baseline tests.

Implemented contract: the TypeScript-compiler-API inventory currently classifies 515 production result paths as 257 owned compatibility fallbacks, 18 migrated dual writes, 237 forwarders, one nonproducer History schema slot, and two absent optional slots. The accepted baseline fingerprints source expressions, pins per-lane and per-registration floors, rejects stale or new unclassified paths, and keeps input syntax, presentation math, prose, reference content, and canonical-printer internals outside result debt. CI and shared-configuration seam plans now add this ratchet without removing any baseline gate.

### A4. `PRINT-PROFILES1` And Domain Migration

Status: active. The mandatory contract-evidence sweep passed on `2026-07-11`; profiles are committed through Symbolic Limits at `1c67132f`, and `PRINT-PROFILE-SYMBOLIC-INTEGRATION1` is implemented and verified and is entering its approved commit checkpoint.

- Introduce profiles only where migrations prove a real policy difference; avoid speculative per-domain switches.
- Cover all nine workspaces, including Geometry and Table, rather than the older six-profile sketch.
- Migrate one producer family per verified milestone. Start with existing Equation presentation-IR consumers and Calculate exact answers, then prioritize high-density Symbolic Engine, Calculus, Trigonometry, and Linear Algebra result builders.
- Use accepted snapshot diffs, real Playwright output, parse-back where applicable, and per-domain replay fixtures.
- Keep large Equation and Calculus benchmark ledgers separate from the fast migration corpus while sampling them for printer evidence.

`PRINT-PROFILE-CALCULATE-EQUATION1` moves the final two Calculate numeric result paths from compatibility debt to validated answer-node dual writes, reducing the Calculate fallback floor to zero. Proven Calculate trees and Equation finite-root IR now enter `pedagogical-v1` through explicit domain adapters, preserving canonical/exact parity and structured-clone safety. Calculate's 20 replay fixtures hard-compare normalized LaTeX; the other 80 remain report-only until their workspace slices. Structural candidates `(1+x)(1+x)`, a reordered general-power derivative, and `\sqrt{1/(-x^2+1)}` were rejected because they were less readable than the established producer output. The accepted visible-output ledger therefore remains empty for this slice.

`PRINT-PROFILE-EQUATION-ADVANCED1` routes all 76 remaining Equation-owned result producers through `profileEquationResult()`, an explicit `pedagogical-v1` domain adapter that preserves existing canonical serializers. The TypeScript-AST ratchet now recognizes wrappers around each authored object path, reducing Equation compatibility debt to zero and raising Equation migrated paths to 86. All 25 Equation replay fixtures hard-compare normalized LaTeX, bringing the hard total to 45. Broad exact, numeric, parameterized, composition, target, Complex, worker, golden, print-hygiene, and browser evidence passed with no accepted visible drift.

`PRINT-PROFILE-SYMBOLIC-LIMITS1` routes all 35 proof-aware Limits result producers through `profileSymbolicLimitsResult()` without changing exact conclusions, infinity signs, conditional cases, or method readback. Symbolic Limits compatibility debt reaches zero; the global floor is 144 compatibility, 132 migrated, and 240 forwarded. Five Calculus limit replay fixtures become hard, bringing hard coverage to 50/100 while unrelated Calculus families remain report-only. Focused Limits, golden, print-hygiene, replay, and real Calculus browser evidence pass with no accepted visible drift.

`PRINT-PROFILE-SYMBOLIC-INTEGRATION1` routes 31 genuinely Integration-owned result producers through `profileSymbolicIntegrationResult()` while preserving exact antiderivatives, constants, certificates, method evidence, and controlled stops. A live diff audit found that the old exact-file registration had incorrectly counted two generic factor/derivative outcomes and one partial-derivative resolution as Integration; those three now use a separate zero-debt `profileSymbolicCoreResult()` lane. The global floor is 110 compatibility, 166 migrated, and 240 forwarded. Six Calculus integral fixtures become hard, bringing hard coverage to 56/100. Integration-focused coverage passed 104 files and 714 tests, and fresh Chromium screenshots show readable `arctan(x)+C` and `2xy` cards without accepted visible drift.

### A5. `DISPLAY-CONTRACT-INVERSION1` Later Gate

- Do not schedule inversion until the migrated result-path floor is near zero, all nine domains have structured adapters, Clipboard is canonical, detail math is typed, and History has a structured-result decision.
- The likely end state is producer-side canonical printing plus optional display-time presentation variants, not Display-side algebra or arbitrary reparsing.
- Removal of compatibility fields requires a separate audit and user approval.

## Arc B: Canonical Clipboard

This arc should begin after A1 and the first A2 payload, before broad detail migration. The app has no detail-line copy action today, so Clipboard does not depend on completion of Arc C.

### B0. `CLIPBOARD-CAPABILITY-AUDIT0`

Status: passed as the `CLIPBOARD-CANONICAL1` entry gate on `2026-07-11`.

- Verify multi-format read/write in real Chromium and the packaged/dev Tauri Linux WebView.
- Record support for custom web MIME, `text/html`, permissions, programmatic paste, native paste events, and writeText/readText fallback.
- Decide the `text/plain` fallback policy before implementation.

Verified matrix: real Chromium reads and writes the custom web MIME, HTML, and plain text in one item. The live Tauri Linux WebView writes HTML plus exact UTF-8 text through the official plugin; an external X11 readback returned the canonical text and advertised `text/html` plus UTF-8 text targets, with no arbitrary custom MIME. The capability file grants only read-text, write-text, and write-html.

### B1. `CLIPBOARD-CANONICAL1`

Status: committed as `586795b0` on `2026-07-11`.

- Add `src/lib/clipboard/` with pure envelope encode/decode plus environment adapters.
- Use a versioned envelope such as `web application/x-calcwiz-math+json`, mirrored in inert `text/html` metadata where supported.
- Carry canonical LaTeX, optional bounded validated MathJSON, source metadata, and optional approximate/plain presentation. Source metadata is descriptive, never trusted authority.
- Treat clipboard data as untrusted input: schema-validate, cap bytes/depth/nodes, reject boxed objects and malformed HTML metadata, and fall back to canonicalized text.
- Always write `text/plain`. Multi-format-capable environments may let it follow visible notation only while the hidden envelope succeeds; fallback-only environments should preserve canonical LaTeX unless the user explicitly chooses lossy external text.
- Keep current success/block notices and `execCommand` fallback behavior where still needed.

Implemented contract: `MathClipboardEnvelopeV1` has exact schema/version validation, canonical LaTeX, optional bounded validated MathJSON, and coarse surface/mode metadata only. Canonical text is capped at 320,000 bytes and the whole envelope at 640,000 bytes. Browser Display copy writes custom MIME, escaped HTML with a base64url envelope attribute, and visible text together; rich-write failure falls back to canonical text. Tauri uses the official v2 plugin, writes the HTML envelope with canonical alternate text, and cannot claim HTML/custom reads. Malformed, mismatched, oversized, text-only, HTML-only, permission-blocked, native-event, and Linux fallback paths are pinned. AppMain shrank to 3,348 lines and its file-size cap lowered in the same change.

### B2. `CLIPBOARD-PIPELINE-RATCHET1`

Status: committed as `f58cf1c0` on `2026-07-11`.

- Route Display, Formula Viewer, full History, Guide/workspace expression copy, diagnostics prose, app Paste, and `MathEditor` paste events through shared math/text APIs.
- Keep existing prop callbacks initially; do not bundle a broad hook/prop-drilling refactor unless required by the AppMain file-size gate.
- Resolve or remove the unused duplicate `expressionRouting.ts` paste implementation rather than maintaining two authorities.
- Paste priority: validated envelope MathJSON -> envelope canonical LaTeX -> `text/plain` through existing canonicalization -> workspace-specific naturalization.
- Preserve Matrix/Vector paste naturalization and every workspace's current editor routing.
- Ratchet direct `navigator.clipboard` use outside the shared adapter to zero. Event `DataTransfer` access must delegate decoding to the shared module.
- Pin plain-text notation Copy Result -> same-editor Paste for the current `x^{\frac{1}{6}}` loss case, cross-workspace History copy/paste, malformed/oversized envelope fallback, and all eligible golden/canary answers.

Implemented contract: Display, Formula Viewer, History, Guide/workspace expressions, diagnostics, programmatic Paste, and native `MathEditor` paste now route through the shared Clipboard district. `expressionRouting.ts` is the only app-level paste router; validated rich envelopes preserve canonical LaTeX without reparsing, while text-only inputs retain existing per-workspace canonicalization and Matrix/Vector naturalization. A source audit rejects direct production Clipboard API, Tauri-plugin, legacy copy-command, or raw paste-event access outside `src/lib/clipboard/`; its current floor is zero. AppMain shrank to 3,306 lines and its cap lowered to match.

## Arc C: Canonical Detail Segments

### C1. `DETAIL-SEGMENT-CONTRACT1`

Status: committed as `5c82758b` on `2026-07-11`.

- Keep `lineParts` as the canonical producer shape because the schema, persistence parser, Formula Viewer, and shared renderer already support it.
- Extract `DetailLineContent` from the near-cap `DisplayResultBlocks.tsx` into a focused shared component; do not introduce a second renderer.
- Add builders that dual-write legacy `lines` for compatibility while making typed parts the producer source.
- Keep detail math parts canonical-LaTeX-only in this program. Structured detail MathJSON belongs with the later structured-History design.
- Add a separate structured shape for `solveSummaryText` or stop classifying it through render-time string inference.
- Mark `lines`, `lineKind`, and `lineKinds` as legacy producer inputs without breaking old History entries.

Implemented contract: `DetailLineContent` is a focused shared renderer used by the main Display and Formula Viewer. Nonempty typed parts take precedence, then an explicit math/prose declaration, then legacy inference only for undeclared compatibility data. Mixed-detail and solve-summary builders derive legacy strings from typed parts; optional `solveSummaryParts` remains additive and is included in print hygiene without entering History or Surface Protocol. Empty policy placeholders do not masquerade as typed rows. `DisplayResultBlocks.tsx` shrank from 898 to 842 lines with no file-size cap increase.

### C2. `DETAIL-SEGMENT-MIGRATION-RATCHET1`

Status: complete. Equation core is committed as `6e2182bf`, Equation parameterized as `97ec9ca2`, Symbolic Limits as `1325782c`, Symbolic Integration as `19ea2ad5`, Calculus as `27305475`, Workspace Domains as `2bb2f91b`, Linear Algebra as `ca7d8179`, and compatibility closeout as `536d1f07`.

1. `DETAIL-SEGMENT-EQUATION-CORE1`.
2. `DETAIL-SEGMENT-EQUATION-PARAMETERIZED1`.
3. `DETAIL-SEGMENT-SYMBOLIC-LIMITS1`.
4. `DETAIL-SEGMENT-SYMBOLIC-INTEGRATION1`.
5. `DETAIL-SEGMENT-CALCULUS1`.
6. `DETAIL-SEGMENT-WORKSPACE-DOMAINS1`.
7. `DETAIL-SEGMENT-LINEAR-ALGEBRA1`.
8. `DETAIL-SEGMENT-COMPAT-CLOSEOUT1`.

`DETAIL-SEGMENT-EQUATION-CORE1` establishes the TypeScript-compiler-API migration ratchet over contextual live `DisplayDetailSection` producers. The accepted baseline inventories 349 producers: 274 declared and 75 fingerprinted undeclared producers reserved for later named slices. Equation core moved from 119 undeclared object producers to zero, with all 121 registered core producers declared. Plain rows now state `lineKind: 'text'`; the existing mixed `Factorization` and `Relation tested` rows use typed parts so their current mixed rendering remains unchanged. Stable fingerprints reject replacement debt, lane floors may not increase, and baseline updates require explicit acceptance plus a durable reason. CI, Linux release, aggregate gates, and relevant seam plans execute the ratchet.

`DETAIL-SEGMENT-EQUATION-PARAMETERIZED1` widens the AST inventory to established `buildParameterizedDetailSections()` calls instead of treating the builder as invisible. The accepted baseline now inventories 383 producers: 329 declared and 54 fingerprinted undeclared producers. Equation parameterized has 73 declared and zero undeclared producers after 21 object migrations plus 34 inventoried builder calls; Equation core now has 123 declared and zero undeclared producers. Parameterized normalization no longer invokes legacy text inference, explicit prose remains prose, and selected-target generated equations and formula branches are producer-owned typed parts. Compatibility `lines`, wording, mathematics, workers, fallbacks, History, and OOE behavior remain unchanged.

`DETAIL-SEGMENT-SYMBOLIC-LIMITS1` replaces the misleading one-producer Limits count with 46 governed typed producers. The accepted inventory is now 433 producers: 379 declared and 54 fingerprinted undeclared producers. Finite rules, local equivalents, recursive leading terms, indeterminate transforms, L'Hospital, and rewrite/cancellation now construct explicit typed rows; compatibility lines are derived from those rows. A source audit forbids legacy string inference helpers in Symbolic Limits routes. The legacy string classifier remains only for Calculus-owned callers until `DETAIL-SEGMENT-CALCULUS1`.

`DETAIL-SEGMENT-SYMBOLIC-INTEGRATION1` adds one producer-owned Integration detail builder and removes all 25 undeclared Symbolic Integration producers. The accepted inventory is now 434 producers: 405 declared and 29 fingerprinted undeclared producers. Normal-form and trig rewrites, integration by parts, substitutions, polynomial division, genus-1 evidence, and non-elementary certificates now declare math or prose intent explicitly while deriving unchanged compatibility lines. The print-hygiene manifest intentionally grows from 185 to 190 fragments because five existing integration constants are now typed mathematical evidence; visible wording and mathematical results remain unchanged.

`DETAIL-SEGMENT-CALCULUS1` removes all 15 accepted Calculus debts and governs 33 typed producers. The accepted inventory is now 445 producers: 431 declared and 14 fingerprinted undeclared producers. Calculus no longer calls the legacy Limits string-inference helpers; variable checks, route diagnostics, finite/infinite limit conclusions, integral methods and interval safety, improper-integral stops, and Laplace readback declare intent directly. Structured one-sided domain subjects preserve prior math evidence without regex inference. The print-hygiene manifest grows additively from 190 to 195 fragments, with compatibility lines and mathematical outcomes unchanged.

`DETAIL-SEGMENT-WORKSPACE-DOMAINS1` removes all three accepted workspace-domain debts while keeping the inventory at 445 producers: 434 declared and 11 fingerprinted undeclared producers. Statistics regression quality derives unchanged compatibility lines from typed SSE, MSE, and residual-standard-error math parts; correlation quality and Table cancellation explicitly declare their existing prose intent. The print-hygiene manifest grows additively from 195 to 196 fragments because the golden regression case exposes the existing SSE value. Quality Summary remains collapsed by default, and expanded Chromium evidence is readable without overlap or overflow.

`DETAIL-SEGMENT-LINEAR-ALGEBRA1` removes the final accepted Linear Algebra debt while keeping the inventory at 445 producers: 435 declared and 10 fingerprinted undeclared producers. All 74 Matrix/Vector detail producers are now declared. The LU zero-pivot stop explicitly remains prose; its exact error, proof wording, collapse behavior, mathematical result, runtime hosts, and independent Matrix/Vector topology are unchanged. Expanded Chromium evidence shows both proof lines without overlap or a math renderer.

`DETAIL-SEGMENT-COMPAT-CLOSEOUT1` removes the final 10 accepted debts while keeping the inventory at 445 producers: all 445 are declared and no undeclared live fingerprint remains. Structured absolute-value, domain/range, assumptions, variable-memory, solve-note, trust, and partial-fraction details now own typed math or explicit prose while deriving unchanged compatibility lines. Seven existing domain and variable symbols raise print-hygiene evidence from 196 to 203 fragments. Live producers no longer need renderer inference; old or snapshot-less History retains compatibility inference without storage migration. Chromium inspected stored-value replay, absolute-value reduction, and radical-domain facts with preserved collapse behavior and no overlap or overflow.

- Establish an AST-aware source floor plus runtime corpus evidence for plain detail lines containing math-looking content.
- Migrate the known dense Equation inequality/complex/numeric paths, Calculus shared/integral details, then at least two representative detail surfaces per workspace.
- Prefer producer-owned parts. `inferDetailLinePartsFromText()` remains compatibility-only and must trend toward zero live use.
- Add one real-browser typed-math detail assertion per workspace without necessarily enlarging the fixed 19-case canary count.
- Preserve prose wording, pedagogical parentheses, card order, collapse behavior, Formula Viewer behavior, and History serialization.

### C3. `DETAIL-SEGMENT-COMPAT-CLOSEOUT1`

Status: committed as `536d1f07` on `2026-07-11`.

- Audit live producers, stored-History compatibility, Formula Viewer, and solve summaries.
- Stop new legacy detail production once the floor reaches zero.
- Retain load/render compatibility for historical entries unless a separately approved storage migration safely normalizes them.

## Later Structured History Gate

`HISTORY-STRUCTURED-RESULT2` is a later dependency of full Display inversion, not part of initial Printer Core.

- Keep `HistoryReplaySnapshotV1` unchanged and visible replay behavior unchanged during A1-C2.
- Later add optional canonical result math to new records while retaining stored LaTeX fallback.
- Decide whether visible History defaults to frozen launch-time presentation or current presentation preferences. The automated harness can use V1 snapshots without silently changing the product.
- Never invent structured results for legacy entries by reparsing arbitrary old strings.

## Cross-Arc Sequence

1. Commit this accepted roadmap and its existing memory/session slice as `PRINTER-DETAIL-CLIPBOARD-ROADMAP0`.
2. `PRINTER-SERIALIZATION-CONTRACT1`.
3. `DISPLAY-MATH-PAYLOAD1`.
4. `PRINTER-MIGRATION-RATCHET1`.
5. `CLIPBOARD-CAPABILITY-AUDIT0` as the entry gate for `CLIPBOARD-CANONICAL1`.
6. `CLIPBOARD-PIPELINE-RATCHET1`.
7. `DETAIL-SEGMENT-CONTRACT1`.
8. Risk-sliced detail migration through the eight named `DETAIL-SEGMENT-*1` commits recorded under C2.
9. Run the contract-review evidence checkpoint across Clipboard, details, Formula Viewer, legacy History, overflow, and fallbacks without pausing for intermediate user acceptance.
10. Continue directly into the risk-sliced internal printer-profile migration across all nine workspaces, followed by one accumulated visible-output review with the user.
11. Close this program, then create a separate structured-History and Display-inversion roadmap from measured migration floors.

## Verification Contract

- Every implementation milestone runs focused tests, TypeScript, build, lint, file-size, memory protocol, relevant OOE/compartment/Surface boundaries, and `git diff --check`.
- Printer changes run golden, print-hygiene, feature-probe, and relevant History replay gates. LaTeX drift becomes hard-fail only for explicitly migrated fixture families.
- Clipboard changes run browser permission/capability evidence, native event paste, programmatic paste, malformed/oversized payload, fallback-only, and real Tauri Linux checks.
- Detail changes visually inspect typed math, prose, collapse behavior, Formula Viewer, History replay, and overflow across all nine workspaces.
- Preserve worker/fallback parity, capability identity, request shape, stale/cancel behavior, commit legality, diagnostics meaning, and History ticket behavior.
- One verified commit per named implementation milestone. The user granted standing approval for these named commits during this session; scope-changing commits still require renewed approval. No push is implied or authorized.

## Locked User Decisions

1. `text/plain` uses the hybrid policy: visible notation only when a lossless envelope succeeds, canonical LaTeX on fallback-only hosts.
2. Visible History behavior stays unchanged. Structured History and `DISPLAY-CONTRACT-INVERSION1` receive a separate later roadmap.
3. Canonical Clipboard precedes broad detail migration after the printer substrate.
4. Canonical truth is MathJSON or the native domain value, while the producer-owned printer derives canonical LaTeX and Display owns presentation-only variants.
5. Printer profiles are internal `compatibility-v1` and `pedagogical-v1` contracts, not a new Settings control.
6. The pedagogical profile may normalize presentation such as subtraction and precedence-driven parentheses, but may not simplify, reorder, combine, or change the producer tree.
7. Every live detail line must be typed or explicitly declared prose-only. Detail parts remain canonical-LaTeX-only in this program.
8. Equation and Symbolic migrations use verified risk slices. At the user's `2026-07-11` direction, the contract-review evidence remains mandatory but its intermediate user pause is removed; visible printer changes accumulate for one final user review.

## Explicit Non-Goals

- No Statistics guided-control changes.
- No Matrix/Vector capability expansion.
- No Graphing, Surface host, plugin, remote compute, SDK, or broad event-bus work.
- No Tauri/Rust MathJSON migration.
- No all-at-once raw-LaTeX rewrite.
- No new detail-line copy feature merely to satisfy a hypothetical round-trip test.
- No visual redesign, printer-driven solver changes, or broad formatting cleanup.
