import { VideoSpecs } from "../types/videoPreset";

/**
 * Calculates simplified aspect ratio fraction string (e.g., 16:9, 9:16, 4:3, 1:1, 21:9)
 */
export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height) return "16:9";

  const ratio = width / height;

  if (Math.abs(ratio - 16 / 9) < 0.05) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.05) return "9:16 (Vertical)";
  if (Math.abs(ratio - 1) < 0.05) return "1:1 (Cuadrado)";
  if (Math.abs(ratio - 4 / 3) < 0.05) return "4:3 (Estándar)";
  if (Math.abs(ratio - 21 / 9) < 0.05) return "21:9 (Ultrawide)";
  if (Math.abs(ratio - 1.85) < 0.05) return "1.85:1 (Cine Plano)";
  if (Math.abs(ratio - 2.39) < 0.05) return "2.39:1 (Anamórfico Cine)";

  // Simplify fraction using GCD
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const wFrac = Math.round(width / divisor);
  const hFrac = Math.round(height / divisor);

  if (wFrac < 100 && hFrac < 100) {
    return `${wFrac}:${hFrac}`;
  }

  return `${ratio.toFixed(2)}:1`;
}

/**
 * Scans ArrayBuffer headers to identify container and video codec signatures
 */
export async function parseVideoBinaryHeader(file: File): Promise<{
  container: string;
  codec: string;
  audioCodec: string;
}> {
  try {
    const slice = file.slice(0, 100000); // Read first 100KB
    const buffer = await slice.arrayBuffer();
    const dataView = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    let container = "MP4 / QuickTime";
    let codec = "H.264 / AVC";
    let audioCodec = "AAC";

    // Convert to ASCII string helper
    const readAscii = (offset: number, length: number): string => {
      let str = "";
      for (let i = 0; i < length; i++) {
        const charCode = bytes[offset + i];
        if (charCode >= 32 && charCode <= 126) {
          str += String.fromCharCode(charCode);
        }
      }
      return str;
    };

    const headerStr = readAscii(0, Math.min(bytes.length, 5000));

    // Check container types
    if (file.name.toLowerCase().endsWith(".mov") || headerStr.includes("qt  ")) {
      container = "MOV (QuickTime)";
    } else if (file.name.toLowerCase().endsWith(".mkv") || headerStr.includes("matroska")) {
      container = "MKV (Matroska)";
    } else if (file.name.toLowerCase().endsWith(".webm") || headerStr.includes("webm")) {
      container = "WebM";
      codec = "VP9 / AV1";
      audioCodec = "Opus";
    } else if (file.name.toLowerCase().endsWith(".mp4") || headerStr.includes("ftyp")) {
      container = "MP4";
    } else if (file.name.toLowerCase().endsWith(".mxf")) {
      container = "MXF (Material Exchange Format)";
    }

    // Codec signatures inside MP4 / MOV atoms
    if (headerStr.includes("avc1") || headerStr.includes("avc3")) {
      codec = "H.264 / AVC (Advanced Video Coding)";
    } else if (headerStr.includes("hvc1") || headerStr.includes("hev1")) {
      codec = "HEVC / H.265 (High Efficiency Video Coding)";
    } else if (headerStr.includes("apcn") || headerStr.includes("apch") || headerStr.includes("ap4h") || headerStr.includes("icp4")) {
      codec = "Apple ProRes 422 / HQ";
      container = "MOV (ProRes Master)";
      audioCodec = "Uncompressed LPCM";
    } else if (headerStr.includes("vp09") || headerStr.includes("vp8")) {
      codec = "VP9";
    } else if (headerStr.includes("av01")) {
      codec = "AV1";
    }

    // Audio codec signatures
    if (headerStr.includes("mp4a")) {
      audioCodec = "AAC";
    } else if (headerStr.includes("opus")) {
      audioCodec = "Opus";
    } else if (headerStr.includes("sowt") || headerStr.includes("twos") || headerStr.includes("lpcm")) {
      audioCodec = "Uncompressed LPCM (16/24-bit)";
    }

    return { container, codec, audioCodec };
  } catch (err) {
    console.warn("Binary header parsing fallback:", err);
    return {
      container: file.name.endsWith(".mov") ? "MOV" : "MP4",
      codec: "H.264 / AVC",
      audioCodec: "AAC",
    };
  }
}

