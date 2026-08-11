import React from "react";
import { FolderOpen, Film, History, Terminal } from "lucide-react";

interface HeaderProps {
  onOpenFolderGuide: () => void;
  onOpenSampleVideos: () => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFolderGuide,
  onOpenSampleVideos,
  onOpenHistory,
  historyCount,
}) => {
  return (
    <header className="bg-[#0A0A0A] border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Brand & Bold Title */}
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter leading-none m-0 font-display uppercase text-white">
              PRESET<span className="text-[#00FF41]">EXTRACTOR</span>
            </h1>
            <span className="bg-white/10 text-white font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/10">
              PR / AE / AME
            </span>
          </div>
          <p className="text-[#00FF41] font-mono text-xs mt-1 uppercase tracking-widest flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Video Analysis & Adobe Metadata Bridge v2.4
          </p>
        </div>

        {/* Action Controls & System Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#151515] rounded-lg border border-white/10 mr-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse"></span>
            <span className="font-mono text-xs uppercase tracking-widest text-white/70">Engine Ready</span>
          </div>

          <button
            onClick={onOpenSampleVideos}
            className="inline-flex items-center px-3 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-widest border border-white/20 hover:bg-white hover:text-black transition-all cursor-pointer"
            title="Probar con vídeos de ejemplo"
          >
            <Film className="w-3.5 h-3.5 mr-1.5 text-[#00FF41]" />
            <span>Ejemplos</span>
          </button>

          <button
            onClick={onOpenFolderGuide}
            className="inline-flex items-center px-3 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-widest border border-white/20 hover:bg-white hover:text-black transition-all cursor-pointer"
            title="¿Dónde guardar los presets en Adobe?"
          >
            <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-white/60" />
            <span>Rutas Adobe</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="inline-flex items-center px-3 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-[#00FF41] text-black hover:bg-white transition-all shadow-md shadow-[#00FF41]/20 cursor-pointer"
            title="Ver presets guardados"
          >
            <History className="w-3.5 h-3.5 mr-1.5" />
            <span>Historial</span>
            {historyCount > 0 && (
              <span className="ml-1.5 bg-black text-[#00FF41] text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

