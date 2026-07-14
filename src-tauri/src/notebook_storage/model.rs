use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::HashSet;

pub const STORED_RECORD_VERSION: u8 = 1;
pub const ASSET_RECORD_VERSION: u8 = 1;
pub const PACKAGE_MANIFEST_VERSION: u8 = 1;
pub const VERSION_SNAPSHOT_VERSION: u8 = 1;
pub const PACKAGE_KIND: &str = "calcwiz-notebook";
pub const DOCUMENT_PATH: &str = "document.json";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotebookStoredRecordV1 {
    pub version: u8,
    pub library_id: String,
    pub revision: u64,
    pub saved_at: String,
    pub document: Value,
    pub asset_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotebookStoredRecordSummaryV1 {
    pub version: u8,
    pub library_id: String,
    pub revision: u64,
    pub saved_at: String,
    pub document_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub block_count: u64,
    pub word_count: u64,
    pub asset_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NotebookAssetMetadataV1 {
    pub version: u8,
    pub id: String,
    pub sha256: String,
    pub byte_length: u64,
    pub mime_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotebookAssetPayloadV1 {
    pub metadata: NotebookAssetMetadataV1,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotebookPackageManifestV1 {
    pub version: u8,
    pub kind: String,
    pub created_at: String,
    pub source_library_id: String,
    pub source_revision: u64,
    pub document_path: String,
    pub document_sha256: String,
    pub assets: Vec<NotebookAssetMetadataV1>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotebookPackageInspectionV1 {
    pub manifest: NotebookPackageManifestV1,
    pub document: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NotebookVersionSnapshotV1 {
    pub version: u8,
    pub snapshot_id: String,
    pub library_id: String,
    pub revision: u64,
    pub created_at: String,
    pub reason: String,
    pub record: NotebookStoredRecordV1,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NotebookRecoveryMetadataV1 {
    pub version: u8,
    pub library_id: String,
    pub revision: u64,
    pub document_sha256: String,
    pub phase: String,
    pub target_file: String,
    pub next_file: String,
    pub previous_file: String,
}

fn object(value: &Value) -> Result<&Map<String, Value>, String> {
    value
        .as_object()
        .ok_or_else(|| "Notebook value must be an object.".to_string())
}

fn required_string<'a>(object: &'a Map<String, Value>, field: &str) -> Result<&'a str, String> {
    object
        .get(field)
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("Notebook field {field} must be a non-empty string."))
}

fn optional_string(object: &Map<String, Value>, field: &str) -> Result<(), String> {
    if let Some(value) = object.get(field) {
        if !value.is_string() {
            return Err(format!("Notebook field {field} must be a string."));
        }
    }
    Ok(())
}

fn optional_bool(object: &Map<String, Value>, field: &str) -> Result<Option<bool>, String> {
    match object.get(field) {
        None => Ok(None),
        Some(value) => value
            .as_bool()
            .map(Some)
            .ok_or_else(|| format!("Notebook field {field} must be a boolean.")),
    }
}

fn validate_paragraph_format(value: &Value) -> Result<(), String> {
    let format = object(value)?;
    if format.keys().any(|key| {
        !matches!(
            key.as_str(),
            "alignment" | "lineSpacing" | "spaceBeforePt" | "spaceAfterPt"
        )
    }) {
        return Err("Notebook paragraph format contains an unknown field.".into());
    }
    if let Some(alignment) = format.get("alignment") {
        if !matches!(
            alignment.as_str(),
            Some("left" | "center" | "right" | "justify")
        ) {
            return Err("Notebook paragraph alignment is invalid.".into());
        }
    }
    if let Some(spacing) = format.get("lineSpacing").and_then(Value::as_f64) {
        if ![1.0, 1.15, 1.5, 2.0]
            .iter()
            .any(|allowed| (spacing - allowed).abs() < f64::EPSILON)
        {
            return Err("Notebook line spacing is invalid.".into());
        }
    } else if format.contains_key("lineSpacing") {
        return Err("Notebook line spacing is invalid.".into());
    }
    for field in ["spaceBeforePt", "spaceAfterPt"] {
        if let Some(space) = format.get(field).and_then(Value::as_u64) {
            if ![0, 6, 12, 18, 24].contains(&space) {
                return Err(format!("Notebook {field} is invalid."));
            }
        } else if format.contains_key(field) {
            return Err(format!("Notebook {field} is invalid."));
        }
    }
    Ok(())
}

fn validate_mark(value: &Value) -> Result<(), String> {
    let mark = object(value)?;
    let mark_type = required_string(mark, "type")?;
    match mark_type {
        "bold" | "italic" | "strike" | "underline" => Ok(()),
        "highlight" => optional_string(mark, "color"),
        "textStyle" => {
            optional_string(mark, "color")?;
            if let Some(font_size) = mark.get("fontSize").and_then(Value::as_u64) {
                if !(50..=249).contains(&font_size) {
                    return Err("Notebook font size is invalid.".into());
                }
            } else if mark.contains_key("fontSize") {
                return Err("Notebook font size is invalid.".into());
            }
            Ok(())
        }
        _ => Err("Notebook text mark is unsupported.".into()),
    }
}

fn validate_inline(value: &Value) -> Result<(), String> {
    let inline = object(value)?;
    match required_string(inline, "type")? {
        "text" => {
            inline
                .get("text")
                .and_then(Value::as_str)
                .ok_or_else(|| "Notebook text node is invalid.".to_string())?;
            if let Some(marks) = inline.get("marks") {
                for mark in marks
                    .as_array()
                    .ok_or_else(|| "Notebook text marks must be an array.".to_string())?
                {
                    validate_mark(mark)?;
                }
            }
            Ok(())
        }
        "inlineMath" => {
            required_string(inline, "id")?;
            inline
                .get("sourceText")
                .and_then(Value::as_str)
                .ok_or_else(|| "Notebook inline math source is invalid.".to_string())?;
            inline
                .get("latex")
                .and_then(Value::as_str)
                .ok_or_else(|| "Notebook inline math LaTeX is invalid.".to_string())?;
            validate_workspace_target(required_string(inline, "workspaceTarget")?)
        }
        _ => Err("Notebook inline node is unsupported.".into()),
    }
}

fn validate_workspace_target(target: &str) -> Result<(), String> {
    if matches!(
        target,
        "calculate"
            | "equation"
            | "matrix"
            | "vector"
            | "table"
            | "calculus"
            | "trigonometry"
            | "statistics"
            | "geometry"
    ) {
        Ok(())
    } else {
        Err("Notebook workspace target is unsupported.".into())
    }
}

fn validate_accent(value: Option<&Value>) -> Result<(), String> {
    let Some(value) = value else {
        return Ok(());
    };
    let color = value
        .as_str()
        .ok_or_else(|| "Notebook accent color must be a string.".to_string())?;
    if color.len() == 7
        && color.starts_with('#')
        && color[1..].bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        Ok(())
    } else {
        Err("Notebook accent color must be six-digit hexadecimal.".into())
    }
}

fn validate_block(value: &Value, depth: usize) -> Result<(), String> {
    if depth > 256 {
        return Err("Notebook nesting exceeds the safety limit.".into());
    }
    let node = object(value)?;
    let node_type = required_string(node, "type")?;
    required_string(node, "id")?;
    if !matches!(node_type, "paragraph" | "heading") && node.contains_key("format") {
        return Err("Notebook format is attached to an ineligible node.".into());
    }
    if !matches!(node_type, "bulletList" | "orderedList") && node.contains_key("style") {
        return Err("Notebook list style is attached to an ineligible node.".into());
    }
    match node_type {
        "paragraph" | "heading" => {
            if node_type == "heading"
                && !matches!(node.get("level").and_then(Value::as_u64), Some(1..=3))
            {
                return Err("Notebook heading level is invalid.".into());
            }
            if let Some(format) = node.get("format") {
                validate_paragraph_format(format)?;
            }
            if let Some(content) = node.get("content") {
                for inline in content
                    .as_array()
                    .ok_or_else(|| "Notebook prose content must be an array.".to_string())?
                {
                    validate_inline(inline)?;
                }
            }
            Ok(())
        }
        "displayMath" => {
            optional_string(node, "label")?;
            node.get("sourceText")
                .and_then(Value::as_str)
                .ok_or_else(|| "Notebook display math source is invalid.".to_string())?;
            node.get("latex")
                .and_then(Value::as_str)
                .ok_or_else(|| "Notebook display math LaTeX is invalid.".to_string())?;
            validate_workspace_target(required_string(node, "workspaceTarget")?)
        }
        "evidenceSnapshot" => {
            if !matches!(
                node.get("source").and_then(Value::as_str),
                Some("future-current-result" | "future-history-entry" | "manual-placeholder")
            ) {
                return Err("Notebook evidence source is invalid.".into());
            }
            required_string(node, "title")?;
            optional_string(node, "inputLatex")?;
            optional_string(node, "resultLatex")?;
            for field in ["facts", "warnings"] {
                if !node
                    .get(field)
                    .and_then(Value::as_array)
                    .is_some_and(|values| values.iter().all(Value::is_string))
                {
                    return Err(format!("Notebook evidence {field} must be strings."));
                }
            }
            Ok(())
        }
        "horizontalRule" => Ok(()),
        "bulletList" | "orderedList" => {
            if let Some(style) = node.get("style").and_then(Value::as_str) {
                let valid = if node_type == "bulletList" {
                    matches!(style, "disc" | "circle" | "square" | "dash")
                } else {
                    matches!(style, "decimal" | "lower-alpha" | "lower-roman")
                };
                if !valid {
                    return Err("Notebook list style is invalid for its list kind.".into());
                }
            } else if node.contains_key("style") {
                return Err("Notebook list style must be a string.".into());
            }
            for item in node
                .get("content")
                .and_then(Value::as_array)
                .ok_or_else(|| "Notebook list content must be an array.".to_string())?
            {
                let item = object(item)?;
                if required_string(item, "type")? != "listItem" {
                    return Err("Notebook list contains a non-item node.".into());
                }
                required_string(item, "id")?;
                validate_block_content(item, depth + 1)?;
            }
            Ok(())
        }
        "semanticBlock" | "section" => {
            validate_accent(node.get("accentColor"))?;
            let collapsible = optional_bool(node, "collapsible")?;
            let collapsed = optional_bool(node, "collapsed")?;
            let default_collapsible = if node_type == "section" {
                required_string(node, "title")?;
                true
            } else {
                optional_string(node, "label")?;
                optional_string(node, "number")?;
                let variant = required_string(node, "variant")?;
                if !matches!(
                    variant,
                    "theorem"
                        | "definition"
                        | "lemma"
                        | "corollary"
                        | "proof"
                        | "example"
                        | "solution"
                        | "exercise"
                        | "hint"
                        | "answer"
                        | "note"
                        | "warning"
                ) {
                    return Err("Notebook semantic variant is unsupported.".into());
                }
                matches!(variant, "hint" | "answer")
            };
            if collapsed == Some(true) && !collapsible.unwrap_or(default_collapsible) {
                return Err("Notebook collapsed state is incompatible with behavior.".into());
            }
            validate_block_content(node, depth + 1)
        }
        _ => Err("Notebook block type is unsupported.".into()),
    }
}

fn validate_block_content(node: &Map<String, Value>, depth: usize) -> Result<(), String> {
    for child in node
        .get("content")
        .and_then(Value::as_array)
        .ok_or_else(|| "Notebook block content must be an array.".to_string())?
    {
        validate_block(child, depth)?;
    }
    Ok(())
}

pub fn validate_notebook_document(document: &Value) -> Result<(), String> {
    let document = object(document)?;
    if document.get("version").and_then(Value::as_u64) != Some(6) {
        return Err("Notebook package requires an app-document version 6.".into());
    }
    required_string(document, "id")?;
    document
        .get("title")
        .and_then(Value::as_str)
        .ok_or_else(|| "Notebook title is invalid.".to_string())?;
    required_string(document, "createdAt")?;
    required_string(document, "updatedAt")?;
    if !matches!(
        document.get("selectedNodeId"),
        Some(Value::String(_) | Value::Null)
    ) {
        return Err("Notebook selected node identity is invalid.".into());
    }
    for node in document
        .get("content")
        .and_then(Value::as_array)
        .ok_or_else(|| "Notebook document content must be an array.".to_string())?
    {
        validate_block(node, 0)?;
    }
    Ok(())
}

pub fn is_library_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 160
        && value.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_alphanumeric() || (index > 0 && b"._:-".contains(&byte))
        })
}

