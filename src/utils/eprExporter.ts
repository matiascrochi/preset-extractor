import { PresetConfig, VideoSpecs } from "../types/videoPreset";

/**
 * Generates an Adobe Premiere Pro / Media Encoder Export Preset (.epr) XML string
 */
export function generateEprPresetXml(preset: PresetConfig, specs?: VideoSpecs): string {
  const bitrateEncodingMap: Record<string, string> = {
    VBR_1PASS: "1 (VBR 1-pass)",
    VBR_2PASS: "2 (VBR 2-pass)",
    CBR: "0 (CBR Constant Bitrate)",
  };

  const targetBitrateBps = Math.round(preset.targetBitrateMbps * 1000000);
  const maxBitrateBps = Math.round(preset.maxBitrateMbps * 1000000);
  const audioBitrateBps = Math.round(preset.audioBitrateKbps * 1000);

  const nowStr = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Preset Extractor - Adobe Premiere Pro & Media Encoder Export Preset -->
<!-- Generado el: ${nowStr} -->
<PremiereData Version="10.0">
  <ExportPreset ObjectRef="1">
    <ExportPreset id="1" Version="5">
      <Name>${escapeXml(preset.presetName)}</Name>
      <Comments>Preset autogenerado coincidiendo con las especificaciones del vídeo de origen (${preset.width}x${preset.height} @ ${preset.fps}fps - ${preset.targetBitrateMbps} Mbps). Normalización de audio: ${preset.normalizeAudio ? preset.targetLufs + " LUFS (" + preset.loudnessStandard + ")" : "Desactivada"}.</Comments>
      <Format>${preset.format === "H.264" ? "H.264" : preset.format === "HEVC" ? "HEVC (H.265)" : preset.format}</Format>
      <Extension>${preset.format === "ProRes" || preset.format === "QuickTime" ? "mov" : "mp4"}</Extension>
      
      <!-- ESPECIFICACIONES DE VÍDEO -->
      <VideoFormat ObjectRef="2">
        <VideoFormat id="2">
          <Width>${preset.width}</Width>
          <Height>${preset.height}</Height>
          <FrameRate>${preset.fps}</FrameRate>
          <PixelAspectRatio>${preset.pixelAspectRatioValue || 1.0}</PixelAspectRatio>
          <PixelAspectRatioLabel>${escapeXml(preset.pixelAspectRatioLabel)}</PixelAspectRatioLabel>
          <FieldType>0</FieldType> <!-- 0 = Progressive Scan -->
          <Profile>${escapeXml(preset.profile)}</Profile>
          <Level>${escapeXml(preset.level)}</Level>
          
          <!-- BITRATE Y CODIFICACIÓN -->
          <BitrateEncodingMode>${preset.bitrateEncoding}</BitrateEncodingMode>
          <BitrateEncodingDescription>${bitrateEncodingMap[preset.bitrateEncoding] || "VBR"}</BitrateEncodingDescription>
          <TargetBitrate>${targetBitrateBps}</TargetBitrate>
          <MaxBitrate>${maxBitrateBps}</MaxBitrate>
          <TargetBitrateMbps>${preset.targetBitrateMbps}</TargetBitrateMbps>
          <MaxBitrateMbps>${preset.maxBitrateMbps}</MaxBitrateMbps>
          <GOPSize>${preset.keyframeInterval}</GOPSize>
          <KeyframeDistance>${preset.keyframeInterval}</KeyframeDistance>
          
          <!-- CALIDAD Y RENDERIZADO -->
          <RenderAtMaximumDepth>${preset.renderAtMaxDepth ? "true" : "false"}</RenderAtMaximumDepth>
          <UseMaximumRenderQuality>${preset.useMaxRenderQuality ? "true" : "false"}</UseMaximumRenderQuality>
          <ColorSpace>${escapeXml(preset.colorSpace)}</ColorSpace>
          <AspectNumerator>${specs ? specs.width : preset.width}</AspectNumerator>
          <AspectDenominator>${specs ? specs.height : preset.height}</AspectDenominator>
        </VideoFormat>
      </VideoFormat>

      <!-- ESPECIFICACIONES DE AUDIO -->
      <AudioFormat ObjectRef="3">
        <AudioFormat id="3">
          <Codec>${escapeXml(preset.audioFormat)}</Codec>
          <SampleRate>${preset.audioSampleRate}</SampleRate>
          <Channels>${preset.audioChannels === "Stereo (2.0)" ? 2 : preset.audioChannels === "5.1 Surround" ? 6 : 1}</Channels>
          <ChannelsLabel>${escapeXml(preset.audioChannels)}</ChannelsLabel>
          <Bitrate>${audioBitrateBps}</Bitrate>
          <BitrateKbps>${preset.audioBitrateKbps}</BitrateKbps>

          <!-- NORMALIZACIÓN DE AUDIO Y EFECTOS LUFS -->
          <AudioEffects>
            <LoudnessNormalization>
              <Enabled>${preset.normalizeAudio ? "true" : "false"}</Enabled>
              <TargetLoudnessLUFS>${preset.targetLufs !== undefined ? preset.targetLufs : -14.0}</TargetLoudnessLUFS>
              <ToleranceLU>0.5</ToleranceLU>
              <MaxTruePeakdBTP>${preset.maxTruePeakDb !== undefined ? preset.maxTruePeakDb : -1.0}</MaxTruePeakdBTP>
              <Standard>${escapeXml(preset.loudnessStandard || "ITU-R BS.1770-4")}</Standard>
              <LoudnessType>Integrated</LoudnessType>
            </LoudnessNormalization>
          </AudioEffects>
        </AudioFormat>
      </AudioFormat>

      <Metadata>
        <Creator>Preset Extractor</Creator>
        <SourceResolution>${preset.width}x${preset.height}</SourceResolution>
        <SourceFPS>${preset.fps}</SourceFPS>
      </Metadata>
    </ExportPreset>
  </ExportPreset>
</PremiereData>
`;
}

/**
 * Sanitized .epr file name derived from the preset name
 */
export function getEprFileName(preset: PresetConfig): string {
  const sanitizedFilename = preset.presetName
    .replace(/[^a-zA-Z0-9_\-\.\s]/g, "")
    .replace(/\s+/g, "_");
  return `${sanitizedFilename || "PresetExtractor_Export"}.epr`;
}

/**
 * Downloads the .epr file directly to the user's computer
 */
export function downloadEprFile(preset: PresetConfig, specs?: VideoSpecs) {
  const xmlContent = generateEprPresetXml(preset, specs);
  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = getEprFileName(preset);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
