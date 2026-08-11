import React from "react";
import { VideoSpecs } from "../types/videoPreset";
import { Monitor, ShieldCheck, Image as ImageIcon } from "lucide-react";

interface VideoSpecsCardProps {
  specs: VideoSpecs;
}

export const VideoSpecsCard: React.FC<VideoSpecsCardProps> = ({ specs }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    }
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-[#00FF41] font-mono mb-1">
            Step 02 / Metadata Inspector
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white font-display flex items-center gap-3">
            <Monitor className="w-6 h-6 text-[#00FF41]" />
            Source Video Report
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="bg-white/10 text-white font-mono text-xs font-bold px-3 py-1 rounded border border-white/20 uppercase tracking-widest flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-[#00FF41]" />
            Container: {specs.container}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Frame Snapshot Preview */}
        <div className="lg:col-span-1 flex flex-col justify-between bg-[#151515] rounded-xl p-4 border border-white/10">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-white/20 flex items-center justify-center group">
            {specs.frameSnapshotBase64 ? (
              <>
                <img
                  src={specs.frameSnapshotBase64}
                  alt="Vista previa del vídeo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/90 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/20">
                  {specs.aspectRatio}
                </div>
                <div className="absolute bottom-2 right-2 bg-black/90 text-[#00FF41] text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-white/20">
                  {specs.fps} FPS
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="w-8 h-8 text-white/30 mx-auto mb-1" />
                <p className="text-xs text-white/40 font-mono">{specs.width} x {specs.height}</p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="truncate max-w-[180px] text-white/60 uppercase" title={specs.fileName}>
                {specs.fileName}
              </span>
              <span className="font-bold text-[#00FF41]">{formatFileSize(specs.fileSize)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-mono text-white/40 uppercase">
              <span>Duration:</span>
              <span className="text-white font-bold">{formatDuration(specs.duration)}</span>
            </div>
          </div>
        </div>

        {/* Specs Technical Grid - High Contrast Mono */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10">
          <div className="bg-[#111111] p-4 flex justify-between items-end border-b sm:border-r border-white/10">
            <span className="text-xs uppercase font-mono tracking-wider opacity-40">Codec</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#00FF41] uppercase truncate max-w-[180px] text-right" title={specs.codec}>
              {specs.codec}
            </span>
          </div>

          <div className="bg-[#111111] p-4 flex justify-between items-end border-b border-white/10">
            <span className="text-xs uppercase font-mono tracking-wider opacity-40">Resolution</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white uppercase">
              {specs.width} × {specs.height}
            </span>
          </div>

          <div className="bg-[#111111] p-4 flex justify-between items-end border-b sm:border-r border-white/10">
            <span className="text-xs uppercase font-mono tracking-wider opacity-40">Frame Rate</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-white uppercase">
              {specs.fps} FPS
            </span>
          </div>

          <div className="bg-[#111111] p-4 flex justify-between items-end border-b border-white/10">
            <span className="text-xs uppercase font-mono tracking-wider opacity-40">Target Bitrate</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-[#00FF41] uppercase">
              {specs.bitrateMbps} MBPS
            </span>
          </div>

          <div className="bg-[#111111] p-4 flex justify-between items-end border-b sm:border-r border-white/10 sm:border-b-0">
            <span className="text-xs uppercase font-mono tracking-wider opacity-40">Color Space</span>
            <span className="text-lg sm:text-xl font-black font-mono text-white uppercase">
              {specs.colorSpace}
            </span>
          </div>

          <div className="bg-[#111111] p-4 flex justify-between items-end border-b sm:border-r border-white/10">
            <span className="text-xs uppercase font-mono tracking-wider opacity-40">Audio Profile</span>
            <span className="text-lg sm:text-xl font-black font-mono text-white uppercase">
              {specs.audioCodec} {specs.audioSampleRate / 1000}kHz
            </span>
          </div>

          <div className="bg-[#111111] p-4 flex justify-between items-end border-b border-white/10">
            <span className="text-xs uppercase font-mono tracking-wider opacity-40">Detected Loudness</span>
            <span className="text-lg sm:text-xl font-black font-mono text-[#00FF41] uppercase flex items-center gap-1">
              <span>{specs.lufs !== undefined ? `${specs.lufs} LUFS` : "-14.0 LUFS"}</span>
              <span className="text-xs text-white/40 font-bold">({specs.truePeakDb !== undefined ? `${specs.truePeakDb} dBTP` : "-1.0 dBTP"})</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

