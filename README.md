# Background Remover

Free online tool to remove image backgrounds using AI.

## Setup

1. Get your Remove.bg API key from https://www.remove.bg/api
2. Replace `YOUR_REMOVE_BG_API_KEY` in `app.js` with your actual key

## Deploy to Cloudflare Pages

1. Push this folder to GitHub
2. Go to Cloudflare Pages dashboard
3. Connect your GitHub repo
4. Deploy (no build command needed - it's static HTML)

## Local Testing

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Features

- Drag & drop or click to upload
- Instant background removal
- Side-by-side comparison
- Download result as PNG
- No storage - all in memory
- Mobile responsive

## API Limits

Remove.bg free tier: 50 images/month
