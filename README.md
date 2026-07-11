# AGRI-MOTION Backend 🚀

Sistem Monitoring Smart Farming berbasis Internet of Things (IoT) yang dibangun menggunakan NestJS, Prisma ORM, PostgreSQL, dan protokol MQTT.

## 📌 Status Terkini (Sampai Sprint 2)

Backend ini sudah sepenuhnya siap menerima koneksi dan data dari perangkat IoT (ESP32) dan menyediakan REST API untuk aplikasi Flutter. Berikut adalah rangkuman fitur yang sudah berjalan:

### 1. Keamanan & Fondasi (Sprint 1)
- **Authentication**: JWT Login & Register (`/auth/login`, `/auth/register`).
- **Authorization**: Endpoint penting (`/users`, `/farms`, `/devices`, dll) dilindungi oleh `JwtAuthGuard`.
- **Security**: Dilengkapi dengan Helmet dan Rate Limiting (Throttler) untuk mencegah serangan DDoS ringan.
- **Validasi Environment**: Konfigurasi di validasi menggunakan Joi (Server tidak akan menyala jika `DATABASE_URL` atau `JWT_SECRET` kosong).
- **Error Handling & Response**: Menggunakan *Global Exception Filter* dan *Transform Interceptor* untuk memastikan format response API selalu seragam (`{ success, message, data, meta }`).

### 2. IoT & Monitoring Engine (Sprint 2)
- **Arsitektur MQTT**: Sudah dipisahkan menjadi *Connection*, *Subscriber*, dan *Handler* yang sangat rapi.
- **Validasi Data IoT**: Mencegah masuknya data sensor abal-abal menggunakan DTO dan `class-validator`. Jika suhu, kelembapan, NPK diluar nalar, sistem akan memblokir otomatis.
- **Device Status (Online/Offline)**: 
  - Menggunakan **LWT (Last Will Topic)** MQTT agar status device langsung menjadi `OFFLINE` saat terputus.
  - Menggunakan **Heartbeat Cron Job** (berjalan setiap menit) untuk mendeteksi device yang "tersangkut" `ONLINE` tapi sudah tidak mengirim data >15 menit.
- **Optimasi Endpoint Monitoring**:
  - `GET /devices/status`: Endpoint khusus untuk *dashboard* Flutter yang merangkum Total Online/Offline, baterai, sinyal, dan waktu terakhir aktif (*Last Seen*).
  - `GET /telemetry/history`: Tersedia dengan fitur *Pagination* yang kencang, Filter, dan Sort, serta didukung *Composite Indexing* pada tabel PostgreSQL agar data besar tidak lemot.

---

## 🎯 Target Selanjutnya (Sprint 3: Deployment & Frontend Integration)

Untuk tim yang melanjutkan pekerjaan malam ini, target utama monitoring sudah siap di sisi *backend logic*. Fokus pekerjaan selanjutnya adalah **Integrasi & Deployment**.

### Yang Perlu Dikerjakan:
1. **Frontend Integration (Flutter)**
   - Sambungkan Flutter App ke endpoint `/auth/login` (simpan Token).
   - Tampilkan *summary* perangkat di dashboard dengan `/devices/status`.
   - Tampilkan riwayat sensor / grafik dengan memanggil `/telemetry/history?page=1&limit=50&sort=desc`.
2. **ESP32 Firmware Flash**
   - Pastikan *code* ESP32 C++ menembak payload MQTT berupa JSON ke topik: `agrimotion/device/NAMADEVICE/telemetry`.
   - Pastikan ESP32 mengirim LWT string `OFFLINE` ke `agrimotion/device/NAMADEVICE/status`.
3. **VPS Deployment (Ubuntu)**
   - Instal EMQX MQTT Broker di VPS.
   - Sesuaikan `docker-compose.yml` untuk mode production (gabungkan PostgreSQL dan Backend image).
   - Set Nginx sebagai Reverse Proxy agar API bisa diakses melalui HTTPS.

---

## 💻 Cara Menjalankan Project (Local Development)

### 1. Persiapan
Pastikan sudah menginstal:
- [Node.js](https://nodejs.org/) (v20+ disarankan)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Docker](https://www.docker.com/) (Untuk Database)

### 2. Setup Environment
Duplikat file `.env.example` menjadi `.env`.
```bash
cp .env.example .env
```
Pastikan `DATABASE_URL` mengarah ke localhost port **5433** (agar tidak tabrakan dengan port default laptop).

### 3. Install & Start Database
```bash
pnpm install
# Menjalankan PostgreSQL via Docker Compose
docker-compose up -d 
```

### 4. Migrasi & Seeding Database
Lakukan migrasi skema dan isi data awalan (Admin, Farm, Device).
```bash
npx prisma migrate dev
pnpm run db:seed
```
*Catatan: Akun admin default adalah `admin@agrimotion.id` | Password: `admin123`*

### 5. Jalankan Backend
```bash
pnpm run start:dev
```
Backend akan berjalan di `http://localhost:3001`.
Swagger Docs bisa diakses di `http://localhost:3001/api`.

### 6. Jalankan Simulator MQTT (Opsional)
Untuk menguji masuknya data seolah-olah dari ESP32 (Pastikan broker mqtt lokal / mosquitto berjalan di port 1883).
```bash
pnpm run simulate
```

Selamat melanjutkan! 🔥
