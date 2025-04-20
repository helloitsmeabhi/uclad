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
    searchButton.addEventListener('click', () => performSearch(searchInput.value));
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch(searchInput.value);
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
async function performSearch(query) {
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

// // Function to search packages using scoop
// async function searchScoopPackages(query) {
//   try {
//     // Call scoop search via electronAPI
//     const results = await window.electronAPI.executeCommand(`scoop search ${query}`);
    
//     // Parse the results (assuming results are in a specific format)
//     const searchResults = parseSearchResults(results);
    
//     // Display the results in your UI
//     displaySearchResults(searchResults);
    
//     return searchResults;
//   } catch (error) {
//     console.error('Error searching scoop packages:', error);
//     return [];
//   }
// }

// // Function to parse the raw search results from scoop
// function parseSearchResults(rawResults) {
//   // Scoop typically returns results in a format like:
//   // Name     Version     Source     Description
//   // ----     -------     ------     -----------
//   // app1     1.0.0       main       Description of app1
//   // app2     2.0.0       extras     Description of app2
  
//   const lines = rawResults.split('\n');
//   const results = [];
  
//   // Skip header lines (first 2 lines)
//   for (let i = 2; i < lines.length; i++) {
//     const line = lines[i].trim();
//     if (line) {
//       // Split by multiple spaces
//       const parts = line.split(/\s{2,}/);
//       if (parts.length >= 4) {
//         results.push({
//           name: parts[0].trim(),
//           version: parts[1].trim(),
//           source: parts[2].trim(),
//           description: parts[3].trim()
//         });
//       }
//     }
//   }
  
//   return results;
// }

// // Function to display the search results in the UI
// function displaySearchResults(results) {
//   const resultsContainer = document.querySelector('.search-results');
//   resultsContainer.innerHTML = '';
  
//   if (results.length === 0) {
//     resultsContainer.innerHTML = '<p class="no-results">No packages found</p>';
//     return;
//   }
  
//   results.forEach(result => {
//     const resultElement = document.createElement('div');
//     resultElement.className = 'search-result-item';
//     resultElement.innerHTML = `
//       <div class="package-name">${result.name}</div>
//       <div class="package-version">${result.version}</div>
//       <div class="package-description">${result.description}</div>
//       <div class="package-source">${result.source}</div>
//       <button class="install-button">Install</button>
//     `;
    
//     // Add event listener for install button
//     const installButton = resultElement.querySelector('.install-button');
//     installButton.addEventListener('click', () => {
//       installPackage(result.name);
//     });
    
//     resultsContainer.appendChild(resultElement);
//   });
// }

// // Function to install a package
// async function installPackage(packageName) {
//   try {
//     const statusIndicator = document.getElementById('statusIndicator');
//     statusIndicator.textContent = `Installing ${packageName}...`;
    
//     // Call scoop install via electronAPI
//     await window.electronAPI.executeCommand(`scoop install ${packageName}`);
    
//     statusIndicator.textContent = `${packageName} installed successfully!`;
//     setTimeout(() => { statusIndicator.textContent = 'Ready'; }, 3000);
//   } catch (error) {
//     console.error('Error installing package:', error);
//     statusIndicator.textContent = `Failed to install ${packageName}`;
//     setTimeout(() => { statusIndicator.textContent = 'Ready'; }, 3000);
//   }
// }

// document.getElementById('packageSearchButton').addEventListener('click', () => {
//   const query = document.getElementById('packageSearchInput').value.trim();
//   if (query) {
//     searchScoopPackages(query);
//   }
// });

// document.getElementById('packageSearchInput').addEventListener('keydown', (e) => {
//   if (e.key === 'Enter') {
//     const query = document.getElementById('packageSearchInput').value.trim();
//     if (query) {
//       searchScoopPackages(query);
//     }
//   }
// });