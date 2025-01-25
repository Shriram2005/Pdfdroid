// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDocument = null;
let extractedText = '';

// Parse page ranges from input
function parsePageRanges(input, totalPages) {
    if (!input.trim()) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set();
    const ranges = input.split(',').map(range => range.trim());

    for (const range of ranges) {
        if (range.includes('-')) {
            const [start, end] = range.split('-').map(num => parseInt(num));
            if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
                throw new Error(`Invalid range: ${range}`);
            }
            for (let i = start; i <= end; i++) {
                pages.add(i);
            }
        } else {
            const page = parseInt(range);
            if (isNaN(page) || page < 1 || page > totalPages) {
                throw new Error(`Invalid page number: ${range}`);
            }
            pages.add(page);
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

// Load PDF file
async function loadPDF(file) {
    try {
        showProgress(true);
        updateProgress(0);
        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        showMessage(`PDF loaded successfully. Pages: ${pdfDocument.numPages}`, 'success');
        document.getElementById('extract-btn').disabled = false;
        
        // Automatically extract text from all pages
        await extractText();
    } catch (error) {
        showMessage('Error loading PDF: ' + error.message, 'error');
    } finally {
        showProgress(false);
    }
}

// Extract text from PDF
async function extractText() {
    if (!pdfDocument) {
        showMessage('Please select a PDF file first', 'error');
        return;
    }

    const preserveFormatting = document.getElementById('preserve-formatting').checked;
    const includePageNumbers = document.getElementById('include-page-numbers').checked;
    const pagesInput = document.getElementById('extract-pages').value;
    const output = document.getElementById('text-output');
    
    showProgress(true);
    extractedText = '';
    output.textContent = '';

    try {
        const pagesToExtract = parsePageRanges(pagesInput, pdfDocument.numPages);
        let processedPages = 0;

        for (const pageNum of pagesToExtract) {
            const page = await pdfDocument.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            if (includePageNumbers) {
                extractedText += `\n----- Page ${pageNum} -----\n\n`;
            }

            if (preserveFormatting) {
                // Group items by their vertical position to maintain line structure
                const lines = {};
                textContent.items.forEach(item => {
                    const y = Math.round(item.transform[5]); // Vertical position
                    if (!lines[y]) {
                        lines[y] = [];
                    }
                    lines[y].push(item);
                });

                // Sort lines by vertical position (top to bottom)
                const sortedYPositions = Object.keys(lines).sort((a, b) => b - a);
                
                // Build text with preserved formatting
                for (const y of sortedYPositions) {
                    // Sort items in line by horizontal position
                    const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
                    const lineText = lineItems.map(item => item.str).join('');
                    if (lineText.trim()) {
                        extractedText += lineText + '\n';
                    }
                }
            } else {
                // Simple text extraction
                extractedText += textContent.items.map(item => item.str).join(' ') + '\n';
            }

            processedPages++;
            updateProgress((processedPages / pagesToExtract.length) * 100);
        }

        output.textContent = extractedText;
        showMessage('Text extracted successfully!', 'success');
        
        // Enable copy and download buttons
        document.getElementById('copy-btn').disabled = false;
        document.getElementById('download-btn').disabled = false;
    } catch (error) {
        showMessage('Error extracting text: ' + error.message, 'error');
    } finally {
        showProgress(false);
    }
}

// Copy text to clipboard
async function copyToClipboard() {
    if (!extractedText) {
        showMessage('No text to copy', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(extractedText);
        showMessage('Text copied to clipboard!', 'success');
    } catch (error) {
        showMessage('Error copying text: ' + error.message, 'error');
    }
}

// Download text as file
function downloadText() {
    if (!extractedText) {
        showMessage('No text to download', 'error');
        return;
    }

    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_text_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// UI Helper Functions
function showMessage(message, type = 'info') {
    const messagesDiv = document.querySelector('.messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    messagesDiv.innerHTML = '';
    messagesDiv.appendChild(messageElement);
    
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

function showProgress(show) {
    const progressContainer = document.querySelector('.progress-container');
    const spinner = document.querySelector('.spinner');
    if (show) {
        progressContainer.style.display = 'block';
        spinner.style.display = 'block';
    } else {
        progressContainer.style.display = 'none';
        spinner.style.display = 'none';
    }
}

function updateProgress(percent) {
    const progressBar = document.querySelector('.progress');
    progressBar.style.width = `${percent}%`;
}

// Event Listeners
document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        loadPDF(file);
    } else if (file) {
        showMessage('Please select a PDF file', 'error');
    }
});

document.getElementById('extract-btn').addEventListener('click', extractText);
document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
document.getElementById('download-btn').addEventListener('click', downloadText);

// Initially disable buttons
document.getElementById('extract-btn').disabled = true;
document.getElementById('copy-btn').disabled = true;
document.getElementById('download-btn').disabled = true;

// Drag and drop handlers
const dropZone = document.querySelector('.drop-zone');

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
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        document.getElementById('file-input').files = e.dataTransfer.files;
        loadPDF(file);
    } else {
        showMessage('Please drop a PDF file', 'error');
    }
}); 