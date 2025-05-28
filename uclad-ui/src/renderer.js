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
const runfiles = document.getElementById('runFiles');

// File type mapping
const fileTypes = {
  'js': 'JavaScript',
  'json': 'JSON',
  'css': 'CSS',
  'html': 'HTML',
  'md': 'Markdown',
  'txt': 'Plain Text',
  'py': 'Python',
  'java': 'Java',
  'c': 'C',
  'cpp': 'C++',
  'sh': 'Shell Script',
  'go': 'Go',
  'rb': 'Ruby',
  'php': 'PHP',
  'rs': 'Rust',
  'ts': 'TypeScript',
  'lua': 'Lua',
  'swift': 'Swift',
  'kt': 'Kotlin',
  'rsx': 'React JSX',
  'tsx': 'React TSX',
  'xml': 'XML',
  'yaml': 'YAML',
  'yml': 'YAML',
  'sql': 'SQL',
  'csv': 'CSV',
  'log': 'Log File',
  'txt': 'Text File',
  'png': 'Image File',
  'jpg': 'Image File',
  'jpeg': 'Image File',
  'gif': 'Image File',
  'svg': 'SVG Image',
  'pdf': 'PDF Document',
  'doc': 'Word Document',
  'docx': 'Word Document',
  'xls': 'Excel Spreadsheet',
  'xlsx': 'Excel Spreadsheet',
  'ppt': 'PowerPoint Presentation',
  'pptx': 'PowerPoint Presentation',
  'zip': 'Compressed Archive',
  'tar': 'Compressed Archive',
  'gz': 'Compressed Archive',
  'bat': 'Batch File',
  'exe': 'Executable File',
  'dll': 'Dynamic Link Library',
  'ps1': 'PowerShell Script',
  'psm1': 'PowerShell Module',
  'psd1': 'PowerShell Data File',
  'ps1xml': 'PowerShell XML File',
  'vbs': 'VBScript File',
  'wsf': 'Windows Script File',
  'sh': 'Shell Script',
  'bash': 'Bash Script',
  'zsh': 'Zsh Script',
  'fish': 'Fish Shell Script',
  'pl': 'Perl Script',
  'r': 'R Script',
  'scala': 'Scala Script',
  'dart': 'Dart Script',
  'clj': 'Clojure Script',
  'cljc': 'Clojure Script',
  'groovy': 'Groovy Script',
  'asm': 'Assembly Language',
  'h': 'C Header File',
  'hpp': 'C++ Header File',
  'hlsl': 'HLSL Shader',
  'glsl': 'GLSL Shader',
  'cs': 'C# Script',
  'fs': 'F# Script',
  'vb': 'Visual Basic Script',
  'm': 'Objective-C Source File',
  'mm': 'Objective-C++ Source File',
  'swift': 'Swift Source File',
  'kt': 'Kotlin Source File',
  'dart': 'Dart Source File',
  'default': 'Unknown File Type'
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
document.getElementById('showbranch').addEventListener('click', async () => {
  const dirPath= directoryPathElement.textContent;
  if (!dirPath) {
    alert('Please select a Git folder first.');
    return;
  }

  try {
    const branches = await window.electronAPI.getGitBranches(dirPath);
    const listContainer = document.getElementById('branchList');
    listContainer.innerHTML = '';

    branches.forEach(branch => {
      const div = document.createElement('div');
      div.textContent = branch;
      listContainer.appendChild(div);
    });
  } catch (err) {
    console.error('Error fetching branches:', err);
    document.getElementById('branchList').textContent = 'Error loading branches.';
  }
});

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
  async function populateRun(directoryPath) {
    try{
      const contents = await window.electronAPI.getDirectoryContents(directoryPath);
      directoryPathElement.textContent = directoryPath;
      currentDirectory = directoryPath;
      runfiles.innerHTML = '';
      const sortedDirs = contents.filter(e => e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
      const sortedFiles = contents.filter(e => !e.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
      sortedDirs.forEach(dir => {
        const folderElement = createFolder(dir);
        runfiles.appendChild(folderElement);
      });
      sortedFiles.forEach(file => {
        const fileElement = createRunFile(file);
        runfiles.appendChild(fileElement);
      });
      statusIndicator.textContent = 'Run directory loaded';
      setTimeout(() => { statusIndicator.textContent = 'Ready'; }, 2000);


    }catch (err) {
      console.error('Run Error:', err);
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
  
  
let selectionOrder = 0; 
  function createFile(file) {
    const fileElement = document.createElement('div');
    fileElement.className = 'file clickable-name';
    fileElement.style.textDecoration = 'none'; // Underline for clickable effect
    fileElement.style.color='white'; // Ensure underline is visible
    fileElement.textContent = file.name;
    fileElement.dataset.path = file.path;
  
    fileElement.onclick = (e) => {
      e.stopPropagation();
      createTab(file.name, file.path);
      loadFile(file.path);
    };
  
    return fileElement;
  }
  
  function createRunFile(file) {
  const fileWrapper = document.createElement('div');
  fileWrapper.className = 'file-wrapper';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'file-checkbox';
  checkbox.dataset.path = file.path;
  checkbox.dataset.name = file.name;
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) {
      e.target.dataset.selectedOrder = selectionOrder++;
    } else {
      e.target.removeAttribute('data-selected-order');
    }
  });

  const label = document.createElement('label');
  label.textContent = file.name;
  label.className = 'file-label';

  fileWrapper.appendChild(checkbox);
  fileWrapper.appendChild(label);

  return fileWrapper;
}
const runBatchBtn = document.getElementById('runBatchBtn');
runBatchBtn.addEventListener('click', async () => {
  try {
    await runSelectedFiles();
    selectionOrder = 0;
    document.querySelectorAll('.file-checkbox').forEach(cb => cb.removeAttribute('data-selected-order'));

  } catch (error) {
    console.error('Error running batch files:', error);
    appendToTerminal(`Error running batch files: ${error.message}`);
  }
});
async function runSelectedFiles() {
  const checkboxes = Array.from(document.querySelectorAll('.file-checkbox:checked'));

  // Sort based on selection order
  checkboxes.sort((a, b) => {
    return parseInt(a.dataset.selectedOrder) - parseInt(b.dataset.selectedOrder);
  });

  for (const cb of checkboxes) {
    const path = cb.dataset.path;
    const name = cb.dataset.name;

    if (!path) {
      appendToTerminal('No file open to run');
      continue;
    }

    if (hasUnsavedChanges) {
      try {
        await window.electronAPI.saveFile(path, editor.value);
        markFileAsSaved();
      } catch (error) {
        console.error('Error saving before run:', error);
        appendToTerminal(`Error saving file: ${error.message}`);
        continue;
      }
    }

    appendToTerminal(`$ Running: ${name}`);
    try {
      const result = await window.electronAPI.runCode(path);
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
  }
}




// Event: Open directory button click
openDirectoryBtn.addEventListener('click', async () => {
  try {
    const directoryPath = await window.electronAPI.openDirectory();
    if (directoryPath) {
      populateExplorer(directoryPath);
      populateRun(directoryPath);
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



// Global variables for search functionality
// Modified renderer.js search functionality with proper DOM element checks

// Global variables for search functionality
let searchResults = [];
let currentResultIndex = -1;

// Initialize search functionality - with added checks for DOM element existence
function initializeSearch() {
  // Create search input
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search in files...';
  
  // Create search results container
  const searchResultsContainer = document.createElement('div');
  searchResultsContainer.id = 'searchResults';
  searchResultsContainer.className = 'search-results';
  
  // Create search controls container
  const searchControlsDiv = document.createElement('div');
  searchControlsDiv.className = 'search-controls';
  
  // Create search button
  const searchButton = document.createElement('button');
  searchButton.className = 'search-btn';
  searchButton.innerHTML = 'Search';
  
  // Create previous result button
  const prevButton = document.createElement('button');
  prevButton.className = 'search-nav-btn prev-btn';
  prevButton.innerHTML = '&#9660;'; // Down-pointing triangle
  prevButton.title = 'Previous result';
  prevButton.disabled = true;
  
  // Create next result button
  const nextButton = document.createElement('button');
  nextButton.className = 'search-nav-btn next-btn';
  nextButton.innerHTML = '&#9650;'; // Up-pointing triangle
  nextButton.title = 'Next result';
  nextButton.disabled = true;
  
  // Create results count display
  const resultsCountSpan = document.createElement('span');
  resultsCountSpan.id = 'resultsCount';
  resultsCountSpan.className = 'results-count';
  resultsCountSpan.innerText = 'No results';
  
  // Assemble the controls
  searchControlsDiv.appendChild(searchButton);
  searchControlsDiv.appendChild(prevButton);
  searchControlsDiv.appendChild(nextButton);
  searchControlsDiv.appendChild(resultsCountSpan);
  
  // Get the search sidebar container
  const searchContainer = document.getElementById('search');
  
  if (searchContainer) {
    // Append all elements to the search sidebar
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(searchControlsDiv);
    searchContainer.appendChild(searchResultsContainer);
    
    // Add event listeners
    searchButton.addEventListener('click', () => PerformSearch(searchInput.value));
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        PerformSearch(searchInput.value);
      }
    });
    
    prevButton.addEventListener('click', navigateToPreviousResult);
    nextButton.addEventListener('click', navigateToNextResult);
    
    // Add event listeners to search input for real-time filtering of file names
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      if (query.length > 0) {
        highlightMatchingFiles(query);
      } else {
        clearFileHighlights();
      }
    });
  } else {
    console.error('Search container element not found!');
  }
}

// Perform search across all files in the current directory
async function PerformSearch(query) {
  if (!query || query.trim() === '') return;
  
  const searchResultsContainer = document.getElementById('searchResults');
  const resultsCountSpan = document.getElementById('resultsCount');
  
  if (!searchResultsContainer || !resultsCountSpan) {
    console.error('Search results container or count element not found!');
    return;
  }
  
  searchResultsContainer.innerHTML = '<div class="search-info">Searching...</div>';
  resultsCountSpan.innerText = 'Searching...';
  
  // Reset search state
  searchResults = [];
  currentResultIndex = -1;
  
  try {
    // Call the electronAPI to search in files
    const results = await window.electronAPI.searchInFiles(query);
    
    if (results.error) {
      searchResultsContainer.innerHTML = `<div class="search-error">Error: ${results.error}</div>`;
      resultsCountSpan.innerText = 'Error';
      return;
    }
    
    // Process the results if they're in an array format
    const processedResults = Array.isArray(results) ? results : (results.results || []);
    searchResults = processedResults;
    
    displaySearchResults(processedResults, query);
    
    // Update navigation buttons
    updateNavigationButtons();
    
  } catch (error) {
    console.error('Search error:', error);
    searchResultsContainer.innerHTML = `<div class="search-error">Error: ${error.message || 'Unknown error occurred'}</div>`;
    resultsCountSpan.innerText = 'Error';
  }
}

// Function to highlight files in explorer that match search query
function highlightMatchingFiles(query) {
  clearFileHighlights();
  
  const fileItems = document.querySelectorAll('.file-item');
  fileItems.forEach(item => {
    const dataName = item.getAttribute('data-name');
    if (dataName && dataName.toLowerCase().includes(query)) {
      item.classList.add('search-highlight');
    }
  });
}

// Clear file highlighting
function clearFileHighlights() {
  const highlightedItems = document.querySelectorAll('.search-highlight');
  highlightedItems.forEach(item => {
    item.classList.remove('search-highlight');
  });
}

// Display search results in the sidebar
function displaySearchResults(results, query) {
  const searchResultsContainer = document.getElementById('searchResults');
  const resultsCountSpan = document.getElementById('resultsCount');
  
  if (!searchResultsContainer || !resultsCountSpan) {
    console.error('Search results container or count element not found!');
    return;
  }
  
  if (!results || results.length === 0) {
    searchResultsContainer.innerHTML = '<div class="search-info">No results found</div>';
    resultsCountSpan.innerText = 'No results';
    return;
  }
  
  resultsCountSpan.innerText = `${results.length} results`;
  
  searchResultsContainer.innerHTML = '';
  
  results.forEach((result, index) => {
    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.setAttribute('data-index', index);
    
    const fileNameElement = document.createElement('div');
    fileNameElement.className = 'result-filename';
    // Use relative path if available, otherwise just the file name
    fileNameElement.innerText = result.relativePath || result.fileName;
    
    const matchPreviewElement = document.createElement('div');
    matchPreviewElement.className = 'result-preview';
    
    // Extract a snippet around the match
    const start = Math.max(0, result.matchPosition - 20);
    const end = Math.min(result.fileContent.length, result.matchPosition + query.length + 20);
    let snippet = result.fileContent.substring(start, end);
    
    // Add ellipsis if we're not showing from the beginning/end
    if (start > 0) snippet = '...' + snippet;
    if (end < result.fileContent.length) snippet = snippet + '...';
    
    // Highlight the matched text
    const highlightedSnippet = highlightText(snippet, query);
    matchPreviewElement.innerHTML = highlightedSnippet;
    
    resultItem.appendChild(fileNameElement);
    resultItem.appendChild(matchPreviewElement);
    
    // Add click event to navigate to this result
    resultItem.addEventListener('click', () => {
      navigateToResult(index);
    });
    
    searchResultsContainer.appendChild(resultItem);
  });
}

// Highlight query text in the snippet
function highlightText(text, query) {
  if (!text || !query) return text || '';
  
  // Simple case-insensitive replace
  const regex = new RegExp(escapeRegExp(query), 'gi');
  return text.replace(regex, match => `<span class="search-match">${match}</span>`);
}

// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

// Navigate to a specific search result
function navigateToResult(index) {
  if (index < 0 || index >= searchResults.length) return;
  
  currentResultIndex = index;
  const result = searchResults[index];
  
  if (!result || !result.filePath) {
    console.error('Invalid search result selected');
    return;
  }
  
  // Open the file
  createTab(result.fileName, result.filePath);
  loadFile(result.filePath);
  
  // After the file is loaded, position the cursor at the match
  setTimeout(() => {
    const editor = document.getElementById('editor');
    if (!editor) {
      console.error('Editor element not found!');
      return;
    }
    
    editor.focus();
    
    // Calculate line and column of the match
    const contentBeforeMatch = result.fileContent.substring(0, result.matchPosition);
    const lines = contentBeforeMatch.split('\n');
    const lineNumber = lines.length;
    const columnNumber = lines[lines.length - 1].length + 1;
    
    // Position cursor at match and scroll to it
    positionCursor(lineNumber, columnNumber);
    
    // Update UI to show which result is active
    updateActiveResultUI();
  }, 200); // Increased timeout to ensure file is loaded
}

// Position the cursor at a specific line and column
function positionCursor(line, column) {
  const editor = document.getElementById('editor');
  if (!editor) return;
  
  const lines = editor.value.split('\n');
  
  let position = 0;
  for (let i = 0; i < line - 1; i++) {
    position += (lines[i]?.length || 0) + 1; // +1 for the newline character
  }
  position += column - 1;
  
  // Ensure position is within bounds
  position = Math.max(0, Math.min(position, editor.value.length));
  
  editor.setSelectionRange(position, position);
  
  // Scroll to make the cursor visible
  const lineHeight = 20; // Approximate line height in pixels
  const scrollPosition = (line - 5) * lineHeight; // Show a few lines above
  editor.scrollTop = Math.max(0, scrollPosition);
}

// Navigate to previous search result
function navigateToPreviousResult() {
  if (searchResults.length === 0) return;
  
  const newIndex = currentResultIndex <= 0 ? searchResults.length - 1 : currentResultIndex - 1;
  navigateToResult(newIndex);
}

// Navigate to next search result
function navigateToNextResult() {
  if (searchResults.length === 0) return;
  
  const newIndex = (currentResultIndex + 1) % searchResults.length;
  navigateToResult(newIndex);
}

// Update navigation buttons based on results and current position
function updateNavigationButtons() {
  const prevButton = document.querySelector('.search-nav-btn.prev-btn');
  const nextButton = document.querySelector('.search-nav-btn.next-btn');
  
  if (!prevButton || !nextButton) {
    console.error('Navigation buttons not found!');
    return;
  }
  
  if (searchResults.length === 0) {
    prevButton.disabled = true;
    nextButton.disabled = true;
  } else {
    prevButton.disabled = false;
    nextButton.disabled = false;
  }
}

// Update UI to show which result is currently active
function updateActiveResultUI() {
  // Remove active class from all results
  const allResults = document.querySelectorAll('.search-result-item');
  allResults.forEach(item => item.classList.remove('active'));
  
  // Add active class to current result
  if (currentResultIndex >= 0) {
    const activeResult = document.querySelector(`.search-result-item[data-index="${currentResultIndex}"]`);
    if (activeResult) {
      activeResult.classList.add('active');
      activeResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  
  // Update the results count display
  const resultsCountSpan = document.getElementById('resultsCount');
  if (resultsCountSpan && searchResults.length > 0) {
    resultsCountSpan.innerText = `${currentResultIndex + 1}/${searchResults.length} results`;
  }
}

// Add this to your initialization code
document.addEventListener('DOMContentLoaded', () => {
  // Wait for DOM to be fully loaded before initializing search
  setTimeout(() => {
    initializeSearch();
    
    // Initialize search icon click handler
    const searchIcon = document.getElementById('searchIcon');
    if (searchIcon) {
      searchIcon.addEventListener('click', () => {
        // Focus the search input when the search icon is clicked
        setTimeout(() => {
          const searchInput = document.querySelector('.search-input');
          if (searchInput) searchInput.focus();
        }, 100);
      });
    }
  }, 100);
});
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


document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('toolSearch');
  const searchButton = document.getElementById('SearchTool');
  const searchResults = document.getElementById('searchToolResults');

  async function performSearch() {
      const query = searchInput.value.trim();
      if (!query) {
          searchResults.classList.add('d-none');
          searchResults.innerHTML = '';
          return;
      }

      searchResults.classList.remove('d-none');
      searchResults.innerHTML = '<div class="text-center py-3">Searching...</div>';
      try {
          // Fix 1: Ensure IPC channel name matches ('scoop-search' instead of 'search-scoop')
          const results = await window.electronAPI.search(query);

          if (!results || results.length === 0) {
              searchResults.innerHTML = '<div class="text-center py-3">No results found</div>';
              return;
          }

          // Fix 2: Omit the first two rows of the results (header rows)
          const filteredResults = results.slice(2); // Skip the first two rows

          // Fix 3: Add null checks and default values
          searchResults.addEventListener('click', async(event) => {
            if (event.target.classList.contains('install-btn')) {
              const packageName = event.target.dataset.name;
              try{
                await window.electronAPI.openCommandDialog();
                await window.electronAPI.install(packageName);
                
              } catch (error) {
                console.error(`Error executing ${packageName}:`, error);
            }
            }
          });
          // Fix 4: Proper HTML structure with error handling
          const resultsHTML = filteredResults.map((item, index) => `
          <div class="extension-item card mb-2 shadow-sm" data-index="${index}">
            <div class="card-body d-flex justify-content-between align-items-start">
              <div class="extension-details">
                <h5 class="card-title mb-1 clickable-name" data-index="${index}">${item.name || 'Unknown Package'}</h5>
                <p class="mb-1 text-muted">
                  Version: ${item.version || 'N/A'}<br>
                  Source: ${item.source || 'N/A'}<br>
                  <!--Binaries: ${item.binaries || 'N/A'}-->
                </p>
              </div>
              <div>
                <button class="btn btn-sm btn-primary install-btn" data-name="${item.name}">
                  Install
                </button>
              </div>
            </div>
          </div>
        `).join('');
        
                 
          searchResults.innerHTML = resultsHTML;
          searchResults.addEventListener('click', async (e) => {
            const target = e.target;
            if (target.classList.contains('clickable-name')) {
              const idx = target.dataset.index;
              const data = filteredResults[idx];
              if (!data) return;

              const packageName = data.name;
              
              try {
                // Show loading state
                showLoadingState(`Searching for "${packageName}"...`);
                
                // Perform Google search and scrape data
                const searchData = await scrapeGoogleSearch(packageName);
                
                // Display the scraped data in a dedicated page/section
                DisplaySearchResults(packageName, searchData);
                
              } catch (error) {
                console.error('Error scraping Google data:', error);
                showErrorState(`Failed to search for "${packageName}"`);
              }
            }
          });
          
      } catch (error) {
          console.error('Search error:', error);
          searchResults.innerHTML = '<div class="text-center py-3 text-danger">Error fetching results</div>';
      }
  }

  // Fix 5: Add input field enter key support
  searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
  });
  searchButton.addEventListener('click', performSearch);
});
// Function to scrape Google search results
async function scrapeGoogleSearch(query) {
  try {
    // Use a CORS proxy or backend API to fetch Google search results
    const searchUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://www.google.com/search?q=${encodeURIComponent(query + ' software package')}&num=10`
    )}`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    const htmlContent = data.contents;
    
    // Parse the HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Extract search results
    const searchResults = [];
    const resultElements = doc.querySelectorAll('div.g, div[data-ved]');
    
    resultElements.forEach((element, index) => {
      if (index >= 10) return; // Limit to 10 results
      
      const titleElement = element.querySelector('h3');
      const linkElement = element.querySelector('a[href^="http"]');
      const snippetElement = element.querySelector('.VwiC3b, .s3v9rd, .st');
      
      if (titleElement && linkElement) {
        searchResults.push({
          title: titleElement.textContent.trim(),
          url: linkElement.href,
          snippet: snippetElement ? snippetElement.textContent.trim() : '',
          domain: new URL(linkElement.href).hostname
        });
      }
    });
    
    // Also try to get additional info from specific sites
    const additionalInfo = await scrapeAdditionalInfo(query);
    
    return {
      query: query,
      results: searchResults,
      additionalInfo: additionalInfo,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error('Failed to scrape Google search results');
  }
}

// Function to scrape additional information from specific sites
async function scrapeAdditionalInfo(packageName) {
  const additionalInfo = {
    github: null,
    documentation: null,
    downloads: null
  };

  try {
    // Try to get GitHub repository info
    const githubUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(packageName)}&per_page=1`;
    const githubResponse = await fetch(githubUrl);
    const githubData = await githubResponse.json();
    
    if (githubData.items && githubData.items.length > 0) {
      const repo = githubData.items[0];
      additionalInfo.github = {
        name: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        url: repo.html_url,
        language: repo.language,
        updated: repo.updated_at
      };
    }
  } catch (error) {
    console.log('GitHub API error:', error);
  }

  return additionalInfo;
}

