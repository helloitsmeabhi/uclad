// renderer.js - Renderer Process

// DOM elements
const openDirectoryBtn = document.getElementById('openDirectory');
const newFileBtn = document.getElementById('newFile');
const saveButton = document.getElementById('saveButton');
const runCodeBtn = document.getElementById('runCode');
const clearTerminalBtn = document.getElementById('clearTerminal');
const directoryPathElement = document.getElementById('directoryPath');
const fileExplorer = document.getElementById('fileExplorer');
const editor = document.getElementById('editor');
const lineNumbers = document.getElementById('lineNumbers');
const editorTabs = document.getElementById('editorTabs');
const terminalOutput = document.getElementById('terminalOutput');
const cursorPosition = document.getElementById('cursorPosition');
const fileTypeIndicator = document.getElementById('fileTypeIndicator');
const statusIndicator = document.getElementById('statusIndicator');

// File type mapping
const fileTypes = {
  'js': 'JavaScript',
  'json': 'JSON',
  'css': 'CSS',
  'html': 'HTML',
  'md': 'Markdown',
  'txt': 'Plain Text'
};

// State variables
let currentDirectory = null;
let currentFilePath = null;
let openedTabs = new Map(); // Map of filepath to tab element
let hasUnsavedChanges = false;

// Helper: Create a tab for a file
function createTab(filename, filepath) {
    // Check if tab already exists
    if (openedTabs.has(filepath)) {
      activateTab(filepath);
      return;
    }
  
    // Create new tab element using the "editor-tab" class for consistency
    const tab = document.createElement('div');
    tab.classList.add('editor-tab');
    tab.dataset.filepath = filepath;
  
    // Create a span for the tab's title and add it to the tab
    const titleSpan = document.createElement('span');
    titleSpan.textContent = filename;
    tab.appendChild(titleSpan);
  
    // Create the close button element using "tab-close" class
    const closeBtn = document.createElement('span');
    closeBtn.classList.add('tab-close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(filepath);
    });
    tab.appendChild(closeBtn);
  
    // When clicking the tab itself, load the file
    tab.addEventListener('click', () => loadFile(filepath));
  
    // Append the tab to the tabs container and record it as opened
    editorTabs.appendChild(tab);
    openedTabs.set(filepath, tab);
    
    // Activate the new tab
    activateTab(filepath);
  }
  

// Helper: Activate a tab
function activateTab(filepath) {
    // Remove active class from all tabs
    document.querySelectorAll('.editor-tab').forEach(tab => tab.classList.remove('active'));
    
    // If a tab with the given filepath exists, add the active class to it
    const activeTab = openedTabs.get(filepath);
    if (activeTab) {
      activeTab.classList.add('active');
    }
  }
  

// Helper: Close a tab
function closeTab(filepath) {
  if (!openedTabs.has(filepath)) return;
  
  // If this is the current file, clear the editor
  if (currentFilePath === filepath) {
    if (hasUnsavedChanges) {
      const confirmClose = confirm('You have unsaved changes. Are you sure you want to close this file?');
      if (!confirmClose) return;
    }
    
    editor.value = '';
    lineNumbers.innerHTML = '';
    editor.disabled = true;
    saveButton.disabled = true;
    currentFilePath = null;
    hasUnsavedChanges = false;
    fileTypeIndicator.textContent = '';
  }
  
  // Remove the tab element
  openedTabs.get(filepath).remove();
  openedTabs.delete(filepath);
  
  // If there are other tabs, activate one of them
  if (openedTabs.size > 0) {
    const nextFilePath = openedTabs.keys().next().value;
    loadFile(nextFilePath);
  }
}

// Helper: Load a file's content into the editor
async function loadFile(filepath) {
  try {
    const content = await window.electronAPI.readFile(filepath);
    
    editor.value = content;
    editor.disabled = false;
    saveButton.disabled = true;
    currentFilePath = filepath;
    hasUnsavedChanges = false;
    
    // Update line numbers
    updateLineNumbers();
    
    // Update the file type indicator
    const extension = filepath.split('.').pop().toLowerCase();
    fileTypeIndicator.textContent = fileTypes[extension] || 'Unknown';
    
    // Activate the tab
    activateTab(filepath);
    
    // Highlight the file in the explorer
    document.querySelectorAll('.file').forEach(f => f.classList.remove('active'));
    const fileElement = document.querySelector(`.file[data-path="${filepath}"]`);
    if (fileElement) {
      fileElement.classList.add('active');
    }
    
    statusIndicator.textContent = 'File loaded';
    setTimeout(() => { statusIndicator.textContent = 'Ready'; }, 2000);
  } catch (error) {
    console.error('Error loading file:', error);
    terminalOutput.innerHTML += `$ Error loading file: ${error.message}<br>`;
  }
}

// Helper: Update line numbers in the editor
function updateLineNumbers() {
  const lines = editor.value.split('\n').length;
  lineNumbers.innerHTML = Array.from({length: lines}, (_, i) => i + 1).join('<br>');
}
editor.addEventListener('input', updateLineNumbers);
editor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = editor.scrollTop;
});


