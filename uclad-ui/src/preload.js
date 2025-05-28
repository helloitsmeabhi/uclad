// preload.js - Preload Script
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close'),
  maximizeApp: () => ipcRenderer.send('maximize'),
  minimizeApp: () => ipcRenderer.send('minimize'),
  // Directory operations
  openDirectory: () => ipcRenderer.invoke('open-directory'),
  getDirectoryContents: (folderPath) => ipcRenderer.invoke('get-directory-contents', folderPath),
  
  // File operations
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  createNewFile: (directoryPath, fileName) => ipcRenderer.invoke('create-new-file', directoryPath, fileName),
  // Code execution
  runCode: (filePath) => ipcRenderer.invoke('run-code', filePath),
  searchInFiles: (query) => ipcRenderer.invoke('search-in-files', query),
  search: (query) => ipcRenderer.invoke('scoop-search', query),
  install: (packageName) => ipcRenderer.invoke('install-package', packageName),
  runPowershellCommand: () => ipcRenderer.invoke('run-powershell-command'),
  runCommand: (language) => ipcRenderer.invoke('run-command', language),
  openCommandDialog: () => ipcRenderer.invoke('open-command-dialog'),
  onCommandOutput: (callback) => {
      ipcRenderer.on('command-output', (event, data) => callback(event, data));
  },
  onCommandComplete: (callback) => {
      ipcRenderer.on('command-complete', (event, code) => callback(event, code));
  },
  getScoopPackageDetails: (pkgName) => ipcRenderer.invoke('get-scoop-details', pkgName),
  getGitBranches: () => ipcRenderer.invoke('get-branches',dirPath)
});