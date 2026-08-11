import React, { useState } from "react";
import { PresetConfig, VideoSpecs, AIReport } from "../types/videoPreset";
import { downloadEprFile, generateEprPresetXml, getEprFileName } from "../utils/eprExporter";
import { downloadJsxFile } from "../utils/jsxExporter";
import { Download, FileCode, FolderOpen, FileText, FolderInput, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface PresetExportBarProps {
  preset: PresetConfig;
  specs: VideoSpecs | null;
  report: AIReport | null;
  onOpenFolderGuide: () => void;
  onSaveToHistory: () => void;
  isSaved: boolean;
}

type InstallState = "idle" | "working" | "done" | "error";

export const PresetExportBar: React.FC<PresetExportBarProps> = ({
  preset,
  specs,
  report,
  onOpenFolderGuide,
  onSaveToHistory,
}) => {
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [installResults, setInstallResults] = useState<{ path: string; success: boolean; error?: string }[]>([]);

  const isElectron = typeof window !== "undefined" && !!window.presetAPI;

  const handleDownloadEpr = () => {
    downloadEprFile(preset, specs || undefined);
    onSaveToHistory();
  };

  const handleDownloadJsx = () => {
    downloadJsxFile(preset);
    onSaveToHistory();
  };

  const handleInstallDirect = async () => {
    if (!window.presetAPI) return;
    setInstallState("working");
    setInstallResults([]);

    try {
      const scan = await window.presetAPI.scanAdobePresetDirs();
      let targets = scan.presetDirs;

      if (targets.length === 0) {
        const chosen = await window.presetAPI.choosePresetFolder();
        if (!chosen) {
          setInstallState("idle");
          return;
        }
        targets = [chosen];
      }

      const xmlContent = generateEprPresetXml(preset, specs || undefined);
      const fileName = getEprFileName(preset);
      const results = await window.presetAPI.installPreset(targets, fileName, xmlContent);

      setInstallResults(results);
      setInstallState(results.some((r) => r.success) ? "done" : "error");
      if (results.some((r) => r.success)) {
        onSaveToHistory();
      }
    } catch (err) {
      console.error("Direct preset install failed:", err);
      setInstallState("error");
    }
  };

  const handleDownloadJsonReport = () => {
    const data = {
      presetConfig: preset,
      videoSpecs: specs,
      aiDiagnosticReport: report,
      exportedAt: new Date().toISOString(),
      generatedBy: "PresetCraft AI",
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Technical_Report_${preset.presetName.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const successfulPaths = installResults.filter((r) => r.success);
  const failedResults = installResults.filter((r) => !r.success);

  return (
    <div className="bg-[#111111] border-2 border-[#00FF41] rounded-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-[#00FF41] font-mono mb-1">
            Step 05 / Output Dispatcher
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-white font-display flex items-center gap-3">
            Export Configuration Preset
          </h2>
          <p className="text-xs font-mono text-white/50 mt-1 max-w-xl uppercase">
            {isElectron ? (
              <>
                Un clic instala el preset <span className="text-[#00FF41] font-bold">.epr</span> directo en Premiere Pro / Media Encoder.
              </>
            ) : (
              <>
                Compile native <span className="text-[#00FF41] font-bold">.epr</span> preset for Premiere & Media Encoder or <span className="text-white font-bold">.jsx</span> script for After Effects.
              </>
            )}
            {preset.normalizeAudio && (
              <span className="block mt-1 text-[#00FF41] font-bold">
                ✓ Includes Audio Loudness Normalization ({preset.targetLufs} LUFS • {preset.maxTruePeakDb || -1.0} dBTP)
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isElectron ? (
            <button
              onClick={handleInstallDirect}
              disabled={installState === "working"}
              className="inline-flex items-center px-6 py-4 rounded-full bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-black font-mono text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-[#00FF41]/20 active:scale-95 disabled:opacity-60 disabled:cursor-wait"
            >
              {installState === "working" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FolderInput className="w-4 h-4 mr-2" />
              )}
              Instalar en Premiere / AME
            </button>
          ) : (
            <button
              onClick={handleDownloadEpr}
              className="inline-flex items-center px-6 py-4 rounded-full bg-[#00FF41] hover:bg-[#00FF41]/90 text-black font-black font-mono text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-[#00FF41]/20 active:scale-95"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Premiere Preset (.EPR)
            </button>
          )}

          {isElectron && (
            <button
              onClick={handleDownloadEpr}
              className="inline-flex items-center px-4 py-4 rounded-full border border-white/20 hover:bg-white hover:text-black font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-white"
              title="Descargar el .epr manualmente"
            >
              <Download className="w-4 h-4 mr-1.5 text-[#00FF41]" />
              .EPR
            </button>
          )}

          {/* After Effects JSX Script Download */}
          <button
            onClick={handleDownloadJsx}
            className="inline-flex items-center px-5 py-4 rounded-full border border-white/20 hover:bg-white hover:text-black font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer text-white"
            title="Download .jsx script for After Effects"
          >
            <FileCode className="w-4 h-4 mr-2 text-[#00FF41]" />
            After Effects (.JSX)
          </button>

          {/* JSON Technical Report Download */}
          <button
            onClick={handleDownloadJsonReport}
            className="inline-flex items-center px-4 py-4 rounded-full border border-white/20 hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
            title="Download JSON technical report"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            JSON Report
          </button>

          {/* Save / Folder guide trigger */}
          <button
            onClick={onOpenFolderGuide}
            className="inline-flex items-center px-4 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer border border-white/20"
          >
            <FolderOpen className="w-4 h-4 mr-1.5 text-[#00FF41]" />
            Path Guide
          </button>
        </div>
      </div>

      {/* Direct-install feedback */}
      {isElectron && installState !== "idle" && installState !== "working" && (
        <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
          {successfulPaths.map((r) => (
            <div key={r.path} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#00FF41]/10 border border-[#00FF41]/30">
              <span className="text-xs font-mono text-[#00FF41] flex items-center gap-2 break-all">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                Instalado en: {r.path}
              </span>
              <button
                onClick={() => window.presetAPI?.showItemInFolder(r.path)}
                className="text-[10px] font-bold text-[#00FF41] hover:underline uppercase flex-shrink-0 cursor-pointer"
              >
                Abrir carpeta
              </button>
            </div>
          ))}
          {failedResults.map((r) => (
            <div key={r.path} className="flex items-center gap-2 p-3 rounded-lg bg-red-950/20 border border-red-500/30">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs font-mono text-red-300 break-all">
                No se pudo instalar en {r.path}{r.error ? `: ${r.error}` : ""}
              </span>
            </div>
          ))}
          {installResults.length === 0 && installState === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/20 border border-red-500/30">
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs font-mono text-red-300">
                No se detectó Premiere Pro ni Media Encoder instalados, y no se eligió una carpeta manual.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
