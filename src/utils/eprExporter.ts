import { PresetConfig, ProResVariant, VideoSpecs } from "../types/videoPreset";
// Raw byte-for-byte copy of a real Adobe Media Encoder H.264/MP4 export preset
// ("Stallion_H264_-23LUFS.epr"), captured from a working install. Adobe's .epr format
// is an internal object graph (ExporterParamContainer/ExporterParam nodes keyed by
// GUID ClassIDs and ADBE* string identifiers, plus StandardFilterWrapper* blocks for
// things like Loudness Normalization) — not something worth hand-authoring from a
// spec. Instead we clone this known-good file and only touch the handful of leaf
// values that legitimately vary per video; everything else (including ~2400 lines of
// disabled Lumetri/ColorSpaceTransform/VideoLimiter filter boilerplate that Premiere
// still expects to find) is carried over untouched.
import h264Mp4Template from "./eprTemplates/h264-mp4-template.epr?raw";
// Real Adobe QuickTime/MOV exporter preset ("Chevy_TV_final (1).epr", cross-checked
// against a second real sample "XR - PAL.epr" that uses the same exporter plugin).
// Both are Apple ProRes 422 HQ ("apch" FourCC) wrapped in a .mov container — a
// completely different exporter (ExporterClassID) and parameter graph than the H.264
// one above, confirming Adobe's .epr shape is exporter-plugin-specific, not generic.
import movProResTemplate from "./eprTemplates/mov-prores-template.epr?raw";
// Adobe's own factory presets, sourced straight from a real Media Encoder install
// (found via its internal catalog, PresetTree.xml, which lists every system preset's
// PresetPath). These ship with Media Encoder itself, so they're guaranteed valid —
// but factory presets never have the Loudness Normalization filter turned on, so its
// ~2400-line filter-chain subtree (see graftLoudnessFilterBlock below) is grafted in
// from the H.264 template rather than substituted in place like everything else here.
import hevcTemplate from "./eprTemplates/hevc-template.epr?raw";
import dnxhrMxfTemplate from "./eprTemplates/dnxhr-mxf-template.epr?raw";
// MXF OP1a (Sony XDCAM family) — the single largest factory-preset group in Media
// Encoder (117 presets), and the standard broadcast delivery wrapper.
import mxfOp1aTemplate from "./eprTemplates/mxf-op1a-template.epr?raw";
// Apple ProRes wrapped in MXF OP1a rather than .mov — same exporter plugin as DNxHR
// MXF (ClassID 1297630752), distinguished by its ExporterFileType ("PMXF").
import proResMxfTemplate from "./eprTemplates/prores-mxf-template.epr?raw";

const ADOBE_TICKS_PER_SECOND = 254016000000;

// The full <StandardFilterContainer>...</StandardFilterWrapperLoudnessNormalization>
// subtree, sliced out of the H.264 template once at module load. Self-contained: every
// ObjectID/ObjectRef inside it only points to other IDs inside this same subtree, which
// is what makes it safe to renumber wholesale and graft into an unrelated preset.
const LOUDNESS_FILTER_BLOCK = (() => {
  const start = h264Mp4Template.indexOf('<StandardFilterContainer ObjectID="100"');
  const endTag = "</StandardFilterWrapperLoudnessNormalization>";
  const end = h264Mp4Template.indexOf(endTag);
  if (start === -1 || end === -1) {
    throw new Error("eprExporter: could not locate the loudness filter block in the H.264 template");
  }
  return h264Mp4Template.slice(start, end + endTag.length);
})();

/**
 * Adobe stores non-integer numeric params (bitrates, loudness targets) with a
 * trailing "." and no fractional zero for whole numbers (e.g. "16." not "16.0" or "16"),
 * matching exactly what every real .epr sampled from Media Encoder does.
 */
function formatAdobeFloat(n: number): string {
  if (Number.isInteger(n)) return `${n}.`;
  return String(n);
}

/**
 * Replaces the <ParamValue> of the <ExporterParam> block identified by its
 * <ParamIdentifier>. Most sampled presets emit <ParamValue> as the first child, but
 * Adobe's older/verbose serialization (seen in factory DNxHR presets) emits every
 * property in a fixed order with <ParamValue> LAST — so this scans the whole
 * enclosing <ExporterParam>...</ExporterParam> block, not just the part before the
 * identifier tag.
 */
