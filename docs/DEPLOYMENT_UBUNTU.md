# AGRI-MOTION Production Deployment Guide (Ubuntu VPS)

Panduan komprehensif ini menjelaskan langkah-langkah *deployment* backend AGRI-MOTION ke Cloud VPS Ubuntu kosong hingga siap menerima request API dan koneksi MQTT dari perangkat IoT.

## 1. Persiapan VPS Ubuntu
Pastikan Anda memiliki VPS dengan OS **Ubuntu 22.04 LTS** atau yang lebih baru, dengan RAM minimal 2GB.

### 1.1. Update Sistem & Install Git
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw
```

### 1.2. Install Docker & Docker Compose
Instal Docker Engine resmi dari repositori Docker:
```bash
# Add Docker's official GPG key
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install Docker packages
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Enable Docker on startup
sudo systemctl enable docker
sudo systemctl start docker
```

## 2. Clone Repository & Konfigurasi
Masuk ke direktori home, dan clone repository backend.
```bash
cd ~
git clone https://github.com/PPK-Ormawa-BEMFMIPAUNUD/agrimotion-backend.git
cd agrimotion-backend
```

Buat file konfigurasi `.env.production`:
```bash
cp .env.example .env.production
nano .env.production
```
Ubah isinya sesuai environment VPS. **Penting:** 
- `DATABASE_URL="postgresql://agrimotion:agrimotion_pass@postgres:5432/agrimotion?schema=public"` (Gunakan `postgres` sebagai host karena terhubung dalam Docker Network).
- Ganti `JWT_SECRET` dengan string acak yang kuat.
- Pastikan `NODE_ENV=production`.

## 3. Deployment

Menjalankan infrastruktur sangat mudah karena kita menggunakan arsitektur *containerized* (Multi-stage Dockerfile + Compose).

```bash
# Beri akses eksekusi pada script deployment
chmod +x deploy/scripts/*.sh

# Jalankan script deployment otomatis
./deploy/scripts/deploy.sh
```
Proses ini akan mem-build image Node.js secara efisien (menggunakan Alpine) dan menjalankan Nginx, PostgreSQL, EMQX, PgAdmin, serta NestJS Backend.

## 4. Setup Database Production
Setelah semua container berjalan (cek dengan `docker ps`), lakukan migrasi skema database.

```bash
./deploy/scripts/migration.sh
```

*(Opsional)* Jika ini pertama kali dan Anda butuh akun admin default, jalankan seeder:
```bash
docker exec -it agrimotion_backend npx prisma db seed
```

## 5. Konfigurasi Firewall (UFW)
Buka port yang dibutuhkan agar dapat diakses dari internet.
```bash
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP Nginx (API & Dashboard)
sudo ufw allow 443     # HTTPS (Jika nanti pakai SSL)
sudo ufw allow 1883    # MQTT TCP (Untuk ESP32)
sudo ufw allow 8083    # MQTT WebSockets
sudo ufw enable
```

## 6. Selesai! 🎉
Aplikasi Anda kini sudah *online*. 
- **API Endpoint:** `http://<IP_VPS>/`
- **Swagger Docs:** `http://<IP_VPS>/api`
- **MQTT Broker:** `<IP_VPS>:1883`

## Manajemen & Maintenance

- **Cek Status Sistem:** Buka `http://<IP_VPS>/system/info` (menampilkan RAM, CPU, dan status MQTT/DB).
- **Cek Health:** Buka `http://<IP_VPS>/health`
- **Backup Database:** Jalankan `./deploy/scripts/backup.sh` (Akan disimpan di folder `/backups`).
- **Restore Database:** Jalankan `./deploy/scripts/restore.sh ./backups/nama_file_backup.sql`
- **Lihat Log Backend:** `docker logs -f agrimotion_backend`
