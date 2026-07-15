use super::{
    assets::sha256_hex,
    model::{
        migrate_notebook_document, NotebookAssetMetadataV1, NotebookPackageManifestV1,
        NotebookStoredRecordV1, NotebookVersionSnapshotV1, DOCUMENT_PATH, PACKAGE_KIND,
        PACKAGE_MANIFEST_VERSION,
    },
    with_export_extension, NotebookStorage,
};
use std::{
    fs,
    io::{Cursor, Read, Write},
    net::TcpStream,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use zip::{write::SimpleFileOptions, CompressionMethod, ZipWriter};

fn unique_storage(label: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time should be valid")
        .as_nanos();
    std::env::temp_dir().join(format!(
        "calcwiz-notebook-{label}-{}-{nonce}",
        std::process::id()
    ))
}

fn document(title: &str) -> serde_json::Value {
    serde_json::json!({
        "version": 13,
        "id": "document.storage.1",
        "title": title,
        "createdAt": "2026-07-14T00:00:00.000Z",
        "updatedAt": "2026-07-14T00:00:00.000Z",
        "selectedNodeId": "paragraph.storage.1",
        "content": [{
            "type": "paragraph",
            "id": "paragraph.storage.1",
            "content": [{"type": "text", "text": "Durable notebook"}]
        }],
        "pageSetup": {
            "paperSize": "a4",
            "orientation": "portrait",
            "marginsPt": { "top": 72, "right": 72, "bottom": 72, "left": 72 }
        },
        "headerFooter": {
            "defaultHeader": {
                "left": [{ "type": "paragraph" }],
                "center": [{ "type": "paragraph" }],
                "right": [{ "type": "paragraph" }]
            },
            "defaultFooter": {
                "left": [{ "type": "paragraph" }],
                "center": [{ "type": "paragraph" }],
                "right": [{ "type": "paragraph" }]
            },
            "firstPageHeader": {
                "left": [{ "type": "paragraph" }],
                "center": [{ "type": "paragraph" }],
                "right": [{ "type": "paragraph" }]
            },
            "firstPageFooter": {
                "left": [{ "type": "paragraph" }],
                "center": [{ "type": "paragraph" }],
                "right": [{ "type": "paragraph" }]
            },
            "differentFirstPage": false,
            "pageNumberStart": 1
        }
    })
}

fn legacy_document(title: &str) -> serde_json::Value {
    let mut legacy = document(title);
    legacy["version"] = 10.into();
    legacy["headerFooter"] = serde_json::json!({
        "headerText": "",
        "footerText": "",
        "differentFirstPage": false,
        "pageNumbering": { "enabled": false, "position": "center", "startAt": 1 }
    });
    legacy
}

fn legacy_record(
    library_id: &str,
    revision: u64,
    title: &str,
    schema: u64,
) -> NotebookStoredRecordV1 {
    let mut record = record(library_id, revision, title);
    record.document = legacy_document(title);
    record.document["version"] = schema.into();
    if schema < 8 {
        record
            .document
            .as_object_mut()
            .expect("document should be an object")
            .remove("pageSetup");
        record
            .document
            .as_object_mut()
            .expect("document should be an object")
            .remove("headerFooter");
    }
    record
}

fn record(library_id: &str, revision: u64, title: &str) -> NotebookStoredRecordV1 {
    NotebookStoredRecordV1 {
        version: 1,
        library_id: library_id.into(),
        revision,
        saved_at: format!("2026-07-14T00:00:0{revision}.000Z"),
        document: document(title),
        asset_ids: Vec::new(),
    }
}

fn safe_svg() -> Vec<u8> {
    br##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><linearGradient id="paint"><stop offset="0"/></linearGradient></defs><rect width="10" height="10" fill="url(#paint)"/></svg>"##.to_vec()
}

fn png_with_dimensions(width: u32, height: u32) -> Vec<u8> {
    let mut bytes = b"\x89PNG\r\n\x1a\n".to_vec();
    bytes.extend_from_slice(&13u32.to_be_bytes());
    bytes.extend_from_slice(b"IHDR");
    bytes.extend_from_slice(&width.to_be_bytes());
    bytes.extend_from_slice(&height.to_be_bytes());
    bytes.extend_from_slice(&[8, 6, 0, 0, 0]);
    bytes.extend_from_slice(&[0, 0, 0, 0]);
    bytes.extend_from_slice(&0u32.to_be_bytes());
    bytes.extend_from_slice(b"IEND");
    bytes.extend_from_slice(&[0, 0, 0, 0]);
    bytes
}

fn stored_zip(entries: &[(&str, &[u8])]) -> Vec<u8> {
    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Stored)
        .large_file(true);
    for (name, bytes) in entries {
        writer
            .start_file(*name, options)
            .expect("entry should start");
        writer.write_all(bytes).expect("entry should write");
    }
    writer.finish().expect("archive should finish").into_inner()
}

fn portable_package_for(record: &NotebookStoredRecordV1) -> Vec<u8> {
    let document_bytes =
        serde_json::to_vec_pretty(&record.document).expect("document should serialize");
    let manifest = NotebookPackageManifestV1 {
        version: PACKAGE_MANIFEST_VERSION,
        kind: PACKAGE_KIND.into(),
        created_at: record.saved_at.clone(),
        source_library_id: record.library_id.clone(),
        source_revision: record.revision,
        document_path: DOCUMENT_PATH.into(),
        document_sha256: sha256_hex(&document_bytes),
        assets: Vec::new(),
    };
    let manifest_bytes = serde_json::to_vec_pretty(&manifest).expect("manifest should serialize");
    stored_zip(&[
        ("manifest.json", &manifest_bytes),
        ("document.json", &document_bytes),
    ])
}

