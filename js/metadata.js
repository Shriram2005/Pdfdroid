// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfFile = null;
let pdfDoc = null;
let originalMetadata = null;

// DOM Elements
const fileInput = document.getElementById('file-input');
const title = document.getElementById('title');
const author = document.getElementById('author');
const subject = document.getElementById('subject');
const keywords = document.getElementById('keywords');
const producer = document.getElementById('producer');
const creator = document.getElementById('creator');
const creationDate = document.getElementById('creation-date');
const modDate = document.getElementById('mod-date');
const pageCount = document.getElementById('page-count');
const pageSize = document.getElementById('page-size');
const pdfVersion = document.getElementById('pdf-version');
const fileSize = document.getElementById('file-size');
const resetBtn = document.getElementById('reset-btn');
const applyBtn = document.getElementById('apply-btn');
const toggleRawBtn = document.querySelector('.toggle-raw');
const metadataPreview = document.querySelector('.metadata-preview');
const messages = document.querySelector('.messages');
const progressBar = document.querySelector('.progress');
const spinner = document.querySelector('.spinner');

// Handle file selection
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        pdfFile = file;
        try {
            await loadPdfMetadata(file);
            showMessage('PDF loaded successfully', 'success');
        } catch (error) {
            showMessage('Error loading PDF: ' + error.message, 'error');
        }
    }
});

// Handle drag and drop
const dropZone = document.querySelector('.drop-zone');
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('drag-over');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('drag-over');
    });
});

dropZone.addEventListener('drop', async (e) => {
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        fileInput.files = e.dataTransfer.files;
        const event = new Event('change');
        fileInput.dispatchEvent(event);
    } else {
        showMessage('Please drop a PDF file', 'error');
    }
});

// Load PDF metadata
async function loadPdfMetadata(file) {
    spinner.style.display = 'block';
    progressBar.style.width = '0%';

    try {
        // Load with PDF.js for reading
        const arrayBuffer = await file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const metadata = await pdfJsDoc.getMetadata();

        // Load with PDF-lib for editing
        pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        
        // Store original metadata
        originalMetadata = {
            title: metadata.info.Title || '',
            author: metadata.info.Author || '',
            subject: metadata.info.Subject || '',
            keywords: metadata.info.Keywords || '',
            producer: metadata.info.Producer || '',
            creator: metadata.info.Creator || '',
            creationDate: metadata.info.CreationDate ? formatPdfDate(metadata.info.CreationDate) : '',
            modDate: metadata.info.ModDate ? formatPdfDate(metadata.info.ModDate) : ''
        };

        // Update form fields
        title.value = originalMetadata.title;
        author.value = originalMetadata.author;
        subject.value = originalMetadata.subject;
        keywords.value = originalMetadata.keywords;
        producer.value = originalMetadata.producer;
        creator.value = originalMetadata.creator;
        creationDate.value = originalMetadata.creationDate;
        modDate.value = originalMetadata.modDate;

        // Update document properties
        const page = await pdfJsDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        
        pageCount.value = pdfJsDoc.numPages;
        pageSize.value = `${Math.round(viewport.width)} × ${Math.round(viewport.height)} points`;
        pdfVersion.value = `PDF ${metadata.info.PDFFormatVersion || pdfJsDoc.pdfInfo.version}`;
        fileSize.value = formatFileSize(file.size);

        // Update raw metadata preview
        updateRawMetadataPreview(metadata);

        progressBar.style.width = '100%';
    } catch (error) {
        throw error;
    } finally {
        spinner.style.display = 'none';
        progressBar.style.width = '0%';
    }
}

// Format PDF date string
function formatPdfDate(pdfDate) {
    if (!pdfDate) return '';
    
    try {
        // Remove 'D:' prefix and 'Z' suffix if present
        pdfDate = pdfDate.replace(/^D:/, '').replace(/Z$/, '');
        
        // Extract date components
        const year = pdfDate.substring(0, 4);
        const month = pdfDate.substring(4, 6);
        const day = pdfDate.substring(6, 8);
        const hour = pdfDate.substring(8, 10);
        const minute = pdfDate.substring(10, 12);
        const second = pdfDate.substring(12, 14);
        
        // Create date string
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    } catch {
        return pdfDate;
    }
}

// Format file size
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Update raw metadata preview
function updateRawMetadataPreview(metadata) {
    const formatValue = (value) => {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    };

    const formatObject = (obj, indent = 0) => {
        const spaces = ' '.repeat(indent);
        return Object.entries(obj)
            .map(([key, value]) => {
                const formattedValue = typeof value === 'object' && value !== null
                    ? '\n' + formatObject(value, indent + 2)
                    : formatValue(value);
                return `${spaces}${key}: ${formattedValue}`;
            })
            .join('\n');
    };

    metadataPreview.textContent = formatObject(metadata);
}

// Toggle raw metadata view
toggleRawBtn.addEventListener('click', () => {
    const isHidden = metadataPreview.style.display === 'none';
    metadataPreview.style.display = isHidden ? 'block' : 'none';
    toggleRawBtn.textContent = isHidden ? 'Hide Raw Metadata' : 'View Raw Metadata';
});

// Reset changes
resetBtn.addEventListener('click', () => {
    if (!originalMetadata) return;

    title.value = originalMetadata.title;
    author.value = originalMetadata.author;
    subject.value = originalMetadata.subject;
    keywords.value = originalMetadata.keywords;

    showMessage('Changes reset successfully', 'success');
});

// Apply changes
applyBtn.addEventListener('click', async () => {
    if (!pdfDoc || !pdfFile) {
        showMessage('Please load a PDF file first', 'error');
        return;
    }

    try {
        spinner.style.display = 'block';
        progressBar.style.width = '0%';

        // Update metadata
        pdfDoc.setTitle(title.value);
        pdfDoc.setAuthor(author.value);
        pdfDoc.setSubject(subject.value);
        pdfDoc.setKeywords(keywords.value);

        progressBar.style.width = '50%';

        // Save the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        downloadPdf(modifiedPdfBytes);

        showMessage('Metadata updated successfully', 'success');
    } catch (error) {
        showMessage('Error updating metadata: ' + error.message, 'error');
    } finally {
        spinner.style.display = 'none';
        progressBar.style.width = '0%';
    }
});

function downloadPdf(pdfBytes) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metadata_updated.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function showMessage(message, type) {
    messages.textContent = message;
    messages.className = 'messages ' + type;
    setTimeout(() => {
        messages.textContent = '';
        messages.className = 'messages';
    }, 5000);
} 