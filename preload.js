const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcherApi', {
  listScripts: () => ipcRenderer.invoke('list-scripts'),
  pickFile: (mode) => ipcRenderer.invoke('pick-file', mode),
  pickOutputFile: (suggestedPath) => ipcRenderer.invoke('pick-output-file', suggestedPath),
  runPython: (payload) => ipcRenderer.invoke('run-python', payload),
});
