import React, { useState } from "react";
import { PresetConfig, VideoSpecs } from "../types/videoPreset";
import { Sliders, Video, Volume2, Shield, Settings2, HardDrive, Wand2, ChevronDown } from "lucide-react";

interface PresetConfiguratorProps {
  preset: PresetConfig;
  onChange: (updated: PresetConfig) => void;
  specs: VideoSpecs | null;
  onResetToSource: () => void;
}

export const PresetConfigurator: React.FC<PresetConfiguratorProps> = ({
  preset,
  onChange,
  specs,
  onResetToSource,
}) => {
  const updateField = <K extends keyof PresetConfig>(field: K, value: PresetConfig[K]) => {
    onChange({ ...preset, [field]: value });
  };

  // Estimate file size per minute in Megabytes
  // (TargetBitrateMbps * 60 seconds) / 8 bits
  const estimatedMBPerMin = Math.round((preset.targetBitrateMbps * 60) / 8);

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl shadow-2xl">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 ${isOpen ? "pb-4 border-b border-white/10" : ""}`}>
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="flex items-center gap-3 text-left cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#00FF41] font-mono mb-1">
              Step 04 / Export Tuning Engine (Opcional)
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white font-display flex items-center gap-3">
              <Sliders className="w-6 h-6 text-[#00FF41]" />
              Preset Fine-Tuning
            </h2>
          </div>
          <ChevronDown className={`w-5 h-5 text-white/50 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        <button
          onClick={onResetToSource}
          className="inline-flex items-center px-4 py-2 rounded-full border border-white/20 hover:bg-white hover:text-black font-mono text-xs font-bold uppercase tracking-widest transition-all self-start sm:self-auto cursor-pointer"
        >
          <Wand2 className="w-3.5 h-3.5 mr-1.5 text-[#00FF41]" />
          Match Source File
        </button>
      </div>

      {isOpen && (
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-6">
        {/* Preset Name */}
        <div>
          <label className="block text-xs font-black font-mono text-white/50 uppercase tracking-widest mb-2">
            Preset Name (.epr / .jsx target)
          </label>
          <input
            type="text"
            value={preset.presetName}
            onChange={(e) => updateField("presetName", e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-black border border-white/20 text-[#00FF41] font-mono font-bold text-sm focus:outline-none focus:border-[#00FF41]"
            placeholder="Preset_Target_1080p"
          />
        </div>

        {/* Video Format & Codec */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black font-mono text-white/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-[#00FF41]" />
              Format / Codec
            </label>
            <select
              value={preset.format}
              onChange={(e) => updateField("format", e.target.value as any)}
              className="w-full px-3 py-3 rounded-lg bg-black border border-white/20 text-white font-mono text-xs font-bold focus:outline-none focus:border-[#00FF41]"
            >
              <option value="H.264">H.264 (AVC - Web & Social)</option>
              <option value="HEVC">HEVC / H.265 (High Efficiency 4K)</option>
              <option value="ProRes">Apple ProRes .MOV (Pro Master)</option>
              <option value="ProRes MXF">Apple ProRes MXF OP1a (Broadcast)</option>
              <option value="DNxHR">Avid DNxHR MXF (Broadcast Spec)</option>
              <option value="MXF OP1a">MXF OP1a / XDCAM (Broadcast Delivery)</option>
            </select>
          </div>

          {(preset.format === "ProRes" || preset.format === "ProRes MXF") && (
            <div>
              <label className="block text-xs font-black font-mono text-white/50 uppercase tracking-widest mb-2">
                ProRes Variant
              </label>
              <select
                value={preset.proResVariant || "ProRes 422 HQ"}
                onChange={(e) => updateField("proResVariant", e.target.value as any)}
                className="w-full px-3 py-3 rounded-lg bg-black border border-white/20 text-white font-mono text-xs font-bold focus:outline-none focus:border-[#00FF41]"
              >
                <option value="ProRes 422 Proxy">422 Proxy (Offline / Lightest)</option>
                <option value="ProRes 422 LT">422 LT (Light)</option>
                <option value="ProRes 422">422 (Standard)</option>
                <option value="ProRes 422 HQ">422 HQ (Broadcast Master)</option>
                <option value="ProRes 4444">4444 (Alpha / Grading)</option>
                <option value="ProRes 4444 XQ">4444 XQ (Highest Quality)</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-black font-mono text-white/50 uppercase tracking-widest mb-2">
              Resolution
            </label>
            <select
              value={`${preset.width}x${preset.height}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split("x").map(Number);
                updateField("width", w);
                updateField("height", h);
              }}
              className="w-full px-3 py-3 rounded-lg bg-black border border-white/20 text-white font-mono text-xs font-bold focus:outline-none focus:border-[#00FF41]"
            >
              {specs && (
                <option value={`${specs.width}x${specs.height}`}>
                  Match Source ({specs.width} × {specs.height})
                </option>
              )}
              <option value="3840x2160">4K UHD (3840 × 2160)</option>
              <option value="1920x1080">Full HD (1920 × 1080)</option>
              <option value="1080x1920">Vertical Reels (1080 × 1920)</option>
              <option value="1080x1080">Square (1080 × 1080)</option>
              <option value="4096x2160">4K DCI Cinema (4096 × 2160)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black font-mono text-white/50 uppercase tracking-widest mb-2">
              Frame Rate (FPS)
            </label>
            <select
              value={preset.fps}
              onChange={(e) => updateField("fps", Number(e.target.value))}
              className="w-full px-3 py-3 rounded-lg bg-black border border-white/20 text-white font-mono text-xs font-bold focus:outline-none focus:border-[#00FF41]"
            >
              <option value={60}>60 FPS (Gaming / High HFR)</option>
              <option value={59.94}>59.94 FPS (NTSC Broadcast)</option>
              <option value={50}>50 FPS (PAL High)</option>
              <option value={30}>30 FPS (Standard Web)</option>
              <option value={29.97}>29.97 FPS (NTSC Standard)</option>
              <option value={25}>25 FPS (PAL Standard)</option>
              <option value={24}>24 FPS (Cinema Standard)</option>
              <option value={23.976}>23.976 FPS (Cinema NTSC)</option>
            </select>
          </div>
        </div>

        {/* Bitrate Encoding & Sliders */}
        <div className="p-5 rounded-xl bg-[#151515] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h4 className="text-xs font-black font-mono uppercase tracking-widest text-[#00FF41] flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              Bitrate Encoding Profile
            </h4>

            <div className="flex items-center space-x-1 bg-black p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => updateField("bitrateEncoding", "VBR_1PASS")}
                className={`px-3 py-1 rounded text-[11px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                  preset.bitrateEncoding === "VBR_1PASS"
                    ? "bg-[#00FF41] text-black"
                    : "text-white/50 hover:text-white"
                }`}
              >
                VBR 1-Pass
              </button>
              <button
                type="button"
                onClick={() => updateField("bitrateEncoding", "VBR_2PASS")}
                className={`px-3 py-1 rounded text-[11px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                  preset.bitrateEncoding === "VBR_2PASS"
                    ? "bg-[#00FF41] text-black"
                    : "text-white/50 hover:text-white"
                }`}
              >
                VBR 2-Pass
              </button>
              <button
                type="button"
                onClick={() => updateField("bitrateEncoding", "CBR")}
                className={`px-3 py-1 rounded text-[11px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                  preset.bitrateEncoding === "CBR"
                    ? "bg-[#00FF41] text-black"
                    : "text-white/50 hover:text-white"
                }`}
              >
                CBR
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-white/60 uppercase">Target Bitrate</span>
                <span className="font-black text-[#00FF41]">{preset.targetBitrateMbps} MBPS</span>
              </div>
              <input
                type="range"
                min={2}
                max={150}
                step={0.5}
                value={preset.targetBitrateMbps}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateField("targetBitrateMbps", val);
                  if (val > preset.maxBitrateMbps) {
                    updateField("maxBitrateMbps", Math.round(val * 1.25));
                  }
                }}
                className="w-full accent-[#00FF41] bg-white/10 rounded-lg cursor-pointer h-2"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-white/60 uppercase">Maximum Bitrate</span>
                <span className="font-black text-amber-400">{preset.maxBitrateMbps} MBPS</span>
              </div>
              <input
                type="range"
                min={preset.targetBitrateMbps}
                max={200}
                step={1}
                value={preset.maxBitrateMbps}
                onChange={(e) => updateField("maxBitrateMbps", Number(e.target.value))}
                className="w-full accent-amber-400 bg-white/10 rounded-lg cursor-pointer h-2"
              />
            </div>
          </div>

          {/* Size Estimator */}
          <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-white/10 uppercase">
            <span className="text-white/40 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#00FF41]" />
              Estimated Output File Size:
            </span>
            <span className="font-bold text-[#00FF41]">
              ~{estimatedMBPerMin} MB / minute
            </span>
          </div>
        </div>

        {/* Audio & Quality Toggles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Audio Config & Normalization */}
          <div className="p-5 rounded-xl bg-[#151515] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black font-mono uppercase tracking-widest text-[#00FF41] flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-[#00FF41]" />
                Audio Parameters & Loudness Normalization
              </h4>

              <label className="flex items-center space-x-2 cursor-pointer bg-black px-2.5 py-1 rounded border border-white/20">
                <input
                  type="checkbox"
                  checked={preset.normalizeAudio}
                  onChange={(e) => updateField("normalizeAudio", e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-white/20 text-[#00FF41] accent-[#00FF41] bg-black"
                />
                <span className="text-[10px] font-mono font-bold text-white uppercase">
                  LUFS Effect
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase mb-1">Sample Rate</label>
                <select
                  value={preset.audioSampleRate}
                  onChange={(e) => updateField("audioSampleRate", Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded bg-black border border-white/20 text-white font-mono text-xs font-bold"
                >
                  <option value={48000}>48,000 Hz (Video Standard)</option>
                  <option value={44100}>44,100 Hz (CD Standard)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-white/40 uppercase mb-1">Bitrate</label>
                <select
                  value={preset.audioBitrateKbps}
                  onChange={(e) => updateField("audioBitrateKbps", Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded bg-black border border-white/20 text-white font-mono text-xs font-bold"
                >
                  <option value={320}>320 kbps (High Quality)</option>
                  <option value={256}>256 kbps (Standard)</option>
                  <option value={192}>192 kbps (Compact)</option>
                </select>
              </div>
            </div>

            {/* LUFS Normalization Effect Parameters */}
            {preset.normalizeAudio && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                    Target Loudness Level:
                    <span className="text-[#00FF41] text-sm font-black">{preset.targetLufs} LUFS</span>
                  </span>

                  {specs && specs.lufs !== undefined && (
                    <button
                      type="button"
                      onClick={() => updateField("targetLufs", specs.lufs!)}
                      className="text-[10px] font-bold text-[#00FF41] bg-black px-2 py-1 rounded border border-[#00FF41]/40 hover:bg-[#00FF41] hover:text-black transition-all uppercase cursor-pointer"
                    >
                      Match Video ({specs.lufs} LUFS)
                    </button>
                  )}
                </div>

                <input
                  type="range"
                  min={-30}
                  max={-6}
                  step={0.1}
                  value={preset.targetLufs}
                  onChange={(e) => updateField("targetLufs", Number(e.target.value))}
                  className="w-full accent-[#00FF41] bg-white/10 rounded-lg cursor-pointer h-2"
                />

                {/* LUFS Standard Quick Pick Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => updateField("targetLufs", -14.0)}
                    className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                      preset.targetLufs === -14.0
                        ? "bg-[#00FF41] text-black border-[#00FF41]"
                        : "bg-black text-white/60 border-white/10 hover:text-white"
                    }`}
                  >
                    -14 LUFS (YouTube)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("targetLufs", -16.0)}
                    className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                      preset.targetLufs === -16.0
                        ? "bg-[#00FF41] text-black border-[#00FF41]"
                        : "bg-black text-white/60 border-white/10 hover:text-white"
                    }`}
                  >
                    -16 LUFS (Podcasts)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("targetLufs", -12.0)}
                    className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                      preset.targetLufs === -12.0
                        ? "bg-[#00FF41] text-black border-[#00FF41]"
                        : "bg-black text-white/60 border-white/10 hover:text-white"
                    }`}
                  >
                    -12 LUFS (Reels/TikTok)
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("targetLufs", -24.0)}
                    className={`px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                      preset.targetLufs === -24.0
                        ? "bg-[#00FF41] text-black border-[#00FF41]"
                        : "bg-black text-white/60 border-white/10 hover:text-white"
                    }`}
                  >
                    -24 LUFS (TV EBU)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 uppercase mb-1">True Peak Limit</label>
                    <select
                      value={preset.maxTruePeakDb}
                      onChange={(e) => updateField("maxTruePeakDb", Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded bg-black border border-white/20 text-white font-mono text-xs font-bold"
                    >
                      <option value={-1.0}>-1.0 dBTP (Standard)</option>
                      <option value={-2.0}>-2.0 dBTP (Broadcast)</option>
                      <option value={-0.5}>-0.5 dBTP (Aggressive)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-white/40 uppercase mb-1">Standard</label>
                    <select
                      value={preset.loudnessStandard}
                      onChange={(e) => updateField("loudnessStandard", e.target.value as any)}
                      className="w-full px-2 py-1.5 rounded bg-black border border-white/20 text-white font-mono text-xs font-bold"
                    >
                      <option value="ITU-R BS.1770-4">ITU-R BS.1770-4</option>
                      <option value="EBU R128">EBU R128</option>
                      <option value="ATSC A/85">ATSC A/85</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Render Quality Toggles */}
          <div className="p-5 rounded-xl bg-[#151515] border border-white/10 space-y-3">
            <h4 className="text-xs font-black font-mono uppercase tracking-widest text-white/60 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#00FF41]" />
              Render Quality Flags
            </h4>

            <div className="space-y-2 font-mono text-xs uppercase">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preset.renderAtMaxDepth}
                  onChange={(e) => updateField("renderAtMaxDepth", e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-[#00FF41] accent-[#00FF41] bg-black"
                />
                <span className="text-white/80 font-bold">
                  Render at Maximum Depth (32-bit color)
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preset.useMaxRenderQuality}
                  onChange={(e) => updateField("useMaxRenderQuality", e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-[#00FF41] accent-[#00FF41] bg-black"
                />
                <span className="text-white/80 font-bold">
                  Use Maximum Render Quality
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