// Helper: Update editor content when a file has been saved
function markFileAsSaved() {
  hasUnsavedChanges = false;
  saveButton.disabled = true;
  
  // Update tab text (remove * if it exists)
  if (currentFilePath && openedTabs.has(currentFilePath)) {
    const tab = openedTabs.get(currentFilePath);
    const filename = currentFilePath.split(/[/\\]/).pop();
    tab.childNodes[0].textContent = filename;
  }
  
  statusIndicator.textContent = 'File saved';
  setTimeout(() => { statusIndicator.textContent = 'Ready'; }, 2000);
}

// Helper: Mark file as having unsaved changes
function markFileAsUnsaved() {
  if (!hasUnsavedChanges && currentFilePath) {
    hasUnsavedChanges = true;
    saveButton.disabled = false;
    
    // Update tab text with * to indicate unsaved changes
    if (openedTabs.has(currentFilePath)) {
      const tab = openedTabs.get(currentFilePath);
      const filename = currentFilePath.split(/[/\\]/).pop();
      tab.childNodes[0].textContent = `${filename} *`;
    }
  }
}

// Helper: Add output to terminal
function appendToTerminal(text) {
  terminalOutput.innerHTML += `${text}<br>`;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

// Helper: Populate file explorer with directory contents
async function populateExplorer(directoryPath) {
    try {
      const contents = await window.electronAPI.getDirectoryContents(directoryPath);
  
      // Update directory path display
      directoryPathElement.textContent = directoryPath;
      currentDirectory = directoryPath;
      fileExplorer.innerHTML = '';
  
      const sortedDirs = contents.filter(e => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
      const sortedFiles = contents.filter(e => !e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
  
      // Add directories first
      sortedDirs.forEach(dir => {
        const folderElement = createFolder(dir);
        fileExplorer.appendChild(folderElement);
      });
  
      // Add files
      sortedFiles.forEach(file => {
        const fileElement = createFile(file);
        fileExplorer.appendChild(fileElement);
      });
  
      statusIndicator.textContent = 'Directory loaded';
      setTimeout(() => { statusIndicator.textContent = 'Ready'; }, 2000);
    } catch (err) {
      console.error('Explorer Error:', err);
      appendToTerminal(`Error: ${err.message}`);
    }
  }
  
  function createFolder(entry, depth = 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'folder-wrapper';
    wrapper.style.paddingLeft = `${depth * 16}px`; // Indentation like VS Code
  
    const header = document.createElement('div');
    header.className = 'folder-header';
  
    const icon = document.createElement('span');
    icon.className = 'toggle-icon';
    icon.textContent = '>';
  
    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = entry.name;
  
    header.appendChild(icon);
    header.appendChild(name);
    wrapper.appendChild(header);
  
    const contentsContainer = document.createElement('div');
    contentsContainer.className = 'folder-contents hidden';
    wrapper.appendChild(contentsContainer);
  
    header.addEventListener('click', async () => {
      const isCollapsed = contentsContainer.classList.contains('hidden');
  
      if (isCollapsed) {
        contentsContainer.classList.remove('hidden');
        icon.textContent = '▾';
        contentsContainer.innerHTML = ''; // Clear existing content (retract logic)
  
        try {
          const subContents = await window.electronAPI.getDirectoryContents(entry.path);
          const subDirs = subContents.filter(e => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
          const subFiles = subContents.filter(e => !e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
  
          subDirs.forEach(subDir => {
            const subFolder = createFolder(subDir, depth + 1);
            contentsContainer.appendChild(subFolder);
          });
  
          subFiles.forEach(file => {
            const fileEl = createFile(file);
            fileEl.style.paddingLeft = `${(depth + 1) * 16}px`; // Indent files under folders
            contentsContainer.appendChild(fileEl);
          });
        } catch (err) {
          console.error('Error loading contents:', err);
        }
      } else {
        contentsContainer.classList.add('hidden');
        icon.textContent = '>';
      }
    });
  
    return wrapper;
  }
  
  
  
  
  function createFile(file) {
    const fileElement = document.createElement('div');
    fileElement.className = 'file';
    fileElement.textContent = file.name;
    fileElement.dataset.path = file.path;
  
    fileElement.onclick = (e) => {
      e.stopPropagation();
      createTab(file.name, file.path);
      loadFile(file.path);
    };
  
    return fileElement;
  }
  

// Event: Open directory button click
openDirectoryBtn.addEventListener('click', async () => {
  try {
    const directoryPath = await window.electronAPI.openDirectory();
    if (directoryPath) {
      populateExplorer(directoryPath);
    }
  } catch (error) {
    console.error('Error opening directory:', error);
    appendToTerminal(`Error opening directory: ${error.message}`);
  }
});

// Event: New file button click
newFileBtn.addEventListener('click', async () => {
    if (!currentDirectory) {
      appendToTerminal('Please open a directory first');
      return;
    }
    
    // Use custom modal instead of prompt
    const fileName = await showInputModal({
      title: 'New File',
      message: 'Enter new file name:',
      placeholder: 'filename.txt'
    });
    
    if (!fileName) return;
    
    try {
      const result = await window.electronAPI.createNewFile(currentDirectory, fileName);
      if (result.success) {
        appendToTerminal(`Created new file: ${fileName}`);
        
        // Refresh explorer
        populateExplorer(currentDirectory);
        
        // Open the new file
        createTab(fileName, result.path);
        loadFile(result.path);
      }
    } catch (error) {
      console.error('Error creating file:', error);
      appendToTerminal(`Error creating file: ${error.message}`);
    }
  });
  document.getElementById('newFile').addEventListener('click', async () => {
    const fileName = await showInputModal({
      title: 'New File',
      message: 'Enter new file name:',
      placeholder: 'filename.js'
    });
    
    if (fileName) {
      console.log('Creating new file:', fileName);
      // Call your existing createNewFile function here
    }
  });
// Modal dialog utility functions
function showInputModal(options) {
    return new Promise((resolve) => {
      const modal = document.getElementById('input-modal');
      const titleEl = document.getElementById('modal-title');
      const messageEl = document.getElementById('modal-message');
      const inputEl = document.getElementById('modal-input');
      const cancelBtn = document.getElementById('modal-cancel');
      const confirmBtn = document.getElementById('modal-confirm');
      
      // Set modal content
      titleEl.textContent = options.title || 'Input';
      messageEl.textContent = options.message || 'Please enter a value:';
      inputEl.placeholder = options.placeholder || '';
      inputEl.value = options.default || '';
      
      // Show modal
      modal.style.display = 'flex';
      inputEl.focus();
      
      // Handle cancel
      const handleCancel = () => {
        modal.style.display = 'none';
        cleanup();
        resolve(null);
      };
      
      // Handle confirm
      const handleConfirm = () => {
        const value = inputEl.value.trim();
        modal.style.display = 'none';
        cleanup();
        resolve(value);
      };
      
      // Handle Enter key
      const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
          handleConfirm();
        } else if (event.key === 'Escape') {
          handleCancel();
        }
      };
      
      // Add event listeners
      cancelBtn.addEventListener('click', handleCancel);
      confirmBtn.addEventListener('click', handleConfirm);
      inputEl.addEventListener('keydown', handleKeyDown);
      
      // Cleanup function
      function cleanup() {
        cancelBtn.removeEventListener('click', handleCancel);
        confirmBtn.removeEventListener('click', handleConfirm);
        inputEl.removeEventListener('keydown', handleKeyDown);
      }
    });
  }
// Event: Save button click
saveButton.addEventListener('click', async () => {
  if (!currentFilePath || !hasUnsavedChanges) return;
  
  try {
    await window.electronAPI.saveFile(currentFilePath, editor.value);
    markFileAsSaved();
  } catch (error) {
    console.error('Error saving file:', error);
    appendToTerminal(`Error saving file: ${error.message}`);
  }
});

// Event: Run code button click
runCodeBtn.addEventListener('click', async () => {
  if (!currentFilePath) {
    appendToTerminal('No file open to run');
    return;
  }
  
  // Save if there are unsaved changes
  if (hasUnsavedChanges) {
    try {
      await window.electronAPI.saveFile(currentFilePath, editor.value);
      markFileAsSaved();
    } catch (error) {
      console.error('Error saving before run:', error);
      appendToTerminal(`Error saving file: ${error.message}`);
      return;
    }
  }
  
  appendToTerminal(`$ Running: ${currentFilePath.split(/[/\\]/).pop()}`);
  
  try {
    const result = await window.electronAPI.runCode(currentFilePath);
    
    if (result.success) {
      appendToTerminal(result.output || '(No output)');
      appendToTerminal('Process completed successfully');
    } else {
      appendToTerminal(`Error: ${result.output}`);
    }
  } catch (error) {
    console.error('Error running code:', error);
    appendToTerminal(`Error running code: ${error.message}`);
  }
});

// Event: Clear terminal button click
clearTerminalBtn.addEventListener('click', () => {
  terminalOutput.innerHTML = '$ Terminal cleared<br>';
});

// Event: Editor input - update line numbers and mark unsaved
editor.addEventListener('input', () => {
  updateLineNumbers();
  markFileAsUnsaved();
});

// Event: Editor cursor position change
editor.addEventListener('click', updateCursorPosition);
editor.addEventListener('keyup', updateCursorPosition);

// Helper: Update cursor position in status bar
function updateCursorPosition() {
  const text = editor.value.substring(0, editor.selectionStart);
  const lines = text.split('\n');
  const currentLine = lines.length;
  const currentColumn = lines[lines.length - 1].length + 1;
  cursorPosition.textContent = `Ln ${currentLine}, Col ${currentColumn}`;
}

// Initialize with empty line numbers
updateLineNumbers();


