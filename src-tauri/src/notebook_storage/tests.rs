use super::{
    assets::sha256_hex,
    model::{
        NotebookAssetMetadataV1, NotebookPackageManifestV1, NotebookStoredRecordV1,
        NotebookVersionSnapshotV1, DOCUMENT_PATH, PACKAGE_KIND, PACKAGE_MANIFEST_VERSION,
    },
    NotebookStorage,
};
use std::{
    fs,
    io::{Cursor, Write},
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
        "version": 7,
        "id": "document.storage.1",
        "title": title,
        "createdAt": "2026-07-14T00:00:00.000Z",
        "updatedAt": "2026-07-14T00:00:00.000Z",
        "selectedNodeId": "paragraph.storage.1",
        "content": [{
            "type": "paragraph",
            "id": "paragraph.storage.1",
            "content": [{"type": "text", "text": "Durable notebook"}]
        }]
    })
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
fn migrates_v6_records_versions_and_packages_without_content_changes() {
    let root = unique_storage("v6-migration");
    let storage = NotebookStorage::load(root.clone()).expect("storage should load");
    let mut legacy = record("library.legacy", 1, "Legacy notebook");
    legacy.document["version"] = 6.into();
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
    assert_eq!(loaded.document["version"], 7);
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
    assert_eq!(versions[0].record.document["version"], 7);
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
    assert_eq!(inspection.document["version"], 7);
    assert_eq!(inspection.document["content"], legacy.document["content"]);
    fs::remove_dir_all(root).expect("temporary storage should be removed");
}

#[test]
fn validates_v7_image_metadata_and_crop_bounds() {
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
        "widthPercent": 75,
        "alignment": "center",
        "placement": "normal",
        "rotation": 90,
        "crop": { "x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8 }
    }]);
    storage
        .save_record(image_record.clone(), None, true)
        .expect("valid image metadata should save");

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
        .expect_err("invalid V7 document should fail")
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
