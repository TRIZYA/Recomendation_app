const fs = require("fs");

// ==========================
// DOKUMEN (d1 - d20)
// ==========================
const documents = `
Sistem Prediksi Penjualan Batik Di Butik Batik Intan Surabaya Menggunakan Metode Trend Projection
Sistem Prediksi Jumlah Prdouksi Besi Fabrikasi Di Cv Indrojaya Dengan Metode Triple Exponential Smoothing Brown
Peramalan Permintaan Jumlah Pupuk Kcl Menggunakan Metode Single Moving Average Studi Kasus Pt Sentana Adidaya Pratama
Prediksi Tren Penggunaan Framework React Js Laravel Bootstrap Pada Aplikasi Publish Or Perish Menggunakan Metode Regresi Linier Sederhana
Sistem Prediksi Penjualan Beras Di Ud Sumber Tani Lamongan Dengan Metode Triple Exponential Smoothing Brown
Implementasi Aplikasi Prediksi Ketepatan Pembayaran Customer Perusahaan Dengan Metode Decision Tree
Analisis Rekomendasi Menu Makanan Dan Minuman Menggunakan Metode Apriori Studi Kasus Joena Coffee
Optimasi Rute Wisata Di Kota Gresik Menggunakan Metode Algoritma Genetika
`.trim().split("\n");

// ==========================
// TERM MANUAL (DARI KAMU)
// ==========================
const text = `
adidaya
analisis
apriori
average
batik
beras
besi
bootstrap
brown
butik
coffee
customer
cv
decision
exponential
fabrikasi
framework
genetika
gresik
indrojaya
intan
joena
js
jumlah
kcl
ketepatan
kota
lamongan
laravel
linier
makanan
menu
minuman
moving
optimasi
or
pembayaran
penggunaan
penjualan
peramalan
perish
permintaan
perusahaan
pratama
prdouksi
prediksi
projection
pt
publish
pupuk
react
regresi
rekomendasi
rute
sederhana
sentana
single
smoothing
sumber
surabaya
tani
tree
tren
trend
triple
ud
wisata
`;

// preprocessing term manual
let terms = text
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, " ")
  .split(/\s+/)
  .filter(t => t.length > 0);

// hapus duplikat + sort
terms = [...new Set(terms)].sort((a, b) => a.localeCompare(b));

// ==========================
// PREPROCESS DOKUMEN
// ==========================
const processedDocs = documents.map(doc =>
  doc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
);

// ==========================
// TERM-DOC MATRIX
// ==========================
let csv = "Term," + documents.map((_, i) => `d${i+1}`).join(",") + "\n";

terms.forEach(term => {
  let row = [term];

  processedDocs.forEach(doc => {
    const count = doc.filter(word => word === term).length;
    row.push(count);
  });

  csv += row.join(",") + "\n";
});

// ==========================
// SIMPAN
// ==========================
fs.writeFileSync("TDM_manual_terms.csv", csv);

console.log("✅ Berhasil! Term pakai manual, bukan auto 🚀");