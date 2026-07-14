use super::model::{validate_asset_metadata, NotebookAssetMetadataV1};
use quick_xml::{
    encoding::Decoder,
    events::{BytesStart, Event},
    Reader,
};
use sha2::{Digest, Sha256};

const SVG_MAX_BYTES: usize = 10 * 1024 * 1024;
const SVG_MAX_ELEMENTS: usize = 100_000;
const SVG_MAX_ATTRIBUTES: usize = 500_000;
const SVG_MAX_DEPTH: usize = 256;

pub fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn contains_ascii(bytes: &[u8], needle: &[u8]) -> bool {
    bytes.windows(needle.len()).any(|window| window == needle)
}

fn validate_svg_element(
    element: &BytesStart<'_>,
    decoder: Decoder,
    element_count: &mut usize,
    attribute_count: &mut usize,
    saw_svg: &mut bool,
) -> Result<(), String> {
    *element_count += 1;
    if *element_count > SVG_MAX_ELEMENTS {
        return Err("Notebook SVG exceeds the element complexity budget.".into());
    }
    let local_name = element.local_name();
    let name = String::from_utf8_lossy(local_name.as_ref()).to_ascii_lowercase();
    *saw_svg |= name == "svg";
    if matches!(
        name.as_str(),
        "script"
            | "foreignobject"
            | "animate"
            | "animatemotion"
            | "animatetransform"
            | "set"
            | "iframe"
            | "object"
            | "embed"
            | "audio"
            | "video"
            | "image"
    ) {
        return Err(format!("Notebook SVG contains forbidden element {name}."));
    }
    for attribute in element.attributes() {
        let attribute =
            attribute.map_err(|error| format!("Notebook SVG attribute is malformed: {error}"))?;
        *attribute_count += 1;
        if *attribute_count > SVG_MAX_ATTRIBUTES {
            return Err("Notebook SVG exceeds the attribute complexity budget.".into());
        }
        let key = String::from_utf8_lossy(attribute.key.as_ref()).to_ascii_lowercase();
        let value = attribute
            .decode_and_unescape_value(decoder)
            .map_err(|error| format!("Notebook SVG attribute is invalid: {error}"))?
            .to_ascii_lowercase();
        if key.starts_with("on")
            || key == "src"
            || ((key == "href" || key.ends_with(":href")) && !value.starts_with('#'))
            || value.contains("javascript:")
            || value.contains("data:text/html")
            || value.contains("url(")
            || value.contains("@import")
            || value.contains("expression(")
        {
            return Err(format!("Notebook SVG contains unsafe attribute {key}."));
        }
    }
    Ok(())
}

fn validate_svg(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() > SVG_MAX_BYTES {
        return Err("Notebook SVG exceeds the 10 MiB safety limit.".into());
    }
    std::str::from_utf8(bytes).map_err(|_| "Notebook SVG must be UTF-8.".to_string())?;
    let mut reader = Reader::from_reader(bytes);
    reader.config_mut().trim_text(false);
    let mut buffer = Vec::new();
    let mut element_count = 0usize;
    let mut attribute_count = 0usize;
    let mut depth = 0usize;
    let mut saw_svg = false;

    loop {
        match reader
            .read_event_into(&mut buffer)
            .map_err(|error| format!("Notebook SVG is malformed: {error}"))?
        {
            Event::Start(element) => {
                validate_svg_element(
                    &element,
                    reader.decoder(),
                    &mut element_count,
                    &mut attribute_count,
                    &mut saw_svg,
                )?;
                depth += 1;
                if depth > SVG_MAX_DEPTH {
                    return Err("Notebook SVG exceeds the nesting safety limit.".into());
                }
            }
            Event::Empty(element) => {
                validate_svg_element(
                    &element,
                    reader.decoder(),
                    &mut element_count,
                    &mut attribute_count,
                    &mut saw_svg,
                )?;
            }
            Event::End(_) => {
                depth = depth.saturating_sub(1);
            }
            Event::GeneralRef(reference) => {
                let name = reference
                    .decode()
                    .map_err(|_| "Notebook SVG entity reference is invalid.".to_string())?;
                if !matches!(name.as_ref(), "lt" | "gt" | "amp" | "apos" | "quot")
                    && reference.resolve_char_ref().ok().flatten().is_none()
                {
                    return Err("Notebook SVG contains an external entity reference.".into());
                }
            }
            Event::DocType(_) | Event::PI(_) => {
                return Err("Notebook SVG contains executable or external XML content.".into());
            }
            Event::Eof => break,
            _ => {}
        }
        buffer.clear();
    }
    if !saw_svg {
        return Err("Notebook SVG has no root SVG element.".into());
    }
    Ok(())
}

pub fn validate_asset_bytes(
    metadata: &NotebookAssetMetadataV1,
    bytes: &[u8],
) -> Result<(), String> {
    validate_asset_metadata(metadata)?;
    if metadata.byte_length != bytes.len() as u64 || metadata.sha256 != sha256_hex(bytes) {
        return Err("Notebook asset content does not match its metadata.".into());
    }
    match metadata.mime_type.as_str() {
        "image/png" => {
            if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") || contains_ascii(bytes, b"acTL") {
                return Err("Notebook PNG is invalid or animated.".into());
            }
        }
        "image/jpeg" => {
            if bytes.len() < 4
                || !bytes.starts_with(&[0xff, 0xd8, 0xff])
                || !bytes.ends_with(&[0xff, 0xd9])
            {
                return Err("Notebook JPEG is invalid.".into());
            }
        }
        "image/webp" => {
            if bytes.len() < 12
                || &bytes[..4] != b"RIFF"
                || &bytes[8..12] != b"WEBP"
                || contains_ascii(bytes, b"ANIM")
                || contains_ascii(bytes, b"ANMF")
            {
                return Err("Notebook WebP is invalid or animated.".into());
            }
        }
        "image/svg+xml" => validate_svg(bytes)?,
        "video/mp4" => {
            if bytes.len() < 12 || &bytes[4..8] != b"ftyp" {
                return Err("Notebook MP4 container is invalid.".into());
            }
        }
        "video/webm" => {
            if !bytes.starts_with(&[0x1a, 0x45, 0xdf, 0xa3]) {
                return Err("Notebook WebM container is invalid.".into());
            }
        }
        "text/vtt" => {
            let text = std::str::from_utf8(bytes)
                .map_err(|_| "Notebook WebVTT must be UTF-8.".to_string())?;
            if !text.trim_start_matches('\u{feff}').starts_with("WEBVTT") {
                return Err("Notebook WebVTT header is invalid.".into());
            }
        }
        _ => return Err("Notebook asset type is unsupported.".into()),
    }
    Ok(())
}
