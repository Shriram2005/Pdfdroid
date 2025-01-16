let pdfDoc = null;
let pdfBytes = null;

// Handle split option visibility
document.querySelectorAll('input[name="split-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        document.getElementById('range-options').style.display = 'none';
        document.getElementById('custom-options').style.display = 'none';
        document.getElementById('alternate-options').style.display = 'none';
        document.getElementById(`${e.target.value}-options`).style.display = 'block';
    });
});

async function loadPDF(file) {
    try {
        pdfBytes = await file.arrayBuffer();
        pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        
        // Update UI with page count
        document.getElementById('to-page').max = pageCount;
        document.getElementById('to-page').value = pageCount;
        document.getElementById('from-page').max = pageCount;
        document.getElementById('alternate-nth').max = pageCount;
        
        showMessage(`PDF loaded successfully. Total pages: ${pageCount}`, 'success');
    } catch (error) {
        showMessage('Error loading PDF: ' + error.message, 'error');
    }
}

async function splitPDF() {
    if (!pdfDoc) {
        showMessage('Please select a PDF file first', 'error');
        return;
    }

    try {
        const splitType = document.querySelector('input[name="split-type"]:checked').value;
        let pagesToExtract = [];

        switch (splitType) {
            case 'range':
                pagesToExtract = await handleRangeSplit();
                break;
            case 'custom':
                pagesToExtract = await handleCustomSplit();
                break;
            case 'alternate':
                pagesToExtract = await handleAlternateSplit();
                break;
        }

        if (pagesToExtract.length === 0) {
            showMessage('No pages selected for splitting', 'error');
            return;
        }

        await createAndDownloadPDF(pagesToExtract);
    } catch (error) {
        showMessage('Error splitting PDF: ' + error.message, 'error');
    }
}

async function handleRangeSplit() {
    const fromPage = parseInt(document.getElementById('from-page').value);
    const toPage = parseInt(document.getElementById('to-page').value);
    const pageCount = pdfDoc.getPageCount();
    
    if (fromPage > toPage) {
        showMessage('Start page cannot be greater than end page', 'error');
        return [];
    }
    
    if (fromPage < 1 || toPage > pageCount) {
        showMessage('Page range is out of bounds', 'error');
        return [];
    }
    
    return Array.from({length: toPage - fromPage + 1}, (_, i) => fromPage + i - 1);
}

async function handleCustomSplit() {
    const customInput = document.getElementById('custom-pages').value.trim();
    if (!customInput) {
        showMessage('Please enter page numbers', 'error');
        return [];
    }

    const pageCount = pdfDoc.getPageCount();
    const pages = new Set();

    const segments = customInput.split(',');
    for (const segment of segments) {
        if (segment.includes('-')) {
            const [start, end] = segment.split('-').map(num => parseInt(num.trim()));
            if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > pageCount) {
                showMessage(`Invalid range: ${segment}`, 'error');
                continue;
            }
            for (let i = start; i <= end; i++) {
                pages.add(i - 1);
            }
        } else {
            const pageNum = parseInt(segment.trim());
            if (isNaN(pageNum) || pageNum < 1 || pageNum > pageCount) {
                showMessage(`Invalid page number: ${segment}`, 'error');
                continue;
            }
            pages.add(pageNum - 1);
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

async function handleAlternateSplit() {
    const nthPage = parseInt(document.getElementById('alternate-nth').value);
    const pageCount = pdfDoc.getPageCount();
    
    if (nthPage < 1 || nthPage > pageCount) {
        showMessage('Invalid alternate page number', 'error');
        return [];
    }
    
    return Array.from({length: pageCount}, (_, i) => i).filter(i => (i % nthPage) === 0);
}

async function createAndDownloadPDF(pageIndices) {
    showProgress(true);
    try {
        const newPdf = await PDFLib.PDFDocument.create();
        const pages = await newPdf.copyPages(pdfDoc, pageIndices);
        pages.forEach(page => newPdf.addPage(page));

        const newPdfBytes = await newPdf.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `split_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        
        showMessage('PDF split successfully!', 'success');
    } catch (error) {
        showMessage('Error creating split PDF: ' + error.message, 'error');
    } finally {
        showProgress(false);
    }
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

document.getElementById('split-btn').addEventListener('click', splitPDF);

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
