// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Initialize jsPDF
window.jsPDF = window.jspdf.jsPDF;

let pdfDocument = null;
let originalFileSize = 0;
let lastCompressedSize = 0;

// Compression presets with very gentle settings
const compressionPresets = {
    low: {
        imageQuality: 0.99,    // Almost lossless
        imageScale: 1.0,       // No scaling
        dpi: 300,             // Original DPI
        description: 'Light compression: Nearly lossless quality with minimal size reduction',
        estimatedReduction: {
            min: 2,
            typical: 5,
            max: 8
        }
    },
    medium: {
        imageQuality: 0.97,    // Very high quality
        imageScale: 0.98,      // Minimal scaling
        dpi: 280,             // Near original DPI
        description: 'Balanced compression: Very high quality with gentle size reduction',
        estimatedReduction: {
            min: 8,
            typical: 12,
            max: 15
        }
    },
    high: {
        imageQuality: 0.95,    // High quality
        imageScale: 0.95,      // Light scaling
        dpi: 250,             // Good DPI
        description: 'Standard compression: High quality with moderate size reduction',
        estimatedReduction: {
            min: 15,
            typical: 18,
            max: 22
        }
    }
};

// Calculate estimated size based on file content type
function calculateEstimatedReduction(settings, fileSize) {
    // Base reduction from compression settings
    let baseReduction;
    
    if (settings.estimatedReduction) {
        // Use preset's estimated reduction
        baseReduction = settings.estimatedReduction.typical;
    } else {
        // Calculate for custom settings - allow stronger compression for custom
        const qualityFactor = (1 - settings.imageQuality) * 40;  // Stronger for custom
        const scaleFactor = (1 - settings.imageScale) * 35;      // Stronger for custom
        const dpiFactor = ((300 - settings.dpi) / 300) * 25;     // Stronger for custom
        baseReduction = qualityFactor + scaleFactor + dpiFactor;
    }
    
    // Adjust based on file size with gentler multipliers
    if (fileSize < 1024 * 1024) { // Less than 1MB
        baseReduction *= 0.9;
    } else if (fileSize > 10 * 1024 * 1024) { // More than 10MB
        baseReduction *= 1.1;
    }
    
    // For presets, cap at 25%. For custom, allow up to 75%
    const maxReduction = settings.estimatedReduction ? 25 : 75;
    return Math.min(Math.max(baseReduction, 2), maxReduction);
}

// Update compression stats preview
function updateCompressionStatsPreview(settings) {
    if (!originalFileSize) return;

    const compressionStats = document.querySelector('.compression-stats');
    compressionStats.style.display = 'block';
    
    // Calculate estimated reduction percentage
    const estimatedReduction = calculateEstimatedReduction(settings, originalFileSize);
    
    // Calculate size range
    let minReduction, maxReduction;
    if (settings.estimatedReduction) {
        minReduction = settings.estimatedReduction.min;
        maxReduction = settings.estimatedReduction.max;
    } else {
        minReduction = Math.max(estimatedReduction - 10, 5);
        maxReduction = Math.min(estimatedReduction + 10, 75);
    }
    
    const maxSize = originalFileSize * (1 - minReduction / 100);
    const minSize = originalFileSize * (1 - maxReduction / 100);
    const typicalSize = originalFileSize * (1 - estimatedReduction / 100);
    
    // Update stats display with ranges
    document.getElementById('original-size').textContent = formatFileSize(originalFileSize);
    document.getElementById('compressed-size').textContent = 
        `~${formatFileSize(typicalSize)} (${formatFileSize(minSize)} - ${formatFileSize(maxSize)})`;
    document.getElementById('size-reduction').textContent = 
        `~${estimatedReduction.toFixed(1)}% (${minReduction}% - ${maxReduction}%)`;
}

// Handle compression level change
document.getElementById('compression-level').addEventListener('change', (e) => {
    const customOptions = document.getElementById('custom-options');
    const compressionInfo = document.getElementById('compression-info');
    
    if (e.target.value === 'custom') {
        customOptions.style.display = 'block';
        compressionInfo.textContent = 'Custom compression settings';
        // Update preview with custom settings
        updateCompressionStatsPreview(getCompressionSettings());
    } else {
        customOptions.style.display = 'none';
        compressionInfo.textContent = compressionPresets[e.target.value].description;
        // Update preview with preset settings
        updateCompressionStatsPreview(compressionPresets[e.target.value]);
    }
});

// Handle custom option changes
['image-quality', 'image-scale', 'dpi'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        if (document.getElementById('compression-level').value === 'custom') {
            updateCompressionStatsPreview(getCompressionSettings());
        }
    });
});

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update file info
function updateFileInfo(file) {
    const fileInfo = document.querySelector('.file-info');
    originalFileSize = file.size;
    fileInfo.innerHTML = `
        <strong>File:</strong> ${file.name}<br>
        <strong>Size:</strong> <span class="file-size">${formatFileSize(file.size)}</span>
    `;
    
    // Update initial compression stats preview
    const level = document.getElementById('compression-level').value;
    if (level === 'custom') {
        updateCompressionStatsPreview(getCompressionSettings());
    } else {
        updateCompressionStatsPreview(compressionPresets[level]);
    }
}

// Load PDF file
async function loadPDF(file) {
    try {
        updateFileInfo(file);
        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        showMessage(`PDF loaded successfully. Pages: ${pdfDocument.numPages}`, 'success');
    } catch (error) {
        showMessage('Error loading PDF: ' + error.message, 'error');
    }
}

// Get compression settings
function getCompressionSettings() {
    const level = document.getElementById('compression-level').value;
    
    if (level === 'custom') {
        return {
            imageQuality: parseInt(document.getElementById('image-quality').value) / 100,
            imageScale: parseInt(document.getElementById('image-scale').value) / 100,
            dpi: parseInt(document.getElementById('dpi').value)
        };
    }
    
    return compressionPresets[level];
}

// Function to compress image data
async function compressImage(imageData, settings) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Scale the image with high-quality settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Scale the image
    const scaledWidth = imageData.width * settings.imageScale;
    const scaledHeight = imageData.height * settings.imageScale;
    
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
    
    // Draw with better quality
    ctx.drawImage(imageData, 0, 0, scaledWidth, scaledHeight);
    
    // Return compressed data URL with better encoding
    return canvas.toDataURL('image/jpeg', settings.imageQuality);
}

// Convert points to millimeters
function ptToMm(pt) {
    return pt * 0.3528;
}

// Compress PDF
async function compressPDF() {
    if (!pdfDocument) {
        showMessage('Please select a PDF file first', 'error');
        return;
    }

    showProgress(true);
    try {
        const settings = getCompressionSettings();
        const numPages = pdfDocument.numPages;
        
        // Get first page to determine PDF dimensions
        const firstPage = await pdfDocument.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        
        // Create new PDF with correct dimensions
        const pdf = new jsPDF({
            orientation: viewport.width > viewport.height ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [ptToMm(viewport.width), ptToMm(viewport.height)]
        });

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            // Get the page
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: settings.imageScale });
            
            // Prepare canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Set canvas dimensions to match viewport
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            // Render page to canvas
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Compress the page image
            const compressedImage = await compressImage(canvas, settings);
            
            // Add new page if not first page
            if (pageNum > 1) {
                pdf.addPage([ptToMm(viewport.width), ptToMm(viewport.height)]);
            }
            
            // Calculate dimensions in mm
            const pageWidth = ptToMm(viewport.width);
            const pageHeight = ptToMm(viewport.height);
            
            // Add compressed image to PDF with correct dimensions
            pdf.addImage(
                compressedImage,
                'JPEG',
                0,
                0,
                pageWidth,
                pageHeight,
                `page-${pageNum}`,
                'FAST'
            );
            
            // Update progress
            updateProgress((pageNum / numPages) * 100);
        }
        
        // Save with compression
        const compressedBytes = pdf.output('arraybuffer');
        
        // Create and download the compressed file
        const blob = new Blob([compressedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Update compression stats with actual values
        const compressionStats = document.querySelector('.compression-stats');
        compressionStats.style.display = 'block';
        lastCompressedSize = blob.size;
        
        // Calculate actual reduction
        const actualReduction = ((originalFileSize - blob.size) / originalFileSize * 100).toFixed(1);
        
        // Update display
        document.getElementById('original-size').textContent = formatFileSize(originalFileSize);
        document.getElementById('compressed-size').textContent = formatFileSize(blob.size);
        document.getElementById('size-reduction').textContent = `${actualReduction}%`;
        
        // Download the file
        const a = document.createElement('a');
        a.href = url;
        a.download = `compressed_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        
        showMessage('PDF compressed successfully!', 'success');
    } catch (error) {
        showMessage('Error compressing PDF: ' + error.message, 'error');
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

document.getElementById('compress-btn').addEventListener('click', compressPDF);

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
