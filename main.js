const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;
let authWindow;

const isDev = process.argv.includes('--dev');

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 680,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    resizable: true,
    backgroundColor: '#140808',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit();
  });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ─── Window Controls ───────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow && mainWindow.close());

// ─── Auth ──────────────────────────────────────────────────────────────────────
ipcMain.on('open-auth', () => {
  if (authWindow) {
    authWindow.focus();
    return;
  }

  authWindow = new BrowserWindow({
    width: 480,
    height: 560,
    resizable: false,
    frame: false,
    modal: true,
    parent: mainWindow,
    backgroundColor: '#1c0b0b',
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  authWindow.loadFile(path.join(__dirname, 'src', 'auth.html'));

  authWindow.on('closed', () => {
    authWindow = null;
  });
});

ipcMain.on('close-auth', () => {
  if (authWindow) authWindow.close();
});

ipcMain.on('auth-success', (event, userData) => {
  if (mainWindow) {
    mainWindow.webContents.send('auth-result', userData);
  }
  if (authWindow) authWindow.close();
});

// ─── Microsoft OAuth ─────────────────────────────────────────────────────────
ipcMain.handle('microsoft-login', async () => {
  try {
    const { Authflow, Titles } = require('msmc');
    const auth = new Authflow(undefined, path.join(app.getPath('userData'), 'msmc_cache'));
    const result = await auth.getMinecraftJava();
    return {
      success: true,
      type: 'online',
      username: result.profile.name,
      uuid: result.profile.id,
      accessToken: result.minecraft.access_token
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('offline-login', async (event, username) => {
  const { v4: uuidv4 } = require('uuid');
  if (!username || username.trim().length < 3) {
    return { success: false, error: 'Username must be at least 3 characters.' };
  }
  const cleanName = username.trim().replace(/[^a-zA-Z0-9_]/g, '').substring(0, 16);
  if (cleanName.length < 3) {
    return { success: false, error: 'Username may only contain letters, numbers, and underscores.' };
  }
  return {
    success: true,
    type: 'offline',
    username: cleanName,
    uuid: uuidv4(),
    accessToken: '0'
  };
});

// ─── Versions ─────────────────────────────────────────────────────────────────
ipcMain.handle('get-versions', async () => {
  try {
    const fetch = require('node-fetch');
    const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
    const data = await res.json();
    const releases = data.versions.filter(v => v.type === 'release').slice(0, 30);
    const snapshots = data.versions.filter(v => v.type === 'snapshot').slice(0, 10);
    return { success: true, versions: [...releases, ...snapshots] };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Launch ───────────────────────────────────────────────────────────────────
ipcMain.handle('launch-minecraft', async (event, options) => {
  try {
    const { Client, Authenticator } = require('minecraft-launcher-core');
    const launcher = new Client();

    const rootPath = path.join(app.getPath('userData'), '.minecraft');

    let auth;
    if (options.authType === 'offline') {
      auth = await Authenticator.getAuth(options.username);
    } else {
      auth = {
        access_token: options.accessToken,
        client_token: options.uuid,
        uuid: options.uuid,
        name: options.username,
        meta: { type: 'mojang' }
      };
    }

    const config = {
      authorization: auth,
      root: rootPath,
      version: {
        number: options.version,
        type: 'release'
      },
      memory: {
        max: `${options.ram || 2048}M`,
        min: `512M`
      }
    };

    launcher.on('debug', (e) => {
      if (mainWindow) mainWindow.webContents.send('launch-log', { type: 'debug', message: e });
    });

    launcher.on('data', (e) => {
      if (mainWindow) mainWindow.webContents.send('launch-log', { type: 'data', message: e });
    });

    launcher.on('close', (code) => {
      if (mainWindow) mainWindow.webContents.send('game-closed', code);
    });

    launcher.on('progress', (e) => {
      if (mainWindow) mainWindow.webContents.send('launch-progress', e);
    });

    await launcher.launch(config);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Settings ─────────────────────────────────────────────────────────────────
const settingsPath = () => path.join(app.getPath('userData'), 'mythos-settings.json');

ipcMain.handle('get-settings', () => {
  try {
    if (fs.existsSync(settingsPath())) {
      return JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    }
  } catch {}
  return { ram: 2048 };
});

ipcMain.handle('save-settings', (event, settings) => {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Account Persistence ──────────────────────────────────────────────────────
const accountPath = () => path.join(app.getPath('userData'), 'mythos-account.json');

ipcMain.handle('get-account', () => {
  try {
    if (fs.existsSync(accountPath())) {
      return JSON.parse(fs.readFileSync(accountPath(), 'utf8'));
    }
  } catch {}
  return null;
});

ipcMain.handle('save-account', (event, account) => {
  try {
    fs.writeFileSync(accountPath(), JSON.stringify(account, null, 2));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('logout', () => {
  try {
    if (fs.existsSync(accountPath())) fs.unlinkSync(accountPath());
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ─── Skin ─────────────────────────────────────────────────────────────────────
const skinPath = () => path.join(app.getPath('userData'), 'custom-skin.png');

ipcMain.handle('select-skin', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Skin',
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { success: false };
  }
  const src = result.filePaths[0];
  fs.copyFileSync(src, skinPath());
  return { success: true, path: skinPath() };
});

ipcMain.handle('get-skin-path', () => {
  if (fs.existsSync(skinPath())) {
    return skinPath();
  }
  return null;
});

// ─── System Info ──────────────────────────────────────────────────────────────
ipcMain.handle('get-system-ram', () => {
  return Math.floor(os.totalmem() / 1024 / 1024);
});

ipcMain.on('open-url', (event, url) => {
  shell.openExternal(url);
});
