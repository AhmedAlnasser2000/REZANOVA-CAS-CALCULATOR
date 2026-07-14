use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
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

fn validate_paragraph_format(value: &Value, allow_left_indent: bool) -> Result<(), String> {
    let format = object(value)?;
    if format.keys().any(|key| {
        !matches!(
            key.as_str(),
            "alignment" | "lineSpacing" | "spaceBeforePt" | "spaceAfterPt" | "leftIndentPt"
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
    if let Some(indent) = format.get("leftIndentPt").and_then(Value::as_u64) {
        if !allow_left_indent || indent > 288 || indent % 36 != 0 {
            return Err("Notebook paragraph left indent is invalid.".into());
        }
    } else if format.contains_key("leftIndentPt") {
        return Err("Notebook paragraph left indent is invalid.".into());
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

fn validate_display_aspect_ratio(value: Option<&Value>, kind: &str) -> Result<(), String> {
    let Some(value) = value else {
        return Ok(());
    };
    if value
        .as_f64()
        .is_some_and(|ratio| ratio.is_finite() && (0.1..=10.0).contains(&ratio))
    {
        Ok(())
    } else {
        Err(format!("Notebook {kind} display aspect ratio is invalid."))
    }
}

fn validate_media_placement(node: &Map<String, Value>, kind: &str) -> Result<(), String> {
    let alignment = node
        .get("alignment")
        .map(|value| {
            value
                .as_str()
                .filter(|value| matches!(*value, "left" | "center" | "right"))
                .ok_or_else(|| format!("Notebook {kind} alignment is invalid."))
        })
        .transpose()?;
    let placement = node
        .get("placement")
        .map(|value| {
            value
                .as_str()
                .filter(|value| {
                    matches!(
                        *value,
                        "normal" | "top-and-bottom" | "square-left" | "square-right"
                    )
                })
                .ok_or_else(|| format!("Notebook {kind} placement is invalid."))
        })
        .transpose()?;
    if matches!((placement, alignment), (Some("square-left"), Some(value)) if value != "left")
        || matches!((placement, alignment), (Some("square-right"), Some(value)) if value != "right")
    {
        return Err(format!(
            "Notebook {kind} placement and alignment are incompatible."
        ));
    }
    Ok(())
}

fn validate_image_figure(
    node: &Map<String, Value>,
    allow_direct_media: bool,
) -> Result<(), String> {
    const LEGACY_FIELDS: &[&str] = &[
        "type",
        "id",
        "assetId",
        "altText",
        "decorative",
        "caption",
        "numbered",
        "widthPercent",
        "alignment",
        "placement",
        "rotation",
        "crop",
    ];
    const V10_FIELDS: &[&str] = &[
        "type",
        "id",
        "assetId",
        "altText",
        "decorative",
        "caption",
        "numbered",
        "widthPercent",
        "alignment",
        "placement",
        "rotation",
        "crop",
        "displayAspectRatio",
    ];
    let allowed_fields = if allow_direct_media {
        V10_FIELDS
    } else {
        LEGACY_FIELDS
    };
    if node
        .keys()
        .any(|field| !allowed_fields.contains(&field.as_str()))
    {
        return Err("Notebook image figure contains an unknown field.".into());
    }
    if !is_asset_id(required_string(node, "assetId")?) {
        return Err("Notebook image asset identity is invalid.".into());
    }
    optional_string(node, "altText")?;
    optional_string(node, "caption")?;
    let decorative = optional_bool(node, "decorative")?;
    optional_bool(node, "numbered")?;
    if decorative == Some(true)
        && node
            .get("altText")
            .and_then(Value::as_str)
            .is_some_and(|value| !value.trim().is_empty())
    {
        return Err("Notebook decorative image cannot carry alternative text.".into());
    }
    if let Some(width) = node.get("widthPercent") {
        if !width
            .as_u64()
            .is_some_and(|value| (10..=100).contains(&value))
        {
            return Err("Notebook image width is invalid.".into());
        }
    }
    validate_media_placement(node, "image")?;
    if let Some(rotation) = node.get("rotation") {
        let valid_rotation = rotation.as_u64().is_some_and(|value| {
            if allow_direct_media {
                value <= 359
            } else {
                [0, 90, 180, 270].contains(&value)
            }
        });
        if !valid_rotation {
            return Err("Notebook image rotation is invalid.".into());
        }
    }
    if allow_direct_media {
        validate_display_aspect_ratio(node.get("displayAspectRatio"), "image")?;
    }
    if let Some(crop_value) = node.get("crop") {
        let crop = object(crop_value)?;
        if crop.len() != 4
            || !["x", "y", "width", "height"]
                .iter()
                .all(|field| crop.contains_key(*field))
        {
            return Err("Notebook image crop is invalid.".into());
        }
        let x = crop.get("x").and_then(Value::as_f64).unwrap_or(-1.0);
        let y = crop.get("y").and_then(Value::as_f64).unwrap_or(-1.0);
        let width = crop.get("width").and_then(Value::as_f64).unwrap_or(-1.0);
        let height = crop.get("height").and_then(Value::as_f64).unwrap_or(-1.0);
        if !x.is_finite()
            || !y.is_finite()
            || !width.is_finite()
            || !height.is_finite()
            || x < 0.0
            || y < 0.0
            || width <= 0.0
            || height <= 0.0
            || x + width > 1.0
            || y + height > 1.0
        {
            return Err("Notebook image crop is invalid.".into());
        }
    }
    Ok(())
}

fn is_video_track_language(value: &str) -> bool {
    let mut parts = value.split('-');
    let Some(primary) = parts.next() else {
        return false;
    };
    (2..=8).contains(&primary.len())
        && primary.bytes().all(|byte| byte.is_ascii_alphabetic())
        && parts.all(|part| {
            (1..=8).contains(&part.len()) && part.bytes().all(|byte| byte.is_ascii_alphanumeric())
        })
}

fn validate_video_figure(
    node: &Map<String, Value>,
    allow_direct_media: bool,
) -> Result<(), String> {
    const ALLOWED_FIELDS: &[&str] = &[
        "type",
        "id",
        "assetId",
        "title",
        "description",
        "caption",
        "numbered",
        "posterAssetId",
        "tracks",
        "widthPercent",
        "alignment",
        "loop",
    ];
    const V10_ALLOWED_FIELDS: &[&str] = &[
        "type",
        "id",
        "assetId",
        "title",
        "description",
        "caption",
        "numbered",
        "posterAssetId",
        "tracks",
        "widthPercent",
        "alignment",
        "placement",
        "displayAspectRatio",
        "loop",
    ];
    let allowed_fields = if allow_direct_media {
        V10_ALLOWED_FIELDS
    } else {
        ALLOWED_FIELDS
    };
    if node
        .keys()
        .any(|field| !allowed_fields.contains(&field.as_str()))
        || !is_asset_id(required_string(node, "assetId")?)
    {
        return Err("Notebook video figure is invalid.".into());
    }
    required_string(node, "title")?;
    if !node.get("description").is_some_and(Value::is_string) {
        return Err("Notebook video description must be a string.".into());
    }
    optional_string(node, "caption")?;
    optional_bool(node, "numbered")?;
    optional_bool(node, "loop")?;
    if let Some(poster_asset_id) = node.get("posterAssetId") {
        if !poster_asset_id.as_str().is_some_and(is_asset_id) {
            return Err("Notebook video poster identity is invalid.".into());
        }
    }
    if let Some(width) = node.get("widthPercent") {
        if !width
            .as_u64()
            .is_some_and(|value| (10..=100).contains(&value))
        {
            return Err("Notebook video width is invalid.".into());
        }
    }
    validate_media_placement(node, "video")?;
    if allow_direct_media {
        validate_display_aspect_ratio(node.get("displayAspectRatio"), "video")?;
    }
    if let Some(tracks) = node.get("tracks") {
        let tracks = tracks
            .as_array()
            .filter(|tracks| tracks.len() <= 32)
            .ok_or_else(|| "Notebook video tracks are invalid.".to_string())?;
        let mut ids = HashSet::new();
        let mut assets = HashSet::new();
        let mut default_count = 0;
        for track in tracks {
            let track = object(track)?;
            if track.keys().any(|field| {
                !["id", "assetId", "kind", "label", "language", "default"].contains(&field.as_str())
            }) {
                return Err("Notebook video track contains unknown fields.".into());
            }
            let id = required_string(track, "id")?;
            let asset_id = required_string(track, "assetId")?;
            let language = required_string(track, "language")?;
            if !ids.insert(id)
                || !is_asset_id(asset_id)
                || !assets.insert(asset_id)
                || !matches!(required_string(track, "kind")?, "captions" | "subtitles")
                || required_string(track, "label")?.trim().is_empty()
                || !is_video_track_language(language)
            {
                return Err("Notebook video track is invalid.".into());
            }
            if optional_bool(track, "default")? == Some(true) {
                default_count += 1;
                if default_count > 1 {
                    return Err("Notebook video has more than one default text track.".into());
                }
            }
        }
    }
    Ok(())
}

fn validate_block(
    value: &Value,
    depth: usize,
    allow_images: bool,
    allow_videos: bool,
    allow_page_layout: bool,
    allow_direct_media: bool,
) -> Result<(), String> {
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
                validate_paragraph_format(format, allow_direct_media)?;
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
                validate_block_content(
                    item,
                    depth + 1,
                    allow_images,
                    allow_videos,
                    false,
                    allow_direct_media,
                )?;
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
            validate_block_content(
                node,
                depth + 1,
                allow_images,
                allow_videos,
                false,
                allow_direct_media,
            )
        }
        "imageFigure" if allow_images => validate_image_figure(node, allow_direct_media),
        "videoFigure" if allow_videos => validate_video_figure(node, allow_direct_media),
        "pageBreak" if allow_page_layout && node.len() == 2 => Ok(()),
        _ => Err("Notebook block type is unsupported.".into()),
    }
}

fn validate_block_content(
    node: &Map<String, Value>,
    depth: usize,
    allow_images: bool,
    allow_videos: bool,
    allow_page_layout: bool,
    allow_direct_media: bool,
) -> Result<(), String> {
    for child in node
        .get("content")
        .and_then(Value::as_array)
        .ok_or_else(|| "Notebook block content must be an array.".to_string())?
    {
        validate_block(
            child,
            depth,
            allow_images,
            allow_videos,
            allow_page_layout,
            allow_direct_media,
        )?;
    }
    Ok(())
}

fn validate_page_setup(value: &Value) -> Result<(), String> {
    let setup = object(value)?;
    if setup.len() != 3
        || !matches!(
            setup.get("paperSize").and_then(Value::as_str),
            Some("a4" | "letter" | "legal")
        )
        || !matches!(
            setup.get("orientation").and_then(Value::as_str),
            Some("portrait" | "landscape")
        )
    {
        return Err("Notebook page setup is invalid.".into());
    }
    let margins = setup
        .get("marginsPt")
        .ok_or_else(|| "Notebook page margins are missing.".to_string())
        .and_then(object)?;
    if margins.len() != 4 {
        return Err("Notebook page margins are invalid.".into());
    }
    let margin = |field: &str| -> Result<f64, String> {
        margins
            .get(field)
            .and_then(Value::as_f64)
            .filter(|value| value.is_finite() && (0.0..=288.0).contains(value))
            .ok_or_else(|| format!("Notebook {field} page margin is invalid."))
    };
    let top = margin("top")?;
    let right = margin("right")?;
    let bottom = margin("bottom")?;
    let left = margin("left")?;
    let (mut width, mut height) = match setup.get("paperSize").and_then(Value::as_str) {
        Some("letter") => (612.0, 792.0),
        Some("legal") => (612.0, 1008.0),
        _ => (595.28, 841.89),
    };
    if setup.get("orientation").and_then(Value::as_str) == Some("landscape") {
        std::mem::swap(&mut width, &mut height);
    }
    if width - left - right < 72.0 || height - top - bottom < 72.0 {
        return Err("Notebook page margins leave no usable page area.".into());
    }
    Ok(())
}

fn validate_header_footer(value: &Value) -> Result<(), String> {
    let settings = object(value)?;
    if settings.len() != 4
        || !settings.get("headerText").is_some_and(Value::is_string)
        || !settings.get("footerText").is_some_and(Value::is_string)
        || !settings
            .get("differentFirstPage")
            .is_some_and(Value::is_boolean)
    {
        return Err("Notebook header and footer settings are invalid.".into());
    }
    let numbering = settings
        .get("pageNumbering")
        .ok_or_else(|| "Notebook page numbering is missing.".to_string())
        .and_then(object)?;
    if numbering.len() != 3
        || !numbering.get("enabled").is_some_and(Value::is_boolean)
        || !matches!(
            numbering.get("position").and_then(Value::as_str),
            Some("left" | "center" | "right")
        )
        || !numbering
            .get("startAt")
            .and_then(Value::as_u64)
            .is_some_and(|value| (1..=9999).contains(&value))
    {
        return Err("Notebook page numbering is invalid.".into());
    }
    Ok(())
}

fn validate_notebook_document_version(
    document: &Value,
    version: u64,
    allow_images: bool,
    allow_videos: bool,
    allow_page_layout: bool,
    allow_direct_media: bool,
) -> Result<(), String> {
    let document = object(document)?;
    if document.get("version").and_then(Value::as_u64) != Some(version) {
        return Err(format!(
            "Notebook package requires app-document version {version}."
        ));
    }
    let allowed_fields = if allow_page_layout {
        &[
            "version",
            "id",
            "title",
            "createdAt",
            "updatedAt",
            "selectedNodeId",
            "content",
            "pageSetup",
            "headerFooter",
        ][..]
    } else {
        &[
            "version",
            "id",
            "title",
            "createdAt",
            "updatedAt",
            "selectedNodeId",
            "content",
        ][..]
    };
    if document.len() != allowed_fields.len()
        || document
            .keys()
            .any(|key| !allowed_fields.contains(&key.as_str()))
    {
        return Err("Notebook document contains unknown or missing fields.".into());
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
        validate_block(
            node,
            0,
            allow_images,
            allow_videos,
            allow_page_layout,
            allow_direct_media,
        )?;
    }
    if allow_page_layout {
        validate_page_setup(
            document
                .get("pageSetup")
                .ok_or_else(|| "Notebook page setup is missing.".to_string())?,
        )?;
        validate_header_footer(
            document
                .get("headerFooter")
                .ok_or_else(|| "Notebook header and footer settings are missing.".to_string())?,
        )?;
    }
    Ok(())
}

pub fn validate_notebook_document(document: &Value) -> Result<(), String> {
    validate_notebook_document_version(document, 10, true, true, true, true)
}

fn add_default_page_layout(document: &mut Value) {
    document["pageSetup"] = json!({
        "paperSize": "a4",
        "orientation": "portrait",
        "marginsPt": { "top": 72, "right": 72, "bottom": 72, "left": 72 }
    });
    document["headerFooter"] = json!({
        "headerText": "",
        "footerText": "",
        "differentFirstPage": false,
        "pageNumbering": { "enabled": false, "position": "center", "startAt": 1 }
    });
}

pub fn migrate_notebook_document(mut document: Value) -> Result<Value, String> {
    match document.get("version").and_then(Value::as_u64) {
        Some(10) => validate_notebook_document(&document)?,
        Some(9) => {
            validate_notebook_document_version(&document, 9, true, true, true, false)?;
            document["version"] = Value::from(10);
            validate_notebook_document(&document)?;
        }
        Some(8) => {
            validate_notebook_document_version(&document, 8, true, false, true, false)?;
            document["version"] = Value::from(10);
            validate_notebook_document(&document)?;
        }
        Some(7) => {
            validate_notebook_document_version(&document, 7, true, false, false, false)?;
            document["version"] = Value::from(10);
            add_default_page_layout(&mut document);
            validate_notebook_document(&document)?;
        }
        Some(6) => {
            validate_notebook_document_version(&document, 6, false, false, false, false)?;
            document["version"] = Value::from(10);
            add_default_page_layout(&mut document);
            validate_notebook_document(&document)?;
        }
        _ => return Err("Notebook document version is unsupported.".into()),
    }
    Ok(document)
}

pub fn migrate_stored_record(
    mut record: NotebookStoredRecordV1,
) -> Result<NotebookStoredRecordV1, String> {
    record.document = migrate_notebook_document(record.document)?;
    validate_stored_record(&record)?;
    Ok(record)
}

pub fn migrate_version_snapshot(
    mut snapshot: NotebookVersionSnapshotV1,
) -> Result<NotebookVersionSnapshotV1, String> {
    snapshot.record = migrate_stored_record(snapshot.record)?;
    validate_version_snapshot(&snapshot)?;
    Ok(snapshot)
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

fn collect_node_asset_ids(value: &Value, asset_ids: &mut HashSet<String>) {
    let Some(node) = value.as_object() else {
        return;
    };
    if matches!(
        node.get("type").and_then(Value::as_str),
        Some("imageFigure" | "videoFigure")
    ) {
        for field in ["assetId", "posterAssetId"] {
            if let Some(asset_id) = node.get(field).and_then(Value::as_str) {
                asset_ids.insert(asset_id.to_string());
            }
        }
        for track in node
            .get("tracks")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            if let Some(asset_id) = track.get("assetId").and_then(Value::as_str) {
                asset_ids.insert(asset_id.to_string());
            }
        }
    }
    for child in node
        .get("content")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        collect_node_asset_ids(child, asset_ids);
    }
}

pub fn collect_notebook_asset_ids(document: &Value) -> HashSet<String> {
    let mut asset_ids = HashSet::new();
    for node in document
        .get("content")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
    {
        collect_node_asset_ids(node, &mut asset_ids);
    }
    asset_ids
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
    if collect_notebook_asset_ids(&record.document)
        .iter()
        .any(|asset_id| !assets.contains(asset_id))
    {
        return Err("Notebook stored record is missing a referenced asset.".into());
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
        Some("imageFigure") => {
            *word_count += count_words(node.get("caption").and_then(Value::as_str).unwrap_or(""));
        }
        Some("videoFigure") => {
            for field in ["title", "description", "caption"] {
                *word_count += count_words(node.get(field).and_then(Value::as_str).unwrap_or(""));
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
