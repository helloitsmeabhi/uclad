// preload.js - Preload Script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Directory operations
  openDirectory: () => ipcRenderer.invoke('open-directory'),
  getDirectoryContents: (folderPath) => ipcRenderer.invoke('get-directory-contents', folderPath),
  getCurrentDirectory: () => ipcRenderer.invoke('get-current-directory'),

  getFilesInCurrentDirectory: () => ipcRenderer.invoke('get-files'),
  openFileByName: (fileName) => ipcRenderer.invoke('open-file-by-name', fileName),
  
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  createNewFile: (directoryPath, fileName) => ipcRenderer.invoke('create-new-file', directoryPath, fileName),
  // Code execution
  runCode: (filePath) => ipcRenderer.invoke('run-code', filePath),
  runrundebug: (filePath) => ipcRenderer.invoke('run-code', filePath),
});



