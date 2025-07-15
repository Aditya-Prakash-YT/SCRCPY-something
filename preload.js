const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  executeCommand: (executable, args, commandType) => ipcRenderer.send('execute-command', { executable, args, commandType }),
  onCommandOutput: (callback) => ipcRenderer.on('command-output', callback),
  showSaveDialog: (format) => ipcRenderer.invoke('show-save-dialog', format),
  saveLog: (logContent, defaultFilename) => ipcRenderer.invoke('save-log', logContent, defaultFilename)
});