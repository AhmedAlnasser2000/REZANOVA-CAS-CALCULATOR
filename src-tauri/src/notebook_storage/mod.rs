mod assets;
mod model;
mod package;

pub use model::{
    NotebookAssetMetadataV1, NotebookAssetPayloadV1, NotebookPackageInspectionV1,
    NotebookStoredRecordSummaryV1, NotebookStoredRecordV1, NotebookVersionSnapshotV1,
};

use assets::{sha256_hex, validate_asset_bytes};
use model::{
    is_asset_id, migrate_stored_record, migrate_version_snapshot, summarize_record,
    validate_stored_record, validate_version_snapshot, NotebookRecoveryMetadataV1,
};
use package::{export_package, inspect_package, inspection};
use std::{
    fs::{self, File},
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::State;
use uuid::Uuid;

pub struct NotebookStorage {
    root: PathBuf,
    operation_lock: Mutex<()>,
}

struct RecordPaths {
    target: PathBuf,
    next: PathBuf,
    previous: PathBuf,
    recovery: PathBuf,
}

impl NotebookStorage {
    pub fn load(root: PathBuf) -> Result<Self, String> {
        let storage = Self {
            root,
            operation_lock: Mutex::new(()),
        };
        storage.ensure_directories()?;
        storage.recover_all()?;
        Ok(storage)
    }

    fn documents_dir(&self) -> PathBuf {
        self.root.join("documents")
    }

    fn assets_dir(&self) -> PathBuf {
        self.root.join("assets")
    }

    fn recovery_dir(&self) -> PathBuf {
        self.root.join("recovery")
    }

    fn trash_dir(&self) -> PathBuf {
        self.root.join("trash")
    }

    fn versions_dir(&self) -> PathBuf {
        self.root.join("versions")
    }

    fn ensure_directories(&self) -> Result<(), String> {
        for directory in [
            self.documents_dir(),
            self.assets_dir(),
            self.recovery_dir(),
            self.trash_dir(),
            self.versions_dir(),
        ] {
            fs::create_dir_all(directory).map_err(|error| error.to_string())?;
        }
        Ok(())
    }

    fn record_key(library_id: &str) -> String {
        sha256_hex(library_id.as_bytes())
    }

    fn record_paths(&self, library_id: &str) -> RecordPaths {
        self.record_paths_for_key(&Self::record_key(library_id))
    }

    fn record_paths_for_key(&self, key: &str) -> RecordPaths {
        RecordPaths {
            target: self.documents_dir().join(format!("{key}.json")),
            next: self.documents_dir().join(format!("{key}.next")),
            previous: self.documents_dir().join(format!("{key}.previous")),
            recovery: self.recovery_dir().join(format!("{key}.json")),
        }
    }

    fn write_synced(path: &Path, bytes: &[u8]) -> Result<(), String> {
        let mut file = File::create(path).map_err(|error| error.to_string())?;
        file.write_all(bytes).map_err(|error| error.to_string())?;
        file.sync_all().map_err(|error| error.to_string())
    }

    fn sync_directory(path: &Path) -> Result<(), String> {
        File::open(path)
            .and_then(|directory| directory.sync_all())
            .map_err(|error| error.to_string())
    }

    fn atomic_write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<(), String> {
        let bytes = serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?;
        let temporary = path.with_extension("tmp");
        Self::write_synced(&temporary, &bytes)?;
        if path.exists() {
            fs::remove_file(path).map_err(|error| error.to_string())?;
        }
        fs::rename(&temporary, path).map_err(|error| error.to_string())?;
        if let Some(parent) = path.parent() {
            Self::sync_directory(parent)?;
        }
        Ok(())
    }

    fn read_record_file(path: &Path) -> Result<NotebookStoredRecordV1, String> {
        let bytes = fs::read(path).map_err(|error| error.to_string())?;
        let record = serde_json::from_slice::<NotebookStoredRecordV1>(&bytes)
            .map_err(|error| error.to_string())?;
        migrate_stored_record(record)
    }

    fn recover_paths(&self, paths: &RecordPaths) -> Result<Option<NotebookStoredRecordV1>, String> {
        let target = Self::read_record_file(&paths.target).ok();
        if let Some(record) = target {
            let _ = fs::remove_file(&paths.next);
            let _ = fs::remove_file(&paths.previous);
            return Ok(Some(record));
        }
        let replacement = Self::read_record_file(&paths.next)
            .ok()
            .or_else(|| Self::read_record_file(&paths.previous).ok());
        let Some(record) = replacement else {
            if paths.target.exists() || paths.next.exists() || paths.previous.exists() {
                return Err("Notebook recovery found no valid record copy.".into());
            }
            return Ok(None);
        };
        let source = if Self::read_record_file(&paths.next).is_ok() {
            &paths.next
        } else {
            &paths.previous
        };
        let _ = fs::remove_file(&paths.target);
        fs::rename(source, &paths.target).map_err(|error| error.to_string())?;
        let _ = fs::remove_file(&paths.next);
        let _ = fs::remove_file(&paths.previous);
        Self::sync_directory(&self.documents_dir())?;
        Ok(Some(record))
    }

    fn recover_all(&self) -> Result<(), String> {
        for entry in fs::read_dir(self.recovery_dir()).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            let metadata = fs::read(&path).ok().and_then(|bytes| {
                serde_json::from_slice::<NotebookRecoveryMetadataV1>(&bytes).ok()
            });
            if let Some(metadata) = metadata {
                let paths = self.record_paths(&metadata.library_id);
                let _ = self.recover_paths(&paths)?;
            }
        }
        Ok(())
    }

    fn save_record_locked(
        &self,
        record: &NotebookStoredRecordV1,
        expected_revision: Option<u64>,
        require_absent: bool,
    ) -> Result<NotebookStoredRecordV1, String> {
        validate_stored_record(record)?;
        let paths = self.record_paths(&record.library_id);
        let current = self.recover_paths(&paths)?;
        if require_absent && current.is_some() {
            return Err("Notebook revision conflict.".into());
        }
        if let Some(expected) = expected_revision {
            if current.as_ref().map(|value| value.revision) != Some(expected) {
                return Err("Notebook revision conflict.".into());
            }
        }
        if current
            .as_ref()
            .is_some_and(|value| record.revision <= value.revision)
        {
            return Err("Notebook revision must advance.".into());
        }
        let bytes = serde_json::to_vec_pretty(record).map_err(|error| error.to_string())?;
        Self::write_synced(&paths.next, &bytes)?;
        let recovery = NotebookRecoveryMetadataV1 {
            version: 1,
            library_id: record.library_id.clone(),
            revision: record.revision,
            document_sha256: sha256_hex(&bytes),
            phase: "prepared".into(),
            target_file: paths
                .target
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into(),
            next_file: paths
                .next
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into(),
            previous_file: paths
                .previous
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .into(),
        };
        Self::atomic_write_json(&paths.recovery, &recovery)?;
        let _ = fs::remove_file(&paths.previous);
        if paths.target.exists() {
            fs::rename(&paths.target, &paths.previous).map_err(|error| error.to_string())?;
        }
        if let Err(error) = fs::rename(&paths.next, &paths.target) {
            if paths.previous.exists() {
                let _ = fs::rename(&paths.previous, &paths.target);
            }
            return Err(error.to_string());
        }
        Self::sync_directory(&self.documents_dir())?;
        let _ = fs::remove_file(&paths.previous);
        let complete = NotebookRecoveryMetadataV1 {
            phase: "complete".into(),
            ..recovery
        };
        Self::atomic_write_json(&paths.recovery, &complete)?;
        Ok(record.clone())
    }

    pub fn save_record(
        &self,
        record: NotebookStoredRecordV1,
        expected_revision: Option<u64>,
        require_absent: bool,
    ) -> Result<NotebookStoredRecordV1, String> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        self.save_record_locked(&record, expected_revision, require_absent)
    }

    pub fn load_record(&self, library_id: &str) -> Result<Option<NotebookStoredRecordV1>, String> {
        if !model::is_library_id(library_id) {
            return Err("Notebook library identity is invalid.".into());
        }
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let record = self.recover_paths(&self.record_paths(library_id))?;
        if record
            .as_ref()
            .is_some_and(|record| record.library_id != library_id)
        {
            return Err("Notebook record identity does not match its storage key.".into());
        }
        Ok(record)
    }

    pub fn list_records(&self) -> Result<Vec<NotebookStoredRecordSummaryV1>, String> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let mut summaries = Vec::new();
        for entry in fs::read_dir(self.documents_dir()).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            summaries.push(summarize_record(&Self::read_record_file(&path)?)?);
        }
        summaries.sort_by(|left, right| right.saved_at.cmp(&left.saved_at));
        Ok(summaries)
    }

    pub fn delete_record(&self, library_id: &str) -> Result<(), String> {
        if !model::is_library_id(library_id) {
            return Err("Notebook library identity is invalid.".into());
        }
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let paths = self.record_paths(library_id);
        for path in [paths.target, paths.next, paths.previous, paths.recovery] {
            match fs::remove_file(path) {
                Ok(()) => {}
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(error) => return Err(error.to_string()),
            }
        }
        Ok(())
    }

    fn trash_path(&self, library_id: &str) -> PathBuf {
        self.trash_dir()
            .join(format!("{}.json", Self::record_key(library_id)))
    }

    fn versions_path(&self, library_id: &str) -> PathBuf {
        self.versions_dir().join(Self::record_key(library_id))
    }

    pub fn list_versions(
        &self,
        library_id: &str,
    ) -> Result<Vec<NotebookVersionSnapshotV1>, String> {
        if !model::is_library_id(library_id) {
            return Err("Notebook library identity is invalid.".into());
        }
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        self.list_versions_locked(library_id)
    }

    fn list_versions_locked(
        &self,
        library_id: &str,
    ) -> Result<Vec<NotebookVersionSnapshotV1>, String> {
        let directory = self.versions_path(library_id);
        if !directory.exists() {
            return Ok(Vec::new());
        }
        let mut snapshots = Vec::new();
        for entry in fs::read_dir(directory).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.extension().and_then(|value| value.to_str()) != Some("json") {
                continue;
            }
            let snapshot = serde_json::from_slice::<NotebookVersionSnapshotV1>(
                &fs::read(path).map_err(|error| error.to_string())?,
            )
            .map_err(|error| error.to_string())?;
            let snapshot = migrate_version_snapshot(snapshot)?;
            if snapshot.library_id != library_id {
                return Err("Notebook version identity does not match its directory.".into());
            }
            snapshots.push(snapshot);
        }
        snapshots.sort_by(|left, right| right.created_at.cmp(&left.created_at));
        Ok(snapshots)
    }

    pub fn save_version(&self, snapshot: NotebookVersionSnapshotV1) -> Result<(), String> {
        validate_version_snapshot(&snapshot)?;
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let directory = self.versions_path(&snapshot.library_id);
        fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
        let path = directory.join(format!(
            "{}.json",
            sha256_hex(snapshot.snapshot_id.as_bytes())
        ));
        Self::atomic_write_json(&path, &snapshot)?;
        self.prune_versions_locked(&snapshot.library_id)
    }

    fn prune_versions_locked(&self, library_id: &str) -> Result<(), String> {
        const MAX_COUNT: usize = 50;
        const MAX_AGE: std::time::Duration = std::time::Duration::from_secs(30 * 24 * 60 * 60);
        let directory = self.versions_path(library_id);
        let now = std::time::SystemTime::now();
        let mut entries = fs::read_dir(&directory)
            .map_err(|error| error.to_string())?
            .filter_map(Result::ok)
            .filter(|entry| {
                entry.path().extension().and_then(|value| value.to_str()) == Some("json")
            })
            .map(|entry| {
                let modified = entry
                    .metadata()
                    .and_then(|metadata| metadata.modified())
                    .unwrap_or(std::time::UNIX_EPOCH);
                (entry.path(), modified)
            })
            .collect::<Vec<_>>();
        entries.sort_by(|left, right| right.1.cmp(&left.1));
        for (index, (path, modified)) in entries.into_iter().enumerate() {
            let expired = now.duration_since(modified).is_ok_and(|age| age > MAX_AGE);
            if index >= MAX_COUNT || expired {
                fs::remove_file(path).map_err(|error| error.to_string())?;
            }
        }
        Self::sync_directory(&directory)
    }

    pub fn move_record_to_trash(&self, library_id: &str) -> Result<NotebookStoredRecordV1, String> {
        if !model::is_library_id(library_id) {
            return Err("Notebook library identity is invalid.".into());
        }
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let paths = self.record_paths(library_id);
        let record = self
            .recover_paths(&paths)?
            .ok_or_else(|| "Notebook record does not exist.".to_string())?;
        let trash_path = self.trash_path(library_id);
        Self::atomic_write_json(&trash_path, &record)?;
        for path in [paths.target, paths.next, paths.previous, paths.recovery] {
            let _ = fs::remove_file(path);
        }
        Self::sync_directory(&self.documents_dir())?;
        Ok(record)
    }

    pub fn list_trash(&self) -> Result<Vec<NotebookStoredRecordSummaryV1>, String> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let mut summaries = Vec::new();
        for entry in fs::read_dir(self.trash_dir()).map_err(|error| error.to_string())? {
            let path = entry.map_err(|error| error.to_string())?.path();
            if path.extension().and_then(|value| value.to_str()) == Some("json") {
                summaries.push(summarize_record(&Self::read_record_file(&path)?)?);
            }
        }
        summaries.sort_by(|left, right| right.saved_at.cmp(&left.saved_at));
        Ok(summaries)
    }

    pub fn restore_record_from_trash(
        &self,
        library_id: &str,
    ) -> Result<NotebookStoredRecordV1, String> {
        if !model::is_library_id(library_id) {
            return Err("Notebook library identity is invalid.".into());
        }
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let paths = self.record_paths(library_id);
        if self.recover_paths(&paths)?.is_some() {
            return Err("Notebook library identity is already active.".into());
        }
        let trash_path = self.trash_path(library_id);
        let record = Self::read_record_file(&trash_path)
            .map_err(|_| "Notebook trash record does not exist.".to_string())?;
        Self::write_synced(
            &paths.next,
            &serde_json::to_vec_pretty(&record).map_err(|error| error.to_string())?,
        )?;
        fs::rename(&paths.next, &paths.target).map_err(|error| error.to_string())?;
        fs::remove_file(trash_path).map_err(|error| error.to_string())?;
        Self::sync_directory(&self.documents_dir())?;
        Ok(record)
    }

    pub fn delete_record_permanently(&self, library_id: &str) -> Result<(), String> {
        if !model::is_library_id(library_id) {
            return Err("Notebook library identity is invalid.".into());
        }
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        match fs::remove_file(self.trash_path(library_id)) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.to_string()),
        }
        match fs::remove_dir_all(self.versions_path(library_id)) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.to_string()),
        }
        Ok(())
    }

    fn asset_paths(&self, asset_id: &str) -> Result<(PathBuf, PathBuf), String> {
        let hash = asset_id
            .strip_prefix("sha256:")
            .filter(|hash| model::is_sha256(hash))
            .ok_or_else(|| "Notebook asset identity is invalid.".to_string())?;
        Ok((
            self.assets_dir().join(format!("{hash}.bin")),
            self.assets_dir().join(format!("{hash}.json")),
        ))
    }

    fn put_asset_locked(
        &self,
        bytes: &[u8],
        mime_type: &str,
        created_at: &str,
    ) -> Result<(NotebookAssetMetadataV1, bool), String> {
        let sha256 = sha256_hex(bytes);
        let metadata = NotebookAssetMetadataV1 {
            version: 1,
            id: format!("sha256:{sha256}"),
            sha256,
            byte_length: bytes.len() as u64,
            mime_type: mime_type.into(),
            created_at: created_at.into(),
        };
        validate_asset_bytes(&metadata, bytes)?;
        let (data_path, metadata_path) = self.asset_paths(&metadata.id)?;
        if data_path.exists() || metadata_path.exists() {
            let existing = self
                .load_asset_locked(&metadata.id)?
                .ok_or_else(|| "Notebook asset store contains an incomplete entry.".to_string())?;
            if existing.metadata.mime_type != metadata.mime_type || existing.bytes != bytes {
                return Err("Notebook asset hash conflicts with stored content.".into());
            }
            return Ok((existing.metadata, false));
        }
        let temporary = data_path.with_extension("tmp");
        Self::write_synced(&temporary, bytes)?;
        fs::rename(&temporary, &data_path).map_err(|error| error.to_string())?;
        if let Err(error) = Self::atomic_write_json(&metadata_path, &metadata) {
            let _ = fs::remove_file(&data_path);
            return Err(error);
        }
        Self::sync_directory(&self.assets_dir())?;
        Ok((metadata, true))
    }

    pub fn put_asset(
        &self,
        bytes: Vec<u8>,
        mime_type: String,
        created_at: String,
    ) -> Result<NotebookAssetMetadataV1, String> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        self.put_asset_locked(&bytes, &mime_type, &created_at)
            .map(|(metadata, _)| metadata)
    }

    fn load_asset_locked(&self, asset_id: &str) -> Result<Option<NotebookAssetPayloadV1>, String> {
        if !is_asset_id(asset_id) {
            return Err("Notebook asset identity is invalid.".into());
        }
        let (data_path, metadata_path) = self.asset_paths(asset_id)?;
        if !data_path.exists() && !metadata_path.exists() {
            return Ok(None);
        }
        let metadata = serde_json::from_slice::<NotebookAssetMetadataV1>(
            &fs::read(metadata_path).map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
        let bytes = fs::read(data_path).map_err(|error| error.to_string())?;
        validate_asset_bytes(&metadata, &bytes)?;
        Ok(Some(NotebookAssetPayloadV1 { metadata, bytes }))
    }

    pub fn load_asset(&self, asset_id: &str) -> Result<Option<NotebookAssetPayloadV1>, String> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        self.load_asset_locked(asset_id)
    }

    pub fn delete_asset(&self, asset_id: &str) -> Result<(), String> {
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let (data_path, metadata_path) = self.asset_paths(asset_id)?;
        let _ = fs::remove_file(data_path);
        let _ = fs::remove_file(metadata_path);
        Ok(())
    }

    pub fn export_package(&self, record: NotebookStoredRecordV1) -> Result<Vec<u8>, String> {
        validate_stored_record(&record)?;
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let mut assets = Vec::with_capacity(record.asset_ids.len());
        for asset_id in &record.asset_ids {
            assets.push(
                self.load_asset_locked(asset_id)?
                    .ok_or_else(|| format!("Notebook asset {asset_id} is missing."))?,
            );
        }
        export_package(&record, &assets)
    }

    pub fn inspect_package(&self, bytes: &[u8]) -> Result<NotebookPackageInspectionV1, String> {
        inspect_package(bytes).map(|package| inspection(&package))
    }

    pub fn import_package(&self, bytes: &[u8]) -> Result<NotebookStoredRecordV1, String> {
        let package = inspect_package(bytes)?;
        let record = NotebookStoredRecordV1 {
            version: 1,
            library_id: format!("notebook.{}", Uuid::new_v4()),
            revision: 1,
            saved_at: package.manifest.created_at.clone(),
            document: package.document,
            asset_ids: package
                .manifest
                .assets
                .iter()
                .map(|asset| asset.id.clone())
                .collect(),
        };
        validate_stored_record(&record)?;
        let _guard = self
            .operation_lock
            .lock()
            .map_err(|_| "Notebook storage is unavailable.".to_string())?;
        let mut created_assets = Vec::new();
        for asset in package.assets {
            match self.put_asset_locked(
                &asset.bytes,
                &asset.metadata.mime_type,
                &asset.metadata.created_at,
            ) {
                Ok((metadata, true)) => created_assets.push(metadata.id),
                Ok(_) => {}
                Err(error) => {
                    self.remove_import_assets(&created_assets);
                    return Err(error);
                }
            }
        }
        if let Err(error) = self.save_record_locked(&record, None, true) {
            self.remove_import_assets(&created_assets);
            return Err(error);
        }
        Ok(record)
    }

    fn remove_import_assets(&self, asset_ids: &[String]) {
        for asset_id in asset_ids {
            if let Ok((data_path, metadata_path)) = self.asset_paths(asset_id) {
                let _ = fs::remove_file(data_path);
                let _ = fs::remove_file(metadata_path);
            }
        }
    }
}

#[tauri::command]
pub fn notebook_list_records(
    state: State<'_, NotebookStorage>,
) -> Result<Vec<NotebookStoredRecordSummaryV1>, String> {
    state.list_records()
}

#[tauri::command]
pub fn notebook_load_record(
    library_id: String,
    state: State<'_, NotebookStorage>,
) -> Result<Option<NotebookStoredRecordV1>, String> {
    state.load_record(&library_id)
}

#[tauri::command]
pub fn notebook_save_record(
    record: NotebookStoredRecordV1,
    expected_revision: Option<u64>,
    require_absent: bool,
    state: State<'_, NotebookStorage>,
) -> Result<NotebookStoredRecordV1, String> {
    state.save_record(record, expected_revision, require_absent)
}

#[tauri::command]
pub fn notebook_delete_record(
    library_id: String,
    state: State<'_, NotebookStorage>,
) -> Result<(), String> {
    state.delete_record(&library_id)
}

#[tauri::command]
pub fn notebook_put_asset(
    bytes: Vec<u8>,
    mime_type: String,
    created_at: String,
    state: State<'_, NotebookStorage>,
) -> Result<NotebookAssetMetadataV1, String> {
    state.put_asset(bytes, mime_type, created_at)
}

#[tauri::command]
pub fn notebook_load_asset(
    asset_id: String,
    state: State<'_, NotebookStorage>,
) -> Result<Option<NotebookAssetPayloadV1>, String> {
    state.load_asset(&asset_id)
}

#[tauri::command]
pub fn notebook_delete_asset(
    asset_id: String,
    state: State<'_, NotebookStorage>,
) -> Result<(), String> {
    state.delete_asset(&asset_id)
}

#[tauri::command]
pub fn notebook_export_package(
    record: NotebookStoredRecordV1,
    state: State<'_, NotebookStorage>,
) -> Result<Vec<u8>, String> {
    state.export_package(record)
}

#[tauri::command]
pub fn notebook_inspect_package(
    bytes: Vec<u8>,
    state: State<'_, NotebookStorage>,
) -> Result<NotebookPackageInspectionV1, String> {
    state.inspect_package(&bytes)
}

#[tauri::command]
pub fn notebook_import_package(
    bytes: Vec<u8>,
    state: State<'_, NotebookStorage>,
) -> Result<NotebookStoredRecordV1, String> {
    state.import_package(&bytes)
}

#[tauri::command]
pub fn notebook_list_versions(
    library_id: String,
    state: State<'_, NotebookStorage>,
) -> Result<Vec<NotebookVersionSnapshotV1>, String> {
    state.list_versions(&library_id)
}

#[tauri::command]
pub fn notebook_save_version(
    snapshot: NotebookVersionSnapshotV1,
    state: State<'_, NotebookStorage>,
) -> Result<(), String> {
    state.save_version(snapshot)
}

#[tauri::command]
pub fn notebook_move_record_to_trash(
    library_id: String,
    state: State<'_, NotebookStorage>,
) -> Result<NotebookStoredRecordV1, String> {
    state.move_record_to_trash(&library_id)
}

#[tauri::command]
pub fn notebook_list_trash(
    state: State<'_, NotebookStorage>,
) -> Result<Vec<NotebookStoredRecordSummaryV1>, String> {
    state.list_trash()
}

#[tauri::command]
pub fn notebook_restore_record_from_trash(
    library_id: String,
    state: State<'_, NotebookStorage>,
) -> Result<NotebookStoredRecordV1, String> {
    state.restore_record_from_trash(&library_id)
}

#[tauri::command]
pub fn notebook_delete_record_permanently(
    library_id: String,
    state: State<'_, NotebookStorage>,
) -> Result<(), String> {
    state.delete_record_permanently(&library_id)
}

#[cfg(test)]
mod tests;
