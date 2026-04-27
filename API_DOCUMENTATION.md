# Master IP Application - API Documentation

Base URL: `http://localhost:<PORT>` (Default: `http://localhost:3003`)  
Global Prefix: `/api/v1`

## 🔐 1. Authentication (`/api/v1/auth`)

Sistem API mendukung dua jenis autentikasi:
1. **Session Cookies** (Digunakan otomatis jika Anda login melalui browser dashboard).
2. **API Key** (Digunakan oleh layanan server/cli pihak ketiga dengan Header `X-API-Key: <YOUR_API_KEY>`).

### 1.1 Login (Browser Dashboard)
- **Endpoint:** `POST /api/v1/auth/login`
- **Deskripsi:** Membuka sesi (session) browser untuk pengguna.
- **Contoh Pemanggilan:**
```bash
curl -X POST http://localhost:3003/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password123"}'
```

### 1.2 Cek Info Session Saat Ini
- **Endpoint:** `GET /api/v1/auth/me`
- **Contoh Pemanggilan:**
```bash
curl -X GET http://localhost:3003/api/v1/auth/me -b "connect.sid=..."
```

### 1.3 Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Contoh Pemanggilan:**
```bash
curl -X POST http://localhost:3003/api/v1/auth/logout -b "connect.sid=..."
```

---

## 🌐 2. Sites & IP Data — Site-Centric (`/api/v1/sites`)

> **Auth:** GET = public | POST/PUT/PATCH/DELETE = session or API key

### 2.1 Get All Sites
- **Endpoint:** `GET /api/v1/sites`
- **Query Filters (opsional):**
  - `?type=SERVER` — hanya tampilkan IP bertipe SERVER
  - `?type=APP` — hanya tampilkan IP bertipe APP
  - `?app=bms` — hanya tampilkan IP untuk app key tertentu
  - Bisa dikombinasi: `?type=APP&app=bms`
- **Contoh Pemanggilan:**
```bash
# Semua sites + semua IP
curl http://localhost:3003/api/v1/sites

# Semua sites, tapi hanya IP bertipe SERVER
curl http://localhost:3003/api/v1/sites?type=SERVER

# Semua sites, tapi hanya IP untuk app BMS
curl http://localhost:3003/api/v1/sites?app=bms
```

### 2.2 Get Single Site Detail
- **Endpoint:** `GET /api/v1/sites/{siteCode}`
```bash
curl http://localhost:3003/api/v1/sites/SITE-01
```

### 2.3 Get Site IPs Only
- **Endpoint:** `GET /api/v1/sites/{siteCode}/ips`
```bash
curl http://localhost:3003/api/v1/sites/SITE-02/ips
```

### 2.4 Get Specific App IP for a Site
- **Endpoint:** `GET /api/v1/sites/{siteCode}/ips/{appKey}`
```bash
curl http://localhost:3003/api/v1/sites/SITE-03/ips/eyesee
```

---

## 📱 3. App-Centric API (`/api/v1/apps`) — **NEW**

> Endpoint ini di-design khusus agar mudah dikonsumsi oleh masing-masing aplikasi (VComm, BMS, EyeSee, dll).  
> Semua endpoint ini **read-only** dan **public** (tanpa auth).

### 3.1 List All App Types
- **Endpoint:** `GET /api/v1/apps`
- **Query Filters (opsional):**
  - `?type=SERVER` — hanya app bertipe SERVER (Router, Proxmox, Storage)
  - `?type=APP` — hanya app bertipe APP (Maps, BMS, BLM, EyeSee, Chat)
- **Contoh Pemanggilan:**
```bash
# List semua app types
curl http://localhost:3003/api/v1/apps

# Hanya app types bertipe APP
curl http://localhost:3003/api/v1/apps?type=APP
```
- **Response:**
```json
{
  "status": "success",
  "data": [
    { "key": "router",  "name": "Gateway",  "type": "SERVER", "sortOrder": 1, "highlighted": false, "totalSites": 22 },
    { "key": "bms",     "name": "Battle Management System", "type": "APP", "sortOrder": 4, "highlighted": false, "totalSites": 22 },
    ...
  ],
  "meta": { "total": 8 }
}
```

