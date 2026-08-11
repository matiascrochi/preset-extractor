import { PresetConfig } from "../types/videoPreset";

/**
 * Generates an After Effects ExtendScript (.jsx) file to auto-configure Render Queue item
 */
export function generateAfterEffectsJsxScript(preset: PresetConfig): string {
  const nowStr = new Date().toISOString();

  return `/* 
  ========================================================================
  Preset Extractor - After Effects Render Queue Setup Script (.jsx)
  Generado el: ${nowStr}
  ========================================================================
  Instrucciones de uso en After Effects:
  1. En After Effects, ve a: Archivo -> Guiones -> Ejecutar archivo de guión...
     (File -> Scripts -> Run Script File...)
  2. Selecciona este archivo .jsx.
  3. El script añadirá tu composición activa a la Cola de Render (Render Queue)
     y aplicará la resolución (${preset.width}x${preset.height}), FPS (${preset.fps})
     y los parámetros de exportación deseados.
  ========================================================================
*/

(function createRenderQueueItemFromPresetExtractor() {
  app.beginUndoGroup("Preset Extractor Render Queue Setup");

  try {
    var comp = app.project.activeItem;

    if (!comp || !(comp instanceof CompItem)) {
      alert("⚠️ Error: Por favor, selecciona una composición activa en la ventana de Proyecto o Línea de Tiempo antes de ejecutar el guión.", "Preset Extractor");
      app.endUndoGroup();
      return;
    }

    // 1. Ajustar o verificar especificaciones de la Composición
    comp.width = ${preset.width};
    comp.height = ${preset.height};
    comp.frameRate = ${preset.fps};
    comp.pixelAspect = ${preset.pixelAspectRatioValue || 1.0};

    // 2. Añadir la Composición a la Cola de Renderización
    var renderQueue = app.project.renderQueue;
    var renderItem = renderQueue.items.add(comp);

    // 3. Ajustar configuración de salida si aplica
    if (renderItem) {
      // Intenta seleccionar la plantilla de módulo de salida recomendada
      var om = renderItem.outputModule(1);
      
      // Aplicar nombre de preset en la plantilla si existe
      try {
        om.applyTemplate("${preset.format === "ProRes" ? "Lossless" : "H.264"}");
      } catch (e) {
        // Fallback a plantilla estándar
      }

      alert("✅ ¡Éxito! La composición '" + comp.name + "' ha sido añadida a la Cola de Render con:\\n" +
            "• Resolución: " + comp.width + "x" + comp.height + " px\\n" +
            "• Fotogramas: " + comp.frameRate + " fps\\n" +
            "• Bitrate Objetivo: ${preset.targetBitrateMbps} Mbps\\n" +
            "• Normalización Audio: ${preset.normalizeAudio ? preset.targetLufs + " LUFS (" + (preset.loudnessStandard || "ITU-R BS.1770-4") + ")" : "Sin Normalización"}\\n\\n" +
            "Revisa la pestaña Cola de Renderizado para exportar tu vídeo.", "Preset Extractor");
    }

  } catch (err) {
    alert("❌ Ocurrió un error al ejecutar el guión: " + err.toString(), "Preset Extractor Error");
  }

  app.endUndoGroup();
})();
`;
}

/**
 * Downloads the .jsx script file for After Effects
 */
export function downloadJsxFile(preset: PresetConfig) {
  const jsxContent = generateAfterEffectsJsxScript(preset);
  const blob = new Blob([jsxContent], { type: "text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const sanitizedFilename = preset.presetName
    .replace(/[^a-zA-Z0-9_\-\.\s]/g, "")
    .replace(/\s+/g, "_");

  const a = document.createElement("a");
  a.href = url;
  a.download = `AE_Script_${sanitizedFilename || "PresetExtractor"}.jsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
