document.addEventListener('DOMContentLoaded', () => {
  setupAuthWindow();
});

function setupAuthWindow() {
  // Close button
  document.getElementById('auth-close-btn').addEventListener('click', () => {
    window.launcher.closeAuth();
  });

  // Mode toggle
  document.querySelectorAll('.auth-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.dataset.mode;
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById(`panel-${mode}`).classList.remove('hidden');
    });
  });

  // Microsoft login
  document.getElementById('microsoft-btn').addEventListener('click', async () => {
    const loading = document.getElementById('auth-loading');
    loading.style.display = 'flex';

    const result = await window.launcher.microsoftLogin();
    loading.style.display = 'none';

    if (result.success) {
      window.launcher.sendAuthSuccess(result);
    } else {
      showAuthError('Microsoft login failed: ' + (result.error || 'Unknown error'));
    }
  });

  // Offline login
  document.getElementById('offline-submit-btn').addEventListener('click', async () => {
    const username = document.getElementById('offline-username').value.trim();
    hideOfflineError();

    const result = await window.launcher.offlineLogin(username);

    if (result.success) {
      window.launcher.sendAuthSuccess(result);
    } else {
      showOfflineError(result.error || 'Invalid username.');
    }
  });

  // Enter key in offline input
  document.getElementById('offline-username').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('offline-submit-btn').click();
    }
  });
}

function showOfflineError(msg) {
  const el = document.getElementById('offline-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function hideOfflineError() {
  const el = document.getElementById('offline-error');
  el.style.display = 'none';
}

function showAuthError(msg) {
  alert(msg);
}
