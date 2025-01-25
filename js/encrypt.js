document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const optionsContainer = document.getElementById('optionsContainer');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const encryptButton = document.getElementById('encryptButton');

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
            optionsContainer.style.display = 'block';
            dropZone.querySelector('h3').textContent = file.name;
            dropZone.classList.add('file-selected');
        } else {
            alert('Please select a PDF file.');
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
        const file = fileInput.files[0];
        if (!file) {
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
            
            // Read the PDF file
            const arrayBuffer = await file.arrayBuffer();
            
            // Load the PDF document
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
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

            // Save the encrypted PDF
            const encryptedPdfBytes = await pdfDoc.save();
            
            // Create download link
            const blob = new Blob([encryptedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `encrypted_${file.name}`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Reset UI
            progressContainer.style.display = 'none';
            optionsContainer.style.display = 'block';
            resetForm();

        } catch (error) {
            console.error('Error encrypting PDF:', error);
            alert('Error encrypting PDF. Please try again.');
            progressContainer.style.display = 'none';
            optionsContainer.style.display = 'block';
        }
    });

    function resetForm() {
        fileInput.value = '';
        document.getElementById('ownerPassword').value = '';
        document.getElementById('userPassword').value = '';
        dropZone.querySelector('h3').textContent = 'Drop your PDF here or click to upload';
        dropZone.classList.remove('file-selected');
        optionsContainer.style.display = 'none';
    }

    // Add this to the existing CSS styles
    const style = document.createElement('style');
    style.textContent = `
        .file-selected {
            background-color: #e8f5e9 !important;
        }
        .drag-over {
            background-color: #e3f2fd !important;
            border-color: #2196f3 !important;
        }
        .password-section {
            margin-bottom: 20px;
        }
        .input-group {
            position: relative;
            margin-bottom: 15px;
        }
        .toggle-password {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            cursor: pointer;
            color: #666;
        }
        .password-input {
            padding-right: 35px;
        }
        .permissions-section {
            margin-bottom: 20px;
        }
        .checkbox-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .checkbox-group label {
            display: flex;
            align-items: center;
            gap: 8px;
        }
    `;
    document.head.appendChild(style);
});
