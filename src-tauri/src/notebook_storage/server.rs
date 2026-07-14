use super::{model::is_sha256, NotebookAssetMetadataV1};
use std::{
    fs::File,
    io::{Read, Seek, SeekFrom, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
    thread::{self, JoinHandle},
    time::Duration,
};
use uuid::Uuid;

const MAX_REQUEST_HEAD_BYTES: usize = 16 * 1024;
const STREAM_BUFFER_BYTES: usize = 64 * 1024;

pub struct NotebookMediaServer {
    address: SocketAddr,
    token: String,
    stop: Arc<AtomicBool>,
    thread: Option<JoinHandle<()>>,
}

impl NotebookMediaServer {
    pub fn start(assets_dir: PathBuf) -> Result<Self, String> {
        let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
        listener
            .set_nonblocking(true)
            .map_err(|error| error.to_string())?;
        let address = listener.local_addr().map_err(|error| error.to_string())?;
        let token = Uuid::new_v4().to_string();
        let stop = Arc::new(AtomicBool::new(false));
        let thread_stop = Arc::clone(&stop);
        let thread_token = token.clone();
        let server_thread = thread::Builder::new()
            .name("notebook-media-server".into())
            .spawn(move || {
                while !thread_stop.load(Ordering::Relaxed) {
                    match listener.accept() {
                        Ok((stream, _)) => {
                            let assets_dir = assets_dir.clone();
                            let token = thread_token.clone();
                            let _ = thread::Builder::new()
                                .name("notebook-media-request".into())
                                .spawn(move || {
                                    let _ = serve_connection(stream, &assets_dir, &token);
                                });
                        }
                        Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                            thread::sleep(Duration::from_millis(10));
                        }
                        Err(_) => thread::sleep(Duration::from_millis(25)),
                    }
                }
            })
            .map_err(|error| error.to_string())?;
        Ok(Self {
            address,
            token,
            stop,
            thread: Some(server_thread),
        })
    }

    pub fn url(&self, asset_id: &str) -> Result<String, String> {
        let hash = asset_id
            .strip_prefix("sha256:")
            .filter(|hash| is_sha256(hash))
            .ok_or_else(|| "Notebook asset identity is invalid.".to_string())?;
        Ok(format!(
            "http://127.0.0.1:{}/{}/{hash}",
            self.address.port(),
            self.token,
        ))
    }
}

impl Drop for NotebookMediaServer {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        if let Some(thread) = self.thread.take() {
            let _ = thread.join();
        }
    }
}

fn parse_range(value: &str, length: u64) -> Result<(u64, u64), ()> {
    let value = value.strip_prefix("bytes=").ok_or(())?;
    if value.contains(',') || length == 0 {
        return Err(());
    }
    let (start, end) = value.split_once('-').ok_or(())?;
    if start.is_empty() {
        let suffix = end
            .parse::<u64>()
            .ok()
            .filter(|value| *value > 0)
            .ok_or(())?;
        return Ok((length.saturating_sub(suffix.min(length)), length - 1));
    }
    let start = start.parse::<u64>().map_err(|_| ())?;
    if start >= length {
        return Err(());
    }
    let end = if end.is_empty() {
        length - 1
    } else {
        end.parse::<u64>().map_err(|_| ())?.min(length - 1)
    };
    (start <= end).then_some((start, end)).ok_or(())
}

fn request_head(stream: &mut TcpStream) -> Result<String, String> {
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;
    let mut bytes = Vec::with_capacity(1024);
    let mut buffer = [0u8; 1024];
    while bytes.len() < MAX_REQUEST_HEAD_BYTES {
        let count = stream
            .read(&mut buffer)
            .map_err(|error| error.to_string())?;
        if count == 0 {
            break;
        }
        bytes.extend_from_slice(&buffer[..count]);
        if bytes.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
    }
    if bytes.len() >= MAX_REQUEST_HEAD_BYTES
        || !bytes.windows(4).any(|window| window == b"\r\n\r\n")
    {
        return Err("Notebook media request header is invalid.".into());
    }
    String::from_utf8(bytes).map_err(|_| "Notebook media request must be UTF-8.".into())
}

fn write_error(
    stream: &mut TcpStream,
    status: &str,
    extra_headers: &[(&str, String)],
) -> Result<(), String> {
    let mut response = format!(
        "HTTP/1.1 {status}\r\nContent-Length: 0\r\nAccess-Control-Allow-Origin: *\r\nCross-Origin-Resource-Policy: cross-origin\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n"
    );
    for (name, value) in extra_headers {
        response.push_str(&format!("{name}: {value}\r\n"));
    }
    response.push_str("\r\n");
    stream
        .write_all(response.as_bytes())
        .map_err(|error| error.to_string())
}

