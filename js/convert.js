// File conversion functionality
const convertFiles = async () => {
    if (files.length === 0) {
        showMessage('Please select files to convert');
        return;
    }

    const conversionType = document.getElementById('conversion-type').value;
    
    try {
        showSpinner(true);
        switch (conversionType) {
            case 'pdf-to-image':
                await convertPDFToImage();
                break;
            case 'image-to-pdf':
                await convertImageToPDF();
                break;
            case 'pdf-to-word':
                await convertPDFToWord();
                break;
            case 'word-to-pdf':
                await convertWordToPDF();
                break;
            case 'pdf-to-excel':
                await convertPDFToExcel();
                break;
            case 'excel-to-pdf':
                await convertExcelToPDF();
                break;
            case 'pdf-to-ppt':
                await convertPDFToPPT();
                break;
            case 'ppt-to-pdf':
                await convertPPTToPDF();
                break;
        }
    } catch (error) {
        showMessage('Error converting files: ' + error.message);
    } finally {
        showSpinner(false);
    }
};

const convertPDFToImage = async () => {
    if (!files[0].type.includes('pdf')) {
        showMessage('Please select a PDF file');
        return;
    }

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
};

const convertImageToPDF = async () => {
    if (!files.some(file => file.type.includes('image'))) {
        showMessage('Please select image files');
        return;
    }

    const pdfDoc = await PDFLib.PDFDocument.create();

    for (let file of files) {
        const imageBytes = await file.arrayBuffer();
        let image;
        
        if (file.type.includes('jpeg') || file.type.includes('jpg')) {
            image = await pdfDoc.embedJpg(imageBytes);
        } else if (file.type.includes('png')) {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
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
};

const convertPDFToWord = async () => {
    showMessage('PDF to Word conversion is not yet implemented in the client-side version', 'error');
};

const convertWordToPDF = async () => {
    showMessage('Word to PDF conversion is not yet implemented in the client-side version', 'error');
};

const convertPDFToExcel = async () => {
    showMessage('PDF to Excel conversion is not yet implemented in the client-side version', 'error');
};

const convertExcelToPDF = async () => {
    showMessage('Excel to PDF conversion is not yet implemented in the client-side version', 'error');
};

const convertPDFToPPT = async () => {
    showMessage('PDF to PowerPoint conversion is not yet implemented in the client-side version', 'error');
};

const convertPPTToPDF = async () => {
    showMessage('PowerPoint to PDF conversion is not yet implemented in the client-side version', 'error');
};

// Update accepted file types based on conversion type
const updateAcceptedFileTypes = () => {
    const fileInput = document.getElementById('file-input');
    const conversionType = document.getElementById('conversion-type').value;
    
    switch(conversionType) {
        case 'pdf-to-image':
            fileInput.accept = '.pdf';
            break;
        case 'image-to-pdf':
            fileInput.accept = '.jpg,.jpeg,.png';
            break;
        case 'pdf-to-word':
        case 'pdf-to-excel':
        case 'pdf-to-ppt':
            fileInput.accept = '.pdf';
            break;
        case 'word-to-pdf':
            fileInput.accept = '.docx,.doc';
            break;
        case 'excel-to-pdf':
            fileInput.accept = '.xlsx,.xls';
            break;
        case 'ppt-to-pdf':
            fileInput.accept = '.pptx,.ppt';
            break;
    }
};

// Initialize convert page specific elements
document.addEventListener('DOMContentLoaded', () => {
    const convertBtn = document.getElementById('convert-btn');
    const conversionType = document.getElementById('conversion-type');
    
    if (convertBtn) {
        convertBtn.addEventListener('click', convertFiles);
    }
    
    if (conversionType) {
        conversionType.addEventListener('change', updateAcceptedFileTypes);
        updateAcceptedFileTypes();
    }
});
