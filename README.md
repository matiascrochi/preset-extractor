# PresetCraft AI — Video Specs & Adobe Export Preset Generator

Desktop app (Windows, via Electron) that inspects a local video file directly in the browser engine
(HTML5 `<video>`, `<canvas>`, and `AudioContext` — no server, no network, no API key) and generates
Adobe Premiere Pro / Media Encoder `.epr` presets and After Effects `.jsx` scripts from the detected
specs. Originally scaffolded in Google AI Studio; the Gemini-backed analysis step has been replaced
with a fully local, offline diagnostic report so every feature works without internet access.

## Run in dev (browser, via Vite)

**Prerequisites:** Node.js 18+

```
npm install
npm run dev
```

## Run as a desktop app (Electron, dev mode)

```
npm install
npm run electron:dev
```

This starts the Vite dev server and opens an Electron window pointed at it.

## Build a Windows installer / portable exe

```
npm install
npm run electron:build
```

Output goes to `release/` — an NSIS installer (`.exe`) and a portable `.exe`, both x64.

## Notes on "local" features

- Video inspection (resolution, fps, codec/container guess, bitrate estimate, audio loudness,
  frame snapshot) runs entirely client-side against the file you pick — nothing is uploaded.
- `.epr`, `.jsx`, and JSON report downloads are generated and saved locally via Blob downloads.
- Saved preset history persists in `localStorage` inside the app's local profile.
- The diagnostic report is computed locally from the inspected specs (no AI/network call).
- Codec playback support for capturing a sample frame depends on Chromium's (Electron's) built-in
  decoders. H.264/AAC MP4 works out of the box on Windows; ProRes/DNxHR `.mov` files won't decode
  for the frame snapshot (same limitation as in any Chromium-based browser) — spec detection still
  falls back to file header/container parsing in that case.
