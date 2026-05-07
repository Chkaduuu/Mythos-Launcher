/* ─── State ───────────────────────────────────────────────────────────────── */
let currentAccount = null;
let allVersions = [];
let currentFilter = 'release';
let isLaunching = false;
let skinScene = null, skinCamera = null, skinRenderer = null;
let skinModel = null;
let isDraggingSkin = false;
let lastMouseX = 0, lastMouseY = 0;
let skinRotY = 0, skinRotX = 0;
let skinAnimFrame = null;

/* ─── Init ────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  setupTitlebar();
  setupNav();
  await loadAccount();
  await loadVersions();
  await loadSettings();
  setupEvents();
});

/* ─── Titlebar ───────────────────────────────────────────────────────────── */
function setupTitlebar() {
  document.getElementById('btn-min').addEventListener('click', () => window.launcher.minimize());
  document.getElementById('btn-max').addEventListener('click', () => window.launcher.maximize());
  document.getElementById('btn-close').addEventListener('click', () => window.launcher.close());
}

/* ─── Navigation ─────────────────────────────────────────────────────────── */
function setupNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));

  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  const pageEl = document.getElementById(`page-${page}`);

  if (navEl) navEl.classList.add('active');
  if (pageEl) pageEl.classList.add('active');

  if (page === 'profile') {
    loadProfilePage();
    setTimeout(initSkinViewer, 100);
  }
}

/* ─── Account ────────────────────────────────────────────────────────────── */
async function loadAccount() {
  currentAccount = await window.launcher.getAccount();
  updateAccountUI();
}

function updateAccountUI() {
  const nameEl = document.getElementById('account-name');
  const typeEl = document.getElementById('account-type');
  const btnEl = document.getElementById('account-btn');
  const avatarEl = document.getElementById('account-avatar');

  if (currentAccount) {
    nameEl.textContent = currentAccount.username;
    typeEl.textContent = currentAccount.type === 'online' ? 'Online (Microsoft)' : 'Offline Mode';
    btnEl.textContent = '';
    btnEl.classList.add('logged-in');
    btnEl.title = 'Signed in';
    avatarEl.textContent = currentAccount.username.charAt(0).toUpperCase();
    avatarEl.style.color = '#e84118';
  } else {
    nameEl.textContent = 'Not logged in';
    typeEl.textContent = 'Click to sign in';
    btnEl.textContent = 'Sign In';
    btnEl.classList.remove('logged-in');
    avatarEl.textContent = '?';
  }
}

function loadProfilePage() {
  const usernameEl = document.getElementById('profile-username');
  const typeEl = document.getElementById('profile-account-type');
  const uuidEl = document.getElementById('profile-uuid');

  if (currentAccount) {
    usernameEl.textContent = currentAccount.username;
    typeEl.textContent = currentAccount.type === 'online' ? 'Online (Microsoft)' : 'Offline';
    uuidEl.textContent = currentAccount.uuid;
  } else {
    usernameEl.textContent = '—';
    typeEl.textContent = '—';
    uuidEl.textContent = '—';
  }
}

/* ─── Auth events ────────────────────────────────────────────────────────── */
window.launcher.onAuthResult(async (userData) => {
  if (userData && userData.success !== false) {
    currentAccount = userData;
    await window.launcher.saveAccount(userData);
    updateAccountUI();
    showToast('Signed in as ' + userData.username, 'success');
  }
});

/* ─── Versions ───────────────────────────────────────────────────────────── */
async function loadVersions() {
  const res = await window.launcher.getVersions();
  if (res.success) {
    allVersions = res.versions;
    renderVersions();
  } else {
    const sel = document.getElementById('version-select');
    sel.innerHTML = '<option value="">Failed to load versions</option>';
  }
}

function renderVersions() {
  const sel = document.getElementById('version-select');
  const filtered = allVersions.filter(v => v.type === currentFilter);
  sel.innerHTML = filtered.map(v =>
    `<option value="${v.id}" data-type="${v.type}" data-time="${v.releaseTime}">${v.id}</option>`
  ).join('');
  updateVersionInfo();
}

