// PDF Split functionality
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

        // Get split options
        const splitType = document.getElementById('split-type').value;
        const customPages = document.getElementById('custom-pages').value;

        if (splitType === 'custom' && !customPages) {
            showMessage('Please specify page numbers for custom split');
            return;
        }

        let pagesToSplit = [];
        if (splitType === 'all') {
            pagesToSplit = Array.from({ length: pageCount }, (_, i) => [i]);
        } else if (splitType === 'custom') {
            const pageRanges = customPages.split(',').map(range => range.trim());
            for (let range of pageRanges) {
                if (range.includes('-')) {
                    const [start, end] = range.split('-').map(num => parseInt(num) - 1);
                    if (start >= 0 && end < pageCount && start <= end) {
                        pagesToSplit.push(Array.from({ length: end - start + 1 }, (_, i) => start + i));
                    }
                } else {
                    const pageNum = parseInt(range) - 1;
                    if (pageNum >= 0 && pageNum < pageCount) {
                        pagesToSplit.push([pageNum]);
                    }
                }
            }
        }

        for (let i = 0; i < pagesToSplit.length; i++) {
            const newPdf = await PDFLib.PDFDocument.create();
            const pages = await newPdf.copyPages(pdf, pagesToSplit[i]);
            pages.forEach(page => newPdf.addPage(page));
            const pdfBytes = await newPdf.save();
            downloadFile(pdfBytes, `split_${i + 1}.pdf`);
            updateProgress((i + 1) / pagesToSplit.length * 100);
        }
        
        showMessage('PDF split successfully!', 'success');
    } catch (error) {
        showMessage('Error splitting PDF: ' + error.message);
    } finally {
        showSpinner(false);
    }
};

// Handle split type change
const handleSplitTypeChange = () => {
    const splitType = document.getElementById('split-type').value;
    const customPagesContainer = document.getElementById('custom-pages-container');
    if (customPagesContainer) {
        customPagesContainer.style.display = splitType === 'custom' ? 'block' : 'none';
    }
};

// Initialize split page specific elements
document.addEventListener('DOMContentLoaded', () => {
    const splitBtn = document.getElementById('split-btn');
    const splitType = document.getElementById('split-type');
    
    if (splitBtn) {
        splitBtn.addEventListener('click', splitPDF);
    }
    
    if (splitType) {
        splitType.addEventListener('change', handleSplitTypeChange);
        handleSplitTypeChange();
    }
});
