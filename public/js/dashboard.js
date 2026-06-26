'use strict';

// ── Config ──────────────────────────────────────────────────────
const API_BASE = '/api/v1';

// ── State ───────────────────────────────────────────────────────
let allSites = [];
let allRegions = []; // cached regions list
let activeCode = null;
let searchQuery = '';
let activeRegion = ''; // region filter code (empty = all)
let appTypesList = []; // cached app types for create modal

// ── Auth guard — redirect to login if not authenticated ─────────
async function checkAuth() {
	try {
		const res = await fetch(`${API_BASE}/auth/me`, {
			credentials: 'same-origin',
		});
		if (!res.ok) {
			window.location.replace('/login');
			return null;
		}
		const body = await res.json();
		const user = body.data;
		document.getElementById('hd-user').textContent =
			user.displayName || user.username;
		return user;
	} catch {
		window.location.replace('/login');
		return null;
	}
}

// ── Logout ──────────────────────────────────────────────────────
async function doLogout() {
	try {
		await fetch(`${API_BASE}/auth/logout`, {
			method: 'POST',
			credentials: 'same-origin',
		});
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
	// Only redirect to login for auth-related 401s (session expired)
	if (res.status === 401 && path.startsWith('/auth')) {
		window.location.replace('/login');
		return;
	}
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
	return body;
}

// ── Filtering ───────────────────────────────────────────────────
function filtered() {
	let list = allSites;
	// Region filter
	if (activeRegion) {
		list = list.filter(s => s.regionCode === activeRegion);
	}
	// Search filter
	if (searchQuery) {
		const q = searchQuery.toLowerCase();
		list = list.filter(
			s =>
				s.siteCode.toLowerCase().includes(q) ||
				s.siteName.toLowerCase().includes(q) ||
				s.blockIp.includes(q) ||
				(s.regionName && s.regionName.toLowerCase().includes(q))
		);
	}
	return list;
}

// ── Init ────────────────────────────────────────────────────────
async function init() {
	// Auth check first — will redirect to /login if not authenticated
	const user = await checkAuth();
	if (!user) return;

	renderSidebarLoading();
	renderGridLoading();
	loadGlobalLogo();
	try {
		// Load regions first (for filter dropdown)
		const regionsRes = await api('/regions');
		if (!regionsRes) return;
		allRegions = regionsRes.data || [];
		populateRegionFilter();

		// Load sites with region info
		const { data, meta } = await api('/sites?includeRegion=true');
		if (!data) return; // redirected
		allSites = data;
		document.getElementById('hd-sites').textContent = meta.total;
		document.getElementById('hd-total').textContent = meta.total * 8;
		renderSidebar(filtered());
		renderGrid(filtered());
		// Cache app types for create modal (lazy load)
		if (!appTypesList.length) {
			api('/apps')
				.then(({ data: apps }) => {
					appTypesList = apps;
				})
				.catch(() => {});
		}
	} catch (err) {
		renderError(err.message);
		document.getElementById(
			'site-list'
		).innerHTML = `<div style="padding:20px;text-align:center;font-size:.75rem;color:var(--text-3)">Gagal memuat</div>`;
	}
}

// ── Search ──────────────────────────────────────────────────────
document.getElementById('search').addEventListener('input', function () {
	searchQuery = this.value.trim();
	const list = filtered();
	renderSidebar(list);
	if (!activeCode) renderGrid(list);
});

// ── Region filter ───────────────────────────────────────────────
document
	.getElementById('region-filter')
	.addEventListener('change', function () {
		activeRegion = this.value;
		const list = filtered();
		renderSidebar(list);
		if (!activeCode) renderGrid(list);
	});

function populateRegionFilter() {
	const select = document.getElementById('region-filter');
	select.innerHTML = '<option value="">Semua Region</option>';
	allRegions.forEach(r => {
		const opt = document.createElement('option');
		opt.value = r.regionCode;
		opt.textContent = `${r.regionCode} — ${r.regionName}`;
		select.appendChild(opt);
	});
	// Restore previous selection if exists
	if (activeRegion) select.value = activeRegion;
}

// ── Sidebar ─────────────────────────────────────────────────────
function renderSidebarLoading() {
	document.getElementById('count-lbl').textContent = 'Memuat...';
	document.getElementById('site-list').innerHTML = '';
}

function renderSidebar(sites) {
	document.getElementById(
		'count-lbl'
	).textContent = `${sites.length} site tersedia`;
	if (!sites.length) {
		document.getElementById(
			'site-list'
		).innerHTML = `<div style="padding:20px;text-align:center;font-size:.75rem;color:var(--text-3)">Tidak ditemukan</div>`;
		return;
	}
	document.getElementById('site-list').innerHTML = sites
		.map(
			s => `
    <div class="site-item ${activeCode === s.siteCode ? 'active' : ''}"
         id="si-${s.siteCode}" data-code="${s.siteCode}"
         onclick="selectSite('${s.siteCode}')">
      <div class="si-badge">${s.siteCode.replace('SITE-', '')}</div>
      <div class="si-info">
        <div class="si-code">${s.siteCode}${
				s.regionCode
					? ` <span class="si-region">${esc(s.regionCode)}</span>`
					: ''
			}${s.hasImage ? ` <span class="si-img-badge" title="Memiliki gambar">${iconImage()}</span>` : ''}${s.hasLogo ? ` <span class="si-logo-badge" title="Memiliki logo">${iconLogo()}</span>` : ''}</div>
        <div class="si-name">${s.siteName}</div>
        <div class="si-ip">${s.blockIp}</div>
      </div>
      <svg class="si-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  `
		)
		.join('');
}

// ── Grid (default view) ─────────────────────────────────────────
function renderGridLoading() {
	document.getElementById('content').innerHTML = `
    <div class="section-header">
      <div class="section-bar"></div>
      <div class="section-title">Semua Site</div>
    </div>
    <div class="skeleton-grid">${Array(22)
			.fill('<div class="skeleton-card"></div>')
			.join('')}</div>
  `;
}

function renderGrid(sites) {
	const cards = sites.length
		? sites
				.map(
					s => `
        <div class="grid-card" onclick="selectSite('${s.siteCode}')">
          <div class="gc-thumb">
            ${s.hasImage
              ? `<img src="${s.imageUrl}" alt="${esc(s.siteName)}" loading="lazy">`
              : `<div class="gc-thumb-default">${iconImagePlaceholder()}</div>`
            }
            ${s.hasLogo ? `<div class="gc-logo-overlay"><img src="${s.logoUrl}" alt="logo" loading="lazy"></div>` : ''}
          </div>
          <div class="gc-top-row">
            <div class="gc-code">${s.siteCode}</div>
            ${
							s.regionCode
								? `<span class="gc-region-badge">${esc(s.regionCode)}</span>`
								: ''
						}
          </div>
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
      `
				)
				.join('')
		: `<div class="no-results">Tidak ada site cocok: "<strong>${esc(
				searchQuery
		  )}</strong>"</div>`;

	document.getElementById('content').innerHTML = `
	   <div class="all-sites-view">
	     <div class="section-header">
	       <div class="section-bar"></div>
	       <div class="section-title">Semua Site</div>
	       <span class="section-count">${sites.length} site</span>
	       <button class="btn btn-ghost btn-sm" onclick="openRegionModal()" style="margin-left:auto">
	         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
	         Region
	       </button>
	       <button class="btn btn-primary btn-sm" onclick="openCreateModal()">
	         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
	         Tambah Site
	       </button>
	     </div>
	     <div class="sites-grid">${cards}</div>
	   </div>
	 `;
}

// ── Select site ─────────────────────────────────────────────────
async function selectSite(code) {
	activeCode = code;
	document
		.querySelectorAll('.site-item')
		.forEach(el => el.classList.toggle('active', el.dataset.code === code));
	const el = document.getElementById(`si-${code}`);
	if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

	document.getElementById('content').innerHTML = `
    <div class="skeleton-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:20px">
      ${Array(5)
				.fill('<div class="skeleton-card" style="height:72px"></div>')
				.join('')}
    </div>
    <div class="skeleton-card" style="height:320px;border-radius:var(--radius)"></div>
  `;

	try {
		const { data } = await api(`/sites/${code}?includeRegion=true`);
		renderDetail(data);
	} catch (err) {
		renderError(err.message);
	}
}

// ── Detail view ─────────────────────────────────────────────────
function renderDetail(site) {
	const gateway = site.ips.find(ip => ip.appKey === 'router')?.ip ?? '—';

	const rows = site.ips
		.map((ip, i) => {
			// Use prefixed class names to avoid conflict with global .app CSS class
			const typeClass = ip.highlighted
				? 't-ee'
				: ip.type === 'SERVER'
				? 't-sv'
				: 't-ap';
			const typeLabel = ip.highlighted ? 'EYESEE' : ip.type;
			const portHtml = ip.port
				? `<span class="port-badge">:${ip.port}</span>`
				: '';
			return `
      <tr class="${ip.highlighted ? 'row-eyesee' : ''}">
        <td class="row-num">${String(i + 1).padStart(2, '0')}</td>
        <td>
          <div class="app-cell">
            <span class="app-name ${ip.highlighted ? 'eyesee' : ''}">${
				ip.highlighted ? '&#9889; ' : ''
			}${esc(ip.appName)}</span>
            <span class="type-tag ${typeClass}">${typeLabel}</span>
          </div>
        </td>
        <td>
          <div class="ip-cell">
            <span class="ip-text ${ip.highlighted ? 'eyesee' : ''}">${
				ip.fullIp
			}</span>
            ${portHtml}
            
          </div>
        </td>
        <td class="act-col">
          <button class="tbl-btn" onclick="copyText('${
						ip.ip
					}',this)">${iconCopy()} Salin</button>
          <button class="tbl-btn tbl-btn-edit" onclick="openEdit('${
						site.siteCode
					}','${ip.appKey}','${esc(ip.appName)}','${ip.ip}','${ip.subnet}',${
				ip.port || 'null'
			},'${esc(ip.note || '')}')">
            ${iconEdit()} Edit
          </button>
        </td>
      </tr>
    `;
		})
		.join('');

	// Build image section
	const imageHtml = site.hasImage
		? `<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
			<div style="font-weight:600; font-size:1.1rem; color: var(--text-1);">Gambar Site</div>
			<button class="tbl-btn" onclick="openImageUploadModal('${site.siteCode}', '${esc(site.siteName)}', true)">
				${iconEdit()} Ganti Gambar
			</button>
		   </div>
		   <div class="site-image-hero" onclick="openLightbox('${site.imageUrl}', '${esc(site.siteName)}')">
			<img src="${site.imageUrl}" alt="${esc(site.siteName)}" loading="lazy">
			<div class="img-overlay"><span>${iconZoom()} Klik untuk memperbesar</span></div>
		   </div>`
		: `<div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
			<div style="font-weight:600; font-size:1.1rem; color: var(--text-1);">Gambar Site</div>
			<button class="tbl-btn" onclick="openImageUploadModal('${site.siteCode}', '${esc(site.siteName)}', false)">
				${iconUpload()} Upload Gambar
			</button>
		   </div>
		   <div class="site-image-placeholder">
			${iconImagePlaceholder()}
			<span>Belum ada gambar untuk site ini</span>
		   </div>`;

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
          <button class="btn btn-ghost" onclick="openAssignRegionModal('${
						site.siteCode
					}','${esc(site.regionCode || '')}','${esc(site.regionName || '')}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Region
          </button>
          <button class="btn btn-ghost" onclick="copyAllIPs()">${iconCopy()} Salin Semua</button>
          <button class="btn btn-ghost" onclick="openEditSiteModal()">${iconEdit()} Edit Keseluruhan</button>
          <button class="btn btn-danger" onclick="deleteSite('${
						site.siteCode
					}','${esc(site.siteName)}')">${iconTrash()} Hapus Site</button>
          <button class="btn btn-ghost" onclick="backToGrid()">${iconGrid()} Semua Site</button>
        </div>
      </div>

      ${imageHtml}

      

      <div class="info-row">
        <div class="info-card"><div class="ic-label">Site ID</div><div class="ic-value cyan">${
					site.siteCode
				}</div></div>
        <div class="info-card"><div class="ic-label">Block IP</div><div class="ic-value yellow">${
					site.blockIp
				}</div></div>
        <div class="info-card"><div class="ic-label">Subnet Mask</div><div class="ic-value">255.255.255.224</div></div>
        <div class="info-card"><div class="ic-label">Default Gateway</div><div class="ic-value cyan">${gateway}</div></div>
        <div class="info-card"><div class="ic-label">Region</div><div class="ic-value green">${
					site.regionName
						? esc(site.regionName)
						: '<span style="color:var(--text-3)">—</span>'
				}</div></div>
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
	document
		.querySelectorAll('.site-item')
		.forEach(el => el.classList.remove('active'));
	renderGrid(filtered());
}

