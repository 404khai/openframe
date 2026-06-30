//! Subtitle import, editing, rendering, and export integration points.

#[derive(Debug, Clone, PartialEq)]
pub struct SubtitleCue {
    pub start_ms: u64,
    pub end_ms: u64,
    pub text: String,
}
