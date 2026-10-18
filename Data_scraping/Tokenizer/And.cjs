const fs = require("fs");

// teks kamu
const text = `
adidaya
analisis
apriori
average
batik
batik
beras
besi
bootstrap
brown
brown
butik
coffee
customer
cv
decision
exponential
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
penjualan
peramalan
perish
permintaan
perusahaan
pratama
prdouksi
prediksi
prediksi
prediksi
prediksi
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
smoothing
sumber
surabaya
tani
tree
tren
trend
triple
triple
ud
wisata
`;


// preprocessing
let tokens = text
  .toLowerCase()
  .replace(/[^a-zA-Z0-9\s]/g, " ")
  .split(/\s+/)
  .filter(t => t.length > 0)

// ✅ HAPUS DUPLIKAT + SORT A-Z
tokens = [...new Set(tokens)].sort((a, b) => a.localeCompare(b));

// buat CSV
let csv = "Token\n";
tokens.forEach(token => {
  csv += `${token}\n`;
});

// simpan file
fs.writeFileSync("hasil_And.csv", csv);

console.log("✅ Token unik + sort A-Z berhasil!");