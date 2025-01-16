// PDF Merge functionality
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

// Initialize merge page specific elements
document.addEventListener('DOMContentLoaded', () => {
    const mergeBtn = document.getElementById('merge-btn');
    if (mergeBtn) {
        mergeBtn.addEventListener('click', mergePDFs);
    }
});