function updateVersionInfo() {
  const sel = document.getElementById('version-select');
  const opt = sel.options[sel.selectedIndex];
  if (!opt || !opt.value) return;
  document.getElementById('vi-type').textContent = opt.dataset.type || '—';
  const d = opt.dataset.time ? new Date(opt.dataset.time).toLocaleDateString() : '—';
  document.getElementById('vi-date').textContent = d;
}

/* ─── Launch ─────────────────────────────────────────────────────────────── */
async function launch() {
  if (isLaunching) return;

  if (!currentAccount) {
    window.launcher.openAuth();
    return;
  }

  const version = document.getElementById('version-select').value;
  if (!version) {
    showToast('Please select a version', 'error');
    return;
  }

  const settings = await window.launcher.getSettings();
  isLaunching = true;

  const playBtn = document.getElementById('play-btn');
  const playText = document.getElementById('play-text');
  const launchStatus = document.getElementById('launch-status');
  const logWrap = document.getElementById('launch-log');
  const logEntries = document.getElementById('log-entries');

  playBtn.disabled = true;
  playText.textContent = 'LAUNCHING...';
  launchStatus.style.display = 'block';
  logWrap.style.display = 'block';
  logEntries.innerHTML = '';

  setProgress(0, 'Starting...');

  window.launcher.onLaunchProgress((prog) => {
    if (prog.task && prog.total) {
      const pct = Math.round((prog.task / prog.total) * 100);
      setProgress(pct, `Downloading: ${prog.type || '...'} (${prog.task}/${prog.total})`);
    }
  });

  window.launcher.onLaunchLog((data) => {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = typeof data.message === 'string' ? data.message.trim() : JSON.stringify(data.message);
    logEntries.appendChild(entry);
    logEntries.scrollTop = logEntries.scrollHeight;
  });

  window.launcher.onGameClosed((code) => {
    isLaunching = false;
    playBtn.disabled = false;
    playText.textContent = 'PLAY';
    launchStatus.style.display = 'none';
    setProgress(0, '');
    showToast(code === 0 ? 'Game closed.' : `Game exited with code ${code}.`, code === 0 ? '' : 'error');
  });

  const result = await window.launcher.launchMinecraft({
    version,
    username: currentAccount.username,
    uuid: currentAccount.uuid,
    accessToken: currentAccount.accessToken || '0',
    authType: currentAccount.type,
    ram: settings.ram || 2048
  });

  if (!result.success) {
    isLaunching = false;
    playBtn.disabled = false;
    playText.textContent = 'PLAY';
    launchStatus.style.display = 'none';
    showToast('Failed: ' + result.error, 'error');
  } else {
    setProgress(100, 'Game is running!');
    playText.textContent = 'RUNNING';
  }
}

function setProgress(pct, label) {
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = label;
}

/* ─── Settings ───────────────────────────────────────────────────────────── */
async function loadSettings() {
  const settings = await window.launcher.getSettings();
  const slider = document.getElementById('ram-slider');
  const systemRam = await window.launcher.getSystemRam();

  const maxRam = Math.min(Math.floor(systemRam / 256) * 256, 32768);
  slider.max = maxRam;
  document.getElementById('ram-max-label').textContent = maxRam + ' MB';
  document.getElementById('system-ram-label').textContent = (systemRam / 1024).toFixed(1) + ' GB';

  const ram = settings.ram || 2048;
  slider.value = ram;
  updateRamDisplay(ram);

  if (settings.javaPath) {
    document.getElementById('java-path-input').value = settings.javaPath;
  }

  updateSliderBackground(slider);
}

function updateRamDisplay(mb) {
  document.getElementById('ram-value').textContent = mb;
  document.getElementById('ram-gb').textContent = `( ${(mb / 1024).toFixed(1)} GB )`;
  updateRamPresets(mb);
}

function updateRamPresets(mb) {
  document.querySelectorAll('.ram-preset').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.ram) === mb);
  });
}

