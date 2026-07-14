use super::{
    assets::{sha256_hex, validate_asset_bytes},
    model::{
        collect_notebook_asset_ids, is_asset_id, is_library_id, is_sha256,
        migrate_notebook_document, validate_asset_metadata, NotebookAssetPayloadV1,
        NotebookPackageInspectionV1, NotebookPackageManifestV1, NotebookStoredRecordV1,
        DOCUMENT_PATH, PACKAGE_KIND, PACKAGE_MANIFEST_VERSION,
    },
};
use std::{
    collections::{HashMap, HashSet},
    io::{Cursor, Read, Write},
    path::PathBuf,
};
use zip::{write::SimpleFileOptions, CompressionMethod, ZipArchive, ZipWriter};

const MANIFEST_PATH: &str = "manifest.json";
const MANIFEST_MAX_BYTES: u64 = 1024 * 1024;
const DOCUMENT_MAX_BYTES: u64 = 256 * 1024 * 1024;
const ENTRY_COUNT_MAX: usize = 10_000;

#[derive(Debug, Clone)]
pub struct ValidatedNotebookPackage {
    pub manifest: NotebookPackageManifestV1,
    pub document: serde_json::Value,
    pub assets: Vec<NotebookAssetPayloadV1>,
}

fn asset_path(asset_id: &str) -> Result<String, String> {
    let hash = asset_id
        .strip_prefix("sha256:")
        .filter(|hash| is_sha256(hash))
        .ok_or_else(|| "Notebook package contains an invalid asset identity.".to_string())?;
    Ok(format!("assets/{hash}"))
}

fn zip_options() -> SimpleFileOptions {
    SimpleFileOptions::default()
        .compression_method(CompressionMethod::Stored)
        .large_file(true)
        .unix_permissions(0o600)
}

pub fn export_package(
    record: &NotebookStoredRecordV1,
    assets: &[NotebookAssetPayloadV1],
) -> Result<Vec<u8>, String> {
    super::model::validate_stored_record(record)?;
    let assets_by_id = assets
        .iter()
        .map(|asset| (asset.metadata.id.as_str(), asset))
        .collect::<HashMap<_, _>>();
    if assets_by_id.len() != record.asset_ids.len() {
        return Err("Notebook portable export is missing a required asset.".into());
    }
    let mut ordered_assets = Vec::with_capacity(record.asset_ids.len());
    for asset_id in &record.asset_ids {
        let asset = assets_by_id
            .get(asset_id.as_str())
            .ok_or_else(|| "Notebook portable export is missing a required asset.".to_string())?;
        validate_asset_bytes(&asset.metadata, &asset.bytes)?;
        ordered_assets.push((*asset).clone());
    }

    let document_bytes = serde_json::to_vec_pretty(&record.document)
        .map_err(|error| format!("Notebook document could not be serialized: {error}"))?;
    let manifest = NotebookPackageManifestV1 {
        version: PACKAGE_MANIFEST_VERSION,
        kind: PACKAGE_KIND.into(),
        created_at: record.saved_at.clone(),
        source_library_id: record.library_id.clone(),
        source_revision: record.revision,
        document_path: DOCUMENT_PATH.into(),
        document_sha256: sha256_hex(&document_bytes),
        assets: ordered_assets
            .iter()
            .map(|asset| asset.metadata.clone())
            .collect(),
    };
    let manifest_bytes = serde_json::to_vec_pretty(&manifest)
        .map_err(|error| format!("Notebook manifest could not be serialized: {error}"))?;

    let cursor = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(cursor);
    writer
        .start_file(MANIFEST_PATH, zip_options())
        .map_err(|error| format!("Notebook package manifest could not be started: {error}"))?;
    writer
        .write_all(&manifest_bytes)
        .map_err(|error| format!("Notebook package manifest could not be written: {error}"))?;
    writer
        .start_file(DOCUMENT_PATH, zip_options())
        .map_err(|error| format!("Notebook package document could not be started: {error}"))?;
    writer
        .write_all(&document_bytes)
        .map_err(|error| format!("Notebook package document could not be written: {error}"))?;
    for asset in ordered_assets {
        writer
            .start_file(asset_path(&asset.metadata.id)?, zip_options())
            .map_err(|error| format!("Notebook package asset could not be started: {error}"))?;
        writer
            .write_all(&asset.bytes)
            .map_err(|error| format!("Notebook package asset could not be written: {error}"))?;
    }
    writer
        .finish()
        .map(|cursor| cursor.into_inner())
        .map_err(|error| format!("Notebook package could not be finalized: {error}"))
}

fn validate_entry_name(name: &str) -> Result<(), String> {
    if name.is_empty()
        || name.contains('\0')
        || name.contains('\\')
        || name.starts_with('/')
        || name
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
    {
        return Err("Notebook package contains an unsafe path.".into());
    }
    Ok(())
}

