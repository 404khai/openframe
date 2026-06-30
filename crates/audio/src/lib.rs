//! Audio cleanup and enhancement integration points.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AudioEnhancement {
    Normalize,
    Compress,
    NoiseSuppress,
    SilenceDetect,
}