### 3.2 Get All IPs for a Specific App
- **Endpoint:** `GET /api/v1/apps/{appKey}`
- **Query Filters (opsional):**
  - `?site=SITE-01` — filter ke satu site saja
- **Use Case:** Aplikasi VComm ingin tahu semua IP Chat di semua site → `GET /api/v1/apps/chat`
- **Contoh Pemanggilan:**
```bash
# Semua IP BMS di semua 22 site
curl http://localhost:3003/api/v1/apps/bms

# Semua IP EyeSee, filter hanya SITE-05
curl http://localhost:3003/api/v1/apps/eyesee?site=SITE-05
```
- **Response:**
```json
{
  "status": "success",
  "data": {
    "appKey": "bms",
    "appName": "Battle Management System",
    "type": "APP",
    "total": 22,
    "sites": [
      { "siteCode": "SITE-01", "siteName": "Site 1", "blockIp": "172.27.0.0/27", "ip": "172.27.0.4", "subnet": "/27", "fullIp": "172.27.0.4/27", "port": 8502, "note": null },
      { "siteCode": "SITE-02", "siteName": "Site 2", "blockIp": "172.27.0.32/27", "ip": "172.27.0.36", "subnet": "/27", "fullIp": "172.27.0.36/27", "port": 8502, "note": null },
      ...
    ]
  }
}
```

### 3.3 Get Specific App IP at Specific Site
- **Endpoint:** `GET /api/v1/apps/{appKey}/{siteCode}`
- **Use Case:** App BMS di laptop site 3 ingin tahu IP server BMS-nya → `GET /api/v1/apps/bms/SITE-03`
- **Contoh Pemanggilan:**
```bash
curl http://localhost:3003/api/v1/apps/bms/SITE-03
```
- **Response:**
```json
{
  "status": "success",
  "data": {
    "siteCode": "SITE-03",
    "siteName": "Site 3",
    "blockIp": "172.27.0.64/27",
    "appKey": "bms",
    "appName": "Battle Management System",
    "type": "APP",
    "highlighted": false,
    "ip": "172.27.0.68",
    "subnet": "/27",
    "fullIp": "172.27.0.68/27",
    "port": 8502,
    "note": null
  }
}
```

---

## ⚡ 4. Quick Lookup (`/api/v1/lookup`) — **NEW**

> Endpoint minimalis untuk konsumsi mesin/script. Hanya mengembalikan data esensial.

- **Endpoint:** `GET /api/v1/lookup?app={appKey}&site={siteCode}`
- **Both parameters required.**
- **Use Case:** Script deployment perlu tahu IP + port target → `GET /api/v1/lookup?app=bms&site=SITE-01`
- **Contoh Pemanggilan:**
```bash
curl http://localhost:3003/api/v1/lookup?app=bms&site=SITE-01
```
- **Response:**
```json
{
  "status": "success",
  "data": {
    "app": "bms",
    "site": "SITE-01",
    "ip": "172.27.0.4",
    "port": 8502,
    "subnet": "/27",
    "fullIp": "172.27.0.4/27",
    "host": "172.27.0.4:8502"
  }
}
```

---

## 📊 5. Summary / Statistics (`/api/v1/summary`) — **NEW**