// Function to display search results in a dedicated page
function DisplaySearchResults(packageName, searchData) {
  // Create or get the results container
  let resultsContainer = document.getElementById('search-results-container');
  if (!resultsContainer) {
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'search-results-container';
    resultsContainer.className = 'search-results-page';
    document.body.appendChild(resultsContainer);
  }

  // Generate HTML for the results page
  const resultsHTML = `
    <div class="search-results-header">
      <button class="back-button" onclick="closeSearchResults()">← Back</button>
      <h2>Search Results for "${packageName}"</h2>
      <p class="search-meta">results found</p>
    </div>

    <div class="search-results-content">
      ${searchData.additionalInfo.github ? `
        <div class="github-info">
          <h3>🔗 GitHub Repository</h3>
          <div class="github-card">
            <h4><a href="${searchData.additionalInfo.github.url}" target="_blank">${searchData.additionalInfo.github.name}</a></h4>
            <p>${searchData.additionalInfo.github.description || 'No description available'}</p>
            <div class="github-stats">
              <span>⭐ ${searchData.additionalInfo.github.stars} stars</span>
              <span>📝 ${searchData.additionalInfo.github.language || 'N/A'}</span>
              <span>🕒 Updated: ${new Date(searchData.additionalInfo.github.updated).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="web-results">
        <h3>🌐 Web Search Results</h3>
        <div class="results-list">
          ${searchData.results.map(result => `
            <div class="result-item">
              <h4><a href="${result.url}" target="_blank">${result.title}</a></h4>
              <p class="result-url">${result.domain}</p>
              <p class="result-snippet">${result.snippet}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="search-results-footer">
      <p>Search performed at: ${new Date(searchData.timestamp).toLocaleString()}</p>
    </div>
  `;

  resultsContainer.innerHTML = resultsHTML;
  resultsContainer.style.display = 'block';
  
  // Add CSS styles if not already present
  addSearchResultsStyles();
}

// Function to add CSS styles for the search results page
function addSearchResultsStyles() {
  if (document.getElementById('search-results-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'search-results-styles';
  styles.textContent = `
    .search-results-page {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: white;
      z-index: 1000;
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
      display: none;
    }

    .search-results-header {
      border-bottom: 2px solid #eee;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .back-button {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin-bottom: 15px;
      font-size: 14px;
    }

    .back-button:hover {
      background: #0056b3;
    }

    .search-results-header h2 {
      margin: 10px 0;
      color: #333;
    }

    .search-meta {
      color: #666;
      font-size: 14px;
    }

    .github-info, .web-results {
      margin-bottom: 40px;
    }

    .github-info h3, .web-results h3 {
      color: #333;
      border-left: 4px solid #007bff;
      padding-left: 15px;
      margin-bottom: 15px;
    }

    .github-card {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .github-card h4 {
      margin: 0 0 10px 0;
    }

    .github-card a {
      color: #007bff;
      text-decoration: none;
    }

    .github-card a:hover {
      text-decoration: underline;
    }

    .github-stats {
      display: flex;
      gap: 20px;
      margin-top: 15px;
      font-size: 14px;
      color: #666;
    }

    .result-item {
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 15px;
      background: #fafafa;
    }

    .result-item h4 {
      margin: 0 0 5px 0;
    }

    .result-item a {
      color: #1a0dab;
      text-decoration: none;
    }

    .result-item a:hover {
      text-decoration: underline;
    }

    .result-url {
      color: #006621;
      font-size: 14px;
      margin: 5px 0;
    }

    .result-snippet {
      color: #545454;
      line-height: 1.4;
      margin: 10px 0 0 0;
    }

    .search-results-footer {
      border-top: 1px solid #eee;
      padding-top: 20px;
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    .loading-state, .error-state {
      text-align: center;
      padding: 50px;
      font-size: 18px;
    }

    .error-state {
      color: #dc3545;
    }
  `;
  
  document.head.appendChild(styles);
}

// Function to show loading state
function showLoadingState(message) {
  let resultsContainer = document.getElementById('search-results-container');
  if (!resultsContainer) {
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'search-results-container';
    resultsContainer.className = 'search-results-page';
    document.body.appendChild(resultsContainer);
  }

  resultsContainer.innerHTML = `
    <div class="loading-state">
      <div>🔍 ${message}</div>
      <div style="margin-top: 20px;">
        <div class="spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 20px auto;"></div>
      </div>
    </div>
  `;
  
  resultsContainer.style.display = 'block';
  addSearchResultsStyles();
  
  // Add spinner animation
  if (!document.getElementById('spinner-styles')) {
    const spinnerStyles = document.createElement('style');
    spinnerStyles.id = 'spinner-styles';
    spinnerStyles.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(spinnerStyles);
  }
}

// Function to show error state
function showErrorState(message) {
  let resultsContainer = document.getElementById('search-results-container');
  if (!resultsContainer) {
    resultsContainer = document.createElement('div');
    resultsContainer.id = 'search-results-container';
    resultsContainer.className = 'search-results-page';
    document.body.appendChild(resultsContainer);
  }

  resultsContainer.innerHTML = `
    <div class="error-state">
      <div>❌ ${message}</div>
      <button class="back-button" onclick="closeSearchResults()" style="margin-top: 20px;">← Back</button>
    </div>
  `;
  
  resultsContainer.style.display = 'block';
  addSearchResultsStyles();
}

// Function to close search results page
function closeSearchResults() {
  const resultsContainer = document.getElementById('search-results-container');
  if (resultsContainer) {
    resultsContainer.style.display = 'none';
  }
}
function setupLanguageButton(languageId) {
  document.getElementById(languageId).addEventListener('click', async () => {
      try {
          await window.electronAPI.openCommandDialog();
          await window.electronAPI.runCommand(languageId);
      } catch (error) {
          console.error(`Error executing ${languageId}:`, error);
      }
  });
}

const runbtn=document.getElementById('runBtn');
runbtn.addEventListener('click', async () => {
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

document.querySelectorAll('.clickable-name').forEach(el => {
  el.addEventListener('click', async (e) => {
    const idx = e.target.dataset.index;
    const data = filteredResults[idx];

    const packageName = data.name;
    const filepath = '';
    const filename = packageName; // just the package name, no .json

    createTab(filename, filepath);

    // Fetch rich package data using Electron backend (web scraping or JSON parsing)
    const metadata = await window.electronAPI.getScoopPackageDetails(packageName);

    // Pass this to your content area (adjust as needed)
    renderExtensionDetails(filepath, metadata);
  });
});


function renderExtensionDetails(filepath, metadata) {
  const editor = document.getElementById('editorContent');
  if (!editor) return;

  if (!metadata) {
    editor.innerHTML = `<p>Error loading package info for <strong>${filepath}</strong>.</p>`;
    return;
  }

  editor.innerHTML = `
    <div class="extension-detail">
      <h2>${metadata.name}</h2>
      <p><strong>Version:</strong> ${metadata.version || 'N/A'}</p>
      <p><strong>Description:</strong> ${metadata.description || 'No description provided.'}</p>
      <p><strong>Homepage:</strong> <a href="${metadata.homepage}" target="_blank">${metadata.homepage}</a></p>
      <p><strong>License:</strong> ${metadata.license || 'Unknown'}</p>
      <pre class="mt-3"><code>${JSON.stringify(metadata, null, 2)}</code></pre>
    </div>
  `;
}
// // Close Button
// document.getElementById("closeBtn").addEventListener("click", (e) => {
//     e.preventDefault();
//     window.electronAPI.closeApp(); // Securely call the close function
//   });
  
//   // Maximize Button
//   document.getElementById("maxBtn").addEventListener("click", (e) => {
//     e.preventDefault();
//     window.electronAPI.maximizeApp(); // Securely call the maximize function
//   });
  
//   // Minimize Button
//   document.getElementById("minBtn").addEventListener("click", (e) => {
//     e.preventDefault();
//     window.electronAPI.minimizeApp(); // Securely call the minimize function
//   });
//   //Navaigation Bar
//   document.getElementById("navbar").addEventListener("dblclick", () => {
//     window.electronAPI.maximizeApp(); // Toggle maximize/restore
//   });