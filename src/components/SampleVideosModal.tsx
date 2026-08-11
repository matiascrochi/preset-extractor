import React from "react";
import { DEMO_SAMPLE_VIDEOS } from "../utils/videoInspector";
import { X, Film } from "lucide-react";

interface SampleVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: typeof DEMO_SAMPLE_VIDEOS[0]) => void;
}

export const SampleVideosModal: React.FC<SampleVideosModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111111] border-2 border-white/20 rounded-xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-black border border-white/20 text-[#00FF41]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black font-mono uppercase tracking-widest text-[#00FF41]">Benchmark Profiles</div>
              <h3 className="text-xl font-black font-display uppercase tracking-tight text-white">Select Sample Video</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full border border-white/20 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
          {DEMO_SAMPLE_VIDEOS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                onSelectSample(sample);
                onClose();
              }}
              className="p-5 rounded-xl bg-black border border-white/10 hover:border-[#00FF41] text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black font-mono bg-[#00FF41] text-black px-2 py-0.5 rounded">
                  {sample.specs.width}x{sample.specs.height} @ {sample.specs.fps}FPS
                </span>
                <span className="text-[10px] font-mono text-white/40 uppercase">
                  {sample.specs.bitrateMbps} MBPS
                </span>
              </div>
              <h4 className="text-base font-black font-display uppercase text-white mt-3 group-hover:text-[#00FF41]">
                {sample.name}
              </h4>
              <p className="text-xs font-mono text-white/50 mt-1 uppercase leading-relaxed">
                {sample.description}
              </p>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[11px] text-white/40 uppercase">
                <span>{sample.specs.codec}</span>
                <span className="text-[#00FF41] font-bold group-hover:underline flex items-center gap-1">
                  Load Profile →
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end font-mono text-xs uppercase font-bold">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full border border-white/20 hover:bg-white hover:text-black text-white cursor-pointer transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

