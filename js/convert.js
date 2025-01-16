// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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

let currentFile = null;

// Conversion settings for different file types
const conversionSettings = {
    'pdf-to-image': {
        accept: '.pdf',
        outputFormat: 'png',
        description: 'Convert PDF pages to high-quality images'
    },
    'image-to-pdf': {
        accept: '.jpg,.jpeg,.png',
        outputFormat: 'pdf',
        description: 'Convert images to PDF document'
    },
    'pdf-to-word': {
        accept: '.pdf',
        outputFormat: 'docx',
        description: 'Convert PDF to editable Word document'
    },
    'word-to-pdf': {
        accept: '.docx,.doc',
        outputFormat: 'pdf',
        description: 'Convert Word documents to PDF'
    },
    'pdf-to-excel': {
        accept: '.pdf',
        outputFormat: 'xlsx',
        description: 'Convert PDF tables to Excel spreadsheet'
    },
    'excel-to-pdf': {
        accept: '.xlsx,.xls',
        outputFormat: 'pdf',
        description: 'Convert Excel spreadsheets to PDF'
    },
    'pdf-to-ppt': {
        accept: '.pdf',
        outputFormat: 'pptx',
        description: 'Convert PDF to PowerPoint presentation'
    },
    'ppt-to-pdf': {
        accept: '.pptx,.ppt',
        outputFormat: 'pdf',
        description: 'Convert PowerPoint presentations to PDF'
    }
};

// Update accepted file types based on conversion type
document.getElementById('conversion-type').addEventListener('change', function() {
    const fileInput = document.getElementById('file-input');
    const conversionType = this.value;
    fileInput.accept = conversionSettings[conversionType].accept;
    
    // Clear current file if it doesn't match new type
    if (currentFile && !isValidFileType(currentFile, conversionType)) {
        currentFile = null;
        document.querySelector('.file-list').innerHTML = '';
    }
});

// Check if file type is valid for conversion
function isValidFileType(file, conversionType) {
    const acceptedTypes = conversionSettings[conversionType].accept.split(',');
    return acceptedTypes.some(type => {
        const extension = type.replace('.', '').toLowerCase();
        return file.name.toLowerCase().endsWith(extension);
    });
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle file selection
async function handleFileSelect(event) {
    const file = event.target.files[0] || event.dataTransfer.files[0];
    const conversionType = document.getElementById('conversion-type').value;
    
    if (!file) return;
    
    if (!isValidFileType(file, conversionType)) {
        showMessage(`Invalid file type. Please select ${conversionSettings[conversionType].accept} file.`, 'error');
        return;
    }
    
    currentFile = file;
    updateFileList(file);
}

// Update file list display
function updateFileList(file) {
    const fileList = document.querySelector('.file-list');
    fileList.innerHTML = `
        <div class="file-item">
            <span>${file.name} (${formatFileSize(file.size)})</span>
            <span class="remove-file" onclick="removeFile()">&times;</span>
        </div>
    `;
}

// Remove file
function removeFile() {
    currentFile = null;
    document.querySelector('.file-list').innerHTML = '';
    document.getElementById('file-input').value = '';
}

// Convert PDF to Image
async function convertPDFToImage(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        const image = canvas.toDataURL('image/png');
        images.push(image);
        
        updateProgress((pageNum / pdf.numPages) * 100);
    }
    
    return images;
}

// Convert Image to PDF
async function convertImageToPDF(file) {
    const pdfDoc = await PDFLib.PDFDocument.create();
    const imageBytes = await file.arrayBuffer();
    
    let image;
    if (file.type === 'image/jpeg') {
        image = await pdfDoc.embedJpg(imageBytes);
    } else if (file.type === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
    }
    
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
    });
    
    return await pdfDoc.save();
}

// Convert PDF to Word (using PDF.js for text extraction)
async function convertPDFToWord(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        text += pageText + '\n\n';
        
        updateProgress((pageNum / pdf.numPages) * 100);
    }
    
    // Create Word document using docx
    const doc = new docx.Document({
        sections: [{
            properties: {},
            children: [
                new docx.Paragraph({
                    children: [new docx.TextRun(text)]
                })
            ]
        }]
    });
    
    return await docx.Packer.toBlob(doc);
}

// Convert Word to PDF
async function convertWordToPDF(file) {
    // This is a placeholder - actual Word to PDF conversion requires server-side processing
    showMessage('Word to PDF conversion requires server-side processing. This is a client-side only demo.', 'error');
    throw new Error('Server-side processing required');
}

// Convert PDF to Excel
async function convertPDFToExcel(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const workbook = XLSX.utils.book_new();
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        
        // Simple table detection and conversion
        const rows = [];
        let currentRow = [];
        let lastY = null;
        
        content.items.forEach(item => {
            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                if (currentRow.length > 0) {
                    rows.push(currentRow);
                    currentRow = [];
                }
            }
            currentRow.push(item.str);
            lastY = item.transform[5];
        });
        
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }
        
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${pageNum}`);
        
        updateProgress((pageNum / pdf.numPages) * 100);
    }
    
    return XLSX.write(workbook, { type: 'array' });
}

// Convert Excel to PDF
async function convertExcelToPDF(file) {
    // This is a placeholder - actual Excel to PDF conversion requires server-side processing
    showMessage('Excel to PDF conversion requires server-side processing. This is a client-side only demo.', 'error');
    throw new Error('Server-side processing required');
}

// Main conversion function
async function convertFile() {
    if (!currentFile) {
        showMessage('Please select a file first', 'error');
        return;
    }
    
    const conversionType = document.getElementById('conversion-type').value;
    showProgress(true);
    
    try {
        let result;
        switch (conversionType) {
            case 'pdf-to-image':
                result = await convertPDFToImage(currentFile);
                // Download each image
                result.forEach((image, index) => {
                    const link = document.createElement('a');
                    link.href = image;
                    link.download = `page_${index + 1}.png`;
                    link.click();
                });
                break;
                
            case 'image-to-pdf':
                result = await convertImageToPDF(currentFile);
                downloadFile(result, 'converted.pdf', 'application/pdf');
                break;
                
            case 'pdf-to-word':
                result = await convertPDFToWord(currentFile);
                downloadFile(result, 'converted.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                break;
                
            case 'word-to-pdf':
                result = await convertWordToPDF(currentFile);
                downloadFile(result, 'converted.pdf', 'application/pdf');
                break;
                
            case 'pdf-to-excel':
                result = await convertPDFToExcel(currentFile);
                downloadFile(result, 'converted.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                break;
                
            case 'excel-to-pdf':
                result = await convertExcelToPDF(currentFile);
                downloadFile(result, 'converted.pdf', 'application/pdf');
                break;
                
            case 'pdf-to-ppt':
            case 'ppt-to-pdf':
                showMessage('PowerPoint conversions require server-side processing. This is a client-side only demo.', 'error');
                return;
        }
        
        showMessage('Conversion completed successfully!', 'success');
    } catch (error) {
        showMessage('Error during conversion: ' + error.message, 'error');
    } finally {
        showProgress(false);
    }
}

// Download helper function
function downloadFile(data, fileName, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Event Listeners
document.getElementById('file-input').addEventListener('change', handleFileSelect);
document.getElementById('convert-btn').addEventListener('click', convertFile);

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
    handleFileSelect(e);
});
