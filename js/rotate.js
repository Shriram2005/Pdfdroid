// PDF Rotation functionality
const rotatePDF = async () => {
    if (files.length !== 1) {
        showMessage('Please select exactly 1 PDF file to rotate');
        return;
    }

    const degrees = parseInt(document.querySelector('#rotation-degrees').value);
    const pageRange = document.querySelector('#page-range').value.trim();

    try {
        showSpinner(true);
        const fileBuffer = await files[0].arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(fileBuffer);
        const pages = pdf.getPages();
        
        // Determine which pages to rotate
        let pagesToRotate = [];
        if (pageRange === '') {
            // Rotate all pages if no range specified
            pagesToRotate = Array.from({ length: pages.length }, (_, i) => i);
        } else {
            // Parse page range (e.g., "1,3-5,7")
            const ranges = pageRange.split(',');
            for (let range of ranges) {
                if (range.includes('-')) {
                    const [start, end] = range.split('-').map(n => parseInt(n) - 1);
                    for (let i = start; i <= end; i++) {
                        if (i >= 0 && i < pages.length) pagesToRotate.push(i);
                    }
                } else {
                    const pageNum = parseInt(range) - 1;
                    if (pageNum >= 0 && pageNum < pages.length) pagesToRotate.push(pageNum);
                }
            }
        }

        // Rotate specified pages
        pagesToRotate.forEach(pageNum => {
            const page = pages[pageNum];
            const currentRotation = page.getRotation().angle;
            page.setRotation(PDFLib.degrees((currentRotation + degrees) % 360));
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

// Initialize rotate page specific elements
document.addEventListener('DOMContentLoaded', () => {
    const rotateBtn = document.getElementById('rotate-btn');
    if (rotateBtn) {
        rotateBtn.addEventListener('click', rotatePDF);
    }
});
