const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Auth window
  openAuth: () => ipcRenderer.send('open-auth'),
  closeAuth: () => ipcRenderer.send('close-auth'),
  sendAuthSuccess: (data) => ipcRenderer.send('auth-success', data),

  // Login methods
  microsoftLogin: () => ipcRenderer.invoke('microsoft-login'),
  offlineLogin: (username) => ipcRenderer.invoke('offline-login', username),

  // Account persistence
  getAccount: () => ipcRenderer.invoke('get-account'),
  saveAccount: (account) => ipcRenderer.invoke('save-account', account),
  logout: () => ipcRenderer.invoke('logout'),

  // Minecraft versions
  getVersions: () => ipcRenderer.invoke('get-versions'),

  // Launch
  launchMinecraft: (options) => ipcRenderer.invoke('launch-minecraft', options),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),

  // System info
  getSystemRam: () => ipcRenderer.invoke('get-system-ram'),

  // Skin
  selectSkin: () => ipcRenderer.invoke('select-skin'),
  getSkinPath: () => ipcRenderer.invoke('get-skin-path'),

  // Open URL
  openUrl: (url) => ipcRenderer.send('open-url', url),

  // Events from main
  onAuthResult: (cb) => {
    ipcRenderer.on('auth-result', (event, data) => cb(data));
  },
  onLaunchLog: (cb) => {
    ipcRenderer.on('launch-log', (event, data) => cb(data));
  },
  onLaunchProgress: (cb) => {
    ipcRenderer.on('launch-progress', (event, data) => cb(data));
  },
  onGameClosed: (cb) => {
    ipcRenderer.on('game-closed', (event, code) => cb(code));
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
