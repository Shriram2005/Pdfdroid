// PDF Compression functionality
const compressPDF = async () => {
    if (files.length !== 1) {
        showMessage('Please select exactly 1 PDF file to compress');
        return;
    }

    const compressionLevel = document.getElementById('compression-level').value;
    
    try {
        showSpinner(true);
        const fileBuffer = await files[0].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileBuffer);
        const pages = pdf.getPages();

        // Apply compression settings based on selected level
        const compressionSettings = {
            low: { quality: 0.8, scale: 1 },
            medium: { quality: 0.6, scale: 0.9 },
            high: { quality: 0.4, scale: 0.8 }
        }[compressionLevel];

        // Process each page
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            // Note: This is a simplified compression. In a real-world scenario,
            // you would want to implement more sophisticated compression techniques
            page.scale(compressionSettings.scale, compressionSettings.scale);
            updateProgress((i + 1) / pages.length * 100);
        }

        const compressedPdfBytes = await pdf.save({
            useObjectStreams: true,
            addDefaultPage: false,
            objectsStack: []
        });

        downloadFile(compressedPdfBytes, 'compressed.pdf');
        showMessage('PDF compressed successfully!', 'success');
    } catch (error) {
        showMessage('Error compressing PDF: ' + error.message);
    } finally {
        showSpinner(false);
    }
};

// Initialize compress page specific elements
document.addEventListener('DOMContentLoaded', () => {
    const compressBtn = document.getElementById('compress-btn');
    if (compressBtn) {
        compressBtn.addEventListener('click', compressPDF);
    }
});
