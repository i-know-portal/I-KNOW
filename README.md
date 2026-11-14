# I-KNOW 2.0 — Pusat Pembelajaran Ilmu Islam

**Islamic Knowledge & Learning**  
*Tagline: ILMU • AMALAN • PENGHAYATAN*

Platform pembelajaran digital Islam statik berasaskan **React 19 + TypeScript + Vite** dengan integrasi penuh **Firebase (Authentication Anonymous & Cloud Firestore)** dan penerbitan automatik ke **GitHub Pages**.

---

## Ciri Utama Aplikasi

- **Pengurusan Pengguna & Keselamatan Firestore Security Rules**:
  - Dua peranan rasmi: **ADMIN** dan **PELAJAR**.
  - Pengesahan menggunakan **Firebase Authentication (Anonymous)** untuk sesi pembelajaran kendiri tanpa kekangan pendaftaran berbayar.
  - Pelajar disekat sepenuhnya di peringkat `firestore.rules` daripada menaik taraf peranan sendiri kepada `ADMIN`. Peranan Admin hanya dikawal melalui koleksi `/admins/{uid}` di **Firebase Console**.
- **Dua Modul Pembelajaran Utama**:
  - **MODUL 1: PEMBELAJARAN SOLAT** (10 topik tersusun daripada Pengenalan Solat hingga Kesilapan Lazim).
  - **MODUL 2: PEMBELAJARAN TAJWID** (10 topik tersusun daripada Pengenalan Tajwid hingga Latihan Bacaan al-Quran).
- **Pengurusan Bahan Pembelajaran (Pautan URL & YouTube — Tanpa Firebase Storage)**:
  - Admin boleh memautkan dokumen PDF, Google Drive, imej, audio, video dan video YouTube ke modul, topik dan subtopik dengan status **Draft** atau **Published**.
  - Pelajar hanya melihat bahan **Published** secara terbina dalam aplikasi.
- **Sistem Kuiz Interaktif & Rekod Kemajuan**:
  - Menyokong soalan **Objektif**, **Padanan (Matching)** dan **Mengenal Pasti Hukum Tajwid**.
  - Pemarkahan automatik, maklum balas jawapan segera, kawalan ulangan kuiz oleh Admin, penjejakan peratus kemajuan modul dan log aktiviti pelajar dalam Cloud Firestore.

---

## Panduan Konfigurasi Manual Menggunakan Firebase Console (`i-know-b18fc`)

Aplikasi ini dipautkan terus kepada projek Firebase sedia ada anda: **`i-know-b18fc`** (tanpa mengaktifkan Firebase Storage atau perkhidmatan berbayar).

### 1. Aktifkan Firebase Authentication (Anonymous)
1. Buka [Firebase Console](https://console.firebase.google.com/) dan pilih projek **`i-know-b18fc`**.
2. Pergi ke **Build &gt; Authentication &gt; Sign-in method**.
3. Pilih **Anonymous**, tukar suis kepada **Enable**, dan klik **Save**.
4. Pergi ke **Authentication &gt; Settings &gt; Authorized domains** dan pastikan domain GitHub Pages anda (`muslehapuo-create.github.io`) serta `localhost` tersenarai.

### 2. Sediakan Pangkalan Data Cloud Firestore & Security Rules
1. Pergi ke **Build &gt; Firestore Database** dan pastikan pangkalan data `(default)` telah dicipta (mod Production disyorkan).
2. Klik tab **Rules**.
3. Salin keseluruhan kandungan fail **`firestore.rules`** dalam repositori ini dan tampal ke dalam editor Rules di Firebase Console.
4. Klik **Publish**.

### 3. Lantik Akaun Admin Pertama (Selamat & Terkawal)
1. Buka aplikasi **I-KNOW 2.0** dan log masuk buat kali pertama melalui borang sesi (masukkan nama penuh anda).
2. Pergi ke menu **Profil Saya** (atau **Akaun**) dan klik **Salin UID** untuk menyalin UID Firebase Anonymous anda.
3. Kembali ke **Firebase Console &gt; Firestore Database &gt; Data**.
4. Klik **+ Start collection**, namakan koleksi sebagai **`admins`**.
5. Masukkan **Document ID** = *UID Firebase anda*, kemudian tambah medan:
   - `active` (type: `boolean`, value: `true`)
   - `note` (type: `string`, value: `Pentadbir I-KNOW 2.0`)
6. Klik **Save**, kemudian muat semula (*refresh*) aplikasi I-KNOW 2.0 — anda kini mempunyai akses penuh **Panel Pentadbir (ADMIN)**.

### 4. Isi Kurikulum Awal Modul Solat & Tajwid
1. Setelah log masuk sebagai **ADMIN**, buka menu **Modul & Topik**.
2. Klik butang **Isi Kurikulum Awal (Solat & Tajwid)** untuk memasukkan 2 modul utama, 20 topik lengkap, subtopik, nota dan 2 kuiz contoh ke dalam Cloud Firestore.

---

## Pemasangan Tempatan & Penerbitan ke GitHub Pages (`https://muslehapuo-create.github.io/i-know/`)

```bash
npm install
npm run dev
```

Untuk menerbitkan ke GitHub Pages:
1. Pastikan repositori GitHub anda bernama `i-know` di bawah akaun `muslehapuo-create`.
2. Pergi ke **Settings &gt; Pages &gt; Source** dan pilih **GitHub Actions**.
3. Tolak (*push*) kod ke branch `main`. Workflow `.github/workflows/deploy.yml` akan membina aplikasi secara automatik dengan laluan asas `/i-know/` dan menerbitkannya ke:
   `https://muslehapuo-create.github.io/i-know/`

---

## Struktur Folder Utama

```text
├── .github/workflows/deploy.yml       # Automasi CI/CD ke GitHub Pages
├── public/404.html                    # Sokongan SPA routing di GitHub Pages
├── firestore.rules                    # Polisi keselamatan Cloud Firestore (RBAC & skema)
├── firebase-blueprint.json            # Spesifikasi struktur entiti & koleksi Firestore
├── src/
│   ├── assets/                        # Imej statik aplikasi
│   ├── components/
│   │   ├── admin/                     # Dashboard, Kurikulum, Bahan, Kuiz & Pelajar
│   │   ├── auth/                      # Portal Sesi Firebase Anonymous & Panduan Console
│   │   ├── layout/                    # AppShell (Sidebar desktop & Bottom Nav mudah alih)
│   │   ├── profile/                   # Profil pengguna & UID Firebase
│   │   └── student/                   # Dashboard Pelajar, Katalog, Ruang Topik, Kuiz & Kemajuan
│   ├── context/AuthContext.tsx        # Pengurusan sesi Firebase Auth Anonymous & /admins/{uid}
│   ├── lib/
│   │   ├── firebase.ts                # Konfigurasi Firebase i-know-b18fc & pengesan sambungan
│   │   └── youtube.ts                 # Penghurai pautan YouTube & format tarikh Melayu
│   ├── services/learningService.ts    # Operasi Cloud Firestore sebenar & seed kurikulum
│   └── types/database.ts              # Definisi TypeScript bagi semua koleksi Firestore
├── vite.config.ts
└── README.md
```
