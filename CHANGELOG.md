# Changelog

All notable user-facing and release-facing changes should be recorded here.

Calcwiz is in early preview. This changelog is intentionally concise and should not imply full CAS parity.

## v0.2.0 - 2026-06-22

### Added

- Linux-first preview release path through GitHub Actions.
- MIT license metadata for npm and Tauri package metadata.
- Public repository guardrails including CI, CODEOWNERS, PR templates, issue templates, CONTRIBUTING, and SECURITY.
- First public preview checklist and release process docs.

### Verification

- Preview releases should pass memory protocol, unit tests, UI tests, lint, frontend build, Rust `cargo check`, launch preflight, and Tauri bundle build before publication.

### Known Limitations

- Early public preview, not production-stable software.
- Linux-first packaging path; Windows and macOS remain architectural targets, not first-preview artifact requirements.
- Symbolic behavior is intentionally bounded and should not be described as full Mathematica/Maple-style CAS parity.
- Playground and external-compute experiments are not public release features.
