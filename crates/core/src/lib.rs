//! Core project and job orchestration for OpenFrame.

pub const APP_NAME: &str = "OpenFrame";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Phase {
    Bootstrap,
    MediaPipeline,
    Timeline,
    Subtitles,
    Audio,
    Export,
}
