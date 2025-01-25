document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.querySelector('.drop-zone');
    const fileInput = document.getElementById('fileInput');
    const optionsContainer = document.querySelector('.encryption-options');
    const progressContainer = document.querySelector('.progress-container');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const encryptButton = document.getElementById('encryptButton');
    let selectedFile = null;

    // Setup drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('drag-over');
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-over');
    }

    // Handle file selection
    dropZone.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        handleFile(file);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        handleFile(file);
    }

    function handleFile(file) {
        if (file && file.type === 'application/pdf') {
            selectedFile = file;
            dropZone.querySelector('.drop-text').textContent = file.name;
            dropZone.classList.add('file-selected');
            optionsContainer.style.display = 'block';
            progressContainer.style.display = 'none';
        } else {
            alert('Please select a valid PDF file.');
            resetForm();
        }
    }

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('.password-input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Handle encryption
    encryptButton.addEventListener('click', async function() {
        if (!selectedFile) {
            alert('Please select a PDF file first.');
            return;
        }

        const ownerPassword = document.getElementById('ownerPassword').value;
        const userPassword = document.getElementById('userPassword').value;

        if (!ownerPassword || !userPassword) {
            alert('Please enter both owner and user passwords.');
            return;
        }

        if (ownerPassword === userPassword) {
            alert('Owner and user passwords should be different for better security.');
            return;
        }

        const permissions = {
            printing: document.getElementById('allowPrinting').checked,
            modifying: document.getElementById('allowModifying').checked,
            copying: document.getElementById('allowCopying').checked,
            annotating: document.getElementById('allowAnnotating').checked
        };

        try {
            optionsContainer.style.display = 'none';
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressText.textContent = 'Reading PDF file...';
            
            // Read the PDF file
            const arrayBuffer = await readFileAsArrayBuffer(selectedFile);
            progressBar.style.width = '30%';
            progressText.textContent = 'Processing PDF...';
            
            // Load the PDF document
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            progressBar.style.width = '60%';
            progressText.textContent = 'Encrypting PDF...';
            
            // Encrypt the PDF
            await pdfDoc.encrypt({
                ownerPassword: ownerPassword,
                userPassword: userPassword,
                permissions: {
                    printing: permissions.printing ? 'highResolution' : 'none',
                    modifying: permissions.modifying,
                    copying: permissions.copying,
                    annotating: permissions.annotating,
                    fillingForms: permissions.modifying,
                    contentAccessibility: true,
                    documentAssembly: permissions.modifying
                }
            });

            progressBar.style.width = '80%';
            progressText.textContent = 'Finalizing...';

            // Save the encrypted PDF
            const encryptedPdfBytes = await pdfDoc.save();
            
            // Create download link
            const blob = new Blob([encryptedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `encrypted_${selectedFile.name}`;
            
            progressBar.style.width = '100%';
            progressText.textContent = 'Download starting...';
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Reset UI after short delay
            setTimeout(() => {
                resetForm();
                alert('PDF encrypted successfully!');
            }, 1000);

        } catch (error) {
            console.error('Error encrypting PDF:', error);
            alert('Error encrypting PDF. Please try again.');
            resetForm();
        }
    });

    function readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(file);
        });
    }

    function resetForm() {
        selectedFile = null;
        fileInput.value = '';
        document.getElementById('ownerPassword').value = '';
        document.getElementById('userPassword').value = '';
        dropZone.querySelector('.drop-text').textContent = 'Drop your PDF here or click to upload';
        dropZone.classList.remove('file-selected');
        optionsContainer.style.display = 'none';
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
        progressText.textContent = 'Processing... 0%';
    }
});
