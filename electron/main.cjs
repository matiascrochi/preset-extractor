const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");

const isDev = process.env.NODE_ENV === "development";

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

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
