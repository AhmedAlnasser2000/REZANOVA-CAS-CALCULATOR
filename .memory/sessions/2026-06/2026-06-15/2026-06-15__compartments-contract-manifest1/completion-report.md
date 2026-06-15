# COMPARTMENTS-CONTRACT-MANIFEST1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5
- attribution_basis: live

## Summary

`COMPARTMENTS-CONTRACT-MANIFEST1` promoted the static compartment manifest into the declarative Supercarrier contract source.

## Completed

- Added manifest-owned `ownedPaths`, `publicSeams`, `privatePaths`, `dependencyPolicies`, and `surfaceExposureCandidate` fields.
- Refactored the read-only compartment validator to derive ids, path labels, and private district checks from manifest-owned contract fields.
- Added tests for required contract fields, unknown policy/surface metadata, empty owned paths, missing OOE fact mappings, and labeled failures.
- Updated the Supercarrier compartment contracts doc with the enforcement record.

## Non-Goals Preserved

- No graphing compartment or graphing workspace was added.
- No bus, runtime registry, plugin layer, Surface Protocol, source rewrite, OOE authority change, diagnostics behavior change, solver behavior change, Display policy change, schema change, worker-host change, or routing change was introduced.
