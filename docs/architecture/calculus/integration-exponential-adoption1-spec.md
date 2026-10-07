# INTEGRATION-EXPONENTIAL-ADOPTION1

- Gate kind: ui. CRITICAL, root-only; approved 2026-10-07.
- Prerequisite: [verified result projection](integration-exponential-result-contract1-spec.md).
- Implementation does not widen the integration algorithms or retire legacy Calculus.

## Exact request and execution

New Integration accepts one explicit indefinite integral. Its complete editable expression and differential remain the request. The raw Compute Engine form supplies string-valued finite literals; BigInt rational lowering never passes a literal through machine-number rounding. `exp(r)` and `e^r` are recognized explicitly, with rational arguments in the differential variable. If that variable is `e`, the bare symbol is the variable and `exp(e)` is unambiguous; `e^e` is an unsupported general-base power.

Lowering creates owned Q(x) atoms and an exclusion ledger, including divisions within arguments or integer exponents. General checked exponential normalization retains divisors, nonpositive powers, atom denominators and canceled-family conditions. Identically zero divisors and zero-to-zero powers are invalid before cancellation. Rational survivors use the rational integrator; one-family survivors use the complete exponential-rational procedure. Independent surviving families, constant extensions, nested exponentials, logarithmic input, parameters and multiple/definite integrals remain unsupported.

The existing `new-integration-worker-runtime` and `calculus.new-integration` capability remain separate and worker-required. All phases share cumulative execution accounting. Stop, supersession, edit revision invalidation, stale replies, background completion, tab closure, restored drafts and per-tab limits retain their existing ownership.

## Results and presentation

Schema 7 carries typed rational/exponential primitives or a completed non-elementarity conclusion. The Integration adapter repeats native verification and exact inverse projection. Source normalization must match the explicit decision target, either directly or through a replayed correspondence certificate.

The structural printer renders exponentials as superscripts. Compact answers may define a generator when substituting its argument adds more than 256 nodes; this is a display heuristic. Full/Copy expand generator and root-log abbreviations within independent canonical presentation bounds. Formatting caches are per result and have no mathematical authority. Traversal or output expansion failure retains the exact answer and needed definitions with an explicit notice. Copy failure is explicit and preserves verified success. Conditions retain their category/path provenance; only recognized nonzero constants are hidden and original entries remain available.

Negative cards distinguish nonconstant-residue and complete Laurent-component RDE obstructions. They provide Copy conclusion, verification details and Export derivation. Unsupported, invalid, verification-failed and resource-exhausted requests remain distinct controlled errors.

## Current saved problems

Envelope version 2 contains the producing source/limits snapshot, normalization certificate, tagged rational/exponential decision and exact source-to-native correspondence certificate. Nested private codecs are unchanged. Version 1 envelopes are explicitly unsupported; no migration/recomputation is provided.

Open saved problem lowers the saved source, replays normalization, reconstructs a fresh certified owner and replays the decision/correspondence before creating a compact-view tab. Verify against current problem independently lowers/normalizes the current source and proves equality through a joint exact exponential normalization. Full arguments matter: a constant exponent shift cannot match merely because derivatives agree. Reexport stores the current source/normalization and replayable correspondence to the retained decision. Saved replay does not invoke normalization search, integration, admission or differentiation producers. Imported limits are informational.

Source is bounded to 64 KiB and imports to 16 MiB. The existing raw-parser traversal remains explicitly bounded to 10,000 nodes and depth 64. Arithmetic remains work 20 billion, cumulative allocation 1 trillion, integer bits 2,048 and degree 256; differential/artifact bounds remain height 8, depth 64 and 100,000 nodes. No hidden family-count bound was added.

Optional export uses an explicitly scoped byte-only signal, with unconditional cleanup. Nested codec and envelope traversal remain strict. Byte overflow alone leaves the arithmetic context live and the authority-validated answer available, with export disabled. Work/allocation/integer/degree exhaustion, malformed evidence, depth/node failures and canonical-result overflow remain errors. Serialization is preceded by complete byte/node/depth inspection; JSON text is never truncated.

## Verification

Actual commands, corpus observations and real npm-dev Playwright screenshots are recorded in the [milestone dossier](../../../.memory/sessions/2026-10/2026-10-07/2026-10-07__integration-exponential-adoption1/verification-summary.md). No commit or push accompanies implementation. Broader families, real forms, reusable answers/History and legacy retirement remain separate work.

## Development launch recovery

The reported port-1420 failure was a detached Vite process, not a compilation failure. Releasing that identified same-checkout process restored npm run dev and npm run tauri:dev; the latter starts its own frontend. Recovery evidence and a fresh browser smoke are folded into the adoption dossier. Test processes were stopped, leaving the required port free; launch configuration is unchanged.
