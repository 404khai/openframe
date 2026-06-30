//! Local AI worker integration points.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AiJobKind {
    Captions,
    AudioCleanup,
    VoiceIsolation,
}
