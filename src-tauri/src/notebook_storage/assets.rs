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
const RASTER_MAX_PIXELS: u64 = 100_000_000;

pub fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn contains_unsafe_css_url(value: &str) -> bool {
    let mut remainder = value;
    while let Some(start) = remainder.find("url(") {
        let after = &remainder[start + 4..];
        let Some(end) = after.find(')') else {
            return true;
        };
        let target = after[..end]
            .trim()
            .trim_matches(|character| character == '\'' || character == '"');
        if !target.starts_with('#')
            || target.len() < 2
            || !target[1..].bytes().all(|byte| {
                byte.is_ascii_alphanumeric() || matches!(byte, b'_' | b':' | b'.' | b'-')
            })
        {
            return true;
        }
        remainder = &after[end + 1..];
    }
    false
}

fn contains_unsafe_svg_text(value: &str) -> bool {
    let value = value.to_ascii_lowercase();
    value.contains("javascript:")
        || value.contains("data:text/html")
        || value.contains("@import")
        || value.contains("expression(")
        || value.contains("behavior:")
        || value.contains("-moz-binding")
        || contains_unsafe_css_url(&value)
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
            || contains_unsafe_svg_text(&value)
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
            Event::Text(text) => {
                let value = text
                    .decode()
                    .map_err(|error| format!("Notebook SVG text is invalid: {error}"))?;
                if contains_unsafe_svg_text(&value) {
                    return Err("Notebook SVG contains executable or external CSS content.".into());
                }
            }
            Event::CData(text) => {
                let value = text
                    .decode()
                    .map_err(|error| format!("Notebook SVG CDATA is invalid: {error}"))?;
                if contains_unsafe_svg_text(&value) {
                    return Err("Notebook SVG contains executable or external CSS content.".into());
                }
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

fn read_u32_be(bytes: &[u8], offset: usize) -> Option<u32> {
    bytes
        .get(offset..offset + 4)
        .and_then(|slice| slice.try_into().ok())
        .map(u32::from_be_bytes)
}

fn read_u32_le(bytes: &[u8], offset: usize) -> Option<u32> {
    bytes
        .get(offset..offset + 4)
        .and_then(|slice| slice.try_into().ok())
        .map(u32::from_le_bytes)
}

fn validate_raster_dimensions(width: u32, height: u32) -> Result<(), String> {
    if width == 0 || height == 0 {
        return Err("Notebook raster image dimensions are invalid.".into());
    }
    if u64::from(width)
        .checked_mul(u64::from(height))
        .is_none_or(|pixels| pixels > RASTER_MAX_PIXELS)
    {
        return Err("Notebook raster image exceeds the 100 megapixel safety limit.".into());
    }
    Ok(())
}

fn validate_png(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() < 33 || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Err("Notebook PNG signature is invalid.".into());
    }
    let mut offset = 8usize;
    let mut dimensions = None;
    let mut saw_end = false;
    while offset.checked_add(12).is_some_and(|end| end <= bytes.len()) {
        let length = read_u32_be(bytes, offset)
            .ok_or_else(|| "Notebook PNG chunk is invalid.".to_string())?
            as usize;
        let chunk_type = bytes
            .get(offset + 4..offset + 8)
            .ok_or_else(|| "Notebook PNG chunk is invalid.".to_string())?;
        let end = offset
            .checked_add(12)
            .and_then(|value| value.checked_add(length))
            .filter(|end| *end <= bytes.len())
            .ok_or_else(|| "Notebook PNG contains a truncated chunk.".to_string())?;
        if chunk_type == b"IHDR" {
            if offset != 8 || length != 13 {
                return Err("Notebook PNG header is invalid.".into());
            }
            dimensions = Some((
                read_u32_be(bytes, offset + 8).unwrap_or(0),
                read_u32_be(bytes, offset + 12).unwrap_or(0),
            ));
        } else if chunk_type == b"acTL" {
            return Err("Animated PNG is not supported.".into());
        } else if chunk_type == b"IEND" {
            saw_end = true;
            break;
        }
        offset = end;
    }
    let (width, height) = dimensions
        .filter(|_| saw_end)
        .ok_or_else(|| "Notebook PNG structure is incomplete.".to_string())?;
    validate_raster_dimensions(width, height)
}

fn validate_jpeg(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() < 4 || !bytes.starts_with(&[0xff, 0xd8]) {
        return Err("Notebook JPEG signature is invalid.".into());
    }
    let mut offset = 2usize;
    while offset + 1 < bytes.len() {
        while bytes.get(offset) == Some(&0xff) {
            offset += 1;
        }
        let Some(&marker) = bytes.get(offset) else {
            break;
        };
        offset += 1;
        if marker == 0xd9 || marker == 0xda {
            break;
        }
        if marker == 0x01 || (0xd0..=0xd7).contains(&marker) {
            continue;
        }
        let length = bytes
            .get(offset..offset + 2)
            .map(|value| u16::from_be_bytes([value[0], value[1]]) as usize)
            .ok_or_else(|| "Notebook JPEG contains a truncated segment.".to_string())?;
        if length < 2 || offset + length > bytes.len() {
            return Err("Notebook JPEG contains a truncated segment.".into());
        }
        if matches!(
            marker,
            0xc0 | 0xc1
                | 0xc2
                | 0xc3
                | 0xc5
                | 0xc6
                | 0xc7
                | 0xc9
                | 0xca
                | 0xcb
                | 0xcd
                | 0xce
                | 0xcf
        ) {
            if length < 7 {
                return Err("Notebook JPEG frame is invalid.".into());
            }
            let height = u16::from_be_bytes([bytes[offset + 3], bytes[offset + 4]]) as u32;
            let width = u16::from_be_bytes([bytes[offset + 5], bytes[offset + 6]]) as u32;
            return validate_raster_dimensions(width, height);
        }
        offset += length;
    }
    Err("Notebook JPEG has no supported image frame.".into())
}

fn validate_webp(bytes: &[u8]) -> Result<(), String> {
    if bytes.len() < 20
        || &bytes[..4] != b"RIFF"
        || &bytes[8..12] != b"WEBP"
        || read_u32_le(bytes, 4).is_none_or(|length| length as usize + 8 > bytes.len())
    {
        return Err("Notebook WebP container is invalid.".into());
    }
    let mut offset = 12usize;
    let mut dimensions = None;
    while offset + 8 <= bytes.len() {
        let chunk_type = &bytes[offset..offset + 4];
        let length = read_u32_le(bytes, offset + 4).unwrap_or(0) as usize;
        let data = offset + 8;
        let end = data
            .checked_add(length)
            .filter(|end| *end <= bytes.len())
            .ok_or_else(|| "Notebook WebP contains a truncated chunk.".to_string())?;
        if chunk_type == b"ANIM" || chunk_type == b"ANMF" {
            return Err("Animated WebP is not supported.".into());
        }
        if chunk_type == b"VP8X" {
            if length < 10 {
                return Err("Notebook WebP extended header is invalid.".into());
            }
            if bytes[data] & 0x02 != 0 {
                return Err("Animated WebP is not supported.".into());
            }
            dimensions = Some((
                1 + u32::from(bytes[data + 4])
                    + (u32::from(bytes[data + 5]) << 8)
                    + (u32::from(bytes[data + 6]) << 16),
                1 + u32::from(bytes[data + 7])
                    + (u32::from(bytes[data + 8]) << 8)
                    + (u32::from(bytes[data + 9]) << 16),
            ));
        } else if chunk_type == b"VP8 " && length >= 10 {
            if bytes.get(data + 3..data + 6) != Some(&[0x9d, 0x01, 0x2a]) {
                return Err("Notebook WebP frame header is invalid.".into());
            }
            dimensions = Some((
                u32::from(u16::from_le_bytes([bytes[data + 6], bytes[data + 7]]) & 0x3fff),
                u32::from(u16::from_le_bytes([bytes[data + 8], bytes[data + 9]]) & 0x3fff),
            ));
        } else if chunk_type == b"VP8L" && length >= 5 {
            if bytes[data] != 0x2f {
                return Err("Notebook lossless WebP header is invalid.".into());
            }
            dimensions = Some((
                1 + u32::from(bytes[data + 1]) + (u32::from(bytes[data + 2] & 0x3f) << 8),
                1 + u32::from(bytes[data + 2] >> 6)
                    + (u32::from(bytes[data + 3]) << 2)
                    + (u32::from(bytes[data + 4] & 0x0f) << 10),
            ));
        }
        offset = end + (length % 2);
    }
    let (width, height) =
        dimensions.ok_or_else(|| "Notebook WebP has no supported image frame.".to_string())?;
    validate_raster_dimensions(width, height)
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
            validate_png(bytes)?;
        }
        "image/jpeg" => {
            validate_jpeg(bytes)?;
        }
        "image/webp" => {
            validate_webp(bytes)?;
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
