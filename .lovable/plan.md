

# Sistem Restoran Mandalika — Implementation Plan

## Overview
Sistem manajemen restoran lengkap dengan desain modern & minimalis, mendukung operasi online & offline, dengan 3 role utama: **Kasir**, **Owner**, dan **Pembeli**.

---

## 1. Backend Setup (Supabase)

### Database Tables
- **profiles** — user profiles dengan role (kasir, owner, admin)
- **menu_categories** — kategori menu (Makanan, Minuman, Dessert, dll)
- **menu_items** — item menu dengan nama, harga, deskripsi, foto, kategori, dan status aktif
- **transactions** — transaksi header (tanggal, kasir, total, metode pembayaran, status sinkronisasi)
- **transaction_items** — detail item per transaksi (menu item, quantity, subtotal)

### Authentication & Security
- Login dengan email/password via Supabase Auth
- Role-based access control menggunakan tabel profiles
- Row Level Security (RLS) pada semua tabel sesuai role

---

## 2. Halaman & Fitur

### 🔐 Login Page
- Form login email + password
- Redirect otomatis berdasarkan role (kasir → dashboard kasir, owner → dashboard owner)

### 🧑‍🍳 Dashboard Kasir
- Ringkasan transaksi hari ini (total transaksi, total penjualan)
- Shortcut ke halaman transaksi baru
- Indikator status online/offline
- Daftar transaksi yang belum tersinkron

### 🛒 Halaman Transaksi (Kasir)
- Grid/list menu items dengan pencarian & filter kategori
- Keranjang pesanan: tambah, ubah qty, hapus item
- Auto-hitung total
- Pilihan metode pembayaran: Cash, QRIS, Transfer Bank, E-Wallet
- Untuk cash: input jumlah bayar & auto-hitung kembalian
- Simpan transaksi (online → Supabase, offline → IndexedDB)

### 🔄 Halaman Sinkronisasi (Kasir)
- Daftar transaksi offline dengan label "Belum Tersinkron"
- Tombol sinkronisasi manual
- Auto-sync ketika koneksi internet kembali
- Status per transaksi (tersinkron / belum)

### 📊 Dashboard Owner
- Total penjualan hari ini, minggu ini, bulan ini
- Grafik penjualan harian & bulanan (menggunakan Recharts)
- Daftar transaksi terbaru
- Filter berdasarkan periode

### 📋 Manajemen Menu (Owner)
- Tabel daftar menu dengan pencarian
- Tambah menu baru (nama, kategori, harga, deskripsi, upload foto)
- Edit & hapus menu
- Toggle aktif/nonaktif menu

### 📱 Katalog Digital (Pembeli — tanpa login)
- Halaman publik yang bisa diakses via QR code
- Tampilan kategori menu sebagai tab/filter
- Grid menu items dengan foto, nama, harga
- Detail menu: foto besar, deskripsi lengkap, harga

---

## 3. Offline Mode & PWA
- Service Worker untuk caching halaman & assets
- IndexedDB untuk menyimpan transaksi saat offline
- Indikator visual status koneksi (online/offline badge)
- Transaksi offline otomatis diberi flag "belum tersinkron"

## 4. Sinkronisasi Otomatis
- Deteksi perubahan status koneksi (online/offline event listener)
- Ketika online: kirim semua transaksi offline ke Supabase
- Update status menjadi "Tersinkronisasi" setelah berhasil
- Notifikasi toast saat sinkronisasi selesai

## 5. UI/UX Design
- Desain modern & minimalis dengan warna netral
- Layout responsif untuk desktop (kasir/owner) dan tablet/mobile (katalog pembeli)
- Navigasi sidebar untuk kasir & owner
- Font besar dan tombol jelas untuk kemudahan kasir
- Feedback visual cepat pada setiap aksi (toast notifications)

