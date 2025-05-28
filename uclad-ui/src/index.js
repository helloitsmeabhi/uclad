// main.js - Main Process
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const https = require('https');

let mainWindow;
// Add this global variable to track the current directory
let currentDirectory = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // show:false,
    // autoHideMenuBar: true,
    // frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile(path.join(__dirname,'index.html'));
  mainWindow.maximize();
  mainWindow.show();
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
ipcMain.on('close', () => {
  app.quit();
});

ipcMain.on('minimize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

ipcMain.on('maximize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    if (win.isMaximized()) {
      win.restore();
    } else {
      win.maximize();
    }
  }
});
// IPC Handlers
ipcMain.handle('open-directory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (canceled) {
    return null;
  }
  // Set the current directory when a directory is opened
  currentDirectory = filePaths[0];
  return currentDirectory;
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



ipcMain.handle('search-in-files', async (event, query) => {
  // Implementation to search through files in the opened directory
  const results = [];
  
  // Check if a directory is currently open
  if (!currentDirectory) {
    console.log('No directory selected for search');
    return { error: 'No directory open', results: [] };
  }
  
  console.log(`Searching for "${query}" in ${currentDirectory}`);
  
  // Function to recursively search in files
  const searchInDirectory = async (dirPath) => {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other common directories to exclude
          if (!['node_modules', '.git', 'dist', '.vscode'].includes(entry.name)) {
            await searchInDirectory(fullPath);
          }
        } else {
          try {
            // Skip binary files or files that are too large
            const stats = await fs.promises.stat(fullPath);
            if (stats.size > 1024 * 1024) continue; // Skip files larger than 1MB
            
            // Read file content
            const fileContent = await fs.promises.readFile(fullPath, 'utf8');
            
            // Search for matches
            let matchPosition = fileContent.toLowerCase().indexOf(query.toLowerCase());
            if (matchPosition !== -1) {
              // Get relative path for display
              const relativePath = path.relative(currentDirectory, fullPath);
              
              results.push({
                fileName: entry.name,
                filePath: fullPath,
                relativePath: relativePath,
                fileContent: fileContent,
                matchPosition: matchPosition,
                searchTerm: query
              });
            }
          } catch (error) {
            console.error(`Error searching in file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
    }
  };
  
  try {
    await searchInDirectory(currentDirectory);
    console.log(`Found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Error searching files:', error);
    return { error: error.message, results: [] };
  }
});

ipcMain.handle('scoop-search', async (event, query) => {
  return new Promise((resolve, reject) => {
      exec(`powershell -Command "scoop search ${query}"`, (error, stdout) => {
          if (error) {
              reject('Error executing Scoop search');
              return;
          }

          const lines = stdout.split('\n').slice(2); // Ignore headers
          const results = lines.map(line => {
              const columns = line.split(/\s{2,}/);
              if (columns.length < 4) return null;
              return {
                  name: columns[0],
                  version: columns[1],
                  source: columns[2],
                  binaries: columns[3]
              };
          }).filter(row => row); // Remove null values

          resolve(results);
      });
  });
});

function createDialog() {
  dialogWindow = new BrowserWindow({
      width: 600,
      height: 400,
      show: false,
      parent: mainWindow,
      modal: true,
      frame: false,
      transparent: true,
      autoHideMenuBar: true,
      backgroundColor: '#00000000',
      webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js')
      }
  });
  dialogWindow.loadFile(path.join(__dirname,'dialog.html'));
  dialogWindow.show();
  dialogWindow.on('closed', () => {
      dialogWindow = null;
  });
}

ipcMain.handle('open-command-dialog', () => {
  createDialog();
  return true;
});
ipcMain.handle('install-package', (event, packageName) => {
  return new Promise((resolve, reject) => {
      if (!packageName) {
          reject(`No command defined for ${packageName}`);
          return;
      }

      const child = exec(`powershell -Command "scoop install ${packageName}"`);

      child.stdout.on('data', (data) => {
          if (dialogWindow) {
              dialogWindow.webContents.send('command-output', data);
          }
      });

      child.stderr.on('data', (data) => {
          if (dialogWindow) {
              dialogWindow.webContents.send('command-output', `ERROR: ${data}`);
          }
      });

      child.on('close', (code) => {
          if (dialogWindow) {
              dialogWindow.webContents.send('command-complete', code);
          }
          resolve(code);
      });
  });
});
ipcMain.handle('get-scoop-details', async (event, pkgName) => {
  const url = `https://raw.githubusercontent.com/ScoopInstaller/Main/master/bucket/${pkgName}.json`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      if (res.statusCode !== 200) {
        resolve(null); // Not found or error
        return;
      }

      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          console.error('JSON parse error:', e);
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('Fetch error:', err);
      resolve(null);
    });
  });
});
ipcMain.handle('get-branches', async (event, dirPath) => {
  return new Promise((resolve, reject) => {
    exec('git branch', { cwd: dirPath }, (err, stdout) => {
      if (err) return reject(err);
      const branches = stdout.split('\n').map(line => line.trim()).filter(Boolean);
      resolve(branches);
    });
  });
});