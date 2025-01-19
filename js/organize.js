// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfFile = null;
let pdfDoc = null;
let pages = [];
let selectedPages = new Set();
let zoom = 100;

// DOM Elements
const fileInput = document.getElementById('file-input');
const pagesGrid = document.getElementById('pages-grid');
const selectAllBtn = document.getElementById('select-all');
const rotateLeftBtn = document.getElementById('rotate-left');
const rotateRightBtn = document.getElementById('rotate-right');
const deletePagesBtn = document.getElementById('delete-pages');
const saveBtn = document.getElementById('save-btn');
const zoomInput = document.getElementById('zoom');
const zoomValue = document.querySelector('.zoom-value');
const selectionInfo = document.querySelector('.selection-info');
const messages = document.querySelector('.messages');
const progressBar = document.querySelector('.progress');
const spinner = document.querySelector('.spinner');

// Initialize Sortable
let sortable = null;

// Handle file selection
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        pdfFile = file;
        try {
            await loadPdf(file);
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

// Load PDF and render pages
async function loadPdf(file) {
    spinner.style.display = 'block';
    progressBar.style.width = '0%';
    pagesGrid.innerHTML = '';
    pages = [];
    selectedPages.clear();
    updateSelectionInfo();
    updateToolbarState();

    try {
        // Load with PDF.js for rendering
        const arrayBuffer = await file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Load with PDF-lib for editing
        pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

        const totalPages = pdfJsDoc.numPages;
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < totalPages; i++) {
            const page = await pdfJsDoc.getPage(i + 1);
            const pageElement = await createPageElement(page, i);
            fragment.appendChild(pageElement);
            pages.push({
                index: i,
                rotation: 0,
                deleted: false
            });
            progressBar.style.width = `${((i + 1) / totalPages) * 100}%`;
        }

        pagesGrid.innerHTML = '';
        pagesGrid.appendChild(fragment);

        // Initialize Sortable
        if (sortable) {
            sortable.destroy();
        }
        sortable = new Sortable(pagesGrid, {
            animation: 150,
            ghostClass: 'dragging',
            onEnd: handlePageReorder
        });

        enableToolbar();
    } catch (error) {
        throw error;
    } finally {
        spinner.style.display = 'none';
        progressBar.style.width = '0%';
    }
}

