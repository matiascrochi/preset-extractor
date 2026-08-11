const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("presetAPI", {
  isElectron: true,
  scanAdobePresetDirs: () => ipcRenderer.invoke("scan-adobe-preset-dirs"),
  installPreset: (targets, fileName, content) =>
    ipcRenderer.invoke("install-preset", { targets, fileName, content }),
  choosePresetFolder: () => ipcRenderer.invoke("choose-preset-folder"),
  showItemInFolder: (filePath) => ipcRenderer.invoke("show-item-in-folder", filePath),
});
