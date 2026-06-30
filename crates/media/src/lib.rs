//! Media metadata, thumbnail, waveform, and preview helpers.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MediaKind {
    Video,
    Audio,
    Image,
    Unknown,
}
