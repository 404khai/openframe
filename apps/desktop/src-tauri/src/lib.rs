use serde::{Deserialize, Serialize};
use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
    process::Command,
    time::UNIX_EPOCH,
};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportedMediaMetadata {
    path: String,
    name: String,
    extension: Option<String>,
    kind: String,
    size_bytes: u64,
    modified_ms: Option<u128>,
    duration_seconds: Option<f64>,
    width: Option<u32>,
    height: Option<u32>,
    frame_rate: Option<f64>,
    audio_sample_rate: Option<u32>,
    audio_channels: Option<u32>,
    thumbnail_path: Option<String>,
    waveform_path: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProbeOutput {
    streams: Option<Vec<ProbeStream>>,
    format: Option<ProbeFormat>,
}

#[derive(Debug, Deserialize)]
struct ProbeFormat {
    duration: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ProbeStream {
    codec_type: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    avg_frame_rate: Option<String>,
    duration: Option<String>,
    sample_rate: Option<String>,
    channels: Option<u32>,
}

#[tauri::command]
fn import_media(path: String) -> Result<ImportedMediaMetadata, String> {
    let path_buf = PathBuf::from(&path);
    let metadata = fs::metadata(&path_buf).map_err(|error| error.to_string())?;
    let name = path_buf
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let extension = path_buf
        .extension()
        .and_then(|extension| extension.to_str())
        .map(str::to_lowercase);
    let modified_ms = metadata
        .modified()
        .ok()
        .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis());
    let kind = media_kind(extension.as_deref());
    let probe = probe_media(&path_buf)?;
    let video_stream = probe
        .streams
        .as_deref()
        .unwrap_or_default()
        .iter()
        .find(|stream| stream.codec_type.as_deref() == Some("video"));
    let audio_stream = probe
        .streams
        .as_deref()
        .unwrap_or_default()
        .iter()
        .find(|stream| stream.codec_type.as_deref() == Some("audio"));
    let duration_seconds = probe
        .format
        .as_ref()
        .and_then(|format| parse_f64(format.duration.as_deref()))
        .or_else(|| video_stream.and_then(|stream| parse_f64(stream.duration.as_deref())))
        .or_else(|| audio_stream.and_then(|stream| parse_f64(stream.duration.as_deref())));
    let cache_dir = cache_dir()?;
    let cache_key = cache_key(&path, metadata.len(), modified_ms);
    let thumbnail_path = match kind.as_str() {
        "video" | "image" => generate_thumbnail(&path_buf, &cache_dir, &cache_key, duration_seconds).ok(),
        _ => None,
    };
    let waveform_path = match kind.as_str() {
        "video" | "audio" => generate_waveform(&path_buf, &cache_dir, &cache_key).ok(),
        _ => None,
    };

    Ok(ImportedMediaMetadata {
        path,
        name,
        extension,
        kind,
        size_bytes: metadata.len(),
        modified_ms,
        duration_seconds,
        width: video_stream.and_then(|stream| stream.width),
        height: video_stream.and_then(|stream| stream.height),
        frame_rate: video_stream.and_then(|stream| parse_frame_rate(stream.avg_frame_rate.as_deref())),
        audio_sample_rate: audio_stream.and_then(|stream| parse_u32(stream.sample_rate.as_deref())),
        audio_channels: audio_stream.and_then(|stream| stream.channels),
        thumbnail_path,
        waveform_path,
    })
}

fn media_kind(extension: Option<&str>) -> String {
    match extension {
        Some("mp4" | "mov" | "m4v" | "webm") => "video",
        Some("mp3" | "wav" | "m4a" | "aac" | "flac") => "audio",
        Some("png" | "jpg" | "jpeg" | "webp") => "image",
        _ => "unknown",
    }
    .to_string()
}

fn probe_media(path: &Path) -> Result<ProbeOutput, String> {
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
        ])
        .arg(path)
        .output()
        .map_err(|error| format!("failed to run ffprobe: {error}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    serde_json::from_slice(&output.stdout).map_err(|error| format!("failed to parse ffprobe output: {error}"))
}

fn generate_thumbnail(
    input: &Path,
    cache_dir: &Path,
    cache_key: &str,
    duration_seconds: Option<f64>,
) -> Result<String, String> {
    let output = cache_dir.join(format!("{cache_key}-thumbnail.jpg"));
    let seek_seconds = duration_seconds
        .map(|duration| (duration * 0.15).clamp(0.0, 2.0))
        .unwrap_or(0.0)
        .to_string();
    let status = Command::new("ffmpeg")
        .args(["-hide_banner", "-loglevel", "error", "-y", "-ss", &seek_seconds])
        .arg("-i")
        .arg(input)
        .args([
            "-frames:v",
            "1",
            "-vf",
            "scale=480:-1:force_original_aspect_ratio=decrease",
            "-update",
            "1",
        ])
        .arg(&output)
        .status()
        .map_err(|error| format!("failed to run ffmpeg thumbnail command: {error}"))?;

    if status.success() {
        Ok(output.to_string_lossy().to_string())
    } else {
        Err("ffmpeg thumbnail command failed".to_string())
    }
}

fn generate_waveform(input: &Path, cache_dir: &Path, cache_key: &str) -> Result<String, String> {
    let output = cache_dir.join(format!("{cache_key}-waveform.png"));
    let status = Command::new("ffmpeg")
        .args(["-hide_banner", "-loglevel", "error", "-y"])
        .arg("-i")
        .arg(input)
        .args([
            "-filter_complex",
            "showwavespic=s=960x160:colors=0xfeba7eff",
            "-frames:v",
            "1",
            "-update",
            "1",
        ])
        .arg(&output)
        .status()
        .map_err(|error| format!("failed to run ffmpeg waveform command: {error}"))?;

    if status.success() {
        Ok(output.to_string_lossy().to_string())
    } else {
        Err("ffmpeg waveform command failed".to_string())
    }
}

fn cache_dir() -> Result<PathBuf, String> {
    let path = std::env::temp_dir().join("openframe").join("media-cache");
    fs::create_dir_all(&path).map_err(|error| format!("failed to create media cache: {error}"))?;
    Ok(path)
}

fn cache_key(path: &str, size_bytes: u64, modified_ms: Option<u128>) -> String {
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    size_bytes.hash(&mut hasher);
    modified_ms.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn parse_f64(value: Option<&str>) -> Option<f64> {
    value.and_then(|value| value.parse::<f64>().ok())
}

fn parse_u32(value: Option<&str>) -> Option<u32> {
    value.and_then(|value| value.parse::<u32>().ok())
}

fn parse_frame_rate(value: Option<&str>) -> Option<f64> {
    let value = value?;
    let (numerator, denominator) = value.split_once('/')?;
    let numerator = numerator.parse::<f64>().ok()?;
    let denominator = denominator.parse::<f64>().ok()?;

    if denominator == 0.0 {
        None
    } else {
        Some(numerator / denominator)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![import_media])
        .run(tauri::generate_context!())
        .expect("failed to run OpenFrame desktop app");
}