- **Endpoint:** `GET /api/v1/summary`
- **Deskripsi:** Statistik dashboard — total sites, total IPs, breakdown per kategori dan app.
- **Contoh Pemanggilan:**
```bash
curl http://localhost:3003/api/v1/summary
```
- **Response:**
```json
{
  "status": "success",
  "data": {
    "totalSites": 22,
    "totalIps": 176,
    "categories": [
      { "type": "SERVER", "count": 3 },
      { "type": "APP",    "count": 5 }
    ],
    "apps": [
      { "key": "router",  "name": "Gateway",                  "type": "SERVER", "totalSites": 22 },
      { "key": "proxmox", "name": "Proxmox Server",           "type": "SERVER", "totalSites": 22 },
      { "key": "bms",     "name": "Battle Management System", "type": "APP",    "totalSites": 22 },
      ...
    ]
  }
}
```

---

## ✏️ 6. Sites & IP Data — MODIFY (CRUD)

> **Auth required:** Session cookie atau `X-API-Key` header.

### 6.1 Create New Site
- **Endpoint:** `POST /api/v1/sites`
- **Required Fields:** `siteCode`, `siteName`, `blockIp`
```bash
curl -X POST http://localhost:3003/api/v1/sites \
     -H "Content-Type: application/json" \
     -H "X-API-Key: mysecretkey" \
     -d '{ "siteCode": "SITE-23", "siteName": "Site 23", "blockIp": "172.27.2.192/27" }'
```

### 6.2 Update Site Metadata
- **Endpoint:** `PUT /api/v1/sites/{siteCode}`
```bash
curl -X PUT http://localhost:3003/api/v1/sites/SITE-23 \
     -H "Content-Type: application/json" \
     -H "X-API-Key: mysecretkey" \
     -d '{ "siteName": "Site 23 (Updated)", "description": "New description" }'
```

### 6.3 Update Specific Site IP
- **Endpoint:** `PATCH /api/v1/sites/{siteCode}/ips/{appKey}`
```bash
curl -X PATCH http://localhost:3003/api/v1/sites/SITE-01/ips/eyesee \
     -H "Content-Type: application/json" \
     -H "X-API-Key: mysecretkey" \
     -d '{ "ipAddress": "192.168.1.15", "port": 3001 }'
```

### 6.4 Delete Site
- **Endpoint:** `DELETE /api/v1/sites/{siteCode}`
```bash
curl -X DELETE http://localhost:3003/api/v1/sites/SITE-23 -H "X-API-Key: mysecretkey"
```

---

## ⚙️ 7. System / Utility

### 7.1 Health Check
- **Endpoint:** `GET /health`
```bash
curl http://localhost:3003/health
```

### 7.2 API Root Info
- **Endpoint:** `GET /api/v1/`
```bash
curl http://localhost:3003/api/v1/
```

---

## 📋 Quick Reference Table

| Endpoint | Method | Auth | Deskripsi |
|---|---|---|---|
| `/api/v1/apps` | GET | ❌ | List semua app types |
| `/api/v1/apps/:appKey` | GET | ❌ | Semua IP untuk satu app |
| `/api/v1/apps/:appKey/:siteCode` | GET | ❌ | IP app di site tertentu |
| `/api/v1/lookup?app=...&site=...` | GET | ❌ | Quick lookup (minimal) |
| `/api/v1/summary` | GET | ❌ | Statistik dashboard |
| `/api/v1/sites` | GET | ❌ | List semua sites |
| `/api/v1/sites?type=APP` | GET | ❌ | Sites filtered by IP type |
| `/api/v1/sites?app=bms` | GET | ❌ | Sites filtered by app |
| `/api/v1/sites/:code` | GET | ❌ | Detail satu site |
| `/api/v1/sites/:code/ips` | GET | ❌ | IP list per site |
| `/api/v1/sites/:code/ips/:appKey` | GET | ❌ | IP spesifik per app per site |
| `/api/v1/sites` | POST | ✅ | Buat site baru |
| `/api/v1/sites/:code` | PUT | ✅ | Update metadata site |
| `/api/v1/sites/:code/ips/:appKey` | PATCH | ✅ | Update IP spesifik |
| `/api/v1/sites/:code` | DELETE | ✅ | Hapus site |
