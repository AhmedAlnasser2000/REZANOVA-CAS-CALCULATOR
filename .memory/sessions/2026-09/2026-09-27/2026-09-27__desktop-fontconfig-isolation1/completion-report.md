# DESKTOP-FONTCONFIG-ISOLATION1

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

## Outcome

- Date: 2026-09-27. User-approved ("Own cache folder") desktop robustness fix found during the Graph GPU program's desktop checks. Gate type: backend. Separate commit from Graph Move 31.
- Root cause, proven by reproduction:
  - Starting from an empty `~/.cache/fontconfig`, one launch of Google Chrome 154 (which bundles a newer fontconfig with cache format 12) wrote 47 `*-le64.cache-12` files plus `cache-9`/`10`/`11` symlinks to them.
  - The system fontconfig 2.15 used by WebKitGTK reads `cache-9`. With those symlinks present, the Calcwiz webview never left `about:blank` (a blank white window).
  - Removing the `cache-9` symlinks restored loading. This explains the recurring blank desktop windows after any Chrome use.
- Fix: `run()` calls `isolate_linux_runtime_caches()` before Tauri, GTK, or WebKit start. The desktop process tree gets `XDG_CACHE_HOME=$XDG_CACHE_HOME|~/.cache/com.ahmed.calcwizdesktop/runtime`, so fontconfig, GStreamer, and shader caches are private to the app. The shared cache used by other apps is never touched. The pure `isolated_cache_home` path function is unit-tested (absolute XDG, HOME fallback, relative XDG ignored, none).
- The earlier `~/.cache/fontconfig` and `WebKitCache` removals were user-approved cleanups; the Chrome-written `cache-9` symlinks in the shared cache were removed again after verification.