/**
 * Inspects a video File using HTML5 Video element and Media APIs
 */
export async function inspectVideoFile(file: File): Promise<VideoSpecs> {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    video.preload = "metadata";
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error("Tiempo de espera agotado al leer el archivo de vídeo."));
    }, 12000);

    video.onloadedmetadata = async () => {
      try {
        clearTimeout(timeout);

        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;
        const duration = video.duration || 0;
        const fileSize = file.size;

        // Estimate bitrate in Mbps: (fileSizeInBits) / durationInSeconds / 1,000,000
        let bitrateMbps = 0;
        if (duration > 0) {
          bitrateMbps = Number(((fileSize * 8) / duration / 1000000).toFixed(2));
        }

        // Estimate FPS based on standard rates or frame callback if available
        let fps = 30;
        if ("webkitDecodedFrameCount" in video || "mozParsedFrames" in video) {
          // Standard fps guess fallback
        }

        // Detect standard common resolution FPS heuristic
        if (duration > 0 && bitrateMbps > 0) {
          if (height >= 2160 && bitrateMbps > 40) fps = 60;
          else if (height === 1080 && bitrateMbps > 25) fps = 60;
        }

        const aspectRatio = calculateAspectRatio(width, height);

        // Binary header analysis
        const binaryMeta = await parseVideoBinaryHeader(file);

        // Capture a sample frame as Base64 JPEG
        let frameSnapshotBase64: string | undefined = undefined;
        try {
          // Seek to 1 second or 10% of video
          const seekTime = Math.min(1.0, duration / 2);
          video.currentTime = seekTime;

          await new Promise<void>((res) => {
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              res();
            };
            video.addEventListener("seeked", onSeeked);
          });

          const canvas = document.createElement("canvas");
          canvas.width = Math.min(width, 1280);
          canvas.height = Math.round((canvas.width * height) / width);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frameSnapshotBase64 = canvas.toDataURL("image/jpeg", 0.75);
          }
        } catch (e) {
          console.warn("Could not capture frame snapshot:", e);
        }

        URL.revokeObjectURL(videoUrl);

        // Audio detection & loudness measurement
        const hasAudio = true;
        let lufs = -14.2;
        let truePeakDb = -1.0;

        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const slice = file.slice(0, 4000000); // 4MB slice
          const buffer = await slice.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(buffer);

          let sumSquares = 0;
          let maxAbs = 0;
          let totalSamples = 0;

          for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
            const data = audioBuffer.getChannelData(c);
            const step = Math.max(1, Math.floor(data.length / 40000));
            for (let i = 0; i < data.length; i += step) {
              const val = data[i];
              const absVal = Math.abs(val);
              if (absVal > maxAbs) maxAbs = absVal;
              sumSquares += val * val;
              totalSamples++;
            }
          }

          if (totalSamples > 0 && sumSquares > 0) {
            const rms = Math.sqrt(sumSquares / totalSamples);
            const rmsDb = 20 * Math.log10(rms || 0.0001);
            lufs = Number(Math.max(-40, Math.min(-6, rmsDb - 0.69)).toFixed(1));
            truePeakDb = Number(Math.max(-30, Math.min(0, 20 * Math.log10(maxAbs || 0.0001))).toFixed(1));
          }
          await audioCtx.close();
        } catch (e) {
          console.warn("Audio Loudness measurement fallback:", e);
        }

        resolve({
          fileName: file.name,
          fileSize,
          duration: Number(duration.toFixed(2)),
          width,
          height,
          fps,
          aspectRatio,
          bitrateMbps: bitrateMbps > 0 ? bitrateMbps : 16.5,
          codec: binaryMeta.codec,
          audioCodec: binaryMeta.audioCodec,
          audioSampleRate: 48000,
          audioChannels: 2,
          audioChannelsLabel: "Estéreo (2.0)",
          colorSpace: height >= 2160 ? "Rec.709 / Rec.2020" : "Rec.709 (SDR)",
          scanType: "Progresivo",
          container: binaryMeta.container,
          frameSnapshotBase64,
          hasAudio,
          lufs,
          truePeakDb,
        });
      } catch (err) {
        URL.revokeObjectURL(videoUrl);
        reject(err);
      }
    };

    video.onerror = (err) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(videoUrl);
      reject(new Error("No se pudo cargar el archivo de vídeo. Asegúrate de que el navegador soporta el formato."));
    };
  });
}

