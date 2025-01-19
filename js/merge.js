// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfFiles = [];
let currentPdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.5;

// Render page to canvas
async function renderPage(pageNum) {
    if (!currentPdfDoc) return;

    pageRendering = true;
    try {
        const page = await currentPdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.getElementById('pdf-preview');
        const ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        await page.render(renderContext).promise;
        pageRendering = false;

        // Update page counters
        document.getElementById('page-num').textContent = pageNum;

        if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
        }
    } catch (error) {
        showMessage('Error rendering preview: ' + error.message, 'error');
        pageRendering = false;
    }
}

// Queue rendering of the page
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

// Previous page
function showPrevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    queueRenderPage(currentPage);
}

// Next page
function showNextPage() {
    if (currentPage >= totalPages) return;
    currentPage++;
    queueRenderPage(currentPage);
}

// Update preview when files are added or removed
async function updatePreview() {
    try {
        // Clear current preview if no files
        if (pdfFiles.length === 0) {
            document.getElementById('page-num').textContent = '0';
            document.getElementById('page-count').textContent = '0';
            document.getElementById('total-files').textContent = '0';
            document.getElementById('total-pages').textContent = '0';
            document.getElementById('prev-page').disabled = true;
            document.getElementById('next-page').disabled = true;
            const canvas = document.getElementById('pdf-preview');
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // Load the first file for preview
        const firstFile = pdfFiles[0];
        const arrayBuffer = await firstFile.arrayBuffer();
        currentPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Update page count
        totalPages = currentPdfDoc.numPages;
        document.getElementById('page-count').textContent = totalPages;
        
        // Update total files and pages
        let totalPdfPages = 0;
        for (const file of pdfFiles) {
            const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
            totalPdfPages += pdf.numPages;
        }
        
        document.getElementById('total-files').textContent = pdfFiles.length;
        document.getElementById('total-pages').textContent = totalPdfPages;
        
        // Enable/disable navigation buttons
        document.getElementById('prev-page').disabled = currentPage <= 1;
        document.getElementById('next-page').disabled = currentPage >= totalPages;
        
        // Show first page
        currentPage = 1;
        renderPage(currentPage);
        
    } catch (error) {
        showMessage('Error updating preview: ' + error.message, 'error');
    }
}

// Handle file selection
function handleFiles(files) {
    for (const file of files) {
        if (file.type !== 'application/pdf') {
            showMessage('Please select only PDF files', 'error');
            continue;
        }
        
        if (!pdfFiles.some(f => f.name === file.name)) {
            pdfFiles.push(file);
            updateFileList();
        }
    }
    
    if (pdfFiles.length > 0) {
        updatePreview();
    }
}

// Update file list display
function updateFileList() {
    const fileList = document.querySelector('.file-list');
    fileList.innerHTML = '';
    
    pdfFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span>${file.name}</span>
            <div class="file-actions">
                <button class="btn-move" onclick="moveFile(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn-move" onclick="moveFile(${index}, 1)" ${index === pdfFiles.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="btn-remove" onclick="removeFile(${index})">×</button>
            </div>
        `;
        fileList.appendChild(fileItem);
    });
}

// Move file in the list
function moveFile(index, direction) {
    if ((direction === -1 && index === 0) || (direction === 1 && index === pdfFiles.length - 1)) {
        return;
    }
    
    const newIndex = index + direction;
    [pdfFiles[index], pdfFiles[newIndex]] = [pdfFiles[newIndex], pdfFiles[index]];
    updateFileList();
    updatePreview();
}

// Remove file from list
function removeFile(index) {
    pdfFiles.splice(index, 1);
    updateFileList();
    updatePreview();
}

// Merge PDFs
async function mergePDFs() {
    if (pdfFiles.length === 0) {
        showMessage('Please add PDF files to merge', 'error');
        return;
    }

    showProgress(true);
    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        for (let i = 0; i < pdfFiles.length; i++) {
            const file = pdfFiles[i];
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
            
            // Update progress
            updateProgress((i + 1) / pdfFiles.length * 100);
        }
        
        const mergedPdfFile = await mergedPdf.save();
        const blob = new Blob([mergedPdfFile], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `merged_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage('PDFs merged successfully!', 'success');
    } catch (error) {
        showMessage('Error merging PDFs: ' + error.message, 'error');
    } finally {
        showProgress(false);
    }
}

// UI Helper Functions
function showMessage(message, type = 'info') {
    const messagesDiv = document.querySelector('.messages');
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    messagesDiv.innerHTML = '';
    messagesDiv.appendChild(messageElement);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

function showProgress(show) {
    const progressContainer = document.querySelector('.progress-container');
    if (show) {
        progressContainer.style.display = 'block';
    } else {
        progressContainer.style.display = 'none';
    }
}

function updateProgress(percent) {
    const progressBar = document.querySelector('.progress');
    progressBar.style.width = `${percent}%`;
}

// Event Listeners
document.getElementById('file-input').addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

document.getElementById('merge-btn').addEventListener('click', mergePDFs);

document.getElementById('prev-page').addEventListener('click', showPrevPage);
document.getElementById('next-page').addEventListener('click', showNextPage);

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
    handleFiles(e.dataTransfer.files);
});
