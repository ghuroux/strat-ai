# LibreChat Enhanced Export Setup

This guide will help you add **direct PDF and DOCX export buttons** to LibreChat.

## ✅ What You Get

- 📕 **Download as PDF** button directly in LibreChat
- 📘 **Download as DOCX** button directly in LibreChat
- Automatic file downloads (no copy/paste needed!)

## 🚀 Quick Setup (2 methods)

### Method 1: Browser Extension (Recommended)

1. **Install Tampermonkey Extension:**
   - Chrome/Edge: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/
   - Safari: https://apps.apple.com/app/tampermonkey/id1482490089

2. **Install the Script:**
   - Click Tampermonkey icon → "Create a new script"
   - Delete everything
   - Copy and paste the entire content of `librechat-export-enhancer.js`
   - Press Cmd+S (Mac) or Ctrl+S (Windows) to save

3. **Reload LibreChat:**
   - Go to http://localhost:3001
   - You should see export buttons appear!

### Method 2: Browser Console (Temporary)

1. **Open LibreChat:** http://localhost:3001

2. **Open Browser Console:**
   - Chrome/Edge/Firefox: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Click the "Console" tab

3. **Paste the Script:**
   ```javascript
   // Copy and paste the entire content of librechat-export-enhancer.js here
   ```

4. **Press Enter**
   - Export buttons will appear!
   - Note: You'll need to repeat this every time you reload the page

## 📖 How to Use

Once installed, you'll see two new buttons in LibreChat:

1. **📕 Download as PDF** - Click to download the current conversation as a PDF file
2. **📘 Download as DOCX** - Click to download the current conversation as a DOCX file

The files will be automatically downloaded with timestamps like:
- `conversation-2025-12-04-16-25-30.pdf`
- `conversation-2025-12-04-16-25-30.docx`

## 🔧 System Requirements

The export API service must be running:
```bash
# Check if it's running
docker compose ps export-api

# Start if needed
docker compose up -d export-api
```

## ⚙️ Services Overview

Your system now has:
- **LibreChat** (http://localhost:3001) - Main chat interface
- **LiteLLM** (http://localhost:4000) - LLM proxy
- **Gotenberg** (http://localhost:3002) - PDF conversion engine
- **Export API** (http://localhost:8081) - Conversion API endpoint

## 🐛 Troubleshooting

**Export buttons don't appear:**
- Check browser console for errors (F12)
- Make sure you're on http://localhost:3001
- Try Method 2 (Browser Console) first to test

**Downloads fail:**
- Verify export API is running: `docker compose ps export-api`
- Check API health: `curl http://localhost:8081/health`
- Restart the service: `docker compose restart export-api`

**Empty or broken files:**
- Check export-api logs: `docker compose logs export-api`
- Verify Gotenberg is running: `docker compose ps gotenberg`

## 💡 Alternative Methods

If the browser integration doesn't work, you can still use:

1. **Download Server:** http://localhost:8080 (if running)
2. **Command Line:**
   ```bash
   ./paste-and-convert.sh pdf
   # Then paste markdown and press Ctrl+D
   ```

## 🛑 Stop Services

```bash
# Stop export API
docker compose stop export-api

# Stop all services
docker compose down
```

---

**Need Help?** Check the logs:
```bash
docker compose logs export-api
docker compose logs gotenberg
```
