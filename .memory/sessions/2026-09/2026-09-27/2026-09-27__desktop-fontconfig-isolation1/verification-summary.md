# DESKTOP-FONTCONFIG-ISOLATION1 verification

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

- `cargo test --lib isolates_the_desktop_cache_home`: pass.
- A/B reproduction:
  - shared cache emptied, then Chrome 154 run once, leaving 47 `cache-9` symlinks;
  - the new debug build (`tauri build --debug --no-bundle`, isolated target dir) loaded `tauri://localhost` in that broken state, per the remote inspector target list;
  - earlier the same state reproducibly left builds at `about:blank`, and removing the symlinks restored them.
- Scope: `src-tauri/src/lib.rs` only. Codex's concurrent Integration files are untouched.
