# 🚀 Panduan Lengkap Setup & Cara Menggunakan Aplikasi STKI

Dokumen ini menjelaskan langkah demi langkah cara menjalankan aplikasi STKI dari awal **tanpa folder `node_modules`**.

---

## 📋 Daftar Isi
1. [Prasyarat](#prasyarat)
2. [Step 1: Install Node.js](#step-1-install-nodejs)
3. [Step 2: Clone/Buka Project](#step-2-clonebuka-project)
4. [Step 3: Install Dependencies](#step-3-install-dependencies)
5. [Step 4: Setup Firebase](#step-4-setup-firebase)
6. [Step 5: Konfigurasi .env](#step-5-konfigurasi-env)
7. [Step 6: Upload Data ke Firebase](#step-6-upload-data-ke-firebase)
8. [Step 7: Jalankan Aplikasi](#step-7-jalankan-aplikasi)
9. [Troubleshooting](#troubleshooting)

---

## 📌 Prasyarat

Sebelum memulai, pastikan Anda memiliki:
- ✅ Akses ke **Google Firebase Console**
- ✅ Koneksi internet yang stabil
- ✅ Git (opsional, jika ingin clone dari repository)
- ✅ Text Editor atau IDE (VS Code recommended)

---

## Step 1: Install Node.js

### Windows

1. Buka [https://nodejs.org/](https://nodejs.org/)
2. Pilih **LTS (Long Term Support)** - biasanya versi terbaru yang stabil
3. Klik tombol download dan jalankan installer
4. Ikuti wizard instalasi (terima semua default)
5. **Penting**: Centang checkbox "Add to PATH" saat instalasi

### Verifikasi Instalasi

Buka **Command Prompt** atau **PowerShell** dan jalankan:

```bash
node --version
npm --version
```

Jika output menampilkan versi (contoh: `v18.16.0`), instalasi berhasil! ✅

### Linux/Mac

```bash
# Menggunakan Homebrew (Mac)
brew install node

# Atau download dari https://nodejs.org/
```

---

## Step 2: Clone/Buka Project

### Jika file sudah ada di komputer:
```bash
cd C:\Users\ACHYAR\Documents\STKI
# atau sesuaikan path ke folder project Anda
```

---

## Step 3: Install Dependencies

Karena folder `node_modules` telah dihapus, Anda perlu menginstall ulang.

### Langkah:

1. **Buka Terminal** di dalam folder project (atau gunakan `cd` command)

2. **Jalankan command:**
   ```bash
   npm install
   ```

3. **Tunggu proses selesai** (biasanya 2-5 menit tergantung kecepatan internet)

   ✅ Ditandai selesai jika tidak ada error dan folder `node_modules` terbuat

### Apa yang Terjadi?

```
npm install akan secara otomatis:
├── Membaca package.json
├── Mendownload semua dependencies dari npm registry
├── Membuat package-lock.json (untuk lock version)
└── Menyimpan ke folder node_modules/
```

---

## Step 4: Setup Firebase

### 4.1 Buat Firebase Project

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik **"Add Project"** atau **"Create a project"**
3. Isikan nama project (contoh: `STKI-Research`)
4. Ikuti wizard hingga selesai
5. **Pilih lokasi region**: Asia Southeast (atau sesuai lokasi Anda)

### 4.2 Aktifkan Firestore Database

1. Di Firebase Console, pilih project yang baru dibuat
2. Klik **"Firestore Database"** di sidebar kiri
3. Klik **"Create database"**
4. Pilih **"Start in production mode"** (atau development jika untuk testing)
5. Pilih lokasi region yang sama seperti step 4.1
6. Klik **"Create"**

### 4.3 Ambil Firebase Config

1. Di Firebase Console, pergi ke **Project Settings** (⚙️ icon)
2. Scroll ke bagian **"Your apps"**
3. Pilih app dengan badge **"Web"** (atau buat baru jika belum ada)
4. Copy seluruh konfigurasi JSON yang terlihat

Contoh config yang terlihat:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD... (panjang string)",
  authDomain: "stki-project.firebaseapp.com",
  projectId: "stki-project",
  storageBucket: "stki-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-ABC123DEF"
};
```

---

## Step 5: Konfigurasi .env

### 5.1 Buat file `.env` di root project

Di folder **`STKI`**, buat file baru bernama `.env` (perhatian: dimulai dengan titik)

### 5.2 Isi `.env` dengan Firebase Config

Salin konfigurasi Firebase dari Step 4.3 dan ubah format menjadi:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=stki-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=stki-project
VITE_FIREBASE_STORAGE_BUCKET=stki-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123DEF
```

**Perhatian**: 
- Gunakan prefix `VITE_` karena project ini menggunakan Vite
- Jangan gunakan quotes (`"` atau `'`) di nilai
- Simpan file dengan encoding UTF-8

### 5.3 Verifikasi

Buka VS Code → Buka file `.env` → Pastikan semua nilai terisi

---

## Step 6: Upload Data ke Firebase

### 6.1 Persiapan Data

Data sudah tersedia di: **`src/data/data_fix.json`**

File ini berisi array artikel dengan struktur:
```json
{
  "title": "Judul Penelitian",
  "author": "Nama Penulis",
  "date": "2024-01-15",
  "link": "https://...",
  "abstract": "Ringkasan penelitian",
  "keywords": ["kata kunci 1", "kata kunci 2"],
  "algorithm": ["Algoritma 1", "Algoritma 2"]
}
```

### 6.2 Upload ke Firestore

Jalankan script upload:

```bash
node src/uploadData.js
```

**Output yang diharapkan:**
```
ENV CHECK: {
  apiKey: 'AIzaSyD...',
  projectId: 'stki-project'
}
✅ Upload data sedang berlangsung...
✅ Total 254 artikel berhasil diupload ke Firestore!
```

### 6.3 Verifikasi di Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project Anda → **Firestore Database**
3. Cari collection bernama **`articles`**
4. Pastikan data sudah masuk (minimal ada beberapa dokumen)

---

## Step 7: Jalankan Aplikasi

### 7.1 Start Development Server

```bash
npm run dev
```

**Output yang diharapkan:**
```
  VITE v6.0.5  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 7.2 Buka di Browser

Klik link atau buka manual di browser:
```
http://localhost:5173/
```

### 7.3 Cek Aplikasi

✅ Halaman berhasil dimuat
✅ Bisa melihat daftar artikel
✅ Bisa melakukan search/filter
✅ Bisa upload data baru (jika fitur tersedia)

### 7.4 Hentikan Server

Tekan `Ctrl + C` di terminal untuk menghentikan

---

## 📱 Workflow Lengkap Penggunaan

### 1. **Dashboard & Pencarian**

```
Halaman Utama
    ↓
Lihat daftar artikel → Klik filter berdasarkan algoritma
    ↓
Masukkan query pencarian → Sistem rekomendasi bekerja
    ↓
Lihat hasil berdasarkan cosine similarity
```

### 2. **Upload Data Baru**

Jika ingin menambah data baru ke Firebase:

1. Siapkan file JSON dengan format sama seperti `data_fix.json`
2. Ganti path di `uploadData.js`:
   ```javascript
   const datajsonPath = path.resolve(__dirname, "./data/data_baru.json");
   ```
3. Jalankan:
   ```bash
   node src/uploadData.js
   ```

### 3. **Preprocessing Data**

Jika data memerlukan cleaning sebelum upload:

```bash
cd Data_scraping/filter_abstrak_keyword/
node filter_ak.cjs          # Filter berdasarkan keyword
node sort.cjs               # Sorting data
```

---

## 🔧 Available Commands

```bash
# Development
npm run dev              # Jalankan development server

# Build
npm run build            # Build untuk production

# Linting
npm run lint             # Check code quality

# Preview
npm run preview          # Preview production build
```

---

## ❌ Troubleshooting

### Error 1: `npm: command not found`
**Solusi:**
- Node.js belum terinstall atau PATH tidak terconfig
- Reinstall Node.js dan centang "Add to PATH"
- Restart command prompt setelah instalasi

### Error 2: `VITE_FIREBASE_API_KEY is not defined`
**Solusi:**
- File `.env` tidak ditemukan atau belum di-save
- Pastikan file `.env` ada di root folder project
- Pastikan format variabel benar (gunakan prefix `VITE_`)
- Restart `npm run dev`

### Error 3: `Failed to upload articles`
**Solusi:**
- Pastikan Firestore Database sudah aktif
- Cek Firebase config di `.env` - apakah benar?
- Cek rules Firestore - pastikan allow read/write

### Error 4: Artikel tidak muncul di dashboard
**Solusi:**
- Pastikan data sudah berhasil diupload (cek Firebase Console)
- Clear browser cache: `Ctrl + Shift + Delete`
- Reload halaman: `Ctrl + F5`
- Cek console browser untuk error message

### Error 5: Build gagal
**Solusi:**
```bash
# Bersihkan
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Build ulang
npm run build
```

---

## 📚 File-file Penting

```
STKI/
├── src/
│   ├── firebase.js              # Konfigurasi Firebase
│   ├── uploadData.js            # Script upload data ke Firestore
│   ├── data/
│   │   └── data_fix.json        # Data artikel
│   ├── components/
│   │   ├── Dashboard.jsx        # Halaman utama
│   │   ├── ArticleList.jsx      # Daftar artikel
│   │   └── SearchBar.jsx        # Pencarian
│   ├── utils/
│   │   └── recommendationPipeline.js  # Pipeline rekomendasi
│   └── App.jsx                  # Main app component
├── .env                         # ⭐ Konfigurasi Firebase (dibuat manual)
├── package.json                 # Dependencies
├── vite.config.js              # Vite configuration
└── README.md                    # Dokumentasi teknis

Data_scraping/
├── filter_abstrak_keyword/
│   ├── filter_ak.cjs           # Filter keyword
│   └── sort.cjs                # Sorting data
└── Tokenizer/
    ├── tokenizer.cjs           # Tokenization
    └── terms.cjs               # Term processing
```

---

## 🎯 Ringkasan Quick Start

Untuk pengguna yang ingin langsung coba:

```bash
# 1. Buka terminal di folder STKI
cd C:\Users\ACHYAR\Documents\STKI

# 2. Install dependencies
npm install

# 3. Buat file .env dengan Firebase config (lihat Step 5)

# 4. Upload data
node src/uploadData.js

# 5. Jalankan aplikasi
npm run dev

# 6. Buka http://localhost:5173/ di browser
```

---

## 📞 Bantuan Lebih Lanjut

Jika mengalami masalah, periksa:
1. **Console Browser** (`F12`) - lihat error message
2. **Terminal/Command Prompt** - baca output error
3. **Firebase Console** - verifikasi data dan rules
4. **File `.env`** - pastikan konfigurasi benar

---

**Selamat! Aplikasi siap digunakan. 🚀**

Versi dokumen: 1.0 | Last updated: 2026-07-13