// ── Copy helpers ────────────────────────────────────────────────
function copyText(text, btn) {
	navigator.clipboard.writeText(text).then(() => {
		btn.classList.add('ok');
		const orig = btn.innerHTML;
		btn.innerHTML = `${iconCheck()} Tersalin`;
		toast('Disalin: ' + text);
		setTimeout(() => {
			btn.classList.remove('ok');
			btn.innerHTML = orig;
		}, 1800);
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
	navigator.clipboard
		.writeText(lines)
		.then(() => toast('Semua IP berhasil disalin!'));
}

// ── Edit modal ──────────────────────────────────────────────────
function openEdit(siteCode, appKey, appName, ip, subnet, port, note) {
	document.getElementById('edit-site-code').value = siteCode;
	document.getElementById('edit-app-key').value = appKey;
	document.getElementById('edit-app-name').value = appName;
	document.getElementById('edit-ip').value = ip;
	document.getElementById('edit-subnet').value = subnet || '/27';
	document.getElementById('edit-port').value =
		port && port !== 'null' ? port : '';
	document.getElementById('edit-note').value = note || '';
	document.getElementById('modal-title').textContent = `Edit IP — ${appName}`;
	document.getElementById('err-ip').classList.remove('show');
	document.getElementById('edit-ip').classList.remove('err');
	document.getElementById('edit-modal').classList.add('open');
}

function closeModal() {
	document.getElementById('edit-modal').classList.remove('open');
}

// Close on backdrop click
document.getElementById('edit-modal').addEventListener('click', function (e) {
	if (e.target === this) closeModal();
});

// Close on Escape
document.addEventListener('keydown', e => {
	if (e.key === 'Escape') closeModal();
});

async function submitEdit(e) {
	e.preventDefault();
	const siteCode = document.getElementById('edit-site-code').value;
	const appKey = document.getElementById('edit-app-key').value;
	const ip = document.getElementById('edit-ip').value.trim();
	const subnet = document.getElementById('edit-subnet').value.trim() || '/27';
	const port = document.getElementById('edit-port').value;
	const note = document.getElementById('edit-note').value.trim();

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
		const { data } = await api(`/sites/${siteCode}?includeRegion=true`);
		renderDetail(data);
	} catch (err) {
		toast(err.message, 'err');
	} finally {
		btn.disabled = false;
		btn.innerHTML = `${iconSave()} Simpan`;
	}
}

// ── Create site modal ───────────────────────────────────────────
function openCreateModal() {
	// Reset form
	document.getElementById('create-site-code').value = '';
	document.getElementById('create-site-name').value = '';
	document.getElementById('create-block-ip').value = '';
	document.getElementById('create-description').value = '';
	document.getElementById('create-image').value = '';
	document.getElementById('err-create-block-ip').classList.remove('show');
	document.getElementById('create-block-ip').classList.remove('err');

	// Populate region dropdown
	const regionSelect = document.getElementById('create-region');
	regionSelect.innerHTML = '<option value="">— Tanpa Region —</option>';
	allRegions.forEach(r => {
		const opt = document.createElement('option');
		opt.value = r.id;
		opt.textContent = `${r.regionCode} — ${r.regionName}`;
		regionSelect.appendChild(opt);
	});

	// Build IP rows for each app type
	const list = document.getElementById('create-ips-list');
	if (appTypesList.length) {
		list.innerHTML = appTypesList
			.map(
				at => `
      <div class="create-ip-row">
        <div class="cip-app">
          <span class="type-tag ${at.type === 'SERVER' ? 't-sv' : 't-ap'}">${
					at.type
				}</span>
          <span class="cip-name">${esc(at.name)}</span>
        </div>
        <input class="form-input cip-ip" type="text" placeholder="IP Address" data-app-key="${
					at.key
				}" autocomplete="off">
        <input class="form-input cip-port" type="number" placeholder="${at.defaultPort ? 'Default: ' + at.defaultPort : 'Port'}" data-app-key="${
					at.key
				}" value="${at.defaultPort || ''}" min="1" max="65535">
      </div>
    `
			)
			.join('');
	} else {
		list.innerHTML = '<div class="form-hint">Memuat daftar aplikasi...</div>';
		// Fetch app types if not cached yet
		api('/apps')
			.then(({ data: apps }) => {
				appTypesList = apps;
				list.innerHTML = appTypesList
					.map(
						at => `
        <div class="create-ip-row">
          <div class="cip-app">
            <span class="type-tag ${at.type === 'SERVER' ? 't-sv' : 't-ap'}">${
							at.type
						}</span>
            <span class="cip-name">${esc(at.name)}</span>
          </div>
          <input class="form-input cip-ip" type="text" placeholder="IP Address" data-app-key="${
						at.key
					}" autocomplete="off">
          <input class="form-input cip-port" type="number" placeholder="${at.defaultPort ? 'Default: ' + at.defaultPort : 'Port'}" data-app-key="${
						at.key
					}" value="${at.defaultPort || ''}" min="1" max="65535">
        </div>
      `
					)
					.join('');
			})
			.catch(() => {
				list.innerHTML =
					'<div class="form-hint" style="color:var(--red)">Gagal memuat daftar aplikasi</div>';
			});
	}

	document.getElementById('create-modal').classList.add('open');
}

function closeCreateModal() {
	document.getElementById('create-modal').classList.remove('open');
}

// Close create modal on backdrop click
document.getElementById('create-modal').addEventListener('click', function (e) {
	if (e.target === this) closeCreateModal();
});

async function submitCreate(e) {
	e.preventDefault();
	const siteCode = document
		.getElementById('create-site-code')
		.value.trim()
		.toUpperCase();
	const siteName = document.getElementById('create-site-name').value.trim();
	const blockIp = document.getElementById('create-block-ip').value.trim();
	const description = document
		.getElementById('create-description')
		.value.trim();
	const regionId = document.getElementById('create-region').value;
	const regionIdInt = regionId ? parseInt(regionId, 10) : null;
	const imageFile = document.getElementById('create-image').files[0] || null;

	// Validate block IP (simple CIDR check)
	const cidrRe = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
	if (!cidrRe.test(blockIp)) {
		document.getElementById('err-create-block-ip').classList.add('show');
		document.getElementById('create-block-ip').classList.add('err');
		return;
	}
	document.getElementById('err-create-block-ip').classList.remove('show');
	document.getElementById('create-block-ip').classList.remove('err');

	// Collect IP entries
	const ips = [];
	document.querySelectorAll('#create-ips-list .create-ip-row').forEach(row => {
		const ipInput = row.querySelector('.cip-ip');
		const portInput = row.querySelector('.cip-port');
		const appKey = ipInput.dataset.appKey;
		const ipAddress = ipInput.value.trim();
		const port = portInput.value.trim();
		if (ipAddress) {
			ips.push({
				appKey,
				ipAddress,
				subnet: '/27',
				port: port ? parseInt(port, 10) : null,
			});
		}
	});

	const btn = document.getElementById('btn-create');
	btn.disabled = true;
	btn.textContent = 'Membuat...';

	try {
		// Use FormData if image is provided, otherwise JSON
		let response;
		if (imageFile) {
			const formData = new FormData();
			formData.append('siteCode', siteCode);
			formData.append('siteName', siteName);
			formData.append('blockIp', blockIp);
			if (description) formData.append('description', description);
			if (regionIdInt) formData.append('regionId', String(regionIdInt));
			formData.append('ips', JSON.stringify(ips));
			formData.append('image', imageFile);

			const res = await fetch(`${API_BASE}/sites`, {
				method: 'POST',
				credentials: 'same-origin',
				body: formData,
			});
			if (res.status === 401) {
				window.location.replace('/login');
				return;
			}
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
			response = body;
		} else {
			response = await api('/sites', {
				method: 'POST',
				body: JSON.stringify({
					siteCode,
					siteName,
					blockIp,
					description: description || null,
					regionId: regionIdInt,
					ips,
				}),
			});
		}
		const { data: newSite } = response;
		closeCreateModal();
		toast('Site berhasil dibuat!');
		// Reload all sites
		const { data, meta } = await api('/sites?includeRegion=true');
		allSites = data;
		document.getElementById('hd-sites').textContent = meta.total;
		document.getElementById('hd-total').textContent = meta.total * 8;
		renderSidebar(filtered());
		// Navigate to the newly created site detail
		selectSite(siteCode);
	} catch (err) {
		toast(err.message, 'err');
	} finally {
		btn.disabled = false;
		btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Buat Site`;
	}
}

// ── Edit Site modal ─────────────────────────────────────────────
function openEditSiteModal() {
	const site = window.__currentSite;
	if (!site) return;

	document.getElementById('edit-site-full-code').value = site.siteCode;
	document.getElementById('edit-site-name-full').value = site.siteName;
	document.getElementById('edit-site-block-ip-full').value = site.blockIp;
	document.getElementById('edit-site-description-full').value = site.description || '';
	document.getElementById('err-edit-site-block-ip').classList.remove('show');
	document.getElementById('edit-site-block-ip-full').classList.remove('err');

	const regionSelect = document.getElementById('edit-site-region-full');
	regionSelect.innerHTML = '<option value="">— Tanpa Region —</option>';
	let regionMatchedId = '';
	allRegions.forEach(r => {
		const opt = document.createElement('option');
		opt.value = r.id;
		opt.textContent = `${r.regionCode} — ${r.regionName}`;
		if (site.regionCode && r.regionCode === site.regionCode) {
			regionMatchedId = r.id;
		}
		regionSelect.appendChild(opt);
	});
	regionSelect.value = regionMatchedId;

	const list = document.getElementById('edit-site-ips-list');
	if (appTypesList.length) {
		list.innerHTML = appTypesList
			.map(at => {
				const existingIp = site.ips.find(i => i.appKey === at.key);
				const ipVal = existingIp ? (existingIp.ip === '0.0.0.0' ? '' : existingIp.ip) : '';
				const portVal = existingIp && existingIp.port ? existingIp.port : (at.defaultPort || '');
				return `
      <div class="create-ip-row">
        <div class="cip-app">
          <span class="type-tag ${at.type === 'SERVER' ? 't-sv' : 't-ap'}">${at.type}</span>
          <span class="cip-name">${esc(at.name)}</span>
        </div>
        <input class="form-input cip-ip" type="text" placeholder="IP Address" data-app-key="${at.key}" value="${ipVal}" autocomplete="off">
        <input class="form-input cip-port" type="number" placeholder="${at.defaultPort ? 'Default: ' + at.defaultPort : 'Port'}" data-app-key="${at.key}" value="${portVal}" min="1" max="65535">
      </div>
    `;
			})
			.join('');
	}

	document.getElementById('edit-site-modal').classList.add('open');
}

function closeEditSiteModal() {
	document.getElementById('edit-site-modal').classList.remove('open');
}

document.getElementById('edit-site-modal').addEventListener('click', function (e) {
	if (e.target === this) closeEditSiteModal();
});

async function submitEditSite(e) {
	e.preventDefault();
	const siteCode = document.getElementById('edit-site-full-code').value;
	const siteName = document.getElementById('edit-site-name-full').value.trim();
	const blockIp = document.getElementById('edit-site-block-ip-full').value.trim();
	const description = document.getElementById('edit-site-description-full').value.trim();
	const regionId = document.getElementById('edit-site-region-full').value;
	const regionIdInt = regionId ? parseInt(regionId, 10) : null;

	const cidrRe = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
	if (!cidrRe.test(blockIp)) {
		document.getElementById('err-edit-site-block-ip').classList.add('show');
		document.getElementById('edit-site-block-ip-full').classList.add('err');
		return;
	}
	document.getElementById('err-edit-site-block-ip').classList.remove('show');
	document.getElementById('edit-site-block-ip-full').classList.remove('err');

	const ips = [];
	document.querySelectorAll('#edit-site-ips-list .create-ip-row').forEach(row => {
		const ipInput = row.querySelector('.cip-ip');
		const portInput = row.querySelector('.cip-port');
		const appKey = ipInput.dataset.appKey;
		const ipAddress = ipInput.value.trim();
		const port = portInput.value.trim();
		if (ipAddress) {
			ips.push({
				appKey,
				ipAddress,
				subnet: '/27',
				port: port ? parseInt(port, 10) : null,
			});
		}
	});

	const btn = document.getElementById('btn-edit-site');
	btn.disabled = true;
	btn.textContent = 'Menyimpan...';

	try {
		await api(`/sites/${siteCode}`, {
			method: 'PUT',
			body: JSON.stringify({
				siteName,
				blockIp,
				description: description || null,
				regionId: regionIdInt,
				ips,
			}),
		});

		closeEditSiteModal();
		toast('Site berhasil diperbarui!');
		
		const { data, meta } = await api('/sites?includeRegion=true');
		allSites = data;
		document.getElementById('hd-sites').textContent = meta.total;
		document.getElementById('hd-total').textContent = meta.total * 8;
		renderSidebar(filtered());
		
		selectSite(siteCode);
	} catch (err) {
		toast(err.message, 'err');
	} finally {
		btn.disabled = false;
		btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg> Simpan Perubahan`;
	}
}

// ── Delete site ──────────────────────────────────────────────────
async function deleteSite(siteCode, siteName) {
	// Use a custom confirm via a temporary modal
	const confirmed = await confirmDelete(siteCode, siteName);
	if (!confirmed) return;

	try {
		await api(`/sites/${siteCode}`, { method: 'DELETE' });
		toast(`Site ${siteCode} berhasil dihapus!`);
		// Go back to grid and reload
		activeCode = null;
		window.__currentSite = null;
		const { data, meta } = await api('/sites?includeRegion=true');
		allSites = data;
		document.getElementById('hd-sites').textContent = meta.total;
		document.getElementById('hd-total').textContent = meta.total * 8;
		renderSidebar(filtered());
		renderGrid(filtered());
	} catch (err) {
		toast(err.message, 'err');
	}
}

function confirmDelete(siteCode, siteName) {
	return new Promise(resolve => {
		// Create confirmation overlay
		const backdrop = document.createElement('div');
		backdrop.className = 'modal-backdrop open';
		backdrop.style.zIndex = '600';
		backdrop.innerHTML = `
      <div class="modal" style="max-width:400px;text-align:center">
        <div style="margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <h3 style="font-size:1rem;margin-bottom:6px">Hapus Site?</h3>
          <p style="font-size:.82rem;color:var(--text-2);line-height:1.5">
            Site <strong style="color:var(--cyan)">${esc(
							siteCode
						)}</strong> — ${esc(siteName)}<br>
            <span style="color:var(--red);font-size:.72rem">Semua data IP di site ini juga akan dihapus. Aksi ini tidak dapat dibatalkan.</span>
          </p>
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-ghost" id="del-cancel">Batal</button>
          <button class="btn btn-danger" id="del-confirm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Hapus
          </button>
        </div>
      </div>
    `;
		document.body.appendChild(backdrop);

		backdrop.querySelector('#del-cancel').addEventListener('click', () => {
			backdrop.remove();
			resolve(false);
		});
		backdrop.querySelector('#del-confirm').addEventListener('click', () => {
			backdrop.remove();
			resolve(true);
		});
		backdrop.addEventListener('click', e => {
			if (e.target === backdrop) {
				backdrop.remove();
				resolve(false);
			}
		});
	});
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
	const el = document.createElement('div');
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
function iconTrash() {
	return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;
}
function iconImage() {
	return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
}
function iconImagePlaceholder() {
	return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
}
function iconZoom() {
	return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`;
}
function iconLogo() {
	return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
}
function iconLogoPlaceholder() {
	return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
}
function iconUpload() {
	return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
}

// ── Lightbox (image zoom) ───────────────────────────────────────
function openLightbox(imageUrl, altText) {
	const existing = document.querySelector('.lightbox');
	if (existing) existing.remove();

	const lightbox = document.createElement('div');
	lightbox.className = 'lightbox';
	lightbox.innerHTML = `
		<button class="lightbox-close" title="Tutup">${iconX()}</button>
		<img src="${imageUrl}" alt="${esc(altText)}">
	`;

	lightbox.addEventListener('click', (e) => {
		if (e.target === lightbox || e.target.closest('.lightbox-close')) {
			lightbox.remove();
		}
	});

	document.addEventListener('keydown', function handler(e) {
		if (e.key === 'Escape') {
			lightbox.remove();
			document.removeEventListener('keydown', handler);
		}
	});

	document.body.appendChild(lightbox);
}

function esc(str) {
	if (!str) return '';
	const d = document.createElement('div');
	d.textContent = String(str);
	return d.innerHTML;
}

// ── Region CRUD modal ────────────────────────────────────────────
function openRegionModal() {
	// Show list, hide form
	document.getElementById('region-list-container').style.display = '';
	document.getElementById('region-form-container').style.display = 'none';
	renderRegionList();
	document.getElementById('region-modal').classList.add('open');
}

function closeRegionModal() {
	document.getElementById('region-modal').classList.remove('open');
}

// Close region modal on backdrop click
document.getElementById('region-modal').addEventListener('click', function (e) {
	if (e.target === this) closeRegionModal();
});

function renderRegionList() {
	const container = document.getElementById('region-list');
	if (!allRegions.length) {
		container.innerHTML =
			'<div class="region-empty">Belum ada region. Tambahkan region pertama.</div>';
		return;
	}
	container.innerHTML = allRegions
		.map(
			r => `
      <div class="region-item">
        <div class="ri-info">
          <div class="ri-code">${esc(r.regionCode)}</div>
          <div class="ri-name">${esc(r.regionName)}</div>
          <div class="ri-desc">${r.description ? esc(r.description) : ''}</div>
        </div>
        <div class="ri-actions">
          <button class="tbl-btn" onclick="editRegionItem('${esc(
						r.regionCode
					)}')">${iconEdit()} Edit</button>
          <button class="tbl-btn tbl-btn-edit" style="color:var(--red);border-color:#fecaca" onclick="deleteRegionItem('${esc(
						r.regionCode
					)}','${esc(r.regionName)}')">${iconTrash()} Hapus</button>
        </div>
      </div>
    `
		)
		.join('');
}

function openAddRegionForm() {
	document.getElementById('region-edit-code').value = '';
	document.getElementById('region-code').value = '';
	document.getElementById('region-code').disabled = false;
	document.getElementById('region-name').value = '';
	document.getElementById('region-description').value = '';
	document.getElementById('region-form-title').textContent =
		'Tambah Region Baru';
	document.getElementById('region-list-container').style.display = 'none';
	document.getElementById('region-form-container').style.display = '';
}

function editRegionItem(code) {
	const region = allRegions.find(r => r.regionCode === code);
	if (!region) return;
	document.getElementById('region-edit-code').value = region.regionCode;
	document.getElementById('region-code').value = region.regionCode;
	document.getElementById('region-code').disabled = true; // can't change code on edit
	document.getElementById('region-name').value = region.regionName;
	document.getElementById('region-description').value =
		region.description || '';
	document.getElementById(
		'region-form-title'
	).textContent = `Edit Region — ${region.regionCode}`;
	document.getElementById('region-list-container').style.display = 'none';
	document.getElementById('region-form-container').style.display = '';
}

function cancelRegionForm() {
	document.getElementById('region-list-container').style.display = '';
	document.getElementById('region-form-container').style.display = 'none';
}

async function submitRegionForm(e) {
	e.preventDefault();
	const editCode = document.getElementById('region-edit-code').value;
	const regionCode = document
		.getElementById('region-code')
		.value.trim()
		.toUpperCase();
	const regionName = document.getElementById('region-name').value.trim();
	const description = document
		.getElementById('region-description')
		.value.trim();

	if (!regionCode || !regionName) {
		toast('Region Code dan Nama wajib diisi.', 'err');
		return;
	}

	const btn = document.getElementById('btn-region-save');
	btn.disabled = true;
	btn.textContent = 'Menyimpan...';

	try {
		if (editCode) {
			// Update existing region
			await api(`/regions/${editCode}`, {
				method: 'PUT',
				body: JSON.stringify({ regionName, description: description || null }),
			});
			toast('Region berhasil diperbarui!');
		} else {
			// Create new region
			await api('/regions', {
				method: 'POST',
				body: JSON.stringify({
					regionCode,
					regionName,
					description: description || null,
				}),
			});
			toast('Region berhasil dibuat!');
		}

		// Reload regions
		const regionsRes = await api('/regions');
		allRegions = regionsRes.data || [];
		populateRegionFilter();

		// Also reload sites to update region info
		const { data, meta } = await api('/sites?includeRegion=true');
		allSites = data;
		document.getElementById('hd-sites').textContent = meta.total;
		document.getElementById('hd-total').textContent = meta.total * 8;

		cancelRegionForm();
		renderRegionList();
	} catch (err) {
		toast(err.message, 'err');
	} finally {
		btn.disabled = false;
		btn.innerHTML = `${iconSave()} Simpan`;
	}
}

async function deleteRegionItem(code, name) {
	const confirmed = await confirmDeleteRegion(code, name);
	if (!confirmed) return;

	try {
		await api(`/regions/${code}`, { method: 'DELETE' });
		toast(`Region ${code} berhasil dihapus!`);

		// Reload regions
		const regionsRes = await api('/regions');
		allRegions = regionsRes.data || [];
		populateRegionFilter();

		// Also reload sites (regionId will be set to null)
		const { data, meta } = await api('/sites?includeRegion=true');
		allSites = data;
		document.getElementById('hd-sites').textContent = meta.total;
		document.getElementById('hd-total').textContent = meta.total * 8;

		renderRegionList();
	} catch (err) {
		toast(err.message, 'err');
	}
}

function confirmDeleteRegion(code, name) {
	return new Promise(resolve => {
		const backdrop = document.createElement('div');
		backdrop.className = 'modal-backdrop open';
		backdrop.style.zIndex = '600';
		backdrop.innerHTML = `
      <div class="modal" style="max-width:400px;text-align:center">
        <div style="margin-bottom:16px">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </div>
          <h3 style="font-size:1rem;margin-bottom:6px">Hapus Region?</h3>
          <p style="font-size:.82rem;color:var(--text-2);line-height:1.5">
            Region <strong style="color:var(--cyan)">${esc(
							code
						)}</strong> — ${esc(name)}<br>
            <span style="color:var(--red);font-size:.72rem">Site yang terhubung akan kehilangan asosiasi region. Aksi ini tidak dapat dibatalkan.</span>
          </p>
        </div>
        <div style="display:flex;gap:8px;justify-content:center">
          <button class="btn btn-ghost" id="del-reg-cancel">Batal</button>
          <button class="btn btn-danger" id="del-reg-confirm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            Hapus
          </button>
        </div>
      </div>
    `;
		document.body.appendChild(backdrop);

		backdrop.querySelector('#del-reg-cancel').addEventListener('click', () => {
			backdrop.remove();
			resolve(false);
		});
		backdrop.querySelector('#del-reg-confirm').addEventListener('click', () => {
			backdrop.remove();
			resolve(true);
		});
		backdrop.addEventListener('click', e => {
			if (e.target === backdrop) {
				backdrop.remove();
				resolve(false);
			}
		});
	});
}

// ── Assign site to region ────────────────────────────────────────
function openAssignRegionModal(siteCode, currentRegionCode, currentRegionName) {
	// Build a simple modal for assigning region
	const backdrop = document.createElement('div');
	backdrop.className = 'modal-backdrop open';
	backdrop.style.zIndex = '500';
	backdrop.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title">Assign Region — ${siteCode}</div>
        <button class="modal-close" id="assign-close">&times;</button>
      </div>
      <div class="form-group">
        <label class="form-label">Region Saat Ini</label>
        <div style="font-size:.85rem;color:var(--text-2);margin-bottom:12px">
          ${
						currentRegionCode
							? `<span class="gc-region-badge">${esc(
									currentRegionCode
							  )}</span> ${esc(currentRegionName)}`
							: '<span style="color:var(--text-3)">Belum diassign</span>'
					}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="assign-region-select">Pilih Region</label>
        <select class="form-input region-select-modal" id="assign-region-select">
          <option value="">— Tanpa Region —</option>
          ${allRegions
						.map(
							r =>
								`<option value="${r.regionCode}" ${
									r.regionCode === currentRegionCode ? 'selected' : ''
								}>${esc(r.regionCode)} — ${esc(r.regionName)}</option>`
						)
						.join('')}
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="assign-cancel">Batal</button>
        <button class="btn btn-primary" id="assign-save">
          ${iconSave()} Simpan
        </button>
      </div>
    </div>
  `;
	document.body.appendChild(backdrop);

	const closeModal = () => {
		backdrop.remove();
	};

	backdrop.querySelector('#assign-close').addEventListener('click', closeModal);
	backdrop
		.querySelector('#assign-cancel')
		.addEventListener('click', closeModal);
	backdrop.addEventListener('click', e => {
		if (e.target === backdrop) closeModal();
	});

	backdrop.querySelector('#assign-save').addEventListener('click', async () => {
		const selectedCode = document.getElementById('assign-region-select').value;
		const selectedRegion = allRegions.find(r => r.regionCode === selectedCode);
		const regionId = selectedRegion ? selectedRegion.id : null;

		const btn = backdrop.querySelector('#assign-save');
		btn.disabled = true;
		btn.textContent = 'Menyimpan...';

		try {
			await api(`/sites/${siteCode}`, {
				method: 'PUT',
				body: JSON.stringify({ regionId }),
			});
			closeModal();
			toast('Region berhasil diassign!');

			// Reload sites
			const { data, meta } = await api('/sites?includeRegion=true');
			allSites = data;
			document.getElementById('hd-sites').textContent = meta.total;
			document.getElementById('hd-total').textContent = meta.total * 8;
			renderSidebar(filtered());

			// Reload detail if active
			if (activeCode === siteCode) {
				const { data: siteData } = await api(
					`/sites/${siteCode}?includeRegion=true`
				);
				renderDetail(siteData);
			}
		} catch (err) {
			toast(err.message, 'err');
			btn.disabled = false;
			btn.innerHTML = `${iconSave()} Simpan`;
		}
	});
}

// ── Logo upload modal ────────────────────────────────────────────
function openImageUploadModal(siteCode, siteName, hasImage) {
	const backdrop = document.createElement('div');
	backdrop.className = 'modal-backdrop open';
	backdrop.style.zIndex = '500';
	backdrop.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div class="modal-title">${hasImage ? 'Ganti' : 'Upload'} Gambar — ${esc(siteCode)}</div>
        <button class="modal-close" id="img-close">&times;</button>
      </div>
      <div id="img-upload-container">
        <div class="logo-upload-area" id="img-drop-area">
          ${iconUpload()}
          <div class="upload-text">Klik atau seret file gambar ke sini</div>
          <div class="upload-hint">Format: JPEG, PNG, GIF, WebP, SVG — Maks 5MB</div>
        </div>
        <input type="file" id="img-file-input" accept="image/*" style="display:none">
      </div>
      <div id="img-preview-container" style="display:none"></div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="img-cancel">Batal</button>
        <button class="btn btn-primary" id="img-save" disabled>
          ${iconUpload()} Upload Gambar
        </button>
      </div>
    </div>
  `;
	document.body.appendChild(backdrop);

	const dropArea = backdrop.querySelector('#img-drop-area');
	const fileInput = backdrop.querySelector('#img-file-input');
	const previewContainer = backdrop.querySelector('#img-preview-container');
	const uploadContainer = backdrop.querySelector('#img-upload-container');
	const saveBtn = backdrop.querySelector('#img-save');
	let selectedFile = null;

	// Click to browse
	dropArea.addEventListener('click', () => fileInput.click());

	// Drag and drop
	dropArea.addEventListener('dragover', (e) => {
		e.preventDefault();
		dropArea.classList.add('dragover');
	});
	dropArea.addEventListener('dragleave', () => {
		dropArea.classList.remove('dragover');
	});
	dropArea.addEventListener('drop', (e) => {
		e.preventDefault();
		dropArea.classList.remove('dragover');
		const file = e.dataTransfer.files[0];
		if (file && file.type.startsWith('image/')) {
			handleFileSelect(file);
		}
	});

	// File input change
	fileInput.addEventListener('change', () => {
		if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
	});

	function handleFileSelect(file) {
		if (file.size > 5 * 1024 * 1024) {
			toast('File terlalu besar. Maksimum 5MB.', 'err');
			return;
		}
		selectedFile = file;
		const reader = new FileReader();
		reader.onload = (e) => {
			uploadContainer.style.display = 'none';
			previewContainer.style.display = '';
			previewContainer.innerHTML = `
				<div class="logo-upload-preview">
					<img src="${e.target.result}" alt="Preview">
					<div class="file-info">
						<div class="file-name">${esc(file.name)}</div>
						<div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
					</div>
					<button class="tbl-btn" id="img-change-file">Ganti</button>
				</div>
			`;
			previewContainer.querySelector('#img-change-file').addEventListener('click', () => {
				selectedFile = null;
				uploadContainer.style.display = '';
				previewContainer.style.display = 'none';
				fileInput.value = '';
				saveBtn.disabled = true;
			});
			saveBtn.disabled = false;
		};
		reader.readAsDataURL(file);
	}

	// Close modal
	const closeModal = () => backdrop.remove();
	backdrop.querySelector('#img-close').addEventListener('click', closeModal);
	backdrop.querySelector('#img-cancel').addEventListener('click', closeModal);
	backdrop.addEventListener('click', (e) => {
		if (e.target === backdrop) closeModal();
	});

	// Save / Upload
	saveBtn.addEventListener('click', async () => {
		if (!selectedFile) return;
		saveBtn.disabled = true;
		saveBtn.textContent = 'Mengunggah...';

		try {
			const formData = new FormData();
			formData.append('image', selectedFile);

			const res = await fetch(`${API_BASE}/sites/${siteCode}`, {
				method: 'PUT',
				credentials: 'same-origin',
				body: formData,
			});
			if (res.status === 401) {
				window.location.replace('/login');
				return;
			}
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);

			closeModal();
			toast('Gambar berhasil diupload!');

			// Reload data
			const { data, meta } = await api('/sites?includeRegion=true');
			allSites = data;
			renderSidebar(filtered());
			if (activeCode === siteCode) {
				const { data: siteData } = await api(`/sites/${siteCode}?includeRegion=true`);
				renderDetail(siteData);
			}
		} catch (err) {
			toast(err.message, 'err');
			saveBtn.disabled = false;
			saveBtn.innerHTML = `${iconUpload()} Upload Gambar`;
		}
	});
}

// ── Global Logo ──────────────────────────────────────────────────
async function loadGlobalLogo() {
	try {
		const res = await fetch(`${API_BASE}/settings/logo/info`);
		const data = await res.json().catch(() => ({}));
		if (data.status === 'success' && data.data.hasLogo) {
			const logoBox = document.getElementById('app-logo-box');
			logoBox.style.borderStyle = 'solid';
			// Menggunakan timestamp pembaruan terakhir agar gambar bisa di-cache browser dengan aman!
			const cacheBuster = data.data.updatedAt || Date.now();
			logoBox.innerHTML = `<img src="${data.data.logoUrl}?t=${cacheBuster}" alt="Master IP Logo">`;
		}
	} catch (err) {
		console.error('Failed to load global logo info:', err);
	}
}

function openGlobalLogoModal() {
	const backdrop = document.createElement('div');
	backdrop.className = 'modal-backdrop open';
	backdrop.style.zIndex = '600';
	backdrop.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div class="modal-header">
        <div class="modal-title">Ganti Logo Aplikasi Utama</div>
        <button class="modal-close" id="glogo-close">&times;</button>
      </div>
      <div id="glogo-upload-container">
        <div class="logo-upload-area" id="glogo-drop-area">
          ${iconUpload()}
          <div class="upload-text">Klik atau seret file logo ke sini</div>
          <div class="upload-hint">Format: JPEG, PNG, GIF, WebP, SVG — Maks 5MB</div>
        </div>
        <input type="file" id="glogo-file-input" accept="image/*" style="display:none">
      </div>
      <div id="glogo-preview-container" style="display:none"></div>
      <div class="modal-footer" style="justify-content: space-between;">
        <button class="btn btn-ghost" style="color:var(--red);" id="glogo-delete">Hapus Logo</button>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost" id="glogo-cancel">Batal</button>
          <button class="btn btn-primary" id="glogo-save" disabled>
            ${iconUpload()} Upload
          </button>
        </div>
      </div>
    </div>
  `;
	document.body.appendChild(backdrop);

	const dropArea = backdrop.querySelector('#glogo-drop-area');
	const fileInput = backdrop.querySelector('#glogo-file-input');
	const previewContainer = backdrop.querySelector('#glogo-preview-container');
	const uploadContainer = backdrop.querySelector('#glogo-upload-container');
	const saveBtn = backdrop.querySelector('#glogo-save');
	const deleteBtn = backdrop.querySelector('#glogo-delete');
	let selectedFile = null;

	// Click to browse
	dropArea.addEventListener('click', () => fileInput.click());

	// Drag and drop
	dropArea.addEventListener('dragover', (e) => {
		e.preventDefault();
		dropArea.classList.add('dragover');
	});
	dropArea.addEventListener('dragleave', () => {
		dropArea.classList.remove('dragover');
	});
	dropArea.addEventListener('drop', (e) => {
		e.preventDefault();
		dropArea.classList.remove('dragover');
		const file = e.dataTransfer.files[0];
		if (file && file.type.startsWith('image/')) {
			handleFileSelect(file);
		}
	});

	// File input change
	fileInput.addEventListener('change', () => {
		if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
	});

	function handleFileSelect(file) {
		if (file.size > 5 * 1024 * 1024) {
			toast('File terlalu besar. Maksimum 5MB.', 'err');
			return;
		}
		selectedFile = file;
		const reader = new FileReader();
		reader.onload = (e) => {
			uploadContainer.style.display = 'none';
			previewContainer.style.display = '';
			previewContainer.innerHTML = `
				<div class="logo-upload-preview">
					<img src="${e.target.result}" alt="Preview">
					<div class="file-info">
						<div class="file-name">${esc(file.name)}</div>
						<div class="file-size">${(file.size / 1024).toFixed(1)} KB</div>
					</div>
					<button class="tbl-btn" id="glogo-change-file">Ganti</button>
				</div>
			`;
			previewContainer.querySelector('#glogo-change-file').addEventListener('click', () => {
				selectedFile = null;
				uploadContainer.style.display = '';
				previewContainer.style.display = 'none';
				fileInput.value = '';
				saveBtn.disabled = true;
			});
			saveBtn.disabled = false;
		};
		reader.readAsDataURL(file);
	}

	// Close modal
	const closeModal = () => backdrop.remove();
	backdrop.querySelector('#glogo-close').addEventListener('click', closeModal);
	backdrop.querySelector('#glogo-cancel').addEventListener('click', closeModal);
	backdrop.addEventListener('click', (e) => {
		if (e.target === backdrop) closeModal();
	});

	// Save / Upload
	saveBtn.addEventListener('click', async () => {
		if (!selectedFile) return;
		saveBtn.disabled = true;
		saveBtn.textContent = 'Mengunggah...';

		try {
			const formData = new FormData();
			formData.append('logo', selectedFile);

			const res = await fetch(`${API_BASE}/settings/logo`, {
				method: 'PUT',
				credentials: 'same-origin',
				body: formData,
			});
			if (res.status === 401) {
				window.location.replace('/login');
				return;
			}
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);

			closeModal();
			toast('Logo aplikasi berhasil diupload!');
			loadGlobalLogo();
		} catch (err) {
			toast(err.message, 'err');
			saveBtn.disabled = false;
			saveBtn.innerHTML = `${iconUpload()} Upload`;
		}
	});

	// Delete
	deleteBtn.addEventListener('click', async () => {
		const confirmed = confirm('Yakin ingin menghapus logo aplikasi?');
		if (!confirmed) return;

		try {
			await fetch(`${API_BASE}/settings/logo`, {
				method: 'DELETE',
				credentials: 'same-origin',
			});
			closeModal();
			toast('Logo berhasil dihapus');
			const logoBox = document.getElementById('app-logo-box');
			logoBox.style.borderStyle = 'dashed';
			logoBox.innerHTML = `
				<div class="app-logo-placeholder">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
				</div>
			`;
		} catch (err) {
			toast(err.message, 'err');
		}
	});
}

// ── Start ───────────────────────────────────────────────────────
init();