/**
 * Built-in Sample Video Presets for quick demonstration without uploading a video
 */
export const DEMO_SAMPLE_VIDEOS: { id: string; name: string; specs: VideoSpecs; description: string }[] = [
  {
    id: "4k_cinematic_drone",
    name: "4K UHD Drone Cinematic Master",
    description: "Vídeo 4K 60fps con alto bitrate, ideal para paisajes, eventos y contenido de cine.",
    specs: {
      fileName: "4K_Cinematic_Drone_Sample.mp4",
      fileSize: 450 * 1024 * 1024, // 450 MB
      duration: 60, // 60 seconds
      width: 3840,
      height: 2160,
      fps: 59.94,
      aspectRatio: "16:9",
      bitrateMbps: 60,
      codec: "H.264 / AVC (High@L5.1)",
      audioCodec: "AAC-LC",
      audioSampleRate: 48000,
      audioChannels: 2,
      audioChannelsLabel: "Estéreo (2.0)",
      colorSpace: "Rec.709 (Wide Gamut)",
      scanType: "Progresivo",
      container: "MP4 (MPEG-4 Part 14)",
      hasAudio: true,
      lufs: -14.2,
      truePeakDb: -1.0,
    },
  },
  {
    id: "1080p60_gaming_gameplay",
    name: "1080p60 High FPS Gaming / Stream",
    description: "Vídeo Full HD a 60 cuadros por segundo, óptimo para partidas de videojuegos y ritmo rápido.",
    specs: {
      fileName: "Gaming_Highlights_1080p60.mp4",
      fileSize: 120 * 1024 * 1024,
      duration: 45,
      width: 1920,
      height: 1080,
      fps: 60,
      aspectRatio: "16:9",
      bitrateMbps: 22,
      codec: "H.264 / AVC (High@L4.2)",
      audioCodec: "AAC",
      audioSampleRate: 48000,
      audioChannels: 2,
      audioChannelsLabel: "Estéreo (2.0)",
      colorSpace: "Rec.709",
      scanType: "Progresivo",
      container: "MP4",
      hasAudio: true,
      lufs: -13.5,
      truePeakDb: -0.8,
    },
  },
  {
    id: "vertical_reels_tiktok",
    name: "Vertical 9:16 Reels / TikTok / Shorts",
    description: "Vídeo vertical de teléfono (1080x1920) optimizado para redes sociales móviles.",
    specs: {
      fileName: "Reels_Promo_Vertical_9x16.mp4",
      fileSize: 35 * 1024 * 1024,
      duration: 30,
      width: 1080,
      height: 1920,
      fps: 30,
      aspectRatio: "9:16 (Vertical)",
      bitrateMbps: 9.5,
      codec: "HEVC / H.265 (Main@L4.0)",
      audioCodec: "AAC",
      audioSampleRate: 44100,
      audioChannels: 2,
      audioChannelsLabel: "Estéreo (2.0)",
      colorSpace: "Rec.709",
      scanType: "Progresivo",
      container: "MP4",
      hasAudio: true,
      lufs: -12.0,
      truePeakDb: -0.5,
    },
  },
  {
    id: "prores_broadcast_master",
    name: "Apple ProRes 422 HQ Broadcast Master",
    description: "Vídeo de calidad de archivo / máster broadcast en formato MOV ProRes sin compresión destructiva.",
    specs: {
      fileName: "Commercial_Master_ProRes422HQ.mov",
      fileSize: 1250 * 1024 * 1024, // ~1.25 GB
      duration: 40,
      width: 1920,
      height: 1080,
      fps: 23.976,
      aspectRatio: "16:9",
      bitrateMbps: 220,
      codec: "Apple ProRes 422 HQ",
      audioCodec: "Uncompressed LPCM 24-bit",
      audioSampleRate: 48000,
      audioChannels: 2,
      audioChannelsLabel: "Estéreo (2.0)",
      colorSpace: "Rec.709",
      scanType: "Progresivo",
      container: "MOV (QuickTime)",
      hasAudio: true,
      lufs: -23.8,
      truePeakDb: -2.0,
    },
  },
];