function setExporterParamValue(xml: string, identifier: string, rawValue: string): string {
  const idTag = `<ParamIdentifier>${identifier}</ParamIdentifier>`;
  const idIndex = xml.indexOf(idTag);
  if (idIndex === -1) {
    throw new Error(`eprExporter: template is missing expected ParamIdentifier "${identifier}"`);
  }
  const paramStart = xml.lastIndexOf("<ExporterParam ", idIndex);
  if (paramStart === -1) {
    throw new Error(`eprExporter: could not locate enclosing ExporterParam for "${identifier}"`);
  }
  const paramEndTag = "</ExporterParam>";
  const paramEnd = xml.indexOf(paramEndTag, idIndex);
  if (paramEnd === -1) {
    throw new Error(`eprExporter: unterminated ExporterParam block for "${identifier}"`);
  }
  const blockEnd = paramEnd + paramEndTag.length;
  const segment = xml.slice(paramStart, blockEnd);
  const valueRegex = /(<ParamValue>)([^<]*)(<\/ParamValue>)/;
  if (!valueRegex.test(segment)) {
    throw new Error(`eprExporter: ExporterParam for "${identifier}" has no <ParamValue> to replace`);
  }
  const newSegment = segment.replace(valueRegex, `$1${rawValue}$3`);
  return xml.slice(0, paramStart) + newSegment + xml.slice(blockEnd);
}

/**
 * Replaces a leaf tag's text content, scoped to inside the
 * <StandardFilterWrapperLoudnessNormalization> block only (tags like "Enabled" also
 * appear in every other filter wrapper, so a global replace would corrupt those).
 */
function setLoudnessField(xml: string, tagName: string, rawValue: string): string {
  const blockTag = "StandardFilterWrapperLoudnessNormalization";
  const blockStart = xml.indexOf(`<${blockTag} `);
  const blockEndTag = `</${blockTag}>`;
  const blockEnd = xml.indexOf(blockEndTag);
  if (blockStart === -1 || blockEnd === -1) {
    throw new Error("eprExporter: template is missing the loudness normalization filter block");
  }
  const blockEndFull = blockEnd + blockEndTag.length;
  const block = xml.slice(blockStart, blockEndFull);
  const re = new RegExp(`(<${tagName}>)([^<]*)(<\\/${tagName}>)`);
  if (!re.test(block)) {
    throw new Error(`eprExporter: loudness block is missing tag <${tagName}>`);
  }
  const newBlock = block.replace(re, `$1${rawValue}$3`);
  return xml.slice(0, blockStart) + newBlock + xml.slice(blockEndFull);
}

/** Replaces a unique root-level leaf tag (PresetName / PresetComments / PresetID). */
function setRootField(xml: string, tagName: string, rawValue: string): string {
  const re = new RegExp(`(<${tagName}>)([^<]*)(<\\/${tagName}>)`);
  if (!re.test(xml)) {
    throw new Error(`eprExporter: template is missing root tag <${tagName}>`);
  }
  return xml.replace(re, `$1${rawValue}$3`);
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 for environments without the Web Crypto randomUUID helper
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** "4.1" -> 41, "Auto" -> null (leave template default) */
function levelToAdobeInt(level: string): number | null {
  const parsed = parseFloat(level);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed * 10);
}

/**
 * Best-effort mapping to Adobe's ADBEVideoBitrateEncoding enum. Only "2" (VBR 2-pass)
 * is confirmed against real presets (every sampled H.264 preset that carries a
 * Min/Target/Max bitrate spread uses it); CBR/1-pass are inferred by elimination and
 * unverified against a real sample.
 */
function bitrateEncodingToAdobeInt(mode: PresetConfig["bitrateEncoding"]): number {
  switch (mode) {
    case "CBR":
      return 0;
    case "VBR_1PASS":
      return 1;
    case "VBR_2PASS":
    default:
      return 2;
  }
}

