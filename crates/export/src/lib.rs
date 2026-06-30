//! Export preset and render job integration points.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExportPreset {
    TikTok,
    InstagramReels,
    YouTubeShorts,
    YouTubeLandscape,
}
