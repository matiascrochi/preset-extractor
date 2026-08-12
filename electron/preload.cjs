const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("presetAPI", {
  isElectron: true,
  scanAdobePresetDirs: () => ipcRenderer.invoke("scan-adobe-preset-dirs"),
  installPreset: (targets, fileName, content) =>
    ipcRenderer.invoke("install-preset", { targets, fileName, content }),
  choosePresetFolder: () => ipcRenderer.invoke("choose-preset-folder"),
  showItemInFolder: (filePath) => ipcRenderer.invoke("show-item-in-folder", filePath),
  // File.path was removed from renderer File objects in Electron 32+; webUtils is the
  // sanctioned replacement for recovering the real on-disk path of a dropped/selected file.
  getPathForFile: (file) => webUtils.getPathForFile(file),
  analyzeLoudness: (filePath) => ipcRenderer.invoke("analyze-audio-loudness", filePath),
});