function updateSliderBackground(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--bg-card2) ${pct}%, var(--bg-card2) 100%)`;
}

/* ─── Skin Viewer (Three.js) ─────────────────────────────────────────────── */
function initSkinViewer() {
  const wrap = document.getElementById('skin-viewer-wrap');
  const canvas = document.getElementById('skin-canvas');
  const placeholder = document.getElementById('skin-placeholder');
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;

  if (skinRenderer) {
    skinRenderer.setSize(w, h);
    loadAndApplySkin();
    return;
  }

  const THREE = window.THREE;
  if (!THREE) return;

  skinScene = new THREE.Scene();
  skinScene.background = new THREE.Color(0x150707);

  skinCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
  skinCamera.position.set(0, 1.6, 4);
  skinCamera.lookAt(0, 0.8, 0);

  skinRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  skinRenderer.setSize(w, h);
  skinRenderer.setPixelRatio(window.devicePixelRatio);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  skinScene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xff6633, 0.6);
  dirLight.position.set(2, 4, 3);
  skinScene.add(dirLight);

  const dirLight2 = new THREE.DirectionalLight(0x6688cc, 0.3);
  dirLight2.position.set(-2, 1, -2);
  skinScene.add(dirLight2);

  canvas.style.display = 'block';
  placeholder.style.display = 'none';

  wrap.addEventListener('mousedown', (e) => {
    isDraggingSkin = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDraggingSkin) return;
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    skinRotY += dx * 0.8;
    skinRotX += dy * 0.4;
    skinRotX = Math.max(-60, Math.min(60, skinRotX));
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });
  window.addEventListener('mouseup', () => { isDraggingSkin = false; });

  loadAndApplySkin();
  animateSkin();
}

async function loadAndApplySkin() {
  const THREE = window.THREE;
  if (!THREE || !skinScene) return;

  const filePath = await window.launcher.getSkinPath();
  if (!filePath) {
    buildDefaultSkinModel(THREE);
    return;
  }

  const fileUrl = 'file:///' + filePath.replace(/\\/g, '/').replace(/^\//, '');

  const img = new Image();
  img.onload = () => buildSkinnedModel(THREE, img);
  img.onerror = () => buildDefaultSkinModel(THREE);
  img.src = fileUrl + '?t=' + Date.now();
}

function cropMat(THREE, image, px, py, pw, ph) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(pw, 1);
  canvas.height = Math.max(ph, 1);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, px, py, pw, ph, 0, 0, Math.max(pw, 1), Math.max(ph, 1));
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
}

function buildSkinnedModel(THREE, image) {
  if (skinModel) skinScene.remove(skinModel);

  const F = (px, py, pw, ph) => cropMat(THREE, image, px, py, pw, ph);

  function skinnedBox(w, h, d, mats, x, y, z) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(g, mats);
    m.position.set(x, y, z);
    return m;
  }

  const head = skinnedBox(0.8, 0.8, 0.8, [
    F(0,8,8,8), F(16,8,8,8), F(8,0,8,8), F(16,0,8,8), F(8,8,8,8), F(24,8,8,8)
  ], 0, 1.6, 0);

  const body = skinnedBox(0.8, 1.2, 0.4, [
    F(16,20,4,12), F(28,20,4,12), F(20,16,8,4), F(28,16,8,4), F(20,20,8,12), F(32,20,8,12)
  ], 0, 0.6, 0);

  const armR = skinnedBox(0.3, 1.2, 0.4, [
    F(40,20,4,12), F(48,20,4,12), F(44,16,4,4), F(48,16,4,4), F(44,20,4,12), F(52,20,4,12)
  ], 0.55, 0.6, 0);

  const armL = skinnedBox(0.3, 1.2, 0.4, [
    F(32,52,4,12), F(40,52,4,12), F(36,48,4,4), F(40,48,4,4), F(36,52,4,12), F(44,52,4,12)
  ], -0.55, 0.6, 0);

  const legR = skinnedBox(0.35, 1.2, 0.4, [
    F(0,20,4,12), F(8,20,4,12), F(4,16,4,4), F(8,16,4,4), F(4,20,4,12), F(12,20,4,12)
  ], 0.2, -0.6, 0);

  const legL = skinnedBox(0.35, 1.2, 0.4, [
    F(16,52,4,12), F(24,52,4,12), F(20,48,4,4), F(24,48,4,4), F(20,52,4,12), F(28,52,4,12)
  ], -0.2, -0.6, 0);

  const group = new THREE.Group();
  group.add(head, body, armR, armL, legR, legL);
  group.position.y = 0.2;

  skinScene.add(group);
  skinModel = group;
  skinRotY = 0;
  skinRotX = 0;
}

function buildDefaultSkinModel(THREE) {
  if (skinModel) skinScene.remove(skinModel);

  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a0a });
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });

  function box(w, h, d, m, x, y, z) {
    const g = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    return mesh;
  }

  const head = box(0.8, 0.8, 0.8, lightMat,  0,     1.6,  0);
  const body = box(0.8, 1.2, 0.4, mat,        0,     0.6,  0);
  const armL = box(0.3, 1.2, 0.4, mat,       -0.55,  0.6,  0);
  const armR = box(0.3, 1.2, 0.4, mat,        0.55,  0.6,  0);
  const legL = box(0.35,1.2, 0.4, darkMat,   -0.2,  -0.6,  0);
  const legR = box(0.35,1.2, 0.4, darkMat,    0.2,  -0.6,  0);

  group.add(head, body, armL, armR, legL, legR);
  group.position.y = 0.2;

  skinScene.add(group);
  skinModel = group;
  skinRotY = 0;
  skinRotX = 0;
}

function animateSkin() {
  skinAnimFrame = requestAnimationFrame(animateSkin);
  if (!skinModel || !skinScene || !skinCamera || !skinRenderer) return;

  if (!isDraggingSkin) {
    skinRotY += 0.4;
  }

  skinModel.rotation.y = (skinRotY * Math.PI) / 180;
  skinModel.rotation.x = (skinRotX * Math.PI) / 180;
  skinRenderer.render(skinScene, skinCamera);
}

/* ─── Events ─────────────────────────────────────────────────────────────── */
function setupEvents() {
  // Account button
  document.getElementById('account-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!currentAccount) {
      window.launcher.openAuth();
    }
  });
  document.getElementById('account-section').addEventListener('click', () => {
    if (!currentAccount) window.launcher.openAuth();
  });

  // Play button
  document.getElementById('play-btn').addEventListener('click', launch);

  // Version filter
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderVersions();
    });
  });

  // Version select change
  document.getElementById('version-select').addEventListener('change', updateVersionInfo);

  // Profile logout
  document.getElementById('profile-logout-btn').addEventListener('click', async () => {
    await window.launcher.logout();
    currentAccount = null;
    updateAccountUI();
    loadProfilePage();
    showToast('Signed out successfully.');
    navigateTo('home');
  });

  // Skin upload
  document.getElementById('upload-skin-btn').addEventListener('click', async () => {
    const result = await window.launcher.selectSkin();
    if (result.success) {
      showToast('Skin uploaded!', 'success');
      await loadAndApplySkin();
    }
  });

  document.getElementById('reset-skin-btn').addEventListener('click', () => {
    if (skinScene) {
      buildDefaultSkinModel(window.THREE);
    }
    showToast('Skin reset to default.');
  });

  // RAM slider
  const ramSlider = document.getElementById('ram-slider');
  ramSlider.addEventListener('input', () => {
    updateRamDisplay(parseInt(ramSlider.value));
    updateSliderBackground(ramSlider);
  });

  // RAM presets
  document.querySelectorAll('.ram-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const ram = parseInt(btn.dataset.ram);
      ramSlider.value = ram;
      updateRamDisplay(ram);
      updateSliderBackground(ramSlider);
    });
  });

  // Save settings
  document.getElementById('save-settings-btn').addEventListener('click', async () => {
    const settings = {
      ram: parseInt(document.getElementById('ram-slider').value),
      javaPath: document.getElementById('java-path-input').value.trim()
    };
    const result = await window.launcher.saveSettings(settings);
    const statusEl = document.getElementById('save-status');
    if (result.success) {
      statusEl.textContent = 'Saved!';
      statusEl.classList.add('visible');
      setTimeout(() => statusEl.classList.remove('visible'), 2500);
      showToast('Settings saved!', 'success');
    } else {
      showToast('Failed to save settings.', 'error');
    }
  });
}

/* ─── Toast ─────────────────────────────────────────────────────────────── */
function showToast(msg, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.textContent = msg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
