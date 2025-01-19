// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfFile = null;
let pdfDoc = null;
let watermarkImage = null;

// DOM Elements
const fileInput = document.getElementById('file-input');
const watermarkText = document.getElementById('watermark-text');
const fontSize = document.getElementById('font-size');
const textColor = document.getElementById('text-color');
const opacity = document.getElementById('opacity');
const rotation = document.getElementById('rotation');
const position = document.getElementById('position');
const allPages = document.getElementById('all-pages');
const applyBtn = document.getElementById('apply-btn');
const previewCanvas = document.getElementById('preview-canvas');
const watermarkTypeInputs = document.getElementsByName('watermark-type');
const textOptions = document.getElementById('text-options');
const imageOptions = document.getElementById('image-options');
const watermarkImageInput = document.getElementById('watermark-image');
const imagePreview = document.getElementById('image-preview');
const imageScale = document.getElementById('image-scale');
const messages = document.querySelector('.messages');
const progressBar = document.querySelector('.progress');
const spinner = document.querySelector('.spinner');

// Update range value displays
document.querySelectorAll('.range-with-value input[type="range"]').forEach(input => {
    const valueDisplay = input.parentElement.querySelector('.range-value');
    input.addEventListener('input', () => {
        let suffix = 'px';
        if (input.id === 'opacity') suffix = '%';
        else if (input.id === 'rotation') suffix = '°';
        else if (input.id === 'image-scale') suffix = '%';
        valueDisplay.textContent = input.value + suffix;
        updatePreview();
    });
});

// Handle watermark type selection
watermarkTypeInputs.forEach(input => {
    input.addEventListener('change', () => {
        textOptions.style.display = input.value === 'text' ? 'block' : 'none';
        imageOptions.style.display = input.value === 'image' ? 'block' : 'none';
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
            updatePreview();
        } catch (error) {
            showMessage('Error loading PDF: ' + error.message, 'error');
        }
    }
});

// Handle watermark image selection
watermarkImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            watermarkImage = new Image();
            watermarkImage.onload = () => {
                imagePreview.src = event.target.result;
                imagePreview.style.display = 'block';
                updatePreview();
            };
            watermarkImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
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
[watermarkText, fontSize, textColor, opacity, rotation, position].forEach(element => {
    element.addEventListener('input', updatePreview);
    element.addEventListener('change', updatePreview);
});

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

        // Add watermark preview
        const watermarkType = document.querySelector('input[name="watermark-type"]:checked').value;
        if (watermarkType === 'text') {
            drawTextWatermark(context, canvas.width, canvas.height);
        } else if (watermarkType === 'image' && watermarkImage) {
            drawImageWatermark(context, canvas.width, canvas.height);
        }
    } catch (error) {
        showMessage('Error updating preview: ' + error.message, 'error');
    }
}

function drawTextWatermark(context, width, height) {
    const text = watermarkText.value;
    const size = parseInt(fontSize.value);
    const color = textColor.value;
    const alpha = parseInt(opacity.value) / 100;
    const angle = parseInt(rotation.value) * Math.PI / 180;

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    context.font = `${size}px Arial`;

    const metrics = context.measureText(text);
    const textWidth = metrics.width;
    const textHeight = size;

    const positions = getPositions(width, height, textWidth, textHeight);
    positions.forEach(pos => {
        context.save();
        context.translate(pos.x, pos.y);
        context.rotate(angle);
        context.fillText(text, -textWidth / 2, textHeight / 2);
        context.restore();
    });

    context.restore();
}

function drawImageWatermark(context, width, height) {
    const scale = parseInt(imageScale.value) / 100;
    const alpha = parseInt(opacity.value) / 100;
    const angle = parseInt(rotation.value) * Math.PI / 180;

    const imgWidth = watermarkImage.width * scale;
    const imgHeight = watermarkImage.height * scale;

    context.save();
    context.globalAlpha = alpha;

    const positions = getPositions(width, height, imgWidth, imgHeight);
    positions.forEach(pos => {
        context.save();
        context.translate(pos.x, pos.y);
        context.rotate(angle);
        context.drawImage(watermarkImage, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        context.restore();
    });

    context.restore();
}

function getPositions(width, height, elementWidth, elementHeight) {
    const positions = [];
    const pos = position.value;
    const padding = 20;

    if (pos === 'tile') {
        const cols = Math.ceil(width / (elementWidth * 2));
        const rows = Math.ceil(height / (elementHeight * 2));
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                positions.push({
                    x: j * elementWidth * 2 + elementWidth,
                    y: i * elementHeight * 2 + elementHeight
                });
            }
        }
    } else {
        const position = {
            'center': { x: width / 2, y: height / 2 },
            'top-left': { x: elementWidth / 2 + padding, y: elementHeight / 2 + padding },
            'top-right': { x: width - elementWidth / 2 - padding, y: elementHeight / 2 + padding },
            'bottom-left': { x: elementWidth / 2 + padding, y: height - elementHeight / 2 - padding },
            'bottom-right': { x: width - elementWidth / 2 - padding, y: height - elementHeight / 2 - padding }
        }[pos];
        positions.push(position);
    }

    return positions;
}

// Apply watermark
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
        const pages = allPages.checked ? pdfDoc.getPages() : [pdfDoc.getPage(0)];
        const watermarkType = document.querySelector('input[name="watermark-type"]:checked').value;

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();

            if (watermarkType === 'text') {
                await addTextWatermark(page, width, height);
            } else {
                await addImageWatermark(page, width, height, pdfDoc);
            }

            progressBar.style.width = `${((i + 1) / pages.length) * 100}%`;
        }

        const modifiedPdfBytes = await pdfDoc.save();
        downloadPdf(modifiedPdfBytes);

        showMessage('Watermark applied successfully', 'success');
    } catch (error) {
        showMessage('Error applying watermark: ' + error.message, 'error');
    } finally {
        spinner.style.display = 'none';
        progressBar.style.width = '0%';
    }
});

async function addTextWatermark(page, width, height) {
    const text = watermarkText.value;
    const size = parseInt(fontSize.value);
    const color = hexToRgb(textColor.value);
    const alpha = parseInt(opacity.value) / 100;
    const angle = parseInt(rotation.value);

    page.drawText(text, {
        x: width / 2,
        y: height / 2,
        size: size,
        color: PDFLib.rgb(color.r / 255, color.g / 255, color.b / 255),
        opacity: alpha,
        rotate: PDFLib.degrees(angle),
        xSkew: PDFLib.degrees(0),
        ySkew: PDFLib.degrees(0)
    });
}

async function addImageWatermark(page, width, height, pdfDoc) {
    if (!watermarkImage) return;

    const canvas = document.createElement('canvas');
    canvas.width = watermarkImage.width;
    canvas.height = watermarkImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(watermarkImage, 0, 0);

    const imageBytes = await new Promise(resolve => {
        canvas.toBlob(blob => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(new Uint8Array(reader.result));
            reader.readAsArrayBuffer(blob);
        }, 'image/png');
    });

    const image = await pdfDoc.embedPng(imageBytes);
    const scale = parseInt(imageScale.value) / 100;
    const alpha = parseInt(opacity.value) / 100;
    const angle = parseInt(rotation.value);

    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;

    page.drawImage(image, {
        x: width / 2 - scaledWidth / 2,
        y: height / 2 - scaledHeight / 2,
        width: scaledWidth,
        height: scaledHeight,
        opacity: alpha,
        rotate: PDFLib.degrees(angle)
    });
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function downloadPdf(pdfBytes) {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'watermarked.pdf';
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