// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfFile = null;
let pdfDoc = null;

// DOM Elements
const fileInput = document.getElementById('file-input');
const numberFormat = document.getElementById('number-format');
const prefix = document.getElementById('prefix');
const suffix = document.getElementById('suffix');
const fontSize = document.getElementById('font-size');
const margin = document.getElementById('margin');
const startPage = document.getElementById('start-page');
const endPage = document.getElementById('end-page');
const skipFirst = document.getElementById('skip-first');
const startNumber = document.getElementById('start-number');
const applyBtn = document.getElementById('apply-btn');
const previewCanvas = document.getElementById('preview-canvas');
const formatPreview = document.getElementById('format-preview');
const messages = document.querySelector('.messages');
const progressBar = document.querySelector('.progress');
const spinner = document.querySelector('.spinner');
const positionOptions = document.querySelectorAll('.position-option');

// Update range value displays
document.querySelectorAll('.range-with-value input[type="range"]').forEach(input => {
    const valueDisplay = input.parentElement.querySelector('.range-value');
    input.addEventListener('input', () => {
        valueDisplay.textContent = input.value + 'px';
        updatePreview();
    });
});

// Handle position selection
let selectedPosition = 'bottom-center';
positionOptions.forEach(option => {
    option.addEventListener('click', () => {
        positionOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        selectedPosition = option.dataset.position;
        updatePreview();
    });
});

// Handle file selection
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        pdfFile = file;
        try {
            const arrayBuffer = await file.arrayBuffer();
            pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            showMessage('PDF loaded successfully', 'success');
            endPage.value = pdfDoc.numPages;
            updatePreview();
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

// Update preview when options change
[numberFormat, prefix, suffix, startNumber].forEach(element => {
    element.addEventListener('input', updateFormatPreview);
    element.addEventListener('change', updateFormatPreview);
});

function updateFormatPreview() {
    const number = formatNumber(parseInt(startNumber.value));
    formatPreview.textContent = prefix.value + number + suffix.value;
}

function formatNumber(num) {
    switch (numberFormat.value) {
        case 'roman':
            return toRoman(num);
        case 'roman-lower':
            return toRoman(num).toLowerCase();
        case 'letter':
            return toLetters(num);
        case 'letter-lower':
            return toLetters(num).toLowerCase();
        default:
            return num.toString();
    }
}

function toRoman(num) {
    const romanNumerals = {
        M: 1000, CM: 900, D: 500, CD: 400,
        C: 100, XC: 90, L: 50, XL: 40,
        X: 10, IX: 9, V: 5, IV: 4, I: 1
    };
    let result = '';
    for (let key in romanNumerals) {
        while (num >= romanNumerals[key]) {
            result += key;
            num -= romanNumerals[key];
        }
    }
    return result;
}

function toLetters(num) {
    let result = '';
    while (num > 0) {
        num--;
        result = String.fromCharCode(65 + (num % 26)) + result;
        num = Math.floor(num / 26);
    }
    return result;
}

async function updatePreview() {
    if (!pdfDoc) return;

    try {
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = previewCanvas;
        const context = canvas.getContext('2d');

        // Scale canvas to fit width while maintaining aspect ratio
        const maxWidth = canvas.parentElement.clientWidth;
        const scale = maxWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({
            canvasContext: context,
            viewport: scaledViewport
        }).promise;

        // Add page number preview
        const number = formatNumber(parseInt(startNumber.value));
        const text = prefix.value + number + suffix.value;
        const size = parseInt(fontSize.value) * scale;
        const marginSize = parseInt(margin.value) * scale;

        context.font = `${size}px Arial`;
        context.fillStyle = '#000000';
        
        const metrics = context.measureText(text);
        const textWidth = metrics.width;
        const textHeight = size;

        let x, y;
        switch (selectedPosition) {
            case 'top-left':
                x = marginSize;
                y = marginSize + textHeight;
                break;
            case 'top-center':
                x = canvas.width / 2 - textWidth / 2;
                y = marginSize + textHeight;
                break;
            case 'top-right':
                x = canvas.width - textWidth - marginSize;
                y = marginSize + textHeight;
                break;
            case 'bottom-left':
                x = marginSize;
                y = canvas.height - marginSize;
                break;
            case 'bottom-center':
                x = canvas.width / 2 - textWidth / 2;
                y = canvas.height - marginSize;
                break;
            case 'bottom-right':
                x = canvas.width - textWidth - marginSize;
                y = canvas.height - marginSize;
                break;
        }

        context.fillText(text, x, y);
    } catch (error) {
        showMessage('Error updating preview: ' + error.message, 'error');
    }
}

// Apply page numbers
applyBtn.addEventListener('click', async () => {
    if (!pdfFile) {
        showMessage('Please select a PDF file first', 'error');
        return;
    }

    try {
        spinner.style.display = 'block';
        progressBar.style.width = '0%';

        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        
        const start = Math.max(1, parseInt(startPage.value));
        const end = Math.min(pages.length, parseInt(endPage.value));
        let currentNumber = parseInt(startNumber.value);

        for (let i = 0; i < pages.length; i++) {
            if (i + 1 < start || i + 1 > end) continue;
            if (skipFirst.checked && i === 0) continue;

            const page = pages[i];
            const { width, height } = page.getSize();
            const text = prefix.value + formatNumber(currentNumber) + suffix.value;
            const size = parseInt(fontSize.value);
            const marginSize = parseInt(margin.value);

            // Calculate text width (approximate since PDFLib doesn't provide text metrics)
            const textWidth = text.length * size * 0.6;

            let x, y;
            switch (selectedPosition) {
                case 'top-left':
                    x = marginSize;
                    y = height - marginSize - size;
                    break;
                case 'top-center':
                    x = width / 2 - textWidth / 2;
                    y = height - marginSize - size;
                    break;
                case 'top-right':
                    x = width - textWidth - marginSize;
                    y = height - marginSize - size;
                    break;
                case 'bottom-left':
                    x = marginSize;
                    y = marginSize + size;
                    break;
                case 'bottom-center':
                    x = width / 2 - textWidth / 2;
                    y = marginSize + size;
                    break;
                case 'bottom-right':
                    x = width - textWidth - marginSize;
                    y = marginSize + size;
                    break;
            }

            page.drawText(text, {
                x: x,
                y: y,
                size: size,
                color: PDFLib.rgb(0, 0, 0)
            });

            currentNumber++;
            progressBar.style.width = `${((i + 1) / pages.length) * 100}%`;
        }

        const modifiedPdfBytes = await pdfDoc.save();
        downloadPdf(modifiedPdfBytes);

        showMessage('Page numbers added successfully', 'success');
    } catch (error) {
        showMessage('Error adding page numbers: ' + error.message, 'error');
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
    link.download = 'numbered.pdf';
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

// Initialize format preview
updateFormatPreview(); 