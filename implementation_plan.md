# Master IP — Rencana Implementasi Full-Stack ✅ SIAP EKSEKUSI

## Latar Belakang

Saat ini aplikasi Master IP masih berupa single HTML file dengan data hardcoded.
Kita akan refactor menjadi full-stack production-grade application dimana:

- **Mobile app** akan consume REST API untuk mendapatkan data IP per site
- **Web dashboard** tetap ada sebagai management view, tapi kini fetch data dari API
- Data IP **statis tapi tersimpan di database** — mudah di-update jika ada perubahan IP tanpa deploy ulang kode

---

## Proposed Changes

### Arsitektur Keseluruhan

```
master-site/
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── routes/
│   │       │   ├── sites.routes.js
│   │       │   └── health.routes.js
│   │       └── index.js
│   ├── config/
│   │   ├── database.js          # Prisma client instance
│   │   └── env.js               # validated env vars
│   ├── controllers/
│   │   └── sites.controller.js
│   ├── services/
│   │   └── sites.service.js     # business logic
│   ├── middlewares/
│   │   ├── errorHandler.js      # global error handler
│   │   ├── notFound.js
│   │   └── requestLogger.js
│   └── utils/
│       ├── logger.js            # Pino logger
│       └── response.js          # standard API response wrapper
├── prisma/
│   ├── schema.prisma            # DB schema
│   └── seed.js                  # auto-seed 22 sites + 8 apps
├── public/
│   └── index.html               # frontend (fetch dari API)
├── .env.example
├── .gitignore
├── package.json
└── server.js                    # entry point
```

---

### [NEW] Database Schema — `prisma/schema.prisma`

**3 tabel utama:**

| Tabel | Fungsi |
|-------|--------|
| `Site` | 22 titik lokasi |
| `AppType` | 8 jenis/tipe (Router, BMS, BLM, dll) |
| `SiteIp` | Relasi: IP per app per site (22×8 = 176 rows) |

```
Site (id, site_code, site_name, block_ip, description)
  └── SiteIp[] (ip_address, subnet, port, note)
         └── AppType (key, name, type: SERVER|APP, sort_order, is_highlighted)
```

---

### [NEW] REST API Endpoints

**Base URL:** `/api/v1`

| Method | Endpoint | Keterangan | Dipakai Mobile |
|--------|----------|------------|----------------|
| `GET` | `/health` | Health check | ✓ |
| `GET` | `/api/v1/sites` | List semua site (ringkas) | ✓ |
| `GET` | `/api/v1/sites/:code` | Detail site + semua IP | ✓ |
| `GET` | `/api/v1/sites/:code/ips` | IP list saja (lightweight) | ✓ |
| `GET` | `/api/v1/sites/:code/ips/:appKey` | IP spesifik 1 app | ✓ |

**Contoh response `GET /api/v1/sites/SITE-01`:**
```json
{
  "status": "success",
  "data": {
    "siteCode": "SITE-01",
    "siteName": "Site 1",
    "blockIp": "172.27.0.0/27",
    "ips": [
      { "appKey": "router", "appName": "Proxmox Router Gateway", "type": "SERVER", "ip": "172.27.0.1", "subnet": "/27", "fullIp": "172.27.0.1/27" },
      { "appKey": "bms",    "appName": "BMS", "type": "APP", "ip": "172.27.0.4", "subnet": "/27", "fullIp": "172.27.0.4/27", "highlighted": false },
      { "appKey": "eyesee", "appName": "EYESEE", "type": "APP", "ip": "172.27.0.6", "subnet": "/27", "fullIp": "172.27.0.6/27", "highlighted": true }
    ]
  }
}
```

---

### Tech Stack Detail

| Layer | Library | Alasan |
|-------|---------|--------|
| Runtime | Node.js 24 | Latest, native fetch built-in, V8 terbaru |
| Framework | Express.js 4 | Mature, battle-tested, ekosistem luas |
| ORM | Prisma | Type-safe, migrations mudah, seeder built-in |
| Database | PostgreSQL 15+ | Reliable, performa bagus |
| Logger | Pino | Fastest Node.js logger, structured JSON log |
| Validation | Zod | Runtime validation + type inference |
| CORS | cors | Wajib untuk mobile API |
| Rate Limit | express-rate-limit | Protect API dari abuse |
| Env | dotenv + envalid | Validated environment variables |
| Dev | nodemon | Auto-reload development |

---

### [MODIFY] Frontend `public/index.html`

Perubahan dari versi sebelumnya:
- **Hapus welcome screen + globe icon** — langsung tampilkan Site 1 saat load
- **Hapus hardcoded data** — semua data fetch dari `GET /api/v1/sites`
- **Fix search bug** — search di-handle dengan filter pada array hasil fetch, bukan DOM manipulation
- **Loading state** — tambah skeleton loader saat fetch API
- **Auto-select site pertama** — UX lebih langsung to the point

---

## Keputusan Final (Semua Resolved)

| Topik | Keputusan |
|-------|-----------|
| **Nama Site** | "Site 1" — "Site 22" (update via DB jika berubah) |
| **PostgreSQL** | Localhost yang sudah ada, DB name: `master_ip_db` |
| **Port Server** | `3003` |
| **API Security** | **API Key** via header `X-API-Key` — simpel, tepat untuk internal |
| **`highlighted` field** | **Dipertahankan** — penanda visual untuk EYESEE di mobile UI |
| **Node.js** | **v24** |

> [!NOTE]
> Field `highlighted: true` hanya ada pada EYESEE. Mobile developer bisa pakai ini untuk memberi warna/style berbeda pada EYESEE di UI mereka — sesuai dengan Excel yang meng-highlight baris EYESEE dengan warna kuning.

---

## Verification Plan

### Automated
- `npm run dev` → server berjalan tanpa error di port 3003
- `GET /health` → `{ status: "ok" }`
- `GET /api/v1/sites` → 22 sites (tanpa API Key → 401)
- `GET /api/v1/sites` dengan header `X-API-Key` → 22 sites
- `GET /api/v1/sites/SITE-01` → data lengkap 8 IPs
- Frontend tampil dan auto-load Site 1

### Manual
- Test di browser: pilih berbagai site, search berfungsi
- Test dengan Postman/curl untuk semua endpoints
- Pastikan CORS header muncul untuk simulasi mobile request

