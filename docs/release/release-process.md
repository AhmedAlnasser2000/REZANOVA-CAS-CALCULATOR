# Release Process

This process is for early Linux-first Calcwiz preview releases.

Calcwiz preview releases are draft/prerelease by default. They are not production-stable and do not claim full CAS parity.

## Required Gates

Before publishing a preview, confirm:

```bash
npm ci
npm run test:memory-protocol
npm run test:unit
npm run test:ui
npm run lint
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run test:launch-preflight
```

For local bundle proof, also run:

```bash
npm run tauri:build
```

## Artifact-Only Workflow

Use this when testing the release workflow without creating a GitHub Release.

1. Open GitHub Actions.
2. Select `Release Linux`.
3. Run workflow.
4. Use `v0.2.0` unless intentionally testing another release tag.
5. Leave `create_github_release` unchecked.
6. Download artifacts from the completed workflow run.

## Draft Prerelease Workflow

Use this when preparing the first public preview.

```bash
git tag v0.2.0
git push origin v0.2.0
```

Then:

1. Wait for `Release Linux`.
2. Review the draft prerelease.
3. Download and smoke-test the Linux artifact.
4. Publish only after manual smoke passes.

Manual `workflow_dispatch` with `create_github_release` checked may also create a draft prerelease from the selected commit.

## Release Wording

Use honest preview wording:

- early Linux-first preview
- MIT-licensed
- not full CAS parity
- verify important mathematical results independently
- Playground and external-compute experiments are not public release features

## Rollback

If artifacts are broken, do not publish the draft release.

If a broken release was published:

1. Mark it as prerelease and add a visible warning.
2. Delete or replace broken assets.
3. If the tag is wrong:

   ```bash
   git tag -d v0.2.0
   git push origin :refs/tags/v0.2.0
   ```

4. Fix in a new PR or commit.
5. Recreate the preview after CI is green.
