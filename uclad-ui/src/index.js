// main.js - Main Process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname,'index.html'));
  // mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('open-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (canceled) {
    return null;
  }
  return filePaths[0];
});

ipcMain.handle('get-directory-contents', async (event, folderPath) => {
  try {
    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
    const contents = entries.map(entry => {
      return {
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(folderPath, entry.name)
      };
    });
    return contents;
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error;
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('Error reading file:', error);
    throw error;
  }
});

ipcMain.handle('save-file', async (event, filePath, content) => {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving file:', error);
    throw error;
  }
});

ipcMain.handle('run-code', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    exec(`runner "${filePath}"`, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, output: stderr });
      } else {
        resolve({ success: true, output: stdout });
      }
    });
  });
});

ipcMain.handle('create-new-file', async (event, directoryPath, fileName) => {
  try {
    const filePath = path.join(directoryPath, fileName);
    
    // Check if file already exists
    try {
      await fs.promises.access(filePath);
      throw new Error('File already exists');
    } catch (err) {
      // File doesn't exist, we can create it
      if (err.code === 'ENOENT') {
        await fs.promises.writeFile(filePath, '', 'utf-8');
        return {
          success: true,
          path: filePath,
          name: fileName
        };
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.error('Error creating file:', error);
    throw error;
  }
});



