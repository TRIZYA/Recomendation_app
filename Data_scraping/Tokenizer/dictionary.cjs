const fs = require("fs");

// teks kamu
const text = `
sistem
prediksi
penjualan
batik
di
butik
batik
intan
surabaya
menggunakan
metode
trend
projection
sistem
prediksi
jumlah
prdouksi
besi
fabrikasi
di
cv
indrojaya
dengan
metode
triple
exponential
smoothing
brown
peramalan
permintaan
jumlah
pupuk
kcl
menggunakan
metode
single
moving
average
studi
kasus
pt
sentana
adidaya
pratama
prediksi
tren
penggunaan
framework
react
js
laravel
bootstrap
pada
aplikasi
publish
or
perish
menggunakan
metode
regresi
linier
sederhana
sistem
prediksi
penjualan
beras
di
ud
sumber
tani
lamongan
dengan
metode
triple
exponential
smoothing
brown
implementasi
aplikasi
prediksi
ketepatan
pembayaran
customer
perusahaan
dengan
metode
decision
tree
analisis
rekomendasi
menu
makanan
dan
minuman
menggunakan
metode
apriori
studi
kasus
joena
coffee
optimasi
rute
wisata
di
kota
gresik
menggunakan
metode
algoritma
genetika
`;

// ✅ STOPWORDS (sudah dibersihkan & lowercase)
const stopwords = new Set([
  "dan","di","ke","dari","pada","untuk","dengan","dalam",
  "yang","oleh","sebagai","terhadap","antara","adalah","sistem","implementasi","penerapan","aplikasi","model","metode",
  "algoritma","algoritmaa","berdasarkan",
  "menggunakan","studi","kasus"
]);

// preprocessing
const tokens = text
  .toLowerCase()
  .replace(/[^a-zA-Z0-9\s]/g, " ") // hapus tanda baca
  .split(/\s+/) // pecah kata
  .filter(t => t.length > 0)
  .filter(t => !stopwords.has(t)); // ✅ hapus stopwords

let tokensz = tokens;  
// buat CSV (bisa dibuka di Excel)
// tokensz = tokens.sort((a, b) => a.localeCompare(b));

// buat CSV
let csv = "Token\n";
tokens.forEach(token => {
  csv += `${token}\n`;
});

// simpan file
fs.writeFileSync("hasil_Dictionary.csv", csv);

console.log("✅ Berhasil export ke hasil_Dictionary.csv");