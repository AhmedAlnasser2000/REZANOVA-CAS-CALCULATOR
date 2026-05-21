# Source Mirror Security

Source mirrors are untrusted research context. They are not dependencies, submodules, product backends, or runtime authorities.

## Security Tiers

- `registered-only`: metadata exists, but no local clone is approved for durable work yet.
- `static-only`: a local clone may be read with static file and git inspection only.
- `sandboxed-execution`: execution may happen only in an explicit sandbox with written rules and no product integration.
- `approved-executable-research`: rare executable research with a named review owner, written risk note, and bounded commands.

Current mirrors must stay at `registered-only` or `static-only` unless a later milestone explicitly raises the tier.

## Required Metadata

Each `metadata/*.yaml` file records:

- the security tier
- execution policy
- submodule policy
- dependency install policy
- network policy
- secrets policy
- allowed commands
- forbidden commands
- last security review date
- security notes

Validation rejects missing fields, unknown policy values, tracked mirror payloads, and stable `src/` references to `playground/sources`.

## Default Rules

- Do not execute source mirrors by default.
- Do not recurse into upstream submodules by default.
- Do not install mirror dependencies in the Calcwiz workspace.
- Do not provide secrets, tokens, local credentials, or private SSH aliases to source mirrors.
- Do not allow Labs runners to execute source mirrors.
- Do not copy source-mirror code into Calcwiz without a separate license/source review.

## Static Review Commands

For `static-only` mirrors, allowed activity is limited to static inspection, such as:

```bash
git status
git log --oneline
git grep <pattern>
rg <pattern> playground/sources/mirrors/<mirror-id>/
sed -n '1,120p' playground/sources/mirrors/<mirror-id>/<file>
```

Forbidden activity includes builds, tests, package installs, arbitrary scripts, or any command that treats a mirror as executable product code.