#[test]
fn atomically_recovers_a_prepared_record_after_interruption() {
    let root = unique_storage("recovery");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let first = record("library.recovery", 1, "Before crash");
    storage
        .save_record(first, None, true)
        .expect("first record should save");

    let second = record("library.recovery", 2, "Recovered revision");
    let paths = storage.record_paths(&second.library_id);
    NotebookStorage::write_synced(
        &paths.next,
        &serde_json::to_vec_pretty(&second).expect("record should serialize"),
    )
    .expect("prepared record should write");
    fs::rename(&paths.target, &paths.previous).expect("crash point should be simulated");

    let restarted = NotebookStorage::load(root.clone()).expect("storage should recover");
    let recovered = restarted
        .load_record("library.recovery")
        .expect("load should succeed")
        .expect("record should exist");
    assert_eq!(recovered.revision, 2);
    assert_eq!(recovered.document["title"], "Recovered revision");
    assert!(!paths.next.exists());
    assert!(!paths.previous.exists());
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn deduplicates_content_addressed_assets_and_rejects_unsafe_svg() {
    let root = unique_storage("assets");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let bytes = safe_svg();
    let first = storage
        .put_asset(
            bytes.clone(),
            "image/svg+xml".into(),
            "2026-07-14T00:00:00.000Z".into(),
        )
        .expect("safe SVG should store");
    let second = storage
        .put_asset(
            bytes,
            "image/svg+xml".into(),
            "2026-07-14T00:00:01.000Z".into(),
        )
        .expect("same SVG should deduplicate");
    assert_eq!(first.id, second.id);
    assert_eq!(fs::read_dir(storage.assets_dir()).unwrap().count(), 2);

    let unsafe_svg = br#"<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>"#;
    assert!(storage
        .put_asset(
            unsafe_svg.to_vec(),
            "image/svg+xml".into(),
            "2026-07-14T00:00:02.000Z".into(),
        )
        .expect_err("scriptable SVG should fail")
        .contains("forbidden element"));

    let external_css = br#"<svg xmlns="http://www.w3.org/2000/svg"><style>.x{fill:url(https://example.com/a)}</style><rect class="x"/></svg>"#;
    assert!(storage
        .put_asset(
            external_css.to_vec(),
            "image/svg+xml".into(),
            "2026-07-14T00:00:03.000Z".into(),
        )
        .expect_err("external CSS reference should fail")
        .contains("external CSS"));

    assert!(storage
        .put_asset(
            png_with_dimensions(10_001, 10_000),
            "image/png".into(),
            "2026-07-14T00:00:04.000Z".into(),
        )
        .expect_err("oversized raster should fail")
        .contains("100 megapixel"));
    assert_eq!(fs::read_dir(storage.assets_dir()).unwrap().count(), 2);
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn migrates_v6_through_v12_records_versions_and_packages_without_content_changes() {
    let root = unique_storage("v6-migration");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let legacy = legacy_record("library.legacy", 1, "Legacy notebook", 6);
    let paths = storage.record_paths(&legacy.library_id);
    NotebookStorage::write_synced(
        &paths.target,
        &serde_json::to_vec_pretty(&legacy).expect("legacy record should serialize"),
    )
    .expect("legacy record should write");

    let loaded = storage
        .load_record(&legacy.library_id)
        .expect("legacy record should load")
        .expect("legacy record should exist");
    assert_eq!(loaded.document["version"], 13);
    assert_eq!(loaded.document["pageSetup"]["paperSize"], "a4");
    assert_eq!(loaded.document["content"], legacy.document["content"]);

    let version_directory = storage.versions_path(&legacy.library_id);
    fs::create_dir_all(&version_directory).expect("version directory should exist");
    let legacy_snapshot = NotebookVersionSnapshotV1 {
        version: 1,
        snapshot_id: "snapshot.legacy.1".into(),
        library_id: legacy.library_id.clone(),
        revision: legacy.revision,
        created_at: "2026-07-14T00:00:00.000Z".into(),
        reason: "periodic".into(),
        record: legacy.clone(),
    };
    NotebookStorage::write_synced(
        &version_directory.join("legacy.json"),
        &serde_json::to_vec_pretty(&legacy_snapshot).expect("legacy snapshot should serialize"),
    )
    .expect("legacy snapshot should write");
    let versions = storage
        .list_versions(&legacy.library_id)
        .expect("legacy version should list");
    assert_eq!(versions[0].record.document["version"], 13);
    assert_eq!(
        versions[0].record.document["content"],
        legacy.document["content"]
    );

    let document_bytes =
        serde_json::to_vec_pretty(&legacy.document).expect("legacy document should serialize");
    let manifest = NotebookPackageManifestV1 {
        version: PACKAGE_MANIFEST_VERSION,
        kind: PACKAGE_KIND.into(),
        created_at: "2026-07-14T00:00:00.000Z".into(),
        source_library_id: legacy.library_id.clone(),
        source_revision: legacy.revision,
        document_path: DOCUMENT_PATH.into(),
        document_sha256: sha256_hex(&document_bytes),
        assets: Vec::new(),
    };
    let manifest_bytes = serde_json::to_vec_pretty(&manifest).expect("manifest should serialize");
    let package = stored_zip(&[
        ("manifest.json", &manifest_bytes),
        ("document.json", &document_bytes),
    ]);
    let inspection = storage
        .inspect_package(&package)
        .expect("legacy package should inspect");
    assert_eq!(inspection.document["version"], 13);
    assert_eq!(inspection.document["content"], legacy.document["content"]);

    let version7 = legacy_record("library.legacy-v7", 1, "Image-era notebook", 7);
    let version7_paths = storage.record_paths(&version7.library_id);
    NotebookStorage::write_synced(
        &version7_paths.target,
        &serde_json::to_vec_pretty(&version7).expect("V7 record should serialize"),
    )
    .expect("V7 record should write");
    let loaded_v7 = storage
        .load_record(&version7.library_id)
        .expect("V7 record should load")
        .expect("V7 record should exist");
    assert_eq!(loaded_v7.document["version"], 13);
    assert_eq!(loaded_v7.document["content"], version7.document["content"]);

    let version8 = legacy_record("library.legacy-v8", 1, "Page-era notebook", 8);
    let version8_paths = storage.record_paths(&version8.library_id);
    NotebookStorage::write_synced(
        &version8_paths.target,
        &serde_json::to_vec_pretty(&version8).expect("V8 record should serialize"),
    )
    .expect("V8 record should write");
    let loaded_v8 = storage
        .load_record(&version8.library_id)
        .expect("V8 record should load")
        .expect("V8 record should exist");
    assert_eq!(loaded_v8.document["version"], 13);
    assert_eq!(loaded_v8.document["content"], version8.document["content"]);

    let version9 = legacy_record("library.legacy-v9", 1, "Video-era notebook", 9);
    let version9_content = version9.document["content"].clone();
    let version9_paths = storage.record_paths(&version9.library_id);
    NotebookStorage::write_synced(
        &version9_paths.target,
        &serde_json::to_vec_pretty(&version9).expect("V9 record should serialize"),
    )
    .expect("V9 record should write");
    let loaded_v9 = storage
        .load_record(&version9.library_id)
        .expect("V9 record should load")
        .expect("V9 record should exist");
    assert_eq!(loaded_v9.document["version"], 13);
    assert_eq!(loaded_v9.document["content"], version9_content);

    let version10 = legacy_record("library.legacy-v10", 1, "Direct-media notebook", 10);
    let version10_paths = storage.record_paths(&version10.library_id);
    NotebookStorage::write_synced(
        &version10_paths.target,
        &serde_json::to_vec_pretty(&version10).expect("V10 record should serialize"),
    )
    .expect("V10 record should write");
    let loaded_v10 = storage
        .load_record(&version10.library_id)
        .expect("V10 record should load")
        .expect("V10 record should exist");
    assert_eq!(loaded_v10.document["version"], 13);
    assert_eq!(
        loaded_v10.document["content"],
        version10.document["content"]
    );

    let mut version11 = record("library.legacy-v11", 1, "Running-matter notebook");
    version11.document["version"] = 11.into();
    let version11_paths = storage.record_paths(&version11.library_id);
    NotebookStorage::write_synced(
        &version11_paths.target,
        &serde_json::to_vec_pretty(&version11).expect("V11 record should serialize"),
    )
    .expect("V11 record should write");
    let loaded_v11 = storage
        .load_record(&version11.library_id)
        .expect("V11 record should load")
        .expect("V11 record should exist");
    assert_eq!(loaded_v11.document["version"], 13);
    assert_eq!(
        loaded_v11.document["content"],
        version11.document["content"]
    );

    let mut version12 = record("library.legacy-v12", 1, "Precise-media notebook");
    version12.document["version"] = 12.into();
    let version12_paths = storage.record_paths(&version12.library_id);
    NotebookStorage::write_synced(
        &version12_paths.target,
        &serde_json::to_vec_pretty(&version12).expect("V12 record should serialize"),
    )
    .expect("V12 record should write");
    let loaded_v12 = storage
        .load_record(&version12.library_id)
        .expect("V12 record should load")
        .expect("V12 record should exist");
    assert_eq!(loaded_v12.document["version"], 13);
    assert_eq!(
        loaded_v12.document["content"],
        version12.document["content"]
    );
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn imports_v6_through_v12_packages_as_new_current_records_without_mutating_sources() {
    let root = unique_storage("v6-v10-package-import");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");

    for schema in 6..=10 {
        let source = legacy_record(
            &format!("library.package-v{schema}"),
            schema,
            &format!("Schema {schema} package"),
            schema,
        );
        let package = portable_package_for(&source);
        let original_package = package.clone();

        let inspected = storage
            .inspect_package(&package)
            .expect("supported legacy package should inspect");
        assert_eq!(inspected.document["version"], 13);
        assert_eq!(inspected.document["content"], source.document["content"]);

        let imported = storage
            .import_package(&package)
            .expect("supported legacy package should import");
        assert_ne!(imported.library_id, source.library_id);
        assert_eq!(imported.revision, 1);
        assert_eq!(imported.document["version"], 13);
        assert_eq!(imported.document["content"], source.document["content"]);
        assert_eq!(package, original_package);

        let raw_imported: serde_json::Value = serde_json::from_slice(
            &fs::read(storage.record_paths(&imported.library_id).target)
                .expect("imported record should exist"),
        )
        .expect("imported record should remain readable");
        assert_eq!(raw_imported["document"]["version"], 13);
    }

    for schema in 11..=12 {
        let mut source = record(
            &format!("library.package-v{schema}"),
            schema,
            &format!("Schema {schema} package"),
        );
        source.document["version"] = schema.into();
        let imported = storage
            .import_package(&portable_package_for(&source))
            .expect("running-matter package should import");
        assert_eq!(imported.document["version"], 13);
        assert_eq!(imported.document["content"], source.document["content"]);
    }

    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn upgrades_a_real_v10_record_only_on_save_and_preserves_one_raw_snapshot() {
    let root = unique_storage("v10-upgrade-save");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let asset_id = format!("sha256:{}", "a".repeat(64));
    let mut legacy = legacy_record("library.upgrade", 4, "Upgrade notebook", 10);
    legacy.asset_ids.push(asset_id.clone());
    legacy.document["pageSetup"]["paperSize"] = "letter".into();
    legacy.document["headerFooter"] = serde_json::json!({
        "headerText": "Course notes",
        "footerText": "Calculus",
        "differentFirstPage": true,
        "pageNumbering": { "enabled": true, "position": "right", "startAt": 7 }
    });
    legacy.document["content"] = serde_json::json!([
        {
            "type": "paragraph",
            "id": "paragraph.upgrade",
            "content": [{ "type": "text", "text": "Preserved content" }]
        },
        {
            "type": "imageFigure",
            "id": "image.upgrade",
            "assetId": asset_id,
            "altText": "Preserved media",
            "widthPercent": 75,
            "displayAspectRatio": 1.5
        }
    ]);
    let paths = storage.record_paths(&legacy.library_id);
    let raw_legacy = serde_json::to_vec_pretty(&legacy).expect("legacy record should serialize");
    NotebookStorage::write_synced(&paths.target, &raw_legacy).expect("legacy record should write");

    let loaded = storage
        .load_record_with_source(&legacy.library_id)
        .expect("V10 record should open")
        .expect("V10 record should exist");
    assert_eq!(loaded.source_document_version, 10);
    let mut opened = loaded.record;
    assert_eq!(opened.document["version"], 13);
    assert_eq!(opened.document["content"], legacy.document["content"]);
    assert_eq!(opened.document["pageSetup"], legacy.document["pageSetup"]);
    assert_eq!(
        opened.document["headerFooter"]["defaultHeader"]["left"][0]["content"][0]["text"],
        "Course notes"
    );
    assert_eq!(
        opened.document["headerFooter"]["defaultFooter"]["right"][0]["content"][0]["type"],
        "pageNumber"
    );
    let still_legacy: serde_json::Value =
        serde_json::from_slice(&fs::read(&paths.target).unwrap()).unwrap();
    assert_eq!(still_legacy["document"]["version"], 10);
    assert_eq!(
        storage.load_raw_recovery(&legacy.library_id).unwrap(),
        Some(raw_legacy)
    );

    opened.revision = 5;
    opened.saved_at = "2026-07-15T00:00:05.000Z".into();
    storage
        .save_record(opened.clone(), Some(4), false)
        .expect("first upgraded save should succeed");
    let current_on_disk: serde_json::Value =
        serde_json::from_slice(&fs::read(&paths.target).unwrap()).unwrap();
    assert_eq!(current_on_disk["document"]["version"], 13);

    let snapshot_paths: Vec<_> = fs::read_dir(storage.versions_path(&legacy.library_id))
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .collect();
    assert_eq!(snapshot_paths.len(), 1);
    let raw_snapshot: serde_json::Value =
        serde_json::from_slice(&fs::read(&snapshot_paths[0]).unwrap()).unwrap();
    assert_eq!(raw_snapshot["reason"], "before-schema-upgrade");
    assert_eq!(raw_snapshot["record"]["revision"], 4);
    assert_eq!(raw_snapshot["record"]["document"]["version"], 10);
    let listed = storage.list_versions(&legacy.library_id).unwrap();
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].record.document["version"], 13);

    opened.revision = 6;
    opened.saved_at = "2026-07-15T00:00:06.000Z".into();
    storage
        .save_record(opened, Some(5), false)
        .expect("current save should succeed");
    assert_eq!(storage.list_versions(&legacy.library_id).unwrap().len(), 1);

    drop(storage);
    let restarted = NotebookStorage::load(root.clone()).expect("storage should restart");
    let reopened = restarted
        .load_record_with_source(&legacy.library_id)
        .unwrap()
        .expect("upgraded record should remain available");
    assert_eq!(reopened.source_document_version, 13);
    assert_eq!(reopened.record.document["version"], 13);
    assert_eq!(
        reopened.record.document["content"],
        legacy.document["content"]
    );
    assert_eq!(reopened.record.document["pageSetup"]["paperSize"], "letter");
    assert_eq!(reopened.record.asset_ids, legacy.asset_ids);
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn keeps_legacy_record_when_upgrade_snapshot_cannot_be_written() {
    let root = unique_storage("v10-upgrade-snapshot-failure");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let legacy = legacy_record("library.snapshot-failure", 1, "Snapshot failure", 10);
    let paths = storage.record_paths(&legacy.library_id);
    NotebookStorage::write_synced(
        &paths.target,
        &serde_json::to_vec_pretty(&legacy).expect("legacy record should serialize"),
    )
    .expect("legacy record should write");
    fs::write(
        storage.versions_path(&legacy.library_id),
        b"not a directory",
    )
    .expect("version path blocker should write");
    let mut current = storage
        .load_record(&legacy.library_id)
        .unwrap()
        .expect("legacy record should open");
    current.revision = 2;
    current.saved_at = "2026-07-15T00:00:02.000Z".into();
    storage
        .save_record(current, Some(1), false)
        .expect_err("snapshot failure should abort the save");
    let retained: serde_json::Value =
        serde_json::from_slice(&fs::read(&paths.target).unwrap()).unwrap();
    assert_eq!(retained["document"]["version"], 10);
    assert!(!paths.next.exists());
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn current_records_skip_upgrade_snapshots_and_legacy_failures_are_specific() {
    let root = unique_storage("schema-errors");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    storage
        .save_record(record("library.current", 1, "Current notebook"), None, true)
        .expect("current record should save");
    assert!(storage.list_versions("library.current").unwrap().is_empty());

    for (library_id, schema, expected) in [
        ("library.early", 5, "NOTEBOOK_SCHEMA_PRE_V6"),
        ("library.future", 14, "NOTEBOOK_SCHEMA_NEWER"),
    ] {
        let legacy = legacy_record(library_id, 1, "Unsupported notebook", schema);
        let paths = storage.record_paths(library_id);
        NotebookStorage::write_synced(&paths.target, &serde_json::to_vec(&legacy).unwrap())
            .expect("unsupported record should write");
        let fallback = record(library_id, 1, "Older recovery copy");
        NotebookStorage::write_synced(&paths.previous, &serde_json::to_vec(&fallback).unwrap())
            .expect("recovery copy should write");
        assert!(storage
            .load_record(library_id)
            .expect_err("unsupported record should fail")
            .contains(expected));
        let retained: serde_json::Value =
            serde_json::from_slice(&fs::read(&paths.target).unwrap()).unwrap();
        assert_eq!(retained["document"]["version"], schema);
        assert!(storage.load_raw_recovery(library_id).unwrap().is_some());
    }

    let mut damaged = record("library.damaged", 1, "Damaged notebook");
    damaged.document["headerFooter"]
        .as_object_mut()
        .unwrap()
        .remove("defaultFooter");
    let damaged_paths = storage.record_paths(&damaged.library_id);
    NotebookStorage::write_synced(
        &damaged_paths.target,
        &serde_json::to_vec(&damaged).unwrap(),
    )
    .expect("damaged record should write");
    assert!(storage
        .load_record(&damaged.library_id)
        .expect_err("damaged record should fail")
        .contains("NOTEBOOK_RECORD_INVALID"));
    assert!(storage
        .load_raw_recovery(&damaged.library_id)
        .unwrap()
        .is_some());
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn validates_v11_page_layout_and_explicit_top_level_breaks() {
    let root = unique_storage("v8-page-layout");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let mut valid = record("library.pages", 1, "Paginated notebook");
    valid.document["pageSetup"] = serde_json::json!({
        "paperSize": "letter",
        "orientation": "landscape",
        "marginsPt": { "top": 36, "right": 54, "bottom": 36, "left": 54 }
    });
    valid.document["headerFooter"] = serde_json::json!({
        "defaultHeader": {
            "left": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Limits" }] }],
            "center": [{ "type": "paragraph" }],
            "right": [{ "type": "paragraph" }]
        },
        "defaultFooter": {
            "left": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Chapter 2" }] }],
            "center": [{ "type": "paragraph" }],
            "right": [{ "type": "paragraph", "content": [{ "type": "pageNumber" }] }]
        },
        "firstPageHeader": {
            "left": [{ "type": "paragraph" }],
            "center": [{ "type": "paragraph" }],
            "right": [{ "type": "paragraph" }]
        },
        "firstPageFooter": {
            "left": [{ "type": "paragraph" }],
            "center": [{ "type": "paragraph" }],
            "right": [{ "type": "paragraph" }]
        },
        "differentFirstPage": true,
        "pageNumberStart": 5
    });
    valid.document["content"] = serde_json::json!([
        { "type": "paragraph", "id": "paragraph.before" },
        { "type": "pageBreak", "id": "break.1" },
        { "type": "paragraph", "id": "paragraph.after" }
    ]);
    storage
        .save_record(valid.clone(), None, true)
        .expect("valid V11 page layout should save");

    let mut invalid_number = valid.clone();
    invalid_number.library_id = "library.pages.invalid-number".into();
    invalid_number.document["headerFooter"]["pageNumberStart"] = 0.into();
    assert!(storage
        .save_record(invalid_number, None, true)
        .expect_err("invalid starting number should fail")
        .contains("header and footer"));

    let mut invalid_margins = valid.clone();
    invalid_margins.library_id = "library.pages.invalid-margins".into();
    invalid_margins.document["pageSetup"]["marginsPt"]["left"] = 500.into();
    assert!(storage
        .save_record(invalid_margins, None, true)
        .expect_err("invalid margins should fail")
        .contains("margin"));

    let mut nested_break = valid;
    nested_break.library_id = "library.pages.nested-break".into();
    nested_break.document["content"] = serde_json::json!([{
        "type": "section",
        "id": "section.with-break",
        "title": "Invalid nested break",
        "content": [{ "type": "pageBreak", "id": "break.nested" }]
    }]);
    assert!(storage
        .save_record(nested_break, None, true)
        .expect_err("nested page break should fail")
        .contains("unsupported"));
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn validates_v12_image_metadata_and_crop_bounds() {
    let root = unique_storage("v7-image-model");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let asset_id = format!("sha256:{}", "a".repeat(64));
    let mut image_record = record("library.image", 1, "Image notebook");
    image_record.asset_ids.push(asset_id.clone());
    image_record.document["content"] = serde_json::json!([{
        "type": "imageFigure",
        "id": "image.storage.1",
        "assetId": asset_id,
        "altText": "A coordinate plane",
        "caption": "Coordinate plane",
        "numbered": true,
        "widthPercent": 63.417,
        "alignment": "center",
        "placement": "normal",
        "rotation": 137,
        "displayAspectRatio": 1.25,
        "crop": { "x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8 }
    }]);
    storage
        .save_record(image_record.clone(), None, true)
        .expect("valid image metadata should save");

    let mut excessive_precision = image_record.clone();
    excessive_precision.library_id = "library.image.precision".into();
    excessive_precision.document["content"][0]["widthPercent"] = 63.4174.into();
    assert!(storage
        .save_record(excessive_precision, None, true)
        .expect_err("excessive media-width precision should fail")
        .contains("width"));

    let mut missing_asset = image_record.clone();
    missing_asset.library_id = "library.missing-image-asset".into();
    missing_asset.asset_ids.clear();
    assert!(storage
        .save_record(missing_asset, None, true)
        .expect_err("missing referenced asset should fail")
        .contains("missing a referenced asset"));

    let mut invalid_crop = image_record.clone();
    invalid_crop.library_id = "library.invalid-crop".into();
    invalid_crop.document["content"][0]["crop"]["width"] = 1.0.into();
    assert!(storage
        .save_record(invalid_crop, None, true)
        .expect_err("out-of-bounds crop should fail")
        .contains("crop"));

    let mut invalid_decorative = image_record;
    invalid_decorative.library_id = "library.invalid-decorative".into();
    invalid_decorative.document["content"][0]["decorative"] = true.into();
    assert!(storage
        .save_record(invalid_decorative, None, true)
        .expect_err("decorative image with alt text should fail")
        .contains("alternative text"));
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn migrates_v9_losslessly_and_rejects_v10_only_formatting_before_migration() {
    let mut legacy = legacy_document("V9 document");
    legacy["version"] = 9.into();
    let original = legacy.clone();
    let migrated = migrate_notebook_document(legacy).expect("V9 document should migrate");
    assert_eq!(migrated["version"], 13);
    assert_eq!(migrated["content"], original["content"]);
    assert_eq!(migrated["pageSetup"], original["pageSetup"]);
    assert_eq!(migrated["headerFooter"]["pageNumberStart"], 1);

    let mut v9_indent = legacy_document("V9 strict indent");
    v9_indent["version"] = 9.into();
    v9_indent["content"][0]["format"] = serde_json::json!({ "leftIndentPt": 36 });
    assert!(migrate_notebook_document(v9_indent)
        .expect_err("V9 must reject V10 paragraph formatting")
        .contains("left indent"));

    let mut v9_image = legacy_document("V9 strict image");
    v9_image["version"] = 9.into();
    v9_image["content"] = serde_json::json!([{
        "type": "imageFigure",
        "id": "image.v9",
        "assetId": format!("sha256:{}", "a".repeat(64)),
        "displayAspectRatio": 1.5
    }]);
    assert!(migrate_notebook_document(v9_image)
        .expect_err("V9 must reject V10 image fields")
        .contains("unknown field"));
}

#[test]
fn validates_v12_video_metadata_and_referenced_assets() {
    let root = unique_storage("v9-video-model");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let video_id = format!("sha256:{}", "a".repeat(64));
    let poster_id = format!("sha256:{}", "b".repeat(64));
    let track_id = format!("sha256:{}", "c".repeat(64));
    let mut video_record = record("library.video", 1, "Video notebook");
    video_record.asset_ids = vec![video_id.clone(), poster_id.clone(), track_id.clone()];
    video_record.document["content"] = serde_json::json!([{
        "type": "videoFigure",
        "id": "video.storage.1",
        "assetId": video_id,
        "title": "Worked limit",
        "description": "A narrated worked example.",
        "caption": "Evaluating the limit",
        "numbered": true,
        "posterAssetId": poster_id,
        "tracks": [{
            "id": "track.en",
            "assetId": track_id,
            "kind": "captions",
            "label": "English",
            "language": "en-US",
            "default": true
        }],
        "widthPercent": 71.125,
        "alignment": "left",
        "placement": "square-left",
        "displayAspectRatio": 1.777,
        "loop": true
    }]);
    storage
        .save_record(video_record.clone(), None, true)
        .expect("valid video metadata should save");

    let mut missing_track = video_record.clone();
    missing_track.library_id = "library.video.missing-track".into();
    missing_track.asset_ids.pop();
    assert!(storage
        .save_record(missing_track, None, true)
        .expect_err("missing track asset should fail")
        .contains("missing a referenced asset"));

    let mut duplicate_default = video_record.clone();
    duplicate_default.library_id = "library.video.defaults".into();
    duplicate_default
        .asset_ids
        .push(format!("sha256:{}", "d".repeat(64)));
    duplicate_default.document["content"][0]["tracks"]
        .as_array_mut()
        .expect("tracks should be an array")
        .push(serde_json::json!({
            "id": "track.ar",
            "assetId": format!("sha256:{}", "d".repeat(64)),
            "kind": "subtitles",
            "label": "Arabic",
            "language": "ar",
            "default": true
        }));
    assert!(storage
        .save_record(duplicate_default, None, true)
        .expect_err("multiple default tracks should fail")
        .contains("default text track"));

    let mut image_property = video_record;
    image_property.library_id = "library.video.image-property".into();
    image_property.document["content"][0]["rotation"] = 90.into();
    assert!(storage
        .save_record(image_property, None, true)
        .expect_err("image-only video property should fail")
        .contains("invalid"));
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn streams_video_uploads_in_bounded_chunks_and_cleans_aborts() {
    let root = unique_storage("streamed-video");
    let storage = NotebookStorage::load(root.clone()).unwrap();
    let bytes = b"\0\0\0\x18ftypisomstreamed-video";
    let upload_id = storage
        .begin_asset_upload(
            bytes.len() as u64,
            "video/mp4".into(),
            "2026-07-14T00:01:00.000Z".into(),
        )
        .unwrap();
    storage
        .append_asset_upload(&upload_id, &bytes[..7])
        .unwrap();
    storage
        .append_asset_upload(&upload_id, &bytes[7..])
        .unwrap();
    let metadata = storage.finish_asset_upload(&upload_id).unwrap();
    assert_eq!(metadata.byte_length, bytes.len() as u64);
    assert_eq!(
        storage.load_asset(&metadata.id).unwrap().unwrap().bytes,
        bytes
    );

    let duplicate_id = storage
        .begin_asset_upload(
            bytes.len() as u64,
            "video/mp4".into(),
            "2026-07-14T00:00:00.000Z".into(),
        )
        .unwrap();
    storage.append_asset_upload(&duplicate_id, bytes).unwrap();
    assert_eq!(
        storage.finish_asset_upload(&duplicate_id).unwrap(),
        metadata
    );

    let url = storage.asset_url(&metadata.id).unwrap();
    let address_and_path = url.strip_prefix("http://").unwrap();
    let (address, path) = address_and_path.split_once('/').unwrap();
    let mut range_stream = TcpStream::connect(address).unwrap();
    write!(
        range_stream,
        "GET /{path} HTTP/1.1\r\nHost: {address}\r\nRange: bytes=4-7\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    let mut range_response = Vec::new();
    range_stream.read_to_end(&mut range_response).unwrap();
    let range_response = String::from_utf8_lossy(&range_response);
    assert!(range_response.starts_with("HTTP/1.1 206 Partial Content"));
    assert!(range_response.contains(&format!("Content-Range: bytes 4-7/{}", bytes.len())));
    assert!(range_response.ends_with("ftyp"));

    let mut head_stream = TcpStream::connect(address).unwrap();
    write!(
        head_stream,
        "HEAD /{path} HTTP/1.1\r\nHost: {address}\r\nConnection: close\r\n\r\n"
    )
    .unwrap();
    let mut head_response = String::new();
    head_stream.read_to_string(&mut head_response).unwrap();
    assert!(head_response.starts_with("HTTP/1.1 200 OK"));
    assert!(head_response.contains("Accept-Ranges: bytes"));
    assert!(head_response.ends_with("\r\n\r\n"));

    let aborted_id = storage
        .begin_asset_upload(12, "video/mp4".into(), "2026-07-14T00:00:00.000Z".into())
        .unwrap();
    storage
        .append_asset_upload(&aborted_id, b"\0\0\0\x18ftyp")
        .unwrap();
    storage.abort_asset_upload(&aborted_id).unwrap();
    assert!(storage.finish_asset_upload(&aborted_id).is_err());
    assert!(std::fs::read_dir(root.join("uploads"))
        .unwrap()
        .next()
        .is_none());
    drop(storage);
    let _ = std::fs::remove_dir_all(root);
}

#[test]
fn portable_export_uses_the_current_snapshot_and_imports_as_a_copy() {
    let root = unique_storage("package-copy");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let metadata = storage
        .put_asset(
            safe_svg(),
            "image/svg+xml".into(),
            "2026-07-14T00:00:00.000Z".into(),
        )
        .expect("asset should store");
    let mut saved = record("library.original", 1, "Saved title");
    saved.asset_ids.push(metadata.id.clone());
    storage
        .save_record(saved.clone(), None, true)
        .expect("record should save");

    let mut current_snapshot = saved.clone();
    current_snapshot.revision = 2;
    current_snapshot.saved_at = "2026-07-14T00:00:02.000Z".into();
    current_snapshot.document["title"] = "Unsaved export title".into();
    let bytes = storage
        .export_package(current_snapshot)
        .expect("portable package should export");
    let inspection = storage
        .inspect_package(&bytes)
        .expect("portable package should inspect");
    assert_eq!(inspection.document["title"], "Unsaved export title");
    assert_eq!(
        storage
            .load_record("library.original")
            .unwrap()
            .unwrap()
            .document["title"],
        "Saved title"
    );

    let imported = storage
        .import_package(&bytes)
        .expect("portable package should import");
    assert_ne!(imported.library_id, "library.original");
    assert_eq!(imported.revision, 1);
    assert_eq!(imported.document["title"], "Unsaved export title");
    assert_eq!(storage.list_records().unwrap().len(), 2);
    assert_eq!(fs::read_dir(storage.assets_dir()).unwrap().count(), 2);
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn validates_the_complete_package_before_mutating_storage() {
    let root = unique_storage("package-safety");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let traversal = stored_zip(&[
        ("manifest.json", b"{}"),
        ("document.json", b"{}"),
        ("../escape", b"bad"),
    ]);
    assert!(storage.import_package(&traversal).is_err());
    assert!(storage.list_records().unwrap().is_empty());
    assert_eq!(fs::read_dir(storage.assets_dir()).unwrap().count(), 0);

    let unsafe_svg =
        br#"<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>"#.to_vec();
    let hash = sha256_hex(&unsafe_svg);
    let metadata = NotebookAssetMetadataV1 {
        version: 1,
        id: format!("sha256:{hash}"),
        sha256: hash.clone(),
        byte_length: unsafe_svg.len() as u64,
        mime_type: "image/svg+xml".into(),
        created_at: "2026-07-14T00:00:00.000Z".into(),
    };
    let document_bytes =
        serde_json::to_vec_pretty(&document("Unsafe package")).expect("document should serialize");
    let manifest = NotebookPackageManifestV1 {
        version: PACKAGE_MANIFEST_VERSION,
        kind: PACKAGE_KIND.into(),
        created_at: "2026-07-14T00:00:00.000Z".into(),
        source_library_id: "library.unsafe".into(),
        source_revision: 1,
        document_path: DOCUMENT_PATH.into(),
        document_sha256: sha256_hex(&document_bytes),
        assets: vec![metadata],
    };
    let manifest_bytes = serde_json::to_vec_pretty(&manifest).expect("manifest should serialize");
    let asset_path = format!("assets/{hash}");
    let unsafe_package = stored_zip(&[
        ("manifest.json", &manifest_bytes),
        ("document.json", &document_bytes),
        (&asset_path, &unsafe_svg),
    ]);
    assert!(storage.import_package(&unsafe_package).is_err());
    assert!(storage.list_records().unwrap().is_empty());
    assert_eq!(fs::read_dir(storage.assets_dir()).unwrap().count(), 0);

    let mut missing_asset_document = document("Missing image asset");
    missing_asset_document["content"] = serde_json::json!([{
        "type": "imageFigure",
        "id": "image.missing.1",
        "assetId": format!("sha256:{}", "d".repeat(64)),
        "altText": "Missing plot"
    }]);
    let missing_document_bytes = serde_json::to_vec_pretty(&missing_asset_document)
        .expect("missing-asset document should serialize");
    let missing_manifest = NotebookPackageManifestV1 {
        version: PACKAGE_MANIFEST_VERSION,
        kind: PACKAGE_KIND.into(),
        created_at: "2026-07-14T00:00:00.000Z".into(),
        source_library_id: "library.missing-asset".into(),
        source_revision: 1,
        document_path: DOCUMENT_PATH.into(),
        document_sha256: sha256_hex(&missing_document_bytes),
        assets: Vec::new(),
    };
    let missing_manifest_bytes =
        serde_json::to_vec_pretty(&missing_manifest).expect("manifest should serialize");
    let missing_asset_package = stored_zip(&[
        ("manifest.json", &missing_manifest_bytes),
        ("document.json", &missing_document_bytes),
    ]);
    assert!(storage
        .import_package(&missing_asset_package)
        .expect_err("package with a missing image asset should fail")
        .contains("missing a document asset"));
    assert!(storage.list_records().unwrap().is_empty());
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn rejects_revision_races_and_invalid_collapsed_documents() {
    let root = unique_storage("validation");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let first = record("library.race", 1, "Revision 1");
    storage
        .save_record(first, None, true)
        .expect("first revision should save");
    assert!(storage
        .save_record(record("library.race", 2, "Revision 2"), Some(0), false)
        .expect_err("stale expected revision should fail")
        .contains("conflict"));

    let mut invalid = record("library.invalid", 1, "Invalid collapse");
    invalid.document["content"] = serde_json::json!([{
        "type": "semanticBlock",
        "id": "semantic.invalid",
        "variant": "theorem",
        "collapsed": true,
        "content": []
    }]);
    assert!(storage
        .save_record(invalid, None, true)
        .expect_err("invalid V10 document should fail")
        .contains("collapsed state"));
    assert_eq!(storage.list_records().unwrap().len(), 1);
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn retains_bounded_version_history_and_round_trips_trash() {
    let root = unique_storage("history-trash");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let stored = record("library.history", 1, "History record");
    storage
        .save_record(stored.clone(), None, true)
        .expect("record should save");
    for index in 0..51 {
        storage
            .save_version(NotebookVersionSnapshotV1 {
                version: 1,
                snapshot_id: format!("snapshot.history.{index}"),
                library_id: stored.library_id.clone(),
                revision: stored.revision,
                created_at: format!("2026-07-14T00:00:{index:02}.000Z"),
                reason: if index == 50 {
                    "before-trash".into()
                } else {
                    "periodic".into()
                },
                record: stored.clone(),
            })
            .expect("snapshot should save");
    }
    assert_eq!(storage.list_versions(&stored.library_id).unwrap().len(), 50);

    storage
        .move_record_to_trash(&stored.library_id)
        .expect("record should move to trash");
    assert!(storage.load_record(&stored.library_id).unwrap().is_none());
    assert_eq!(storage.list_trash().unwrap().len(), 1);
    storage
        .restore_record_from_trash(&stored.library_id)
        .expect("record should restore");
    assert_eq!(
        storage
            .load_record(&stored.library_id)
            .unwrap()
            .unwrap()
            .document["title"],
        "History record"
    );
    storage
        .move_record_to_trash(&stored.library_id)
        .expect("record should move to trash again");
    storage
        .delete_record_permanently(&stored.library_id)
        .expect("record should delete permanently");
    assert!(storage.list_trash().unwrap().is_empty());
    assert!(storage
        .list_versions(&stored.library_id)
        .unwrap()
        .is_empty());
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn round_trips_schema13_floating_placements_through_storage_history_trash_and_packages() {
    let root = unique_storage("schema13-floating");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let mut stored = record("library.floating", 1, "Floating objects");
    stored.document["content"] = serde_json::json!([{
        "type": "paragraph",
        "id": "paragraph.anchor"
    }, {
        "type": "displayMath",
        "id": "math.floating",
        "sourceText": "x^2",
        "latex": "x^2",
        "workspaceTarget": "equation",
        "objectPlacement": {
            "mode": "floating",
            "anchor": { "kind": "paragraph", "nodeId": "paragraph.anchor" },
            "horizontalReference": "margins",
            "verticalReference": "page",
            "xPt": -12.5,
            "yPt": 84.25,
            "widthPt": 216.75,
            "wrap": "square",
            "textDistancePt": { "top": 6, "right": 12, "bottom": 6, "left": 12 },
            "zOrder": 0
        }
    }, {
        "type": "section",
        "id": "section.floating",
        "title": "Page anchored",
        "objectPlacement": {
            "mode": "floating",
            "anchor": { "kind": "page", "pageNumber": 3 },
            "horizontalReference": "page",
            "verticalReference": "margins",
            "xPt": 72,
            "yPt": 144,
            "widthPt": 288,
            "wrap": "top-and-bottom",
            "textDistancePt": { "top": 0, "right": 0, "bottom": 12, "left": 0 },
            "zOrder": 1
        },
        "content": [{ "type": "paragraph", "id": "paragraph.section" }]
    }]);
    storage
        .save_record(stored.clone(), None, true)
        .expect("floating record should save");
    storage
        .save_version(NotebookVersionSnapshotV1 {
            version: 1,
            snapshot_id: "snapshot.floating.1".into(),
            library_id: stored.library_id.clone(),
            revision: stored.revision,
            created_at: "2026-07-16T01:00:00.000Z".into(),
            reason: "periodic".into(),
            record: stored.clone(),
        })
        .expect("floating snapshot should save");
    let package = storage
        .export_package(stored.clone())
        .expect("floating package should export");
    assert_eq!(
        storage
            .inspect_package(&package)
            .expect("floating package should inspect")
            .document["content"],
        stored.document["content"]
    );
    storage
        .move_record_to_trash(&stored.library_id)
        .expect("floating record should move to trash");
    storage
        .restore_record_from_trash(&stored.library_id)
        .expect("floating record should restore");
    assert_eq!(
        storage
            .load_record(&stored.library_id)
            .unwrap()
            .unwrap()
            .document["content"],
        stored.document["content"]
    );
    assert_eq!(
        storage.list_versions(&stored.library_id).unwrap()[0]
            .record
            .document["content"],
        stored.document["content"]
    );

    let mut invalid = stored;
    invalid.library_id = "library.floating-invalid".into();
    invalid.document["content"][1]["objectPlacement"]["zOrder"] = 4.into();
    assert!(storage
        .save_record(invalid, None, true)
        .expect_err("unnormalized layers should fail")
        .contains("layer order"));
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn writes_export_bytes_through_a_sibling_temp_file_without_touching_incomplete_targets() {
    let root = unique_storage("export-save");
    fs::create_dir_all(&root).expect("temporary directory should exist");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let target = root.join("publication.docx");
    fs::write(&target, b"previous publication").expect("previous publication should exist");

    let incomplete = storage
        .begin_export_write(target.clone(), 5)
        .expect("incomplete export should begin");
    storage
        .append_export_write(&incomplete, b"abc")
        .expect("partial export should append");
    assert!(storage
        .finish_export_write(&incomplete)
        .expect_err("incomplete export should fail")
        .contains("incomplete"));
    assert_eq!(fs::read(&target).unwrap(), b"previous publication");

    let bytes = vec![7; 1024 * 1024 + 23];
    let complete = storage
        .begin_export_write(target.clone(), bytes.len() as u64)
        .expect("export should begin");
    storage
        .append_export_write(&complete, &bytes[..1024 * 1024])
        .expect("first chunk should append");
    storage
        .append_export_write(&complete, &bytes[1024 * 1024..])
        .expect("second chunk should append");
    storage
        .finish_export_write(&complete)
        .expect("complete export should replace target");
    assert_eq!(fs::read(&target).unwrap(), bytes);
    assert!(fs::read_dir(&root)
        .expect("temporary directory should list")
        .all(|entry| !entry
            .expect("entry should read")
            .file_name()
            .to_string_lossy()
            .contains("calcwiz-export")));
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn export_save_replaces_an_unexpected_extension_with_the_selected_format() {
    assert_eq!(
        with_export_extension(PathBuf::from("/tmp/lesson.txt"), "docx"),
        PathBuf::from("/tmp/lesson.docx")
    );
    assert_eq!(
        with_export_extension(PathBuf::from("/tmp/lesson.DOCX"), "docx"),
        PathBuf::from("/tmp/lesson.DOCX")
    );
}
