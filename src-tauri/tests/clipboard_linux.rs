#[cfg(target_os = "linux")]
#[test]
fn tauri_clipboard_preserves_canonical_text_beside_html() {
    use tauri::test::{mock_builder, mock_context, noop_assets};
    use tauri_plugin_clipboard_manager::ClipboardExt;

    let app = mock_builder()
        .plugin(tauri_plugin_clipboard_manager::init())
        .build(mock_context(noop_assets()))
        .expect("clipboard test app should build");
    let canonical = r"x^{\frac{1}{6}}";
    let html = r#"<span data-calcwiz-math-envelope="linux-audit">x^(1/6)</span>"#;

    app.clipboard()
        .write_html(html, Some(canonical))
        .expect("Linux clipboard should accept HTML with canonical alternate text");
    let readback = app
        .clipboard()
        .read_text()
        .expect("Linux clipboard should expose the canonical alternate text");

    assert_eq!(readback, canonical);
}
