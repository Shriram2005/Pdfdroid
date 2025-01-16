// Utility functions
const showMessage = (message, type = 'error') => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    document.querySelector('.messages').appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 5000);
};

const showSpinner = (show) => {
    const spinner = document.querySelector('.spinner');
    spinner.style.display = show ? 'block' : 'none';
};

const updateProgress = (progress) => {
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.querySelector('.progress');
    progressContainer.style.display = 'block';
    progressBar.style.width = `${progress}%`;
};

// File handling
let files = [];

const handleFileSelect = (event) => {
    event.preventDefault();
    const newFiles = event.target.files || event.dataTransfer.files;
    addFiles(newFiles);
};

const addFiles = (newFiles) => {
    for (const file of newFiles) {
        if (!file.type.includes('pdf') && !isAllowedFile(file)) {
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
        'image/jpg'
    ];
    return allowedTypes.includes(file.type);
};

const displayFile = (file) => {
    const fileList = document.querySelector('.file-list');
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <span>${file.name}</span>
        <span class="remove-file" onclick="removeFile('${file.name}')">&times;</span>
    `;
    fileList.appendChild(fileItem);
};

const removeFile = (fileName) => {
    files = files.filter(file => file.name !== fileName);
    document.querySelector('.file-list').innerHTML = '';
    files.forEach(file => displayFile(file));
};

// Drag and drop handling
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

// PDF Operations
const mergePDFs = async () => {
    if (files.length < 2) {
        showMessage('Please select at least 2 PDF files to merge');
        return;
    }

    try {
        showSpinner(true);
        const pdfDoc = await PDFLib.PDFDocument.create();
        
        for (let file of files) {
            const fileBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(fileBuffer);
            const pages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => pdfDoc.addPage(page));
            updateProgress((files.indexOf(file) + 1) / files.length * 100);
        }

        const mergedPdfBytes = await pdfDoc.save();
        downloadFile(mergedPdfBytes, 'merged.pdf');
        showMessage('PDFs merged successfully!', 'success');
    } catch (error) {
        showMessage('Error merging PDFs: ' + error.message);
    } finally {
        showSpinner(false);
    }
};

const splitPDF = async () => {
    if (files.length !== 1) {
        showMessage('Please select exactly 1 PDF file to split');
        return;
    }

    try {
        showSpinner(true);
        const fileBuffer = await files[0].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileBuffer);
        const pageCount = pdf.getPageCount();

        for (let i = 0; i < pageCount; i++) {
            const newPdf = await PDFLib.PDFDocument.create();
            const [page] = await newPdf.copyPages(pdf, [i]);
            newPdf.addPage(page);
            const pdfBytes = await newPdf.save();
            downloadFile(pdfBytes, `split_${i + 1}.pdf`);
            updateProgress((i + 1) / pageCount * 100);
        }
        showMessage('PDF split successfully!', 'success');
    } catch (error) {
        showMessage('Error splitting PDF: ' + error.message);
    } finally {
        showSpinner(false);
    }
};

const rotatePDF = async () => {
    if (files.length !== 1) {
        showMessage('Please select exactly 1 PDF file to rotate');
        return;
    }

    const degrees = parseInt(document.querySelector('#rotation-degrees').value);

    try {
        showSpinner(true);
        const fileBuffer = await files[0].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileBuffer);
        const pages = pdf.getPages();

        pages.forEach(page => {
            page.setRotation(PDFLib.degrees(degrees));
        });

        const pdfBytes = await pdf.save();
        downloadFile(pdfBytes, 'rotated.pdf');
        showMessage('PDF rotated successfully!', 'success');
    } catch (error) {
        showMessage('Error rotating PDF: ' + error.message);
    } finally {
        showSpinner(false);
    }
};

// File conversion functions
const convertPDFToImage = async () => {
    if (files.length !== 1 || !files[0].type.includes('pdf')) {
        showMessage('Please select exactly 1 PDF file to convert');
        return;
    }

    try {
        showSpinner(true);
        const fileBuffer = await files[0].arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: fileBuffer}).promise;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({scale: 1.5});
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const image = canvas.toDataURL('image/jpeg', 0.8);
            downloadFile(dataURLToBlob(image), `page_${i}.jpg`);
            updateProgress(i / pdf.numPages * 100);
        }
        showMessage('PDF converted to images successfully!', 'success');
    } catch (error) {
        showMessage('Error converting PDF to images: ' + error.message);
    } finally {
        showSpinner(false);
    }
};

const convertImageToPDF = async () => {
    if (files.length < 1 || !files[0].type.includes('image')) {
        showMessage('Please select at least 1 image file to convert');
        return;
    }

    try {
        showSpinner(true);
        const pdfDoc = await PDFLib.PDFDocument.create();

        for (let file of files) {
            const imageBytes = await file.arrayBuffer();
            let image;
            
            if (file.type.includes('jpeg') || file.type.includes('jpg')) {
                image = await pdfDoc.embedJpg(imageBytes);
            } else {
                showMessage(`Unsupported image format: ${file.type}`);
                continue;
            }

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
            updateProgress((files.indexOf(file) + 1) / files.length * 100);
        }

        const pdfBytes = await pdfDoc.save();
        downloadFile(pdfBytes, 'converted_images.pdf');
        showMessage('Images converted to PDF successfully!', 'success');
    } catch (error) {
        showMessage('Error converting images to PDF: ' + error.message);
    } finally {
        showSpinner(false);
    }
};

// Helper functions
const downloadFile = (data, fileName) => {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
};

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

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#file-input').addEventListener('change', handleFileSelect);
    document.querySelector('#merge-btn')?.addEventListener('click', mergePDFs);
    document.querySelector('#split-btn')?.addEventListener('click', splitPDF);
    document.querySelector('#rotate-btn')?.addEventListener('click', rotatePDF);
    document.querySelector('#pdf-to-image-btn')?.addEventListener('click', convertPDFToImage);
    document.querySelector('#image-to-pdf-btn')?.addEventListener('click', convertImageToPDF);
});
