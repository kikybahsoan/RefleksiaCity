# 🏙️ Kota Refleksia - Kota Virtual Isometrik Pembelajaran Siswa SMK/SMA

Selamat datang di **Kota Refleksia**, media pembelajaran interaktif berbasis kota virtual 2.5D isometrik dengan gaya visual vektor datar pastel. Siswa mengeksplorasi 8 bangunan tematik, menyelesaikan refleksi bermakna, berdiskusi real-time, mengumpulkan koin poin, dan terhubung langsung dengan guru melalui Google Spreadsheet dan AI Kurikulum.

---

## 🌟 Fitur Utama

1. **Peta Kota Isometrik 2.5D**:
   - Peta responsif dengan fitur geser (pan) dan perbesar (zoom).
   - 8 Bangunan tematik:
     - 🏛️ **Perpustakaan Pusat (Kubah Emas)**: Eksplorasi materi esensial & refleksi nalar kritis.
     - 🏛️ **Dewan Kota (Kubah Hijau Belah)**: Studi kasus etika, kepemimpinan, dan kebijakan industri.
     - 📡 **Menara Siaran (ON AIR)**: Pengumuman guru, infografis, dan siaran audio/podcast siswa.
     - 🚔 **Kantor Polisi**: Kesepakatan belajar kelas, kode etik digital, dan pelaporan kendala.
     - ☕ **Kafe & Toko Roti**: Ruang santai obrolan grup dan problem-solving teman sebaya.
     - 🏪 **Toko Poin (Butik & Hotel)**: Penukaran koin poin reward dengan hak istimewa belajar.
     - ✈️ **Bandara Vokasi**: Misi portofolio industri, studi kasus proyek, dan tantangan vokasi.
     - ⛲ **Alun-alun Refleksia**: Air mancur bertingkat dan Pohon Kebijaksanaan untuk menanam refleksi.

2. **🤖 Generator Tugas AI untuk 8 Bangunan**:
   - Guru cukup memasukkan **Elemen Pembelajaran**, **Tujuan Pembelajaran (TP)**, dan **Materi Esensial**.
   - AI (didukung Gemini API) secara otomatis menganalisis dan mendistribusikan modul tugas, refleksi, kuis poin, misi vokasi, dan kesepakatan belajar ke **seluruh 8 bangunan** dalam sekali klik!

3. **💬 Obrolan Langsung (Real-Time Live Chat)**:
   - Obrolan antar siswa dan guru yang online dengan sinkronisasi langsung (BroadcastChannel + polling Google Spreadsheet).
   - Filter kata kasar otomatis & tombol pelaporan pesan.
   - Balon obrolan interaktif yang muncul di atas kepala avatar pemain.

4. **🚶 Animasi Pergerakan Avatar Lembut (Smooth Humanoid Kinematics)**:
   - Pergerakan avatar yang halus dan humanis dengan langkah kaki, ayunan lengan berlawanan, tekukan lutut, dan bobbing tubuh.

5. **📊 Integrasi Otomatis Google Spreadsheet (Apps Script)**:
   - Terhubung langsung ke Web App Google Apps Script default:
     `https://script.google.com/macros/s/AKfycbxE38CCJ3JPHZX4iOQzX1AvTkRAQIKOSsbIwk8DPPM57IQc0VLfLl8d_U5a1-LP9guxnQ/exec`
   - Sinkronisasi 8 Sheet: `Pengguna`, `Bangunan`, `Materi`, `Refleksi`, `Pertanyaan`, `Obrolan`, `Poin`, `Kunjungan`.

6. **🎧 Suasana Kota & Mode Waktu**:
   - Suara latar damai (Peaceful Lo-Fi Chords & Kicauan Burung sintetis Web Audio API).
   - Mode Siang (Matahari berputar dan awan melayang) & Mode Malam (Kunang-kunang berpendar, bulan sabit, dan pendar lampu jalan).
   - Jam tersinkronisasi WIB real-time & lencana kelas siswa/guru.

---

## 🚀 Panduan Push ke GitHub & Deploy ke GitHub Pages

Aplikasi ini sudah dilengkapi dengan file alur kerja GitHub Actions (`.github/workflows/deploy.yml`) dan konfigurasi `vite.config.ts` path relatif (`base: './'`).

### Langkah 1: Buat Repositori di GitHub
1. Masuk ke [GitHub](https://github.com/) dan buat repositori baru (misalnya `kota-refleksia`).
2. Jangan centang "Initialize this repository with a README" karena file sudah lengkap.

### Langkah 2: Push Kode dari Komputer Anda
Buka terminal di direktori proyek ini dan jalankan perintah:

```bash
# Inisialisasi git (jika belum)
git init

# Tambahkan semua file
git add .

# Buat commit pertama
git commit -m "Deploy Kota Refleksia ke GitHub Pages"

# Ubah nama branch utama menjadi main
git branch -M main

# Sambungkan remote URL ke repository GitHub Anda (ganti USERNAME & REPO-NAME)
git remote add origin https://github.com/USERNAME/REPO-NAME.git

# Push ke GitHub
git push -u origin main
```

### Langkah 3: Aktifkan GitHub Pages via GitHub Actions
1. Di halaman repositori GitHub Anda, buka tab **Settings**.
2. Di menu samping kiri, klik **Pages**.
3. Di bagian **Build and deployment > Source**, pilih opsi:
   👉 **GitHub Actions**
4. Selesai! Workflow akan otomatis berjalan di tab **Actions**, mengompilasi Vite, dan menerbitkan web ke:
   `https://USERNAME.github.io/REPO-NAME/`

---

## 🔑 Akun Demo Pengujian Cepat

- **Siswa (Peserta Didik)**:
  - ID Pengguna: `SISWA01`
  - PIN: `1234`
  - Peran: Siswa (Kelas XII RPL 1)

- **Guru (Pengajar / Pembimbing)**:
  - ID Pengguna: `GURU01`
  - PIN: `1234`
  - Peran: Guru (Memiliki akses ke **Panel Guru** & **Generator Tugas AI**)

---

## 🛠️ Pengembangan Lokal

```bash
# Install dependensi
npm install

# Jalankan server pengembangan
npm run dev

# Kompilasi untuk produksi
npm run build
```
