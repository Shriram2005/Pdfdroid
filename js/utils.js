// Shared utility functions for PDF tools

// Global variables
let files = [];

// UI Utilities
const showMessage = (message, type = 'error') => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    const messagesContainer = document.querySelector('.messages');
    if (messagesContainer) {
        messagesContainer.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 5000);
    }
};

const showProgress = (show) => {
    const progressContainer = document.querySelector('.progress-container');
    if (progressContainer) {
        progressContainer.style.display = show ? 'block' : 'none';
        if (!show) {
            const progressBar = document.querySelector('.progress');
            if (progressBar) {
                progressBar.style.width = '0%';
            }
        }
    }
};

const showSpinner = (show) => {
    const spinner = document.querySelector('.spinner');
    if (spinner) {
        spinner.style.display = show ? 'block' : 'none';
    }
};

const updateProgress = (progress) => {
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.querySelector('.progress');
    if (progressContainer && progressBar) {
        progressContainer.style.display = 'block';
        progressBar.style.width = `${progress}%`;
    }
};

// File handling
const handleFileSelect = (event) => {
    event.preventDefault();
    const newFiles = event.target.files || event.dataTransfer.files;
    addFiles(newFiles);
};

const addFiles = (newFiles) => {
    for (const file of newFiles) {
        if (!isAllowedFile(file)) {
            showMessage(`File ${file.name} is not supported`);
            continue;
        }
        if (!files.some(f => f.name === file.name)) {
            files.push(file);
            displayFile(file);
        }
    }
};

const isAllowedFile = (file) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/jpg',
        'image/png'
    ];
    return allowedTypes.includes(file.type);
};

const displayFile = (file) => {
    const fileList = document.querySelector('.file-list');
    if (fileList) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <span class="remove-file" onclick="removeFile('${file.name}')">&times;</span>
        `;
        fileList.appendChild(fileItem);
    }
};

const removeFile = (fileName) => {
    files = files.filter(file => file.name !== fileName);
    const fileList = document.querySelector('.file-list');
    if (fileList) {
        fileList.innerHTML = '';
        files.forEach(file => displayFile(file));
    }
};

// Download helper
const downloadFile = (data, fileName) => {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

// Data URL to Blob converter
const dataURLToBlob = (dataURL) => {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type: mime});
};

// Initialize drag and drop
const initializeDragAndDrop = () => {
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            handleFileSelect(e);
        });
    }
};

// Initialize file input
const initializeFileInput = () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
};

// Initialize all common functionality
document.addEventListener('DOMContentLoaded', () => {
    initializeDragAndDrop();
    initializeFileInput();
});
