'use strict';

const form      = document.getElementById('login-form');
const errorBox  = document.getElementById('error-alert');
const errorMsg  = document.getElementById('error-msg');
const btnSubmit = document.getElementById('btn-submit');
const btnLabel  = document.getElementById('btn-label');
const btnIcon   = document.getElementById('btn-icon');
const spinner   = document.getElementById('spinner');
const pwdToggle = document.getElementById('pwd-toggle');
const pwdInput  = document.getElementById('password');

// ── Password visibility toggle ──────────────────────────────────
pwdToggle.addEventListener('click', () => {
  const isText = pwdInput.type === 'text';
  pwdInput.type = isText ? 'password' : 'text';
  document.getElementById('eye-icon').innerHTML = isText
    ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
    : '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
});

// ── Login ───────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  setLoading(true);
  hideError();

  const username = document.getElementById('username').value.trim();
  const password = pwdInput.value;

  if (!username || !password) {
    showError('Username dan password wajib diisi.');
    setLoading(false);
    return;
  }

  try {
    const res = await fetch('/api/v1/auth/login', {
      method:      'POST',
      credentials: 'same-origin',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ username, password }),
    });

    const body = await res.json().catch(() => ({}));

    if (res.ok) {
      window.location.replace('/');
    } else {
      showError(body.message || 'Login gagal. Coba lagi.');
      setLoading(false);
    }
  } catch {
    showError('Gagal terhubung ke server. Periksa koneksi Anda.');
    setLoading(false);
  }
});

// ── Helpers ─────────────────────────────────────────────────────
function setLoading(on) {
  btnSubmit.disabled    = on;
  spinner.style.display = on ? 'block' : 'none';
  btnIcon.style.display = on ? 'none'  : 'block';
  btnLabel.textContent  = on ? 'Memverifikasi...' : 'Masuk';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.classList.add('show');
}

function hideError() {
  errorBox.classList.remove('show');
}

// ── Auto-focus ──────────────────────────────────────────────────
document.getElementById('username').focus();

// ── Redirect if already logged in ──────────────────────────────
(async () => {
  try {
    const res = await fetch('/api/v1/auth/me', { credentials: 'same-origin' });
    if (res.ok) window.location.replace('/');
  } catch { /* ignore */ }
})();
