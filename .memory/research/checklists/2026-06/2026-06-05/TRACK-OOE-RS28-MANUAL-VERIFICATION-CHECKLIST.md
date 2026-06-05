# TRACK-OOE-RS28 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Scope

Verify `OOE-RS28: Broader Equation Cooperative Cancellation Coverage`.

This checklist covers cooperative Equation cancellation checkpoints and async yields beyond RS26 guarded-stage boundaries and RS27 direct-symbolic worker hard-stop isolation. RS28 does not add solver capability, migrate the full Equation solver to a worker, execute solvers in Rust, expose public diagnostics UI/MCP, or change result/history schemas.

## Manual Checks

- Start a normal Equation solve and confirm completed visible output, history, and `Ans` behavior remain unchanged.
- Start a substitution-heavy Equation solve, press `Stop`, and confirm the header settles to transient stopped status.
- Confirm cancelled Equation helper work does not replace the previous visible result.
- Confirm cancelled Equation helper work does not append history.
- Confirm cancelled Equation helper work does not update `Ans`.
- Confirm cancelled Equation helper work does not clear replay substitution snapshots.
- Run another normal Equation solve after cancellation and confirm it commits normally.

## Internal/Diagnostic Checks

- Confirm active OOE jobs remain capability `equation.solve`.
- Confirm cooperative checkpoints can record helper, family, branch index, or candidate index evidence where available.
- Confirm cancelled envelopes remain terminal `cancelled` with `notApplicable` commit assessment.
- Confirm RS27 direct-symbolic worker host evidence remains intact when the terminal helper is reached.
- Confirm release asset deletions, if present locally, are unrelated and are not restored or staged by this milestone.

## Regression Boundaries

- Existing RS26 guarded-stage cancellation checkpoints remain intact.
- Existing RS27 direct-symbolic worker cancellation/fallback behavior remains intact.
- Normal Equation results remain unchanged for real, complex, inequality, approximate, and isolate routes.
- Calculate, Table, editor-analysis, and other OOE lanes remain unchanged.
