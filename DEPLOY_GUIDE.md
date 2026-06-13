# 🔐 Secure Diary — Deployment & Setup Guide

## What changed from the original

| Before | After |
|--------|-------|
| Hardcoded Azure App ID (only your account worked) | Each user enters their own App ID — stored in their browser's localStorage |
| No offline support | Service Worker added — works offline after first load |
| Required `http://localhost` | Works on any HTTPS host or locally via a simple server |
| No PWA manifest | Can be installed as a home-screen app on Android/iOS |

---

## Files you received

```
index.html     ← main app (updated)
sw.js          ← service worker (offline support)
manifest.json  ← PWA manifest (installable app)
```

**All three files must be in the same folder when deployed.**

---

## Option A — Deploy FREE on GitHub Pages (recommended, zero cost forever)

### Step 1 — Create a GitHub account
Go to https://github.com and sign up (free).

### Step 2 — Create a new repository
1. Click **+** → **New repository**
2. Name it anything, e.g. `secure-diary`
3. Set visibility to **Public** (required for free GitHub Pages)
4. Click **Create repository**

### Step 3 — Upload your files
1. In your new repo, click **Add file → Upload files**
2. Upload all three files: `index.html`, `sw.js`, `manifest.json`
3. Click **Commit changes**

### Step 4 — Enable GitHub Pages
1. Go to **Settings** → **Pages** (left sidebar)
2. Under **Source**, select **Deploy from a branch**
3. Branch: `main`, Folder: `/ (root)`
4. Click **Save**
5. Wait ~1 minute — your URL will appear:
   `https://YOUR_USERNAME.github.io/secure-diary/`

> ✅ That's your public URL. Share it with anyone you want to use the diary.

---

## Option B — Deploy FREE on Cloudflare Pages (faster, custom domain easy)

1. Go to https://pages.cloudflare.com and sign up (free)
2. Click **Create a project → Upload assets**
3. Upload all three files
4. Your site gets a URL like `https://secure-diary-abc.pages.dev`
5. You can add a custom domain for free

---

## Option C — Run locally (no internet needed)

You need Node.js or Python installed.

**With Python (usually pre-installed on Mac/Linux):**
```bash
cd /folder/where/your/files/are
python3 -m http.server 8080
```
Open: http://localhost:8080

**With Node.js:**
```bash
npx serve .
```
Open: http://localhost:3000

> ⚠️ Do NOT open `index.html` directly by double-clicking — the app requires a web server (even a local one). The service worker and MSAL won't work from `file://`.

---

## Setting up Azure App ID (each user does this once)

The app no longer has a hardcoded ID. Every user needs to create their own free Azure App ID. It takes about 3 minutes.

### Step 1 — Register an Azure App (free)
1. Go to https://portal.azure.com (sign in with your Microsoft account — free)
2. Search for **App registrations** → **+ New registration**
3. Name: anything, e.g. `MySecureDiary`
4. Supported account types: **Personal Microsoft accounts only**
5. Redirect URI type: **Single-page application (SPA)**
6. Redirect URI value: paste your app's URL (e.g. `https://yourname.github.io/secure-diary/`)
   - For local use: `http://localhost:8080/`
7. Click **Register**
8. Copy the **Application (client) ID** — looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Step 2 — Enter the ID in the app
1. Open your diary URL
2. Tap **⚙️ Setup** button on the login screen
3. Paste your Application (client) ID
4. Tap **Save & Connect**
5. The ID is saved in your browser — you only do this once per device

> 🔒 **Privacy**: Each person's App ID is stored only in their own browser's localStorage. No App IDs are shared between users or stored anywhere central.

---

## How multiple users work

Each person who uses your hosted URL:
1. Opens the URL
2. Taps **⚙️ Setup**, enters *their own* Azure App ID
3. Signs in with *their own* Microsoft account
4. Their diary is stored encrypted in *their own* OneDrive

Nobody can access anyone else's diary — each `.enc` file is encrypted with the user's own password and lives in their own OneDrive.

---

## Offline mode

After the first load on any device, the app is cached by the service worker. You can:
- Open it without internet
- Read previous entries
- Write new entries (they save in memory)
- Download a `.enc` file to keep your changes

When you're back online, open the site and use **☁ OneDrive** mode to sync.

---

## Tips

- **Add to Home Screen**: On Android, tap browser menu → "Add to Home Screen". On iOS Safari, tap Share → "Add to Home Screen". The app icon will appear like a native app.
- **Multiple diaries**: Each Microsoft account can have multiple `.enc` diary files in OneDrive.
- **Backup**: Use **⋯ → Download .enc** anytime to download a local encrypted backup.
- **Change devices**: Install the app on any device, enter your App ID, sign in — your diary is there.
