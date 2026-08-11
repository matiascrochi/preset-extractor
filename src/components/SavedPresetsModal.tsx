import React from "react";
import { SavedPreset } from "../types/videoPreset";
import { downloadEprFile } from "../utils/eprExporter";
import { downloadJsxFile } from "../utils/jsxExporter";
import { X, Download, Trash2, History, Film, Calendar } from "lucide-react";

interface SavedPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPresets: SavedPreset[];
  onLoadPreset: (preset: SavedPreset) => void;
  onDeletePreset: (id: string) => void;
  onClearAll: () => void;
}

export const SavedPresetsModal: React.FC<SavedPresetsModalProps> = ({
  isOpen,
  onClose,
  savedPresets,
  onLoadPreset,
  onDeletePreset,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-[#111111] border-2 border-white/20 rounded-xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-black border border-white/20 text-[#00FF41]">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-black font-mono uppercase tracking-widest text-[#00FF41]">Local Storage Vault</div>
              <h3 className="text-xl font-black font-display uppercase tracking-tight text-white">Saved Preset Vault</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full border border-white/20 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {savedPresets.length === 0 ? (
            <div className="text-center py-12">
              <Film className="w-12 h-12 text-white/20 mx-auto mb-2" />
              <p className="text-sm font-bold font-mono text-white/60 uppercase">No Saved Presets Found</p>
              <p className="text-xs font-mono text-white/40 mt-1 uppercase max-w-sm mx-auto">
                Exported presets will automatically be saved to your local storage vault.
              </p>
            </div>
          ) : (
            savedPresets.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-black border border-white/10 hover:border-[#00FF41]/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black font-display uppercase text-white">{item.presetConfig.presetName}</span>
                    <span className="text-[10px] font-mono font-bold bg-[#00FF41] text-black px-2 py-0.5 rounded">
                      {item.presetConfig.width}x{item.presetConfig.height}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-white/60 mt-1 uppercase">
                    Source Video: <span className="text-white font-bold">{item.videoSpecs.fileName}</span> ({item.videoSpecs.fps} FPS • {item.presetConfig.targetBitrateMbps} MBPS)
                  </p>
                  <p className="text-[10px] text-white/30 mt-1 flex items-center gap-1 font-mono uppercase">
                    <Calendar className="w-3 h-3 text-[#00FF41]" />
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto font-mono text-xs font-bold uppercase">
                  <button
                    onClick={() => {
                      onLoadPreset(item);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded bg-[#00FF41] text-black hover:bg-[#00FF41]/90 transition-colors cursor-pointer"
                  >
                    Load
                  </button>

                  <button
                    onClick={() => downloadEprFile(item.presetConfig, item.videoSpecs)}
                    className="px-3 py-1.5 rounded border border-white/20 bg-black hover:bg-white hover:text-black text-white transition-colors flex items-center gap-1 cursor-pointer"
                    title="Download .epr"
                  >
                    <Download className="w-3.5 h-3.5" />
                    .EPR
                  </button>

                  <button
                    onClick={() => downloadJsxFile(item.presetConfig)}
                    className="px-3 py-1.5 rounded border border-white/20 bg-black hover:bg-white hover:text-black text-white transition-colors flex items-center gap-1 cursor-pointer"
                    title="Download .jsx"
                  >
                    .JSX
                  </button>

                  <button
                    onClick={() => onDeletePreset(item.id)}
                    className="p-1.5 rounded border border-white/10 text-white/40 hover:text-red-500 hover:border-red-500 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {savedPresets.length > 0 && (
          <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-shrink-0 font-mono text-xs uppercase font-bold">
            <button
              onClick={onClearAll}
              className="text-red-500 hover:underline cursor-pointer"
            >
              Clear Entire Vault
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-white/20 hover:bg-white hover:text-black text-white cursor-pointer transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

