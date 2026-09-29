# INTEGRATION-RATIONAL-ADOPTION1 — New Integration

Started 2026-09-28; updated 2026-09-29. UI, CRITICAL, root-only. User-approved implementation; no dependencies, staging, commit or push.

## Scope and prerequisite

The verified rational decision kernel and the V5 result-contract prerequisite support the first user-facing rational integration workspace. MENU → Calculus → New Integration opens an independent page tab. An older host-provided launcher catalog cannot hide this client-owned entry. Existing Calculus remains available and unchanged.

The shared MathEditor owns the entire editable source, including the integral and differential. Insert Integral wraps a selection or the entire expression and leaves the differential editable. There is no implicit integration of bare expressions or inference of their variable. Only one explicit indefinite integral with rational coefficients is executable. Multiple or nested integrals, bounds, functions and additional free variables give controlled responses while preserving the draft.

## Exact lowering and conditions

The installed Compute Engine parser runs with `form: raw`, `parseNumbers: decimal` and full string-valued numeric serialization. It never evaluates or canonicalizes the source. Finite decimal coefficients are embedded directly using BigInt rationals. Rational operations and integer powers use the owned kernel; original divisions and negative powers retain their nonzero numerator conditions even when subsequent arithmetic cancels them. Identically zero divisors and zero-to-zero powers are rejected.

Source exclusions, normalized input denominator, primitive denominator and log norms remain distinct through construction. V5 carries typed condition groups. Ordinary V2 output carries checked exclusions in deterministic source/input/primitive order, with origin labels in the workspace. No pre-normalization restriction is inferred from the final simplified denominator.

One cumulative ExecutionContext covers lowering, construction, verification, codecs and result projection. Independent public proof operations start fresh trust scopes. Source bytes are limited to 64 KiB, parser structure to 10,000 nodes/depth 64, and artifact files to 16 MiB. Existing canonical bounds remain unchanged. Oversized live drafts remain editable; requests fail explicitly.

## Execution and workspace lifecycle

The `calculus.new-integration` capability has its own `new-integration-worker-runtime` host, request protocol, runtime shell and Rust OOE plan/host descriptors. There is no main-thread computation fallback. Missing/failed workers produce canonical V2 errors. OOE remains responsible for job identity, cancellation, revision/closed-tab assessment and commit legality.

Stop and replacement runs terminate the old worker. Editing invalidates the current request. Switching tabs keeps the original job alive; only its original open tab and revision may receive its result. Closing or closing other tabs uses the existing cancellation policy and terminates removed jobs. Results never become visible success before exact verification and canonical validation finish.

Four editable finite limits initially use the benchmark profile: work 20 billion, cumulative allocation 1 trillion, integer bits 2,048 and degree 256. Counters measure activity, not available RAM. New Integration persists only its own drafts, titles and limits; restoration occurs on the next entry and never restores proof authority, jobs or starts computation. The local restore record is bounded to 64 drafts/4 MiB with an explicit persistence notice on overflow, independent of mathematical execution limits.

Tab identity uses an operation-local sequence and timestamp, not the secure-context-only `crypto.randomUUID()` API. Copy LaTeX uses the shared clipboard adapter, including plain-HTTP fallback. The reported LAN failure was reproduced and fixed; final visual acceptance follows the user's requested `npm run dev` localhost path.

## Artifacts and output

A `new-integration`, version 1 envelope holds the producing source/limit snapshot and the unchanged rational-decision version 1 structure. Exports use the producing snapshot even after edits. Imported settings are informational; active limits govern replay.

Open saved problem verifies first, then opens a new tab. Verify against current problem retains its editor, checks the saved source and decision under fresh proof state, requires the same variable and normalized integrand, and uses the current source exclusions. Failed imports preserve current drafts and prior results. Neither path trusts saved conditions, success flags or result documents.

The result displays a fresh integration constant and local-complex meaning. Long root-log terms have mathematical definitions and horizontally scrollable expressions. Conditions and verification evidence are collapsible. Copy LaTeX expands the full typed answer. Global History, Ans, To Editor, real-form conversion, symbolic parameters and retirement of old Calculus are deferred.

## Acceptance and handoff

The focused corpus includes zero/constants, improper and repeated factors, repeated residues, degree loss, the generic quintic, exact decimals/large integers, cancellation exclusions, unsupported inputs, current-versus-saved exclusions, baseline version-1 replay, tampering and limits. Worker and React hook tests cover unavailable workers, independent tabs/limits, stop/close/edit staleness and draft restoration. Playwright covers the real app, including large and narrow-screen answers and insecure-context APIs.

See the separate result-contract and adoption dossiers for actual counts, commands, screenshot review and unresolved repository-wide enforcement failures. A pre-existing unrelated Calculate authority/display-inventory failure blocks unrestricted gate signoff; it is not bypassed or repaired by widening this scope. Repository lint/build remain commit gates. The broader roadmap remains subject to change when necessary.

2026-09-29 closeout update: Claude commit `f1abd519` resolves the authority/display blockers; both checks pass. The missing New Integration worker-required runtime probe is implemented and passes. Final signoff is pending the Calculate V2 return-type compile error in that commit; see the dated dossier continuation. No integration commit or push.

Final 2026-09-29 posture: complete and verified; user authorized commit. Earlier blocker notes above are historical and resolved. See the final dossier entry for the bounded Calculate type repair, authority/display evidence and five real-app browser scenarios. No push or old Calculus retirement.
