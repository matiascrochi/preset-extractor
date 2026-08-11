export interface VideoSpecs {
  fileName: string;
  fileSize: number; // in bytes
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  aspectRatio: string; // e.g. "16:9", "9:16", "4:3", "1:1", "21:9"
  bitrateMbps: number;
  codec: string; // e.g., "H.264 / AVC", "HEVC / H.265", "Apple ProRes 422", "VP9", "AV1"
  audioCodec: string; // e.g., "AAC", "Opus", "Uncompressed PCM", "Dolby Digital"
  audioSampleRate: number; // e.g., 48000, 44100
  audioChannels: number; // 1, 2, 6
  audioChannelsLabel: string; // "Estéreo (2.0)", "Mono (1.0)", "Surround 5.1"
  colorSpace: string; // "Rec.709", "Rec.2020", "sRGB", "HDR HLG", "HDR10"
  scanType: "Progresivo" | "Entrelazado";
  container: string; // "MP4", "MOV", "WebM", "MKV", "MXF"
  frameSnapshotBase64?: string;
  hasAudio: boolean;
  lufs?: number; // Measured integrated loudness e.g. -14.2 LUFS
  truePeakDb?: number; // Measured true peak e.g. -1.1 dBTP
}

export interface PresetConfig {
  presetName: string;
  softwareTarget: "premiere" | "media_encoder" | "after_effects" | "all";
  format: "H.264" | "HEVC" | "ProRes" | "DNxHR" | "QuickTime";
  width: number;
  height: number;
  fps: number;
  aspectRatio: string;
  pixelAspectRatioLabel: string; // "Píxeles cuadrados (1.0)"
  pixelAspectRatioValue: number; // 1.0
  bitrateEncoding: "VBR_1PASS" | "VBR_2PASS" | "CBR";
  targetBitrateMbps: number;
  maxBitrateMbps: number;
  profile: "Main" | "High" | "High10" | "ProRes 422 HQ" | "ProRes 422" | "ProRes 422 LT" | "DNxHR HQX";
  level: "3.1" | "4.0" | "4.1" | "4.2" | "5.0" | "5.1" | "Auto";
  keyframeInterval: number; // GOP size in frames
  renderAtMaxDepth: boolean;
  useMaxRenderQuality: boolean;
  audioFormat: "AAC" | "Uncompressed LPCM" | "Dolby Digital";
  audioSampleRate: number; // 48000 or 44100
  audioChannels: "Stereo (2.0)" | "5.1 Surround" | "Mono (1.0)";
  audioBitrateKbps: number;
  colorSpace: "Rec.709" | "Rec.2020" | "HLG" | "PQ";
  // Audio Normalization & Loudness
  normalizeAudio: boolean;
  targetLufs: number; // e.g. -14.0 LUFS
  loudnessStandard: "ITU-R BS.1770-4" | "EBU R128" | "ATSC A/85" | "Custom";
  maxTruePeakDb: number; // e.g. -1.0 dBTP
}

export interface AIReport {
  technicalSummary: string;
  recommendedSettings: Partial<PresetConfig>;
  criticalWarnings: string[];
  platformSuitability: {
    [platform: string]: {
      score: number; // 0 - 100
      notes: string;
    };
  };
  proTips: string[];
}

export interface SavedPreset {
  id: string;
  createdAt: string;
  videoSpecs: VideoSpecs;
  presetConfig: PresetConfig;
  aiReport?: AIReport;
}
