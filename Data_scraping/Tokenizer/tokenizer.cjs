const fs = require("fs");

// teks kamu
const text = `
Sistem Prediksi Penjualan Batik Di Butik Batik Intan Surabaya Menggunakan Metode Trend Projection
Sistem Prediksi Jumlah Prdouksi Besi Fabrikasi Di Cv Indrojaya Dengan Metode Triple Exponential Smoothing Brown
Peramalan Permintaan Jumlah Pupuk Kcl Menggunakan Metode Single Moving Average Studi Kasus Pt Sentana Adidaya Pratama
Prediksi Tren Penggunaan Framework React Js Laravel Bootstrap Pada Aplikasi Publish Or Perish Menggunakan Metode Regresi Linier Sederhana
Sistem Prediksi Penjualan Beras Di Ud Sumber Tani Lamongan Dengan Metode Triple Exponential Smoothing Brown
Implementasi Aplikasi Prediksi Ketepatan Pembayaran Customer Perusahaan Dengan Metode Decision Tree
Analisis Rekomendasi Menu Makanan Dan Minuman Menggunakan Metode Apriori Studi Kasus Joena Coffee
Optimasi Rute Wisata Di Kota Gresik Menggunakan Metode Algoritma Genetika
`;

// preprocessing
const tokens = text
  .toLowerCase()
  .replace(/[^a-zA-Z0-9\s]/g, " ") // hapus tanda baca
  .split(/\s+/) // pecah kata
  .filter(t => t.length > 0);

// buat CSV (bisa dibuka di Excel)
let csv = "Token\n";
tokens.forEach(token => {
  csv += `${token}\n`;
});

// simpan file
fs.writeFileSync("hasil_tokenizer.csv", csv);

console.log("✅ Berhasil export ke hasil_tokenizer.csv");