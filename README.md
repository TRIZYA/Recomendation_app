# Implementasi Sistem Rekomendasi Metode Penelitian

Dokumentasi singkat ini menjelaskan bagaimana mengimplementasikan sistem rekomendasi metode penelitian berdasarkan flowchart yang diberikan. Tujuan: menjelaskan alur data, modul yang perlu ada, dan langkah teknis untuk mereproduksi fungsionalitas.

## Gambaran Umum

Flowchart utama:
- Input Judul / Deskripsi Penelitian
- Pengolahan Dataset (Judul, Abstrak, Kata Kunci, Kesimpulan)
- Preprocessing Teks (case folding, tokenizing, stopword removal, remove duplicates)
- Perhitungan TF-IDF dan pembobotan
- Perhitungan Vector Length
- Perhitungan Cosine Similarity
- Filtering Algoritma Penelitian
- Perankingan Similarity
- Menampilkan Rekomendasi Metode Penelitian

## Lokasi kode relevan
- Komponen UI untuk input & tampilan hasil: [src/components/ArticleSection.jsx](src/components/ArticleSection.jsx#L1), [src/App.jsx](src/App.jsx#L1), [src/uploadData.js](src/uploadData.js#L1)
- Dataset dan skrip pembersihan: [Data_scraping/filter/](Data_scraping/filter/), [filter_abstrak_keyword/](filter_abstrak_keyword/)
- Tokenizer / util teks: [Tokenizer/](Tokenizer/)

Jika Anda ingin menelusuri implementasi yang sudah ada, mulailah dari file-file di atas.

## Rincian implementasi langkah demi langkah

1) Input Judul / Deskripsi
- UI menerima `judul` dan/atau `deskripsi` penelitian. Pada frontend, ambil input ini dan kirim ke backend atau modul pemrosesan teks yang berjalan di Node.js (atau di browser jika dataset kecil).

2) Pengolahan Dataset
- Gabungkan semua sumber data penelitian ke bentuk struktur yang konsisten: objek dengan field minimal: `id`, `judul`, `abstrak`, `kata_kunci`, `kesimpulan`, `metode` (opsional).
- Contoh format JSON per entri:

  {
    "id": "paper-1",
    "judul": "...",
    "abstrak": "...",
    "kata_kunci": ["..."],
    "kesimpulan": "..."
  }

3) Preprocessing Teks
- Tahapan: case folding (lowercase), tokenizing, menghapus stopwords, stemming/lemmatization (opsional), menghapus duplikat.
- Gunakan util di `Tokenizer/` dan skrip dalam `filter/` atau `filter_abstrak_keyword/` sebagai dasar.
- Output: representasi token bersih per dokumen dan vocabulary global.

4) Perhitungan TF-IDF dan Pembobotan
- Hitung TF untuk setiap dokumen: TF(term, doc).
- Hitung IDF untuk terms di seluruh korpus: IDF(term) = log(N / df(term)).
- Bentuk vektor TF-IDF untuk setiap dokumen dan juga untuk query (judul/deskripsi input). Jika input pendek, gunakan smoothing atau gabungkan judul+deskripsi untuk query vector.
- Simpan vektor dalam struktur numerik (array angka) atau sparse map.

5) Perhitungan Vector Length
- Untuk normalisasi, hitung panjang vektor L2: length = sqrt(sum(v_i^2)).
- Simpan panjang untuk setiap dokumen dan normalisasi vektor bila perlu.

6) Perhitungan Cosine Similarity
- Cosine(query, doc) = dot(query_vec, doc_vec) / (||query_vec|| * ||doc_vec||).
- Jika vektor dinormalisasi, cosine = dot(query_norm, doc_norm).

7) Filtering Algoritma Penelitian
- Berdasarkan flowchart, setelah similarity dihitung, terapkan filter untuk hanya menampilkan entri yang relevan terhadap 'algoritma' atau kategori penelitian tertentu.
- Gunakan aturan berbasis kata kunci pada `kata_kunci` atau hasil ekstraksi metode dari `filter_abstrak_keyword/get_algorithm_puter.cjs`.

8) Perankingan Similarity
- Urutkan hasil berdasarkan nilai cosine similarity menurun.
- Terapkan threshold minimal dan/atau batas jumlah hasil (mis. top-10).

9) Menampilkan Rekomendasi
- Kirim hasil terurut ke frontend. Tampilan rekomendasi dapat dilakukan di komponen seperti [src/components/ArticleSection.jsx](src/components/ArticleSection.jsx#L1).
- Tampilkan skor similarity, snippet abstrak, kata kunci, dan metode yang terdeteksi.

## Implementasi di kode (mapping langkah → file / fungsi)

Berikut file dan fungsi yang sudah menangani tiap langkah dalam flowchart — buka file-file ini untuk menelusuri implementasi lebih lanjut:

- 1) Input Judul / Deskripsi:
  - UI input: [src/components/SearchInput.jsx](src/components/SearchInput.jsx#L1)
  - Orkestrasi pencarian & state: [src/App.jsx](src/App.jsx#L1) — `runSearch()` dan hook effect untuk memicu pencarian.

- 2) Pengolahan Dataset (normalisasi & upload):
  - Upload / normalisasi awal: [src/uploadData.js](src/uploadData.js#L1) — `cleanData`, `buildLookupKey`, `uploadData()`.
  - Normalisasi saat load: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L1) — `normalizeArticle()`.

- 3) Preprocessing Teks:
  - Preprocess untuk pencarian: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L162) — `preprocessText()` (case folding, tokenizing, stopword removal).
  - Skrip tokenisasi offline: [Data_scraping/Tokenizer/tokenizer.cjs](Data_scraping/Tokenizer/tokenizer.cjs#L1) dan [Data_scraping/Tokenizer/dictionary.cjs](Data_scraping/Tokenizer/dictionary.cjs#L1).

- 4) Perhitungan TF‑IDF dan Pembobotan:
  - TF‑IDF builder: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L177) — `calculateTfIdf(documents)`.

- 5) Perhitungan Vector Length:
  - Norma/L2 dihitung saat similarity: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L223) — bagian norma di `calculateCosineSimilarity()`.

- 6) Perhitungan Cosine Similarity:
  - Implementasi cosine: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L223) — `calculateCosineSimilarity(vecA, vecB)`.

- 7) Filtering / ekstraksi Algoritma:
  - Ekstraksi heuristic / AI untuk field `algorithm`: [Data_scraping/filter_abstrak_keyword/get_algorithm_puter.cjs](Data_scraping/filter_abstrak_keyword/get_algorithm_puter.cjs#L1).
  - Deteksi & normalisasi algoritma di UI: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L425) — `detectAlgorithmsInQuery()` dan fungsi normalisasi `standardizeAlgorithmName()`.

- 8) Perankingan Similarity (artikel & algoritma):
  - Ranking artikel: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L717) — `recommendArticles()`.
  - Agregasi & ranking algoritma: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L300) — `recommendAlgorithm()` dan `recommendAlgorithmDualLanguage()`.

- 9) Menampilkan Rekomendasi di UI:
  - Panel algoritma: [src/components/RecommendationAlgorithmsPanel.jsx](src/components/RecommendationAlgorithmsPanel.jsx#L1).
  - Daftar artikel & skor: [src/components/ArticleSection.jsx](src/components/ArticleSection.jsx#L1) dan [src/components/ArticleList.jsx](src/components/ArticleList.jsx#L1).

---
Tambahkan komentar atau catatan di file-file itu jika Anda ingin saya menyisipkan penjelasan baris-per-baris. Jika cocok, saya bisa juga membuat ringkasan potongan kode (snippet) untuk tiap fungsi.

## Proses Alur Data (urutan eksekusi)

Langkah berikut menjelaskan alur data dari awal sampai akhir saat sistem dijalankan, serta file/fungsi yang mengimplementasikannya.

1) Pengumpulan & pembersihan data (offline)
  - Skrip scraping dan ekstraksi abstrak/kata kunci: [Data_scraping/filter_abstrak_keyword/filter_ak.cjs](Data_scraping/filter_abstrak_keyword/filter_ak.cjs#L1)
  - Ekstraksi/normalisasi metode (heuristic + optional AI): [Data_scraping/filter_abstrak_keyword/get_algorithm_puter.cjs](Data_scraping/filter_abstrak_keyword/get_algorithm_puter.cjs#L1)

2) Unggah ke Firestore / normalisasi batch
  - Normalisasi & upload dataset ke koleksi `articles`: [src/uploadData.js](src/uploadData.js#L1) — fungsi `cleanData`, `buildLookupKey`, `uploadData()`.

3) Muat data ke UI (startup)
  - Ambil dokumen dari Firestore pada startup: [src/App.jsx](src/App.jsx#L1) — effect `fetchArticles()` memanggil `getDocs()`.
  - Normalisasi tiap dokumen saat load: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L1) — `normalizeArticle()`.

4) Precompute TF‑IDF (preparing index)
  - Setelah `articlesData` tersedia, App memanggil: [src/App.jsx](src/App.jsx#L31) → `calculateTfIdf(searchTexts)`.
  - Implementasi TF‑IDF: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L177) — `calculateTfIdf()` mengembalikan `tfidfMatrix` + `terms`.

5) Pengguna memasukkan kueri (runtime)
  - Input field: [src/components/SearchInput.jsx](src/components/SearchInput.jsx#L1).
  - Event handler: `runSearch()` di [src/App.jsx](src/App.jsx#L1) membaca kueri dan memulai pipeline pencarian.

6) Terjemahan & deteksi algoritma kueri
  - Terjemahan kueri (opsional): [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L453) — `translateQuery()`.
  - Deteksi istilah algoritma dalam kueri: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L425) — `detectAlgorithmsInQuery()`.

