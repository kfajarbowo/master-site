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
- **Body Request:** (Bergantung pada implementasi dashboard Anda, misal username & password atau metode lain yang digunakan).
- **Contoh Pemanggilan:**
```bash
curl -X POST http://localhost:3003/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password123"}'
```

### 1.2 Cek Info Session Saat Ini
- **Endpoint:** `GET /api/v1/auth/me`
- **Deskripsi:** Memeriksa status sesi yang aktif.
- **Contoh Pemanggilan:**
```bash
curl -X GET http://localhost:3003/api/v1/auth/me -b "connect.sid=..."
```

### 1.3 Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Deskripsi:** Menghapus atau mengakhiri sesi.
- **Contoh Pemanggilan:**
```bash
curl -X POST http://localhost:3003/api/v1/auth/logout -b "connect.sid=..."
```

---

## 🌐 2. Sites & IP Data - READ (GET)

> **Catatan Authentication:** Anda bisa menyisipkan header `-H "X-API-Key: SECRET_KEY"` pada *curl* di bawah ini atau membukanya di browser jika sudah login.

### 2.1 Get All Sites
- **Endpoint:** `GET /api/v1/sites`
- **Deskripsi:** Mengambil list semua *site* yang terdaftar.
- **Contoh Pemanggilan:**
```bash
# Mengambil daftar seluruh site
curl -X GET http://localhost:3003/api/v1/sites -H "X-API-Key: mysecretkey"
```

### 2.2 Get Single Site Detail
- **Endpoint:** `GET /api/v1/sites/{siteCode}`
- **Deskripsi:** Mengambil detail informasi lengkap untuk satu *site* beserta relasi daftar IP aplikasinya.
- **Contoh Pemanggilan:**
```bash
# Mengambil detail untuk site dengan kode "SITE-01"
curl -X GET http://localhost:3003/api/v1/sites/SITE-01 -H "X-API-Key: mysecretkey"
```

### 2.3 Get Site IPs Only
- **Endpoint:** `GET /api/v1/sites/{siteCode}/ips`
- **Deskripsi:** Hanya mengambil list *IP aplikasi* dari sebuah *site*, tanpa metadata utamanya.
- **Contoh Pemanggilan:**
```bash
# Mengambil daftar IP untuk site "SITE-02"
curl -X GET http://localhost:3003/api/v1/sites/SITE-02/ips -H "X-API-Key: mysecretkey"
```

### 2.4 Get Specific App IP for a Site
- **Endpoint:** `GET /api/v1/sites/{siteCode}/ips/{appKey}`
- **Deskripsi:** Mengambil IP spesifik untuk satu jenis aplikasi di satu *site*.
- **Contoh Pemanggilan:**
```bash
# Mengambil alamat IP "eyesee" untuk site "SITE-03"
curl -X GET http://localhost:3003/api/v1/sites/SITE-03/ips/eyesee -H "X-API-Key: mysecretkey"
```

---

## ✏️ 3. Sites & IP Data - MODIFY (CRUD)

### 3.1 Create New Site
- **Endpoint:** `POST /api/v1/sites`
- **Deskripsi:** Mendaftarkan *site* baru. Fields `siteCode`, `siteName`, dan `blockIp` bersifat **wajib (*required*)**.
- **Contoh Pemanggilan:**
```bash
curl -X POST http://localhost:3003/api/v1/sites \
     -H "Content-Type: application/json" \
     -H "X-API-Key: mysecretkey" \
     -d '{
           "siteCode": "SITE-04",
           "siteName": "Site 04 Area",
           "blockIp": "192.168.5.0/24",
           "description": "Kantor cabang khusus SITE-04"
         }'
```

### 3.2 Update Site Metadata
- **Endpoint:** `PUT /api/v1/sites/{siteCode}`
- **Deskripsi:** Mengubah *metadata* umum dari target *site*.
- **Contoh Pemanggilan:**
```bash
# Mengubah deskripsi site "SITE-04"
curl -X PUT http://localhost:3003/api/v1/sites/SITE-04 \
     -H "Content-Type: application/json" \
     -H "X-API-Key: mysecretkey" \
     -d '{
           "siteName": "Site 04 Area (Updated)",
           "description": "Perubahan nama dan fasilitas"
         }'
```

### 3.3 Update Specific Site IP Detail
- **Endpoint:** `PATCH /api/v1/sites/{siteCode}/ips/{appKey}`
- **Deskripsi:** Memperbarui data untuk satu IP aplikasi tertentu di dalam *site*.
- **Contoh Pemanggilan:**
```bash
# Memperbarui alamat IP "eyesee" untuk site "SITE-01"
curl -X PATCH http://localhost:3003/api/v1/sites/SITE-01/ips/eyesee \
     -H "Content-Type: application/json" \
     -H "X-API-Key: mysecretkey" \
     -d '{
           "ipAddress": "192.168.1.15",
           "serverName": "Eyesee Server Master 1"
         }'
```

### 3.4 Delete Site
- **Endpoint:** `DELETE /api/v1/sites/{siteCode}`
- **Deskripsi:** Menghapus data *site* beserta seliputannya.
- **Contoh Pemanggilan:**
```bash
# Menghapus site "SITE-04" berserta konfig IP-nya
curl -X DELETE http://localhost:3003/api/v1/sites/SITE-04 -H "X-API-Key: mysecretkey"
```

---

## ⚙️ 4. System / Utility Health Check

### 4.1 Health Check
- **Endpoint:** `GET /health`
- **Deskripsi:** Pengecekan status (tanpa otorisasi / publik). Sangat berguna bagi *load balancer* atau *monitoring tool*.
- **Contoh Pemanggilan:**
```bash
curl -X GET http://localhost:3003/health
```

### 4.2 Utility Root
- **Endpoint:** `GET /api/v1/`
- **Deskripsi:** Mengembalikan summary umum URL layanan.
- **Contoh Pemanggilan:**
```bash
curl -X GET http://localhost:3003/api/v1/
```