/**
 * Best-effort mapping for Adobe's LoudnessStandard enum. Confirmed data points across
 * 4 real presets don't reduce to a clean rule: -23 LUFS -> 1, -14 and -20 LUFS -> 2,
 * -24 LUFS -> 0. This isn't derived from the target number at all — it's whichever
 * named standard the editor picked in Premiere's dropdown (independent of the numeric
 * target). Without Adobe's enum reference we can only approximate: EBU R128 -> 1
 * (matches the one sample that explicitly is EBU R128), everything else -> 2. Treat
 * this field as cosmetic; TargetLoudness/TruePeakLevel are what actually drive the
 * normalization filter's behavior in Media Encoder.
 */
function loudnessStandardToAdobeInt(standard: PresetConfig["loudnessStandard"]): number {
  return standard === "EBU R128" ? 1 : 2;
}

/**
 * ProRes variant -> QuickTime FourCC, packed as the big-endian int Adobe stores in
 * <ParamValue>. Every code here was read back out of Adobe's own factory ProRes
 * presets rather than guessed, so all six are verified:
 *   apco=Proxy, apcs=422 LT, apcn=422, apch=422 HQ, ap4h=4444, ap4x=4444 XQ
 */
const PRORES_FOURCC: Record<ProResVariant, string> = {
  "ProRes 422 Proxy": "apco",
  "ProRes 422 LT": "apcs",
  "ProRes 422": "apcn",
  "ProRes 422 HQ": "apch",
  "ProRes 4444": "ap4h",
  "ProRes 4444 XQ": "ap4x",
};

function proResVariantToFourCcInt(variant: ProResVariant | undefined): number | null {
  const code = variant ? PRORES_FOURCC[variant] : undefined;
  if (!code) return null;
  return (code.charCodeAt(0) << 24) | (code.charCodeAt(1) << 16) | (code.charCodeAt(2) << 8) | code.charCodeAt(3);
}

/**
 * Grafts the Loudness Normalization standard filter (and the ~9 other disabled filter
 * wrappers Premiere expects alongside it — Lumetri, ColorSpaceTransform, VideoLimiter,
 * etc.) into a preset that doesn't have any StandardFilterContainer at all, which is
 * how every factory preset ships. Renumbers every ObjectID/ObjectRef in the grafted
 * block so it can't collide with IDs the target preset already uses, points a new
 * root-level <StandardUserFilters> at it, and appends the block before </PremiereData>.
 */
function graftLoudnessFilterBlock(xml: string): string {
  if (xml.includes("<StandardFilterWrapperLoudnessNormalization ")) {
    // Base template already carries the filter chain (H.264/ProRes) — nothing to graft.
    return xml;
  }

  const usedIds = Array.from(xml.matchAll(/(?:ObjectID|ObjectRef)="(\d+)"/g)).map((m) => parseInt(m[1], 10));
  const maxUsedId = usedIds.length > 0 ? Math.max(...usedIds) : 0;
  // Our filter block's own IDs start at 100; shift everything so the lowest grafted ID
  // becomes maxUsedId + 1, guaranteeing no overlap with the target preset's IDs.
  const offset = maxUsedId + 1 - 100;

  const renumberedBlock = LOUDNESS_FILTER_BLOCK.replace(
    /(ObjectID|ObjectRef)="(\d+)"/g,
    (_match, attr: string, id: string) => `${attr}="${parseInt(id, 10) + offset}"`
  );
  const newContainerId = 100 + offset;

  let result = xml;
  if (result.includes("<StandardUserFilters ")) {
    result = result.replace(/<StandardUserFilters ObjectRef="\d+"\/>/, `<StandardUserFilters ObjectRef="${newContainerId}"/>`);
  } else if (result.includes("<ExportXMPOptionKey>")) {
    result = result.replace(
      /(<ExportXMPOptionKey>[^<]*<\/ExportXMPOptionKey>)/,
      `$1\n\t<StandardUserFilters ObjectRef="${newContainerId}"/>`
    );
  } else {
    // Fallback: factory presets always have a root <PresetID>; anchor there instead.
    result = result.replace(
      /(<PresetID>[^<]*<\/PresetID>)/,
      `$1\n\t<StandardUserFilters ObjectRef="${newContainerId}"/>`
    );
  }

  const closingTag = "</PremiereData>";
  const closingIndex = result.lastIndexOf(closingTag);
  if (closingIndex === -1) {
    throw new Error("eprExporter: template is missing the closing </PremiereData> tag");
  }
  return result.slice(0, closingIndex) + renumberedBlock + "\n" + result.slice(closingIndex);
}

