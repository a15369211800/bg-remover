const API_KEY = 'YOUR_REMOVE_BG_API_KEY'; // Replace with your actual Remove.bg API key
const TIMEOUT_MS = 30000; // 30 seconds

const uploadArea   = document.getElementById('uploadArea');
const fileInput    = document.getElementById('fileInput');
const loading      = document.getElementById('loading');
const preview      = document.getElementById('preview');
const errorEl      = document.getElementById('error');
const errorText    = document.getElementById('errorText');
const originalImg  = document.getElementById('originalImg');
const resultImg    = document.getElementById('resultImg');
const downloadBtn  = document.getElementById('downloadBtn');
const newBtn       = document.getElementById('newBtn');

let resultBlob = null;
let errorTimer = null;

// ── Upload triggers ──────────────────────────────────────────────────────────

uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

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
    } else {
        showError('Please drop a valid image file (PNG, JPG, WEBP).');
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processImage(file);
});

// ── Core processing ──────────────────────────────────────────────────────────

async function processImage(file) {
    // Validate size
    if (file.size > 10 * 1024 * 1024) {
        showError('File too large. Please upload an image under 10 MB.');
        return;
    }

    // Validate type
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
        showError('Unsupported file type. Please use PNG, JPG, or WEBP.');
        return;
    }

    hideError();
    uploadArea.style.display = 'none';
    loading.classList.add('active');
    preview.classList.remove('active');
    resultBlob = null;

    // Show original preview immediately
    originalImg.src = URL.createObjectURL(file);

    // Abort controller for timeout
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const formData = new FormData();
        formData.append('image_file', file);
        formData.append('size', 'auto');

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: { 'X-Api-Key': API_KEY },
            body: formData,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let msg = 'Failed to remove background.';
            try {
                const errData = await response.json();
                msg = errData.errors?.[0]?.title || msg;
                // Friendly messages for common codes
                if (response.status === 402) msg = 'Free quota exceeded. Please try again tomorrow.';
                if (response.status === 400) msg = 'Invalid image. Please try a different file.';
                if (response.status === 429) msg = 'Too many requests. Please wait a moment and try again.';
            } catch (_) { /* keep generic msg */ }
            throw new Error(msg);
        }

        resultBlob = await response.blob();
        resultImg.src = URL.createObjectURL(resultBlob);

        loading.classList.remove('active');
        preview.classList.add('active');

    } catch (err) {
        clearTimeout(timeoutId);
        loading.classList.remove('active');
        uploadArea.style.display = 'block';

        if (err.name === 'AbortError') {
            showError('Request timed out (30s). Please check your connection and try again.');
        } else {
            showError(err.message || 'Something went wrong. Please try again.');
        }
    }
}

// ── Download ─────────────────────────────────────────────────────────────────

downloadBtn.addEventListener('click', () => {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = 'background-removed.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// ── Reset ────────────────────────────────────────────────────────────────────

newBtn.addEventListener('click', () => {
    preview.classList.remove('active');
    uploadArea.style.display = 'block';
    fileInput.value = '';
    resultBlob = null;
    originalImg.src = '';
    resultImg.src   = '';
    hideError();
});

// ── Error helpers ─────────────────────────────────────────────────────────────

function showError(msg) {
    errorText.textContent = msg;
    errorEl.classList.add('active');

    // Auto-dismiss after 5 seconds
    clearTimeout(errorTimer);
    errorTimer = setTimeout(hideError, 5000);
}

function hideError() {
    errorEl.classList.remove('active');
    clearTimeout(errorTimer);
}
