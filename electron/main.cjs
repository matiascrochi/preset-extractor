const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");

const isDev = process.env.NODE_ENV === "development";

// ffmpeg-static resolves to a path inside app.asar when packaged, but binaries
// can't execute from inside the asar archive — asarUnpack (see package.json
// "build.asarUnpack") copies the real file next to it under app.asar.unpacked.
function resolveFfmpegPath() {
  let ffmpegPath = require("ffmpeg-static");
  if (app.isPackaged) {
    ffmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");
  }
  return ffmpegPath;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0A0A0A",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

// Recursively looks for directories literally named "Presets" under an Adobe app's
// Documents folder (depth-bounded: Adobe's own layout varies "<version>/Presets" vs
// "<version>/Profile-<name>/Settings/Presets" across app versions).
function findPresetDirs(baseDir, maxDepth) {
  const found = [];

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.name === "Presets") {
        found.push(fullPath);
      } else {
        walk(fullPath, depth + 1);
      }
    }
  }

  walk(baseDir, 0);
  return found;
}

function scanAdobePresetDirs() {
  const documents = path.join(os.homedir(), "Documents");
  const ameBase = path.join(documents, "Adobe", "Adobe Media Encoder");
  const premiereBase = path.join(documents, "Adobe", "Premiere Pro");

  const mediaEncoderDirs = fs.existsSync(ameBase) ? findPresetDirs(ameBase, 1) : [];
  const premiereDirs = fs.existsSync(premiereBase) ? findPresetDirs(premiereBase, 3) : [];

  // De-dupe (Premiere and Media Encoder can resolve to the same shared folder on some versions)
  const allDirs = Array.from(new Set([...mediaEncoderDirs, ...premiereDirs]));

  return {
    mediaEncoderInstalled: fs.existsSync(ameBase),
    premiereInstalled: fs.existsSync(premiereBase),
    presetDirs: allDirs,
  };
}

ipcMain.handle("scan-adobe-preset-dirs", () => scanAdobePresetDirs());

ipcMain.handle("install-preset", (_event, { targets, fileName, content }) => {
  return targets.map((targetDir) => {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      const fullPath = path.join(targetDir, fileName);
      fs.writeFileSync(fullPath, content, "utf-8");
      return { path: fullPath, success: true };
    } catch (err) {
      return { path: targetDir, success: false, error: String((err && err.message) || err) };
    }
  });
});

ipcMain.handle("choose-preset-folder", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(win, {
    title: "Selecciona la carpeta de presets de Premiere / Media Encoder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("show-item-in-folder", (_event, filePath) => {
  shell.showItemInFolder(filePath);
});

// Measures real integrated loudness (LUFS) and true peak (dBTP) per ITU-R BS.1770 /
// EBU R128 by decoding the full audio track with ffmpeg's ebur128 filter — the same
// approach the "transcode" reporting tool uses (it shells out to ffmpeg for this
// instead of reading container metadata). Replaces the old in-browser RMS estimate,
// which only sampled the first few MB of the raw file and wasn't K-weighted or gated.
ipcMain.handle("analyze-audio-loudness", (_event, filePath) => {
  return new Promise((resolve) => {
    if (!filePath || !fs.existsSync(filePath)) {
      resolve({ success: false, error: "Archivo no encontrado en disco." });
      return;
    }

    const ffmpegPath = resolveFfmpegPath();
    const args = [
      "-nostdin",
      "-hide_banner",
      "-i", filePath,
      "-vn", // skip video decoding entirely, we only need the audio track
      "-filter:a", "ebur128=peak=true",
      "-f", "null",
      "-",
    ];

    execFile(
      ffmpegPath,
      args,
      { timeout: 120000, maxBuffer: 1024 * 1024 * 32 },
      (err, _stdout, stderr) => {
        // ffmpeg always exits through the "-f null -" path writing its measurement
        // summary to stderr; a non-zero/timeout exit still gives us a real error to show.
        if (err && !stderr) {
          resolve({ success: false, error: String((err && err.message) || err) });
          return;
        }

        const output = stderr || "";
        const noAudioStream = /does not contain any stream/i.test(output) || /Output file is empty/i.test(output);
        if (noAudioStream) {
          resolve({ success: false, error: "El archivo no tiene pista de audio." });
          return;
        }

        const integratedMatch = output.match(/Integrated loudness:\s*\n\s*I:\s*(-?\d+(?:\.\d+)?|-inf)\s*LUFS/i);
        const peakMatch = output.match(/True peak:\s*\n\s*Peak:\s*(-?\d+(?:\.\d+)?|-inf)\s*dBFS/i);

        const lufs = integratedMatch ? parseFloat(integratedMatch[1]) : NaN;
        const truePeakDb = peakMatch ? parseFloat(peakMatch[1]) : NaN;

        if (!Number.isFinite(lufs)) {
          resolve({ success: false, error: "ffmpeg no devolvió una medición de loudness válida (audio silencioso o demasiado corto)." });
          return;
        }

        resolve({
          success: true,
          lufs: Number(lufs.toFixed(1)),
          truePeakDb: Number.isFinite(truePeakDb) ? Number(truePeakDb.toFixed(1)) : undefined,
        });
      }
    );
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