fn serve_connection(mut stream: TcpStream, assets_dir: &Path, token: &str) -> Result<(), String> {
    let request = request_head(&mut stream)?;
    let mut lines = request.split("\r\n");
    let request_line = lines
        .next()
        .ok_or_else(|| "Notebook media request is empty.".to_string())?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts.next().unwrap_or_default();
    let path = request_parts.next().unwrap_or_default();
    if !matches!(method, "GET" | "HEAD") {
        return write_error(&mut stream, "405 Method Not Allowed", &[]);
    }
    let mut path_parts = path.trim_start_matches('/').split('/');
    let path_token = path_parts.next().unwrap_or_default();
    let hash = path_parts.next().unwrap_or_default();
    if path_token != token || !is_sha256(hash) || path_parts.next().is_some() {
        return write_error(&mut stream, "404 Not Found", &[]);
    }
    let range = lines.find_map(|line| {
        line.split_once(':').and_then(|(name, value)| {
            name.eq_ignore_ascii_case("range")
                .then(|| value.trim().to_string())
        })
    });
    let data_path = assets_dir.join(format!("{hash}.bin"));
    let metadata_path = assets_dir.join(format!("{hash}.json"));
    if !data_path.exists() || !metadata_path.exists() {
        return write_error(&mut stream, "404 Not Found", &[]);
    }
    let metadata = serde_json::from_slice::<NotebookAssetMetadataV1>(
        &std::fs::read(metadata_path).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    let file_length = std::fs::metadata(&data_path)
        .map_err(|error| error.to_string())?
        .len();
    if metadata.id != format!("sha256:{hash}") || metadata.byte_length != file_length {
        return write_error(&mut stream, "500 Internal Server Error", &[]);
    }
    let (status, start, end) = if let Some(value) = range {
        match parse_range(&value, file_length) {
            Ok((start, end)) => ("206 Partial Content", start, end),
            Err(()) => {
                return write_error(
                    &mut stream,
                    "416 Range Not Satisfiable",
                    &[
                        ("Accept-Ranges", "bytes".into()),
                        ("Content-Range", format!("bytes */{file_length}")),
                    ],
                )
            }
        }
    } else if file_length > 0 {
        ("200 OK", 0, file_length - 1)
    } else {
        ("200 OK", 0, 0)
    };
    let content_length = if file_length == 0 { 0 } else { end - start + 1 };
    let mut response = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {}\r\nContent-Length: {content_length}\r\nAccept-Ranges: bytes\r\nAccess-Control-Allow-Origin: *\r\nCross-Origin-Resource-Policy: cross-origin\r\nX-Content-Type-Options: nosniff\r\nCache-Control: private, max-age=31536000, immutable\r\nConnection: close\r\n",
        metadata.mime_type,
    );
    if status.starts_with("206") {
        response.push_str(&format!(
            "Content-Range: bytes {start}-{end}/{file_length}\r\n"
        ));
    }
    response.push_str("\r\n");
    stream
        .write_all(response.as_bytes())
        .map_err(|error| error.to_string())?;
    if method == "HEAD" || content_length == 0 {
        return Ok(());
    }
    let mut file = File::open(data_path).map_err(|error| error.to_string())?;
    file.seek(SeekFrom::Start(start))
        .map_err(|error| error.to_string())?;
    let mut remaining = content_length;
    let mut buffer = vec![0u8; STREAM_BUFFER_BYTES];
    while remaining > 0 {
        let count = file
            .read(&mut buffer[..remaining.min(STREAM_BUFFER_BYTES as u64) as usize])
            .map_err(|error| error.to_string())?;
        if count == 0 {
            return Err("Notebook media asset ended before its declared length.".into());
        }
        stream
            .write_all(&buffer[..count])
            .map_err(|error| error.to_string())?;
        remaining -= count as u64;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::parse_range;

    #[test]
    fn parses_single_open_and_suffix_ranges() {
        assert_eq!(parse_range("bytes=2-5", 10), Ok((2, 5)));
        assert_eq!(parse_range("bytes=7-", 10), Ok((7, 9)));
        assert_eq!(parse_range("bytes=-3", 10), Ok((7, 9)));
        assert!(parse_range("bytes=10-", 10).is_err());
        assert!(parse_range("bytes=0-1,3-4", 10).is_err());
    }
}