fn read_archive_entries(bytes: &[u8]) -> Result<HashMap<String, Vec<u8>>, String> {
    let mut archive = ZipArchive::new(Cursor::new(bytes))
        .map_err(|error| format!("Notebook package is not a valid ZIP archive: {error}"))?;
    if archive.len() < 2 || archive.len() > ENTRY_COUNT_MAX {
        return Err("Notebook package entry count is outside the safety bounds.".into());
    }
    let mut entries = HashMap::new();
    let mut declared_total = 0u64;
    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("Notebook package entry could not be read: {error}"))?;
        let name = entry.name().to_string();
        validate_entry_name(&name)?;
        if entry.enclosed_name() != Some(PathBuf::from(&name))
            || !entry.is_file()
            || entry.encrypted()
            || entry.compression() != CompressionMethod::Stored
            || entry
                .unix_mode()
                .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err(
                "Notebook package contains a link, encrypted, or unsupported entry.".into(),
            );
        }
        if name == MANIFEST_PATH && entry.size() > MANIFEST_MAX_BYTES {
            return Err("Notebook package manifest is too large.".into());
        }
        if name == DOCUMENT_PATH && entry.size() > DOCUMENT_MAX_BYTES {
            return Err("Notebook package document is too large.".into());
        }
        declared_total = declared_total
            .checked_add(entry.size())
            .ok_or_else(|| "Notebook package declared size overflows.".to_string())?;
        if declared_total > bytes.len() as u64 {
            return Err(
                "Notebook package declares expanded content beyond its stored bytes.".into(),
            );
        }
        let mut contents =
            Vec::with_capacity(usize::try_from(entry.size()).map_err(|_| {
                "Notebook package entry is too large for this platform.".to_string()
            })?);
        entry
            .read_to_end(&mut contents)
            .map_err(|error| format!("Notebook package entry could not be expanded: {error}"))?;
        if contents.len() as u64 != entry.size() || entries.insert(name, contents).is_some() {
            return Err("Notebook package contains a duplicate or incomplete entry.".into());
        }
    }
    Ok(entries)
}

fn parse_manifest(bytes: &[u8]) -> Result<NotebookPackageManifestV1, String> {
    let manifest = serde_json::from_slice::<NotebookPackageManifestV1>(bytes)
        .map_err(|error| format!("Notebook package manifest is malformed: {error}"))?;
    if manifest.version != PACKAGE_MANIFEST_VERSION
        || manifest.kind != PACKAGE_KIND
        || manifest.document_path != DOCUMENT_PATH
        || manifest.created_at.is_empty()
        || !is_library_id(&manifest.source_library_id)
        || manifest.source_revision == 0
        || !is_sha256(&manifest.document_sha256)
    {
        return Err("Notebook package manifest contract is invalid.".into());
    }
    let mut asset_ids = HashSet::new();
    for asset in &manifest.assets {
        validate_asset_metadata(asset)?;
        if !asset_ids.insert(&asset.id) {
            return Err("Notebook package manifest repeats an asset.".into());
        }
    }
    Ok(manifest)
}

pub fn inspect_package(bytes: &[u8]) -> Result<ValidatedNotebookPackage, String> {
    let mut entries = read_archive_entries(bytes)?;
    let manifest_bytes = entries
        .remove(MANIFEST_PATH)
        .ok_or_else(|| "Notebook package manifest is missing.".to_string())?;
    let manifest = parse_manifest(&manifest_bytes)?;
    let document_bytes = entries
        .remove(DOCUMENT_PATH)
        .ok_or_else(|| "Notebook package document is missing.".to_string())?;
    if manifest.document_sha256 != sha256_hex(&document_bytes) {
        return Err("Notebook package document hash does not match the manifest.".into());
    }
    let document = serde_json::from_slice(&document_bytes)
        .map_err(|error| format!("Notebook package document is malformed: {error}"))?;
    let document = migrate_notebook_document(document)?;
    let package_asset_ids = manifest
        .assets
        .iter()
        .map(|asset| asset.id.as_str())
        .collect::<HashSet<_>>();
    if collect_notebook_asset_ids(&document)
        .iter()
        .any(|asset_id| !package_asset_ids.contains(asset_id.as_str()))
    {
        return Err("Notebook package is missing a document asset.".into());
    }

    let mut assets = Vec::with_capacity(manifest.assets.len());
    for metadata in &manifest.assets {
        if !is_asset_id(&metadata.id) {
            return Err("Notebook package asset identity is invalid.".into());
        }
        let path = asset_path(&metadata.id)?;
        let asset_bytes = entries
            .remove(&path)
            .ok_or_else(|| format!("Notebook package asset {path} is missing."))?;
        validate_asset_bytes(metadata, &asset_bytes)?;
        assets.push(NotebookAssetPayloadV1 {
            metadata: metadata.clone(),
            bytes: asset_bytes,
        });
    }
    if !entries.is_empty() {
        return Err("Notebook package contains undeclared content.".into());
    }
    Ok(ValidatedNotebookPackage {
        manifest,
        document,
        assets,
    })
}

pub fn inspection(package: &ValidatedNotebookPackage) -> NotebookPackageInspectionV1 {
    NotebookPackageInspectionV1 {
        manifest: package.manifest.clone(),
        document: package.document.clone(),
    }
}
