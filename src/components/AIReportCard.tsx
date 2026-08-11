import React, { useState } from "react";
import { AIReport } from "../types/videoPreset";
import { AlertTriangle, CheckCircle, Info, Sparkles, Youtube, Tv, Smartphone, Film, Lightbulb, ChevronDown } from "lucide-react";

interface AIReportCardProps {
  report: AIReport | null;
  isLoading: boolean;
}

export const AIReportCard: React.FC<AIReportCardProps> = ({ report, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-[#111111] border border-white/10 rounded-xl p-8 shadow-2xl text-center py-12">
        <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-[#00FF41] flex items-center justify-center mx-auto mb-3 animate-pulse">
          <Sparkles className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-lg font-black font-display uppercase tracking-tight text-white">Generating AI Diagnostic Report...</h3>
        <p className="text-xs font-mono text-white/40 mt-1 max-w-sm mx-auto uppercase">
          Evaluating profile compatibility, bitrate bounds, frame tolerances and render presets.
        </p>
      </div>
    );
  }

  if (!report) return null;

  const getPlatformIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case "youtube":
        return <Youtube className="w-4 h-4 text-red-500" />;
      case "instagramreels":
      case "tiktok":
        return <Smartphone className="w-4 h-4 text-pink-500" />;
      case "broadcast":
        return <Tv className="w-4 h-4 text-amber-400" />;
      case "cinema":
        return <Film className="w-4 h-4 text-[#00FF41]" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#00FF41]" />;
    }
  };

  const getPlatformLabel = (key: string) => {
    switch (key.toLowerCase()) {
      case "youtube":
        return "YouTube 4K/HD";
      case "instagramreels":
        return "Instagram Reels / TikTok (9:16)";
      case "broadcast":
        return "Televisión Broadcast / Cable";
      case "cinema":
        return "Cine DCP / Proyección";
      default:
        return key;
    }
  };

  return (
    <div className="bg-[#111111] border border-white/10 rounded-xl shadow-2xl relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 sm:p-8 text-left cursor-pointer hover:bg-white/5 transition-colors ${isOpen ? "border-b border-white/10" : ""}`}
      >
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-[#00FF41] font-mono mb-1">
            Step 03 / AI Diagnostic Engine (Opcional)
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white font-display flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-[#00FF41]" />
            Metadata Analysis Report
          </h2>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="bg-[#00FF41] text-black font-mono text-xs font-black uppercase tracking-widest px-3 py-1 rounded flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-black" />
            ANALYSIS COMPLETE
          </span>
          <ChevronDown className={`w-5 h-5 text-white/50 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen && (
      <div className="p-6 sm:p-8 pt-6 space-y-6">
      {/* Resumen Ejecutivo */}
      <div className="p-4 rounded-xl bg-[#151515] border border-white/10">
        <h4 className="text-xs font-black font-mono uppercase tracking-widest text-[#00FF41] mb-2 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Technical Summary
        </h4>
        <p className="text-xs font-mono text-white/80 leading-relaxed uppercase">
          {report.technicalSummary}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Warnings / Valores a Chequear */}
        <div className="bg-[#151515] rounded-xl p-5 border border-white/10">
          <h4 className="text-xs font-black font-mono uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Key Parameters To Check
          </h4>

          {report.criticalWarnings && report.criticalWarnings.length > 0 ? (
            <ul className="space-y-2.5">
              {report.criticalWarnings.map((warning, idx) => (
                <li key={idx} className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs font-mono text-amber-200 flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3.5 rounded-lg bg-[#00FF41]/10 border border-[#00FF41]/30 text-xs font-mono text-[#00FF41] flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#00FF41] flex-shrink-0" />
              <span>No critical stream inconsistencies found. Target parameters fully normalized.</span>
            </div>
          )}
        </div>

        {/* Suitability by Platform */}
        <div className="bg-[#151515] rounded-xl p-5 border border-white/10">
          <h4 className="text-xs font-black font-mono uppercase tracking-widest text-[#00FF41] mb-3 flex items-center gap-1.5">
            <Film className="w-4 h-4 text-[#00FF41]" />
            Target Platform Rating
          </h4>

          <div className="space-y-3">
            {Object.entries(report.platformSuitability || {}).map(([platKey, info]) => {
              const platInfo = info as { score: number; notes: string };
              return (
                <div key={platKey} className="p-3 rounded-lg bg-[#111111] border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white font-display uppercase flex items-center gap-2">
                      {getPlatformIcon(platKey)}
                      {getPlatformLabel(platKey)}
                    </span>
                    <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                      platInfo.score >= 85
                        ? "bg-[#00FF41] text-black"
                        : platInfo.score >= 70
                        ? "bg-amber-400 text-black"
                        : "bg-red-500 text-white"
                    }`}>
                      {platInfo.score}%
                    </span>
                  </div>

                  {/* Score bar */}
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-500 ${
                        platInfo.score >= 85
                          ? "bg-[#00FF41]"
                          : platInfo.score >= 70
                          ? "bg-amber-400"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${platInfo.score}%` }}
                    />
                  </div>

                  <p className="text-[11px] font-mono text-white/50 uppercase">
                    {platInfo.notes}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pro Tips */}
      {report.proTips && report.proTips.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-xs font-black font-mono uppercase tracking-widest text-white/60 mb-3 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-[#00FF41]" />
            Adobe Premiere & Encoder Pro Tips
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.proTips.map((tip, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-[#151515] border border-white/10 text-xs font-mono text-white/70 flex items-start gap-2.5 uppercase">
                <span className="text-[#00FF41] font-bold">→</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
};

