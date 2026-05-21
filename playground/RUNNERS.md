# Labs Runner Policy

Labs runners are developer-only experiment bridges. They let Calcwiz inspect approved Playground experiments visually without turning Playground code into product behavior.

## Runner Rules

- Runners are allowlisted in stable metadata, not dynamically discovered from arbitrary files.
- Every runner must map to a committed Playground record and manifest.
- Every runner must declare accepted input kinds.
- Output is always experimental and developer-only.
- Runners must not use secrets, local credentials, private SSH aliases, or provider tokens.
- Runners must not execute source mirrors.
- Runners must not run remote, SSH, provider-host, or external compute jobs by default.
- Runners must not write stable product files.
- Runners must not add normal calculator history or stable result provenance.
- Release builds must not expose runner execution.

## Approved Categories

- `local-stable-probe`: checks a visual channel over existing stable behavior without changing product behavior.
- `local-playground-experiment`: runs a bounded local Playground experiment for inspection.
- `corpus-comparison`: compares approved local experiment variants against a fixed corpus or custom input.

Forbidden by default:

- `remote-experiment`
- `source-mirror-execution`
- product solver backend behavior

Any new runner category needs a separate policy update and validation before implementation.

## Current Runners

- `sym-search-planner-ordering`: `corpus-comparison`, accepts `equation` and `corpus-case`.
- `expression-baseline-probe`: `local-stable-probe`, accepts `expression`.

Both runners use `dev-only-local` execution, `no-history`, `no-source-mirror-execution`, and `no-remote-execution`.