// Create page element
async function createPageElement(page, index) {
    const viewport = page.getViewport({ scale: 1 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set canvas size to match viewport
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page to canvas
    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    // Create page container
    const pageElement = document.createElement('div');
    pageElement.className = 'page-item';
    pageElement.dataset.index = index;

    // Create page preview
    const preview = document.createElement('canvas');
    preview.className = 'page-preview';
    preview.width = viewport.width;
    preview.height = viewport.height;
    preview.getContext('2d').drawImage(canvas, 0, 0);

    // Add page number
    const pageNumber = document.createElement('div');
    pageNumber.className = 'page-number';
    pageNumber.textContent = `Page ${index + 1}`;

    // Add page actions
    const actions = document.createElement('div');
    actions.className = 'page-actions';

    pageElement.appendChild(preview);
    pageElement.appendChild(pageNumber);
    pageElement.appendChild(actions);

    // Add click handler for selection
    pageElement.addEventListener('click', (e) => {
        if (!e.target.closest('.page-actions')) {
            togglePageSelection(pageElement);
        }
    });

    return pageElement;
}

// Handle page reordering
function handlePageReorder(event) {
    const oldIndex = event.oldIndex;
    const newIndex = event.newIndex;

    if (oldIndex === newIndex) return;

    // Update pages array
    const page = pages.splice(oldIndex, 1)[0];
    pages.splice(newIndex, 0, page);

    // Update page numbers
    const pageNumbers = pagesGrid.querySelectorAll('.page-number');
    pageNumbers.forEach((number, index) => {
        number.textContent = `Page ${index + 1}`;
    });

    saveBtn.disabled = false;
}

// Toggle page selection
function togglePageSelection(pageElement) {
    const index = parseInt(pageElement.dataset.index);
    if (selectedPages.has(index)) {
        selectedPages.delete(index);
        pageElement.classList.remove('selected');
    } else {
        selectedPages.add(index);
        pageElement.classList.add('selected');
    }
    updateSelectionInfo();
    updateToolbarState();
}

// Update selection info
function updateSelectionInfo() {
    const count = selectedPages.size;
    selectionInfo.textContent = `${count} page${count === 1 ? '' : 's'} selected`;
    selectionInfo.style.display = count > 0 ? 'block' : 'none';
}

// Update toolbar state
function updateToolbarState() {
    const hasSelection = selectedPages.size > 0;
    const hasPages = pages.filter(p => !p.deleted).length > 0;
    
    rotateLeftBtn.disabled = !hasSelection;
    rotateRightBtn.disabled = !hasSelection;
    deletePagesBtn.disabled = !hasSelection;
    selectAllBtn.disabled = !hasPages;
    saveBtn.disabled = !hasPages;
}

// Enable toolbar
function enableToolbar() {
    selectAllBtn.addEventListener('click', handleSelectAll);
    rotateLeftBtn.addEventListener('click', () => rotatePage(-90));
    rotateRightBtn.addEventListener('click', () => rotatePage(90));
    deletePagesBtn.addEventListener('click', deleteSelectedPages);
    updateToolbarState();
}

// Handle select all
function handleSelectAll() {
    const pageElements = pagesGrid.querySelectorAll('.page-item');
    const allSelected = selectedPages.size === pageElements.length;

    pageElements.forEach(element => {
        const index = parseInt(element.dataset.index);
        if (allSelected) {
            selectedPages.delete(index);
            element.classList.remove('selected');
        } else {
            selectedPages.add(index);
            element.classList.add('selected');
        }
    });

    updateSelectionInfo();
    updateToolbarState();
}

// Rotate selected pages
async function rotatePage(angle) {
    const pageElements = pagesGrid.querySelectorAll('.page-item');
    
    for (const index of selectedPages) {
        const pageElement = pageElements[index];
        const preview = pageElement.querySelector('.page-preview');
        
        // Update rotation in pages array
        pages[index].rotation = (pages[index].rotation + angle + 360) % 360;
        
        // Rotate preview
        preview.style.transform = `rotate(${pages[index].rotation}deg)`;
    }

    saveBtn.disabled = false;
}

// Delete selected pages
function deleteSelectedPages() {
    if (!confirm('Are you sure you want to delete the selected pages?')) return;

    const pageElements = pagesGrid.querySelectorAll('.page-item');
    const selectedArray = Array.from(selectedPages).sort((a, b) => b - a);

    selectedArray.forEach(index => {
        pages[index].deleted = true;
        pageElements[index].remove();
    });

    selectedPages.clear();
    updateSelectionInfo();
    updateToolbarState();
    saveBtn.disabled = false;

    // Update remaining page numbers
    const remainingNumbers = pagesGrid.querySelectorAll('.page-number');
    remainingNumbers.forEach((number, index) => {
        number.textContent = `Page ${index + 1}`;
    });
}

// Handle zoom
zoomInput.addEventListener('input', () => {
    zoom = parseInt(zoomInput.value);
    zoomValue.textContent = `${zoom}%`;
    
    const previews = pagesGrid.querySelectorAll('.page-preview');
    previews.forEach(preview => {
        preview.style.transform = `scale(${zoom / 100}) rotate(${pages[parseInt(preview.parentElement.dataset.index)].rotation}deg)`;
    });
});

// Save changes
saveBtn.addEventListener('click', async () => {
    if (!pdfDoc) return;

    try {
        spinner.style.display = 'block';
        progressBar.style.width = '0%';

        // Create new PDF document
        const newPdf = await PDFLib.PDFDocument.create();
        
        // Copy pages in new order, applying rotations
        const remainingPages = pages.filter(p => !p.deleted);
        for (let i = 0; i < remainingPages.length; i++) {
            const page = remainingPages[i];
            const [copiedPage] = await newPdf.copyPages(pdfDoc, [page.index]);
            
            if (page.rotation !== 0) {
                copiedPage.setRotation(PDFLib.degrees(page.rotation));
            }
            
            newPdf.addPage(copiedPage);
            progressBar.style.width = `${((i + 1) / remainingPages.length) * 100}%`;
        }

        // Save and download
        const modifiedPdfBytes = await newPdf.save();
        downloadPdf(modifiedPdfBytes);

        showMessage('Changes saved successfully', 'success');
    } catch (error) {
        showMessage('Error saving changes: ' + error.message, 'error');
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
    link.download = 'organized.pdf';
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