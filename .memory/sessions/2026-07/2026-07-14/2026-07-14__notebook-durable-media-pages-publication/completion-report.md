# Notebook Durable Media, Pages, And Publication Program

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- primary_agent_family: sol
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- verified_by_agent_family: sol
- attribution_basis: live

## Program State

- `NOTEBOOK-LARGE-DOCUMENT-READINESS1` is committed as `4e275f06`.
- Notebook block count remains diagnostic rather than a product limit. The author-facing status now shows word count and the honest pre-persistence `Session only` state.
- The committed readiness floor is normal live authoring at 5,000 text-heavy blocks including 2,000 inline-math nodes. Fifty thousand blocks is a validation/import safety fixture, not a promise of equivalent live-editing latency.
- Large documents use the continuous Draft view, settled app-document synchronization, off-path metrics and validation, and viewport-aware MathLive hydration without changing the single-editor selection or undo model.
- `NOTEBOOK-PERSISTENCE-FOUNDATION1` is verified under the standing commit approval. It separates the V6 app document from a versioned library record, adds atomic Rust storage and recovery, content-addressed assets, validated ZIP64 `.cwiznb` packages, Tauri ports, and browser IndexedDB parity.
- Package import validates every declared entry before mutation and creates a fresh library identity; portable export uses the passed current revision without changing the saved record.
- Notebook autosave, save-state UI, library navigation, and File backstage remain intentionally deferred to `NOTEBOOK-DOCUMENT-LIBRARY1`, which is the next gate.
