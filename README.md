# Mythos Core Launcher

A custom Minecraft launcher built with Electron.

## Features

- Online login (Microsoft account)
- Offline login (no account needed)
- Version selection (Releases + Snapshots)
- 3D skin viewer with mouse rotation
- RAM memory configuration
- Custom Mythos Core branding

---

## Build in GitHub Codespaces

### 1. Open this folder in Codespaces

Upload the contents of this archive to a GitHub repository and open it in Codespaces.

### 2. Install dependencies

```bash
npm install
```

### 3. Run in development mode

```bash
npm run dev
```

### 4. Build for your platform

**Windows:**
```bash
npm run build:win
```

**Linux:**
```bash
npm run build:linux
```

**macOS:**
```bash
npm run build:mac
```

Outputs are placed in the `dist/` folder.

---

## Notes

- For Windows builds, the icon must be `assets/icon.ico` — convert `icon.png` if needed.
- For macOS builds, you may need `assets/icon.icns`.
- Linux builds produce an AppImage and a .deb package.
- Microsoft login requires an internet connection and a valid Minecraft: Java Edition license.
- Offline mode works without any account.

---

## Folder Structure

```
mythos-launcher/
├── main.js          ← Electron main process
├── preload.js       ← IPC bridge
├── package.json     ← Project config & build settings
├── assets/
│   ├── logo.png     ← Launcher logo
│   ├── icon.png     ← App icon (Linux/Mac)
│   └── icon.ico     ← App icon (Windows)
├── src/
│   ├── index.html   ← Main launcher window
│   ├── auth.html    ← Sign-in window
│   ├── styles/
│   │   └── main.css
│   └── js/
│       ├── renderer.js   ← UI logic
│       └── auth.js       ← Auth window logic
└── README.md
```

---

## Convert icon.png → icon.ico (for Windows builds)

Install ImageMagick and run:

```bash
convert assets/icon.png -resize 256x256 assets/icon.ico
```

Or use an online converter like https://cloudconvert.com/png-to-ico