7) Pembentukan vektor kueri & perhitungan similarity
  - Preprocessing kueri: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L162) — `preprocessText()`.
  - Bentuk vektor kueri terhadap `terms` hasil TF‑IDF (di `recommendArticles()` / `recommendAlgorithm()`).
  - Cosine similarity: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L223) — `calculateCosineSimilarity()`.

8) Filtering, agregasi dan perankingan
  - Perhitungan skor gabungan (title, keyword, TF‑IDF): [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L717) — `recommendArticles()`.
  - Agregasi rekomendasi algoritma dan peranking: [src/utils/recommendationPipeline.js](src/utils/recommendationPipeline.js#L300) — `recommendAlgorithm()` / `recommendAlgorithmDualLanguage()`.

9) Penyimpanan hasil & rendering
  - App menyimpan hasil ke state: `setRecommendedAlgorithms()` dan `setTopArticles()` di [src/App.jsx](src/App.jsx#L1).
  - UI menampilkan rekomendasi algoritma: [src/components/RecommendationAlgorithmsPanel.jsx](src/components/RecommendationAlgorithmsPanel.jsx#L1).
  - UI menampilkan daftar artikel & skor similarity: [src/components/ArticleSection.jsx](src/components/ArticleSection.jsx#L1) dan [src/components/ArticleList.jsx](src/components/ArticleList.jsx#L1).

Bagian ini menambahkan urutan eksekusi lengkap. Bila Anda mau, saya bisa menyertakan diagram sederhana (ASCII atau mermaid) atau menambahkan snippet contoh panggilan fungsi untuk setiap langkah.

## Contoh pseudocode (Node.js)

1. Load dataset -> preprocess setiap dokumen -> build vocabulary
2. Compute TF-IDF vectors for corpus
3. For query: preprocess(query) -> compute tf-idf(vector)
4. For each doc: similarity = cosine(query_vec, doc_vec)
5. Filter docs by algorithm keywords
6. Sort by similarity and return top-K

## Perpustakaan yang direkomendasikan
- Node.js: `natural`, `wink-nlp`, `stopword`, custom TF-IDF atau `natural.TfIdf`.
- Python: `scikit-learn` (`TfidfVectorizer`) jika memilih memproses offline atau di service terpisah.

## Catatan implementasi dan pengujian
- Pastikan konsistensi preprocessing antara dokumen dan query.
- Simpan vektor TF-IDF yang sudah dihitung untuk menghindari rekalkulasi saat query baru (cache atau indeks sederhana).
- Tambahkan tes unit untuk: preprocessing, perhitungan TF-IDF, cosine similarity, dan filtering keyword.

## Menambahkan threshold & tuning
- Bereksperimenlah dengan threshold similarity (mis. > 0.2) dan jumlah top-K.
- Jika hasil terlalu banyak noise, perkuat filter kata kunci atau tambahkan metadata (tahun, institusi) sebagai filter tambahan.

## Langkah selanjutnya yang saya bisa bantu
- Saya bisa membuat modul TF-IDF contoh (Node.js) dan contoh endpoint API untuk query.
- Saya bisa menulis unit tests atau menambahkan contoh integrasi dengan UI.

---