/** Maps the UI's channel-layout label to the raw channel count Adobe stores. */
function channelCountOf(preset: PresetConfig): number {
  return preset.audioChannels === "Stereo (2.0)" ? 2 : preset.audioChannels === "5.1 Surround" ? 6 : 1;
}

/** Renames the preset and stamps it with a fresh UUID so it never collides with its template. */
function applyPresetIdentity(xml: string, preset: PresetConfig, codecSummary: string): string {
  let out = setRootField(xml, "PresetName", escapeXml(preset.presetName));
  out = setRootField(
    out,
    "PresetComments",
    escapeXml(
      `Preset Extractor: ${preset.width}x${preset.height} @ ${preset.fps}fps, ${codecSummary}` +
        (preset.normalizeAudio ? `, audio ${preset.targetLufs} LUFS (${preset.loudnessStandard})` : "")
    )
  );
  return setRootField(out, "PresetID", generateUuid());
}

/** Width/height plus the frame rate re-expressed in Adobe's internal tick units. */
function applyVideoGeometry(xml: string, preset: PresetConfig): string {
  let out = setExporterParamValue(xml, "ADBEVideoWidth", String(preset.width));
  out = setExporterParamValue(out, "ADBEVideoHeight", String(preset.height));
  const frameTicks = Math.round(ADOBE_TICKS_PER_SECOND / preset.fps);
  return setExporterParamValue(out, "ADBEVideoFPS", String(frameTicks));
}

/**
 * Fills in the Loudness Normalization filter. TruePeakLevel here is the limiter's
 * output ceiling — a delivery-spec constant, NOT the source video's own measured peak
 * (conflating the two was the original bug this whole exporter rewrite started from).
 */
function applyLoudness(xml: string, preset: PresetConfig): string {
  let out = setLoudnessField(xml, "Enabled", preset.normalizeAudio ? "true" : "false");
  out = setLoudnessField(out, "TargetLoudness", formatAdobeFloat(preset.targetLufs));
  out = setLoudnessField(out, "TruePeakLevel", formatAdobeFloat(preset.maxTruePeakDb));
  out = setLoudnessField(out, "LoudnessStandard", String(loudnessStandardToAdobeInt(preset.loudnessStandard)));
  return setLoudnessField(out, "LoudnessTolerance", formatAdobeFloat(0.5));
}

/**
 * Bitrate ladder + GOP length, shared by the two long-GOP exporters (H.264 and HEVC),
 * which expose an identical parameter surface here. Intra-frame codecs (ProRes, DNxHR)
 * have no user-facing equivalent and skip this entirely.
 */
function applyLongGopBitrate(xml: string, preset: PresetConfig): string {
  let out = setExporterParamValue(xml, "ADBEVideoBitrateEncoding", String(bitrateEncodingToAdobeInt(preset.bitrateEncoding)));
  // Every sampled real preset carries a fixed ~2 Mbps floor regardless of target;
  // mirror that, but never let the floor exceed the target itself.
  const minBitrateMbps = Math.min(2, preset.targetBitrateMbps / 2);
  out = setExporterParamValue(out, "ADBEVideoMinBitrate", formatAdobeFloat(minBitrateMbps));
  out = setExporterParamValue(out, "ADBEVideoTargetBitrate", formatAdobeFloat(preset.targetBitrateMbps));
  out = setExporterParamValue(out, "ADBEVideoMaxBitrate", formatAdobeFloat(preset.maxBitrateMbps));

  const levelInt = levelToAdobeInt(preset.level);
  if (levelInt !== null) {
    out = setExporterParamValue(out, "ADBEVideoMPEGProfileLevel", String(levelInt));
  }

  const keyframeRate = Math.max(1, Math.min(300, Math.round(preset.keyframeInterval)));
  return setExporterParamValue(out, "ADBEMPEGKeyframeRate", String(keyframeRate));
}

/**
 * Generates a real, Adobe-importable .epr by cloning a known-good preset's object
 * graph and substituting only the values that legitimately vary per video. H.264/MP4
 * and ProRes/QuickTime MOV are built from real user-saved presets; HEVC, DNxHR/MXF,
 * MXF OP1a and ProRes MXF are built from Adobe's own factory presets (see the ?raw
 * imports above) with the loudness filter grafted in, since factory presets never
 * ship with it enabled. Anything unrecognized falls back to a legacy, unverified XML
 * shape — see generateLegacyEprPresetXml.
 */