pub fn is_sha256(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

pub fn is_asset_id(value: &str) -> bool {
    value.strip_prefix("sha256:").is_some_and(is_sha256)
}

pub fn validate_version_snapshot(snapshot: &NotebookVersionSnapshotV1) -> Result<(), String> {
    validate_stored_record(&snapshot.record)?;
    if snapshot.version != VERSION_SNAPSHOT_VERSION
        || !snapshot.snapshot_id.starts_with("snapshot.")
        || snapshot.snapshot_id.len() > 189
        || !snapshot
            .snapshot_id
            .bytes()
            .skip("snapshot.".len())
            .all(|byte| byte.is_ascii_alphanumeric() || b"._:-".contains(&byte))
        || !is_library_id(&snapshot.library_id)
        || snapshot.revision == 0
        || snapshot.created_at.is_empty()
        || !matches!(
            snapshot.reason.as_str(),
            "initial" | "periodic" | "before-restore" | "before-trash"
        )
        || snapshot.record.library_id != snapshot.library_id
        || snapshot.record.revision != snapshot.revision
    {
        return Err("Notebook version snapshot is invalid.".into());
    }
    Ok(())
}

pub fn validate_asset_metadata(metadata: &NotebookAssetMetadataV1) -> Result<(), String> {
    if metadata.version != ASSET_RECORD_VERSION
        || !is_sha256(&metadata.sha256)
        || metadata.id != format!("sha256:{}", metadata.sha256)
        || metadata.created_at.is_empty()
        || !matches!(
            metadata.mime_type.as_str(),
            "image/png"
                | "image/jpeg"
                | "image/webp"
                | "image/svg+xml"
                | "video/mp4"
                | "video/webm"
                | "text/vtt"
        )
    {
        return Err("Notebook asset metadata is invalid.".into());
    }
    Ok(())
}

pub fn validate_stored_record(record: &NotebookStoredRecordV1) -> Result<(), String> {
    if record.version != STORED_RECORD_VERSION
        || !is_library_id(&record.library_id)
        || record.revision == 0
        || record.saved_at.is_empty()
    {
        return Err("Notebook stored-record envelope is invalid.".into());
    }
    validate_notebook_document(&record.document)?;
    let mut assets = HashSet::new();
    for asset_id in &record.asset_ids {
        if !is_asset_id(asset_id) || !assets.insert(asset_id) {
            return Err("Notebook stored record contains invalid or duplicate assets.".into());
        }
    }
    Ok(())
}

fn count_words(value: &str) -> u64 {
    value
        .split(|character: char| {
            !character.is_alphanumeric() && character != '\'' && character != '’'
        })
        .filter(|word| word.chars().any(char::is_alphanumeric))
        .count() as u64
}

fn measure_node(value: &Value, block_count: &mut u64, word_count: &mut u64) {
    let Some(node) = value.as_object() else {
        return;
    };
    *block_count += 1;
    match node.get("type").and_then(Value::as_str) {
        Some("paragraph" | "heading") => {
            for inline in node
                .get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                if inline.get("type").and_then(Value::as_str) == Some("text") {
                    *word_count +=
                        count_words(inline.get("text").and_then(Value::as_str).unwrap_or(""));
                }
            }
        }
        Some("semanticBlock") => {
            *word_count += count_words(node.get("label").and_then(Value::as_str).unwrap_or(""));
        }
        Some("section") => {
            *word_count += count_words(node.get("title").and_then(Value::as_str).unwrap_or(""));
        }
        Some("evidenceSnapshot") => {
            *word_count += count_words(node.get("title").and_then(Value::as_str).unwrap_or(""));
            for field in ["facts", "warnings"] {
                for text in node
                    .get(field)
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                {
                    *word_count += count_words(text.as_str().unwrap_or(""));
                }
            }
        }
        _ => {}
    }
    if matches!(
        node.get("type").and_then(Value::as_str),
        Some("bulletList" | "orderedList")
    ) {
        for item in node
            .get("content")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            for child in item
                .get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
            {
                measure_node(child, block_count, word_count);
            }
        }
    } else if matches!(
        node.get("type").and_then(Value::as_str),
        Some("semanticBlock" | "section")
    ) {
        for child in node
            .get("content")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            measure_node(child, block_count, word_count);
        }
    }
}

pub fn summarize_record(
    record: &NotebookStoredRecordV1,
) -> Result<NotebookStoredRecordSummaryV1, String> {
    validate_stored_record(record)?;
    let document = object(&record.document)?;
    let mut block_count = 0;
    let mut word_count = 0;
    for node in document
        .get("content")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        measure_node(node, &mut block_count, &mut word_count);
    }
    Ok(NotebookStoredRecordSummaryV1 {
        version: STORED_RECORD_VERSION,
        library_id: record.library_id.clone(),
        revision: record.revision,
        saved_at: record.saved_at.clone(),
        document_id: required_string(document, "id")?.into(),
        title: document
            .get("title")
            .and_then(Value::as_str)
            .unwrap_or("")
            .into(),
        created_at: required_string(document, "createdAt")?.into(),
        updated_at: required_string(document, "updatedAt")?.into(),
        block_count,
        word_count,
        asset_count: record.asset_ids.len(),
    })
}
