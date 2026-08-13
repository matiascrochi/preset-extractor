import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { VideoUploader } from "./components/VideoUploader";
import { VideoSpecsCard } from "./components/VideoSpecsCard";
import { AIReportCard } from "./components/AIReportCard";
import { PresetConfigurator } from "./components/PresetConfigurator";
import { PresetExportBar } from "./components/PresetExportBar";
import { AdobePathGuideModal } from "./components/AdobePathGuideModal";
import { SavedPresetsModal } from "./components/SavedPresetsModal";
import { SampleVideosModal } from "./components/SampleVideosModal";
import { inspectVideoFile, DEMO_SAMPLE_VIDEOS } from "./utils/videoInspector";
import { VideoSpecs, PresetConfig, AIReport, SavedPreset } from "./types/videoPreset";
import { Sliders, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export default function App() {
  const [currentSpecs, setCurrentSpecs] = useState<VideoSpecs | null>(null);
  const [presetConfig, setPresetConfig] = useState<PresetConfig | null>(null);
  const [aiReport, setAiReport] = useState<AIReport | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [isSaved, setIsSaved] = useState(false);

  // Modals
  const [isFolderGuideOpen, setIsFolderGuideOpen] = useState(false);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Load saved presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("presetcraft_saved_presets");
      if (stored) {
        setSavedPresets(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load saved presets from localStorage:", e);
    }
  }, []);

  // Save preset to history list in localStorage
  const handleSaveToHistory = () => {
    if (!currentSpecs || !presetConfig) return;

    const newSavedItem: SavedPreset = {
      id: "preset_" + Date.now(),
      createdAt: new Date().toISOString(),
      videoSpecs: currentSpecs,
      presetConfig,
      aiReport: aiReport || undefined,
    };

    const updated = [newSavedItem, ...savedPresets.filter((p) => p.presetConfig.presetName !== presetConfig.presetName)];
    setSavedPresets(updated);
    setIsSaved(true);

    try {
      localStorage.setItem("presetcraft_saved_presets", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  };

  const handleDeleteSavedPreset = (id: string) => {
    const updated = savedPresets.filter((p) => p.id !== id);
    setSavedPresets(updated);
    try {
      localStorage.setItem("presetcraft_saved_presets", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to update localStorage:", e);
    }
  };

  const handleClearAllHistory = () => {
    if (confirm("¿Estás seguro de que deseas borrar todo el historial de presets?")) {
      setSavedPresets([]);
      localStorage.removeItem("presetcraft_saved_presets");
    }
  };

  // Build default PresetConfig matching VideoSpecs
  const createPresetFromSpecs = (specs: VideoSpecs): PresetConfig => {
    const cleanName = specs.fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const format: PresetConfig["format"] = specs.codec.includes("ProRes")
      ? "ProRes"
      : specs.codec.includes("HEVC")
      ? "HEVC"
      : specs.codec.includes("DNx")
      ? "DNxHR"
      : "H.264";

    // Match the source's own ProRes variant when we can identify it, so a ProRes
    // master round-trips at the same quality tier instead of silently defaulting.
    // Order matters: "422 HQ" must be tested before the bare "422" substring.
    const proResVariant: PresetConfig["proResVariant"] = !specs.codec.includes("ProRes")
      ? undefined
      : specs.codec.includes("4444 XQ")
      ? "ProRes 4444 XQ"
      : specs.codec.includes("4444")
      ? "ProRes 4444"
      : specs.codec.includes("Proxy")
      ? "ProRes 422 Proxy"
      : specs.codec.includes("LT")
      ? "ProRes 422 LT"
      : specs.codec.includes("HQ")
      ? "ProRes 422 HQ"
      : "ProRes 422";

    return {
      presetName: `Preset_${cleanName}_${specs.width}x${specs.height}`,
      softwareTarget: "all",
      format,
      proResVariant,
      width: specs.width,
      height: specs.height,
      fps: specs.fps,
      aspectRatio: specs.aspectRatio,
      pixelAspectRatioLabel: "Píxeles cuadrados (1.0)",
      pixelAspectRatioValue: 1.0,
      bitrateEncoding: specs.bitrateMbps > 30 ? "VBR_2PASS" : "VBR_1PASS",
      targetBitrateMbps: specs.bitrateMbps,
      maxBitrateMbps: Math.round(specs.bitrateMbps * 1.3),
      profile: specs.height >= 2160 ? "High" : "Main",
      level: specs.height >= 2160 ? "5.1" : "4.1",
      keyframeInterval: Math.round(specs.fps),
      renderAtMaxDepth: specs.height >= 2160 || specs.codec.includes("ProRes"),
      useMaxRenderQuality: true,
      audioFormat: specs.audioCodec.includes("PCM") ? "Uncompressed LPCM" : "AAC",
      audioSampleRate: specs.audioSampleRate || 48000,
      audioChannels: specs.audioChannels === 6 ? "5.1 Surround" : "Stereo (2.0)",
      audioBitrateKbps: 320,
      colorSpace: specs.colorSpace.includes("2020") ? "Rec.2020" : "Rec.709",
      // Audio Normalization & Loudness matching detected video target
      normalizeAudio: true,
      targetLufs: specs.lufs !== undefined ? specs.lufs : -14.0,
      // A -23 LUFS target is the EBU R128 broadcast reference (matches how real
      // broadcast presets are authored); other targets default to the ITU-R base spec.
      loudnessStandard: specs.lufs !== undefined && Math.abs(specs.lufs - -23) < 0.5 ? "EBU R128" : "ITU-R BS.1770-4",
      // Delivery ceiling for the output limiter — a fixed spec value, NOT the source's
      // own measured true peak (specs.truePeakDb). -1 dBTP is the EBU R128 / broadcast
      // standard ceiling; the user can override it in the configurator if their spec differs.
      maxTruePeakDb: -1.0,
    };
  };

  // Build a fully local diagnostic report from the inspected specs (no network / AI backend involved)
  const runAiAnalysis = async (specs: VideoSpecs) => {
    setAnalysisStep("Generando diagnóstico técnico local a partir de las especificaciones...");
    setAiReport({
      technicalSummary: `Vídeo en contenedor ${specs.container} con resolución ${specs.width}x${specs.height} a ${specs.fps} fps con un bitrate de ${specs.bitrateMbps} Mbps.`,
      recommendedSettings: {
        targetBitrateMbps: specs.bitrateMbps,
        maxBitrateMbps: Math.round(specs.bitrateMbps * 1.25),
      },
      criticalWarnings: [
        specs.fps > 60 ? "Tasa de fotogramas muy elevada (>60fps); asegúrate de mantenerla para evitar tirones en reproducción." : null,
        specs.bitrateMbps > 80 ? "Bitrate muy alto para web; si es para YouTube/Vimeo el preset optimizado reducirá tiempo de subida sin pérdida visible." : null,
      ].filter(Boolean) as string[],
      platformSuitability: {
        YouTube: { score: 95, notes: "Resolución y tasa de bits excelentes para HD/4K" },
        InstagramReels: { score: specs.aspectRatio.includes("9:16") ? 100 : 70, notes: specs.aspectRatio.includes("9:16") ? "Formato vertical 9:16 perfecto" : "Requiere reencuadre vertical" },
        Broadcast: { score: specs.codec.includes("ProRes") ? 95 : 80, notes: "Apto para televisión web/digital" },
      },
      proTips: [
        "Usa la aceleración por hardware (NVENC o QuickSync) en Premiere para exportar hasta 5x más rápido.",
        "Para redes sociales mantén el perfil en High y audio AAC a 320 kbps y 48,000 Hz.",
      ],
    });
  };

  // Handle uploaded video file
  const handleFileSelected = async (file: File) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAiReport(null);
    setIsSaved(false);

    try {
      setAnalysisStep("Parseando metadatos y cabeceras del vídeo...");
      const specs = await inspectVideoFile(file);

      setCurrentSpecs(specs);
      const initialPreset = createPresetFromSpecs(specs);
      setPresetConfig(initialPreset);

      await runAiAnalysis(specs);
    } catch (err: any) {
      console.error("Error inspecting video:", err);
      setAnalysisError(err.message || "No se pudo inspeccionar el archivo de vídeo.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  // Handle demo sample selection
  const handleSampleSelected = async (demo: typeof DEMO_SAMPLE_VIDEOS[0]) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAiReport(null);
    setIsSaved(false);

    try {
      setAnalysisStep(`Cargando especificaciones del ejemplo '${demo.name}'...`);
      setCurrentSpecs(demo.specs);
      const initialPreset = createPresetFromSpecs(demo.specs);
      setPresetConfig(initialPreset);

      await runAiAnalysis(demo.specs);
    } catch (err: any) {
      setAnalysisError(err.message || "Error al cargar el ejemplo de prueba.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const handleLoadSavedPreset = (saved: SavedPreset) => {
    setCurrentSpecs(saved.videoSpecs);
    setPresetConfig(saved.presetConfig);
    if (saved.aiReport) {
      setAiReport(saved.aiReport);
    }
  };

  const handleResetToSource = () => {
    if (currentSpecs) {
      setPresetConfig(createPresetFromSpecs(currentSpecs));
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#00FF41] selection:text-black pb-16">
      {/* Header */}
      <Header
        onOpenFolderGuide={() => setIsFolderGuideOpen(true)}
        onOpenSampleVideos={() => setIsSampleModalOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={savedPresets.length}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Step 1: Video Uploader */}
        <VideoUploader
          onFileSelected={handleFileSelected}
          onSampleSelected={handleSampleSelected}
          isAnalyzing={isAnalyzing}
          analysisStep={analysisStep}
          analysisError={analysisError}
          currentSpecs={currentSpecs}
        />

        {/* Step 2: Video Specs Display */}
        {currentSpecs && (
          <div className="space-y-8 animate-fade-in">
            <VideoSpecsCard specs={currentSpecs} />

            {/* Step 3: Direct Export Bar — the main path: drag video, get preset */}
            {presetConfig && (
              <PresetExportBar
                preset={presetConfig}
                specs={currentSpecs}
                report={aiReport}
                onOpenFolderGuide={() => setIsFolderGuideOpen(true)}
                onSaveToHistory={handleSaveToHistory}
                isSaved={isSaved}
              />
            )}

            {/* Optional: AI Diagnostic & Report (collapsed by default) */}
            <AIReportCard report={aiReport} isLoading={isAnalyzing} />

            {/* Optional: Preset Fine-Tuning Configurator (collapsed by default) */}
            {presetConfig && (
              <PresetConfigurator
                preset={presetConfig}
                onChange={setPresetConfig}
                specs={currentSpecs}
                onResetToSource={handleResetToSource}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <AdobePathGuideModal
        isOpen={isFolderGuideOpen}
        onClose={() => setIsFolderGuideOpen(false)}
      />

      <SavedPresetsModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedPresets={savedPresets}
        onLoadPreset={handleLoadSavedPreset}
        onDeletePreset={handleDeleteSavedPreset}
        onClearAll={handleClearAllHistory}
      />

      <SampleVideosModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        onSelectSample={handleSampleSelected}
      />
    </div>
  );
}
