const API_KEY = 'YOUR_REMOVE_BG_API_KEY'; // Replace with your API key

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const loading = document.getElementById('loading');
const preview = document.getElementById('preview');
const error = document.getElementById('error');
const originalImg = document.getElementById('originalImg');
const resultImg = document.getElementById('resultImg');
const downloadBtn = document.getElementById('downloadBtn');
const newBtn = document.getElementById('newBtn');

let resultBlob = null;

// Click to upload
uploadArea.addEventListener('click', () => fileInput.click());

// Drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImage(file);
    }
});

// File input change
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processImage(file);
});

// Process image
async function processImage(file) {
    if (file.size > 10 * 1024 * 1024) {
        showError('File too large. Max 10MB.');
        return;
    }

    hideError();
    uploadArea.style.display = 'none';
    loading.classList.add('active');
    preview.classList.remove('active');

    // Show original
    originalImg.src = URL.createObjectURL(file);

    try {
        const formData = new FormData();
        formData.append('image_file', file);
        formData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': API_KEY
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.errors?.[0]?.title || 'API error');
        }

        resultBlob = await response.blob();
        resultImg.src = URL.createObjectURL(resultBlob);

        loading.classList.remove('active');
        preview.classList.add('active');
    } catch (err) {
        loading.classList.remove('active');
        uploadArea.style.display = 'block';
        showError(err.message || 'Failed to remove background');
    }
}

// Download
downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'background-removed.png';
    a.click();
    URL.revokeObjectURL(url);
});

// Upload another
newBtn.addEventListener('click', () => {
    preview.classList.remove('active');
    uploadArea.style.display = 'block';
    fileInput.value = '';
    resultBlob = null;
});

function showError(msg) {
    error.textContent = msg;
    error.classList.add('active');
}

function hideError() {
    error.classList.remove('active');
}
