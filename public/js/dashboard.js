'use strict';

// ── Config ──────────────────────────────────────────────────────
const API_BASE = '/api/v1';

// ── State ───────────────────────────────────────────────────────
let allSites    = [];
let activeCode  = null;
let searchQuery = '';

// ── Auth guard — redirect to login if not authenticated ─────────
async function checkAuth() {
  try {
    const res  = await fetch(`${API_BASE}/auth/me`, { credentials: 'same-origin' });
    if (!res.ok) { window.location.replace('/login'); return null; }
    const body = await res.json();
    const user = body.data;
    document.getElementById('hd-user').textContent = user.displayName || user.username;
    return user;
  } catch {
    window.location.replace('/login');
    return null;
  }
}

// ── Logout ──────────────────────────────────────────────────────
async function doLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin' });
  } finally {
    window.location.replace('/login');
  }
}

// ── API helpers — session cookie sent automatically ─────────────
async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  // Session expired?
  if (res.status === 401) { window.location.replace('/login'); return; }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
  return body;
}

// ── Filtering ───────────────────────────────────────────────────
function filtered() {
  if (!searchQuery) return allSites;
  const q = searchQuery.toLowerCase();
  return allSites.filter(s =>
    s.siteCode.toLowerCase().includes(q) ||
    s.siteName.toLowerCase().includes(q) ||
    s.blockIp.includes(q)
  );
}

// ── Init ────────────────────────────────────────────────────────
async function init() {
  // Auth check first — will redirect to /login if not authenticated
  const user = await checkAuth();
  if (!user) return;

  renderSidebarLoading();
  renderGridLoading();
  try {
    const { data, meta } = await api('/sites');
    if (!data) return; // redirected
    allSites = data;
    document.getElementById('hd-sites').textContent = meta.total;
    document.getElementById('hd-total').textContent = meta.total * 8;
    renderSidebar(allSites);
    renderGrid(allSites);
  } catch (err) {
    renderError(err.message);
    document.getElementById('site-list').innerHTML =
      `<div style="padding:20px;text-align:center;font-size:.75rem;color:var(--text-3)">Gagal memuat</div>`;
  }
}

// ── Search ──────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input', function () {
  searchQuery = this.value.trim();
  const list  = filtered();
  renderSidebar(list);
  if (!activeCode) renderGrid(list);
});

// ── Sidebar ─────────────────────────────────────────────────────
function renderSidebarLoading() {
  document.getElementById('count-lbl').textContent = 'Memuat...';
  document.getElementById('site-list').innerHTML = '';
}

function renderSidebar(sites) {
  document.getElementById('count-lbl').textContent = `${sites.length} site tersedia`;
  if (!sites.length) {
    document.getElementById('site-list').innerHTML =
      `<div style="padding:20px;text-align:center;font-size:.75rem;color:var(--text-3)">Tidak ditemukan</div>`;
    return;
  }
  document.getElementById('site-list').innerHTML = sites.map(s => `
    <div class="site-item ${activeCode === s.siteCode ? 'active' : ''}"
         id="si-${s.siteCode}" data-code="${s.siteCode}"
         onclick="selectSite('${s.siteCode}')">
      <div class="si-badge">${s.siteCode.replace('SITE-','')}</div>
      <div class="si-info">
        <div class="si-code">${s.siteCode}</div>
        <div class="si-name">${s.siteName}</div>
        <div class="si-ip">${s.blockIp}</div>
      </div>
      <svg class="si-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  `).join('');
}

// ── Grid (default view) ─────────────────────────────────────────
function renderGridLoading() {
  document.getElementById('content').innerHTML = `
    <div class="section-header">
      <div class="section-bar"></div>
      <div class="section-title">Semua Site</div>
    </div>
    <div class="skeleton-grid">${Array(22).fill('<div class="skeleton-card"></div>').join('')}</div>
  `;
}

function renderGrid(sites) {
  const cards = sites.length
    ? sites.map(s => `
        <div class="grid-card" onclick="selectSite('${s.siteCode}')">
          <div class="gc-code">${s.siteCode}</div>
          <div class="gc-name">${s.siteName}</div>
          <div class="gc-ip">${s.blockIp}</div>
          <div class="gc-dots">
            <div class="gc-dot d-sv" title="Gateway"></div>
            <div class="gc-dot d-sv" title="Proxmox Server"></div>
            <div class="gc-dot d-ap" title="Maps"></div>
            <div class="gc-dot d-ap" title="BMS"></div>
            <div class="gc-dot d-ap" title="BLM"></div>
            <div class="gc-dot d-ee" title="EYESEE"></div>
            <div class="gc-dot d-sv" title="Storage Server"></div>
            <div class="gc-dot d-ap" title="Chat"></div>
          </div>
        </div>
      `).join('')
    : `<div class="no-results">Tidak ada site cocok: "<strong>${esc(searchQuery)}</strong>"</div>`;

  document.getElementById('content').innerHTML = `
    <div class="all-sites-view">
      <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">Semua Site</div>
        <span class="section-count">${sites.length} site</span>
      </div>
      <div class="sites-grid">${cards}</div>
    </div>
  `;
}

// ── Select site ─────────────────────────────────────────────────
async function selectSite(code) {
  activeCode = code;
  document.querySelectorAll('.site-item').forEach(el =>
    el.classList.toggle('active', el.dataset.code === code)
  );
  const el = document.getElementById(`si-${code}`);
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

  document.getElementById('content').innerHTML = `
    <div class="skeleton-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:20px">
      ${Array(5).fill('<div class="skeleton-card" style="height:72px"></div>').join('')}
    </div>
    <div class="skeleton-card" style="height:320px;border-radius:var(--radius)"></div>
  `;

  try {
    const { data } = await api(`/sites/${code}`);
    renderDetail(data);
  } catch (err) {
    renderError(err.message);
  }
}

// ── Detail view ─────────────────────────────────────────────────
function renderDetail(site) {
  const gateway = site.ips.find(ip => ip.appKey === 'router')?.ip ?? '—';

  const rows = site.ips.map((ip, i) => {
    // Use prefixed class names to avoid conflict with global .app CSS class
    const typeClass = ip.highlighted ? 't-ee' : (ip.type === 'SERVER' ? 't-sv' : 't-ap');
    const typeLabel = ip.highlighted ? 'EYESEE' : ip.type;
    const portHtml  = ip.port ? `<span class="port-badge">:${ip.port}</span>` : '';
    return `
      <tr class="${ip.highlighted ? 'row-eyesee' : ''}">
        <td class="row-num">${String(i + 1).padStart(2, '0')}</td>
        <td>
          <div class="app-cell">
            <span class="app-name ${ip.highlighted ? 'eyesee' : ''}">${ip.highlighted ? '&#9889; ' : ''}${esc(ip.appName)}</span>
            <span class="type-tag ${typeClass}">${typeLabel}</span>
          </div>
        </td>
        <td>
          <div class="ip-cell">
            <span class="ip-text ${ip.highlighted ? 'eyesee' : ''}">${ip.fullIp}</span>
            ${portHtml}
            <button class="copy-btn" onclick="copyText('${ip.fullIp}',this)">${iconCopy()} Salin</button>
          </div>
        </td>
        <td class="act-col">
          <button class="tbl-btn" onclick="copyText('${ip.ip}',this)">${iconCopy()} IP Only</button>
          <button class="tbl-btn tbl-btn-edit" onclick="openEdit('${site.siteCode}','${ip.appKey}','${esc(ip.appName)}','${ip.ip}','${ip.subnet}',${ip.port || 'null'},'${esc(ip.note || '')}')">
            ${iconEdit()} Edit
          </button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('content').innerHTML = `
    <div class="detail-view">
      <div class="detail-top">
        <div>
          <div class="detail-breadcrumb">Master IP / ${site.siteCode}</div>
          <h2 class="detail-title">${esc(site.siteName)}</h2>
          <div class="detail-sub">Detail IP Address &mdash; Server &amp; Aplikasi</div>
          <div class="block-badge">Block IP: ${site.blockIp}</div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-ghost" onclick="copyAllIPs()">${iconCopy()} Salin Semua</button>
          <button class="btn btn-ghost" onclick="backToGrid()">${iconGrid()} Semua Site</button>
        </div>
      </div>

      <div class="info-row">
        <div class="info-card"><div class="ic-label">Site ID</div><div class="ic-value cyan">${site.siteCode}</div></div>
        <div class="info-card"><div class="ic-label">Block IP</div><div class="ic-value yellow">${site.blockIp}</div></div>
        <div class="info-card"><div class="ic-label">Subnet Mask</div><div class="ic-value">255.255.255.224</div></div>
       
        <div class="info-card"><div class="ic-label">Default Gateway</div><div class="ic-value cyan">${gateway}</div></div>
      </div>

      <div class="section-header">
        <div class="section-bar"></div>
        <div class="section-title">Daftar IP Address</div>
      </div>
      <div class="ip-table-wrap">
        <table class="ip-table">
          <thead>
            <tr>
              <th width="36">#</th>
              <th>Nama / Jenis Kebutuhan</th>
              <th>IP Address / Subnet</th>
              <th style="text-align:right" width="160">Aksi</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  window.__currentSite = site;
}

// ── Back to grid ────────────────────────────────────────────────
function backToGrid() {
  activeCode = null;
  window.__currentSite = null;
  document.querySelectorAll('.site-item').forEach(el => el.classList.remove('active'));
  renderGrid(filtered());
}

// ── Copy helpers ────────────────────────────────────────────────
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('ok');
    const orig = btn.innerHTML;
    btn.innerHTML = `${iconCheck()} Tersalin`;
    toast('Disalin: ' + text);
    setTimeout(() => { btn.classList.remove('ok'); btn.innerHTML = orig; }, 1800);
  });
}

function copyAllIPs() {
  const site = window.__currentSite;
  if (!site) return;
  const lines = [
    `=== ${site.siteCode} — ${site.siteName} ===`,
    `Block IP : ${site.blockIp}`,
    '',
    ...site.ips.map(ip => {
      const port = ip.port ? `:${ip.port}` : '';
      return `${ip.appName.padEnd(24)}: ${ip.fullIp}${port}`;
    }),
  ].join('\n');
  navigator.clipboard.writeText(lines).then(() => toast('Semua IP berhasil disalin!'));
}

// ── Edit modal ──────────────────────────────────────────────────
function openEdit(siteCode, appKey, appName, ip, subnet, port, note) {
  document.getElementById('edit-site-code').value = siteCode;
  document.getElementById('edit-app-key').value   = appKey;
  document.getElementById('edit-app-name').value  = appName;
  document.getElementById('edit-ip').value        = ip;
  document.getElementById('edit-subnet').value    = subnet || '/27';
  document.getElementById('edit-port').value      = port && port !== 'null' ? port : '';
  document.getElementById('edit-note').value      = note || '';
  document.getElementById('modal-title').textContent = `Edit IP — ${appName}`;
  document.getElementById('err-ip').classList.remove('show');
  document.getElementById('edit-ip').classList.remove('err');
  document.getElementById('edit-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('edit-modal').classList.remove('open');
}

// Close on backdrop click
document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

async function submitEdit(e) {
  e.preventDefault();
  const siteCode = document.getElementById('edit-site-code').value;
  const appKey   = document.getElementById('edit-app-key').value;
  const ip       = document.getElementById('edit-ip').value.trim();
  const subnet   = document.getElementById('edit-subnet').value.trim() || '/27';
  const port     = document.getElementById('edit-port').value;
  const note     = document.getElementById('edit-note').value.trim();

  // Validate IP
  const ipRe = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRe.test(ip) || ip.split('.').some(n => +n > 255)) {
    document.getElementById('err-ip').classList.add('show');
    document.getElementById('edit-ip').classList.add('err');
    return;
  }
  document.getElementById('err-ip').classList.remove('show');
  document.getElementById('edit-ip').classList.remove('err');

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    await api(`/sites/${siteCode}/ips/${appKey}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ipAddress: ip,
        subnet,
        port: port ? parseInt(port, 10) : null,
        note: note || null,
      }),
    });
    closeModal();
    toast('IP berhasil diperbarui!');
    // Reload detail
    const { data } = await api(`/sites/${siteCode}`);
    renderDetail(data);
  } catch (err) {
    toast(err.message, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `${iconSave()} Simpan`;
  }
}

// ── Error rendering ─────────────────────────────────────────────
function renderError(msg) {
  document.getElementById('content').innerHTML = `
    <div class="error-box">
      <span>&#9888;</span>
      <h3>Gagal memuat data</h3>
      <p>${esc(msg)}</p>
      <button onclick="init()">Coba Lagi</button>
    </div>
  `;
}

// ── Toast ───────────────────────────────────────────────────────
function toast(msg, type = 'ok') {
  const wrap = document.getElementById('toast-wrap');
  const el   = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = (type === 'ok' ? iconCheck() : iconX()) + ' ' + esc(msg);
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ── Icons ───────────────────────────────────────────────────────
function iconCopy() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
}
function iconCheck() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
}
function iconGrid() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`;
}
function iconEdit() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}
function iconSave() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>`;
}
function iconX() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
}

function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

// ── Start ───────────────────────────────────────────────────────
init();
