import React, { useRef, useState } from "react";
import { Upload, Film, Loader2, CheckCircle2, AlertCircle, ArrowDown } from "lucide-react";
import { DEMO_SAMPLE_VIDEOS } from "../utils/videoInspector";
import { VideoSpecs } from "../types/videoPreset";

interface VideoUploaderProps {
  onFileSelected: (file: File) => void;
  onSampleSelected: (sample: typeof DEMO_SAMPLE_VIDEOS[0]) => void;
  isAnalyzing: boolean;
  analysisStep: string;
  analysisError: string | null;
  currentSpecs: VideoSpecs | null;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onFileSelected,
  onSampleSelected,
  isAnalyzing,
  analysisStep,
  analysisError,
  currentSpecs,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|mxf|avi|m4v)$/i.test(file.name)) {
        onFileSelected(file);
      } else {
        alert("Por favor, sube un archivo de vídeo válido (.mp4, .mov, .mkv, .webm, .mxf, .avi).");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#00FF41] font-mono mb-1">
              Step 01 / Input Bridge
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-white font-display flex items-center gap-3">
              <Film className="w-6 h-6 text-[#00FF41]" />
              Drop Source Video
            </h2>
            <p className="text-xs font-mono text-white/50 mt-1 max-w-2xl uppercase">
              Analyzes container, stream maps, encoding profiles and audio bitrate in real-time.
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#00FF41] text-black hover:bg-white font-mono font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer self-start md:self-auto shadow-lg shadow-[#00FF41]/10"
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Local File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,.mp4,.mov,.mkv,.webm,.mxf,.avi,.m4v"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Drag & Drop Target Box */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isAnalyzing && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-[#00FF41] bg-[#00FF41]/10 scale-[1.01]"
              : isAnalyzing
              ? "border-[#00FF41]/50 bg-white/5 cursor-wait"
              : currentSpecs
              ? "border-white/30 bg-white/5 hover:border-[#00FF41] hover:bg-white/10"
              : "border-white/20 bg-white/5 hover:border-[#00FF41] hover:bg-white/10 group"
          }`}
        >
          {isAnalyzing ? (
            <div className="py-6 flex flex-col items-center justify-center">
              <div className="relative mb-4">
                <Loader2 className="w-12 h-12 text-[#00FF41] animate-spin" />
              </div>
              <p className="text-sm font-black font-mono uppercase tracking-widest text-[#00FF41] animate-pulse">
                Analyzing Video Streams...
              </p>
              <p className="text-xs font-mono text-white/50 mt-2 max-w-md uppercase">
                {analysisStep || "Extracting codecs, bitrates, audio channels and AI specs..."}
              </p>
            </div>
          ) : analysisError ? (
            <div className="py-4 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <p className="text-xs font-mono font-bold uppercase text-red-400">{analysisError}</p>
              <p className="text-xs font-mono text-white/40 mt-1 uppercase">Click to select another video file</p>
            </div>
          ) : currentSpecs ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-left">
              {currentSpecs.frameSnapshotBase64 ? (
                <div className="w-36 h-24 rounded-lg overflow-hidden border border-white/20 shadow-xl flex-shrink-0 bg-black relative">
                  <img
                    src={currentSpecs.frameSnapshotBase64}
                    alt="Frame Snapshot"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/90 text-[#00FF41] text-[10px] px-1.5 py-0.5 font-mono font-bold border border-white/10">
                    {currentSpecs.width}x{currentSpecs.height}
                  </span>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#00FF41]/10 border border-[#00FF41]/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-8 h-8 text-[#00FF41]" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-[#00FF41] text-black text-[10px] font-black font-mono uppercase tracking-widest px-2 py-0.5 rounded">
                    ANALYZE COMPLETE
                  </span>
                  <span className="text-xs text-white/40 font-mono">
                    {(currentSpecs.fileSize / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
                <h3 className="text-lg font-black uppercase text-white font-display line-clamp-1">
                  {currentSpecs.fileName}
                </h3>
                <p className="text-xs font-mono text-[#00FF41] mt-1">
                  {currentSpecs.width}×{currentSpecs.height} • {currentSpecs.fps} FPS • {currentSpecs.codec} • {currentSpecs.bitrateMbps} Mbps
                </p>
                <p className="text-[11px] font-mono text-white/40 uppercase mt-2">
                  Click or drop another file to switch active target
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="text-5xl font-black text-white/20 group-hover:text-[#00FF41] transition-colors mb-3">
                ↓
              </div>
              <h3 className="text-2xl font-black uppercase text-white font-display tracking-tight mb-2">
                Drop Source Video
              </h3>
              <p className="text-xs font-mono text-white/40 max-w-sm uppercase leading-relaxed mb-6">
                Analyzes container, stream maps, and encoding profiles instantly.
              </p>
              <div className="px-6 py-2.5 border border-white/30 rounded-full text-xs font-mono font-bold uppercase tracking-widest text-white group-hover:bg-white group-hover:text-black transition-all">
                Select File
              </div>
            </div>
          )}
        </div>

        {/* Quick Sample Presets Loader */}
        <div className="pt-4 border-t border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-black uppercase tracking-widest text-white/40">
              Instant Sample Targets
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEMO_SAMPLE_VIDEOS.map((demo) => (
              <button
                key={demo.id}
                onClick={() => onSampleSelected(demo)}
                disabled={isAnalyzing}
                className="p-3 rounded-lg bg-[#151515] hover:bg-white/10 border border-white/10 hover:border-[#00FF41]/50 text-left transition-all group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-[#00FF41] font-display uppercase">
                    {demo.name}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    {demo.specs.width}x{demo.specs.height}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-white/50 mt-1 uppercase">
                  {demo.specs.fps} FPS • {demo.specs.codec} • {demo.specs.bitrateMbps} Mbps
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