export function generateEprPresetXml(preset: PresetConfig, specs?: VideoSpecs): string {
  switch (preset.format) {
    case "H.264":
      return generateLongGopEprXml(h264Mp4Template, preset);
    case "HEVC":
      return generateLongGopEprXml(graftLoudnessFilterBlock(hevcTemplate), preset);
    case "ProRes":
    case "QuickTime":
      return generateIntraFrameEprXml(movProResTemplate, preset, "ProRes", preset.proResVariant);
    case "ProRes MXF":
      return generateIntraFrameEprXml(graftLoudnessFilterBlock(proResMxfTemplate), preset, "ProRes MXF", preset.proResVariant);
    case "DNxHR":
      return generateIntraFrameEprXml(graftLoudnessFilterBlock(dnxhrMxfTemplate), preset, "DNxHR");
    case "MXF OP1a":
      return generateIntraFrameEprXml(graftLoudnessFilterBlock(mxfOp1aTemplate), preset, "MXF OP1a");
    default:
      return generateLegacyEprPresetXml(preset, specs);
  }
}

/**
 * Builds a preset for the long-GOP exporters (H.264, HEVC). Both expose the same
 * parameter surface — AAC audio with a bitrate, a Min/Target/Max bitrate ladder,
 * profile level and keyframe interval — so one routine covers both; only the base
 * template differs.
 */
function generateLongGopEprXml(template: string, preset: PresetConfig): string {
  let xml = applyPresetIdentity(template, preset, `${preset.targetBitrateMbps} Mbps`);

  xml = setExporterParamValue(xml, "ADBEAudioRatePerSecond", String(preset.audioSampleRate));
  xml = setExporterParamValue(xml, "ADBEAudioNumChannels", String(channelCountOf(preset)));
  xml = setExporterParamValue(xml, "ADBEAudioBitrate", String(preset.audioBitrateKbps));

  xml = applyVideoGeometry(xml, preset);
  xml = applyLongGopBitrate(xml, preset);
  return applyLoudness(xml, preset);
}

/**
 * Builds a preset for the intra-frame / mastering exporters (ProRes in .mov or MXF,
 * DNxHR MXF, XDCAM MXF OP1a). These are fixed-quality codecs: quality is chosen via a
 * codec//quality-level enum rather than a bitrate ladder, so no bitrate or keyframe
 * fields are touched. Audio is uncompressed PCM, which has no bitrate parameter —
 * only sample rate and channel count.
 *
 * `proResVariant` is only meaningful for the two ProRes exporters; passing it for
 * DNxHR/XDCAM would write a QuickTime FourCC into a codec field those exporters don't
 * interpret that way, so callers leave it undefined there.
 */
function generateIntraFrameEprXml(
  template: string,
  preset: PresetConfig,
  codecSummary: string,
  proResVariant?: ProResVariant
): string {
  let xml = applyPresetIdentity(template, preset, codecSummary);

  xml = setExporterParamValue(xml, "ADBEAudioRatePerSecond", String(preset.audioSampleRate));
  xml = setExporterParamValue(xml, "ADBEAudioNumChannels", String(channelCountOf(preset)));

  xml = applyVideoGeometry(xml, preset);

  const codecInt = proResVariantToFourCcInt(proResVariant);
  if (codecInt !== null) {
    xml = setExporterParamValue(xml, "ADBEVideoCodec", String(codecInt));
  }

  return applyLoudness(xml, preset);
}

/**
 * Legacy generator for any remaining format we don't have a verified real .epr
 * template for. Adobe's real .epr schema differs per exporter plugin — each format
 * above uses a different ExporterClassID and parameter set — so this custom XML shape
 * is NOT confirmed to import into Premiere/Media Encoder. Kept only so a future
 * PresetConfig.format value still produces *something* until a real reference preset
 * is captured for it.
 */
function generateLegacyEprPresetXml(preset: PresetConfig, specs?: VideoSpecs): string {
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
<!-- Preset Extractor - UNVERIFIED preset shape (no real ${escapeXml(preset.format)} .epr reference captured yet) -->
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
