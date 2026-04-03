const API_KEY = '9e37wbtVkZrt1DqiJxTU4333';
const TIMEOUT_MS = 30000;

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

// ── Quota helpers (inline, no window.* dependency) ──────────────────────────

const DAILY_FREE_QUOTA = 2;

function _getQuotaKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `bgRemoverQuota_${y}-${m}-${d}`;
}

function _getTodayQuota() {
    const stored = localStorage.getItem(_getQuotaKey());
    return stored !== null ? parseInt(stored, 10) : DAILY_FREE_QUOTA;
}

function _consumeQuota() {
    const current = _getTodayQuota();
    if (current <= 0) return false;
    localStorage.setItem(_getQuotaKey(), (current - 1).toString());
    // Sync the shared updateQuotaDisplay if available
    if (typeof updateQuotaDisplay === 'function') updateQuotaDisplay();
    return true;
}

function _redirectPricing() {
    window.location.href = 'pricing.html';
}

// ── Upload triggers ──────────────────────────────────────────────────────────

uploadArea.addEventListener('click', () => {
    if (_getTodayQuota() <= 0) {
        _redirectPricing();
        return;
    }
    fileInput.click();
});

uploadArea.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (_getTodayQuota() <= 0) {
        _redirectPricing();
        return;
    }
    fileInput.click();
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

    if (_getTodayQuota() <= 0) {
        _redirectPricing();
        return;
    }

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
    if (file.size > 10 * 1024 * 1024) {
        showError(window.getT ? window.getT('errSize') : 'File too large. Please upload an image under 10 MB.');
        return;
    }

    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
        showError(window.getT ? window.getT('errType') : 'Unsupported file type. Please use PNG, JPG, or WEBP.');
        return;
    }

    hideError();
    uploadArea.style.display = 'none';
    loading.classList.add('active');
    preview.classList.remove('active');
    resultBlob = null;

    originalImg.src = URL.createObjectURL(file);

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
                if (response.status === 402) msg = window.getT ? window.getT('errQuota') : 'Free quota exceeded. Please try again tomorrow.';
                if (response.status === 400) msg = window.getT ? window.getT('errInvalid') : 'Invalid image. Please try a different file.';
                if (response.status === 429) msg = window.getT ? window.getT('errRate') : 'Too many requests. Please wait a moment and try again.';
            } catch (_) {}
            throw new Error(msg);
        }

        resultBlob = await response.blob();
        resultImg.src = URL.createObjectURL(resultBlob);
        loading.classList.remove('active');
        preview.classList.add('active');
        // Deduct quota only after successful processing
        _consumeQuota();

    } catch (err) {
        clearTimeout(timeoutId);
        loading.classList.remove('active');
        uploadArea.style.display = 'block';

        if (err.name === 'AbortError') {
            showError(window.getT ? window.getT('errTimeout') : 'Request timed out (30s). Please check your connection and try again.');
        } else {
            showError(err.message || (window.getT ? window.getT('errGeneric') : 'Something went wrong. Please try again.'));
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

// ── Reset ─────────────────────────────────────────────────────────────────────

newBtn.addEventListener('click', () => {
    preview.classList.remove('active');
    uploadArea.style.display = 'block';
    fileInput.value = '';
    fileInput.type = '';
    fileInput.type = 'file';
    resultBlob = null;
    originalImg.src = '';
    resultImg.src   = '';
    hideError();
});

// ── Error helpers ─────────────────────────────────────────────────────────────

function showError(msg) {
    errorText.textContent = msg;
    errorEl.classList.add('active');
    clearTimeout(errorTimer);
    errorTimer = setTimeout(hideError, 5000);
}

function hideError() {
    errorEl.classList.remove('active');
    clearTimeout(errorTimer);
}

// Expose for inline script sync
window._appGetTodayQuota = _getTodayQuota;
