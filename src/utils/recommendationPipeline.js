import { puter } from "@heyputer/puter.js";
import { StopwordsId } from "@nlpjs/lang-id";
import { franc } from "franc";

const idStopwords = new StopwordsId();

const academicStopwords = new Set([
  "penelitian", "sistem", "studi", "kajian", "riset", "analisis", "analisa", "secara", "hasil", "kesimpulan",
  "pendahuluan", "dasar", "teori", "tujuan", "metode", "metodologi", "teknik", "cara", "proses",
  "data", "variabel", "parameter", "kriteria", "aspek", "faktor", "elemen", "komponen", "unsur",
  "informasi", "aplikasi", "perangkat", "alat", "tool", "software", "hardware", "model",
  "implementasi", "pengembangan", "perancangan", "desain", "rancang", "bangun", "pembuatan",
  "pelaksanaan", "penerapan", "pengujian", "testing", "validasi", "verifikasi", "evaluasi",
  "berdasarkan", "didasarkan", "ditinjau", "dilihat", "dibandingkan", "dikomparekan", "dianalisis",
  "mampu", "efektif", "efisien", "baik", "buruk", "positif", "negatif",
  "tinggi", "rendah", "besar", "kecil", "panjang", "pendek", "lambat", "cepat", "mudah", "sulit",
  "real", "teoritis", "praktis", "empiris", "kualitatif", "kuantitatif", "deskriptif",
  "permasalahan", "solusi", "masalah", "isu", "kendala", "hambatan", "tantangan",
  "kelebihan", "kelemahan", "kekurangan", "manfaat", "fungsi", "kegunaan", "peran", "kontribusi",
  "berakhir", "selesai", "rampung", "ditutup", "menutup", "membuka", "memulai", "dimulai",
  "digunakan", "menggunakan", "dimanfaatkan", "memanfaatkan", "diterapkan", "menerapkan",
  "dilakukan", "melakukan", "diatur", "mengatur", "ditentukan", "menentukan",
  "disebutkan", "menyebutkan", "dinyatakan", "menyatakan", "diketahui", "dikenal",
  "diberikan", "memberikan", "diperoleh", "memperoleh", "dicapai", "mencapai", "didapat",
  "demikian", "kesuksesan", "keberhasilan", "mempersingkat", "mempercepat", "mempermudah",
  "berfungsi", "berjalan", "beroperasi", "berhasil",
  "menunjukkan", "menunjukan", "membuktikan", "terbukti", "terlihat", "nampak", "tampak",
  "diperlukan", "dibutuhkan", "dipunyai", "tersedia", "terdapat", "ada",
  "diharapkan", "diinginkan", "direncanakan", "ditargetkan", "dimaksudkan", "ditujukan",
  "jurnal", "artikel", "paper", "tesis", "skripsi", "tugas", "akhir", "laporan", "publikasi",
  "penulis", "peneliti", "pihak", "kelompok", "tim", "kami", "saya", "kita", "mereka", "dia",
  "universitas", "sekolah", "institusi", "organisasi", "perusahaan", "lembaga", "dinas",
  "indonesia", "gresik", "surabaya", "jakarta", "ternate", "lamongan", "manyar",
]);

// Mengambil token autentikasi Puter dari lingkungan yang tersedia.
const getPuterAuthToken = () => {
  const viteToken = typeof import.meta !== "undefined" ? import.meta.env?.VITE_PUTER_AUTH_TOKEN : undefined;
  const nodeToken = typeof process !== "undefined" ? process.env?.PUTER_AUTH_TOKEN || process.env?.VITE_PUTER_AUTH_TOKEN : undefined;
  const authToken = viteToken || nodeToken || "";

  return authToken.trim();
};

const puterAuthToken = getPuterAuthToken();

if (puterAuthToken) {
  puter.setAuthToken(puterAuthToken);
}

const algorithmDomainCache = new Map();

// Persist algorithm domain cache in browser localStorage to avoid repeated prewarm calls
const ALG_CACHE_KEY = "puter_algorithm_domain_cache_v1";
if (typeof window !== "undefined" && window.localStorage) {
  try {
    const raw = window.localStorage.getItem(ALG_CACHE_KEY);
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object") {
        Object.keys(obj).forEach((k) => algorithmDomainCache.set(k, obj[k]));
      }
    }
  } catch (e) {
    // ignore
  }
}

const saveAlgorithmCache = () => {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const obj = {};
    algorithmDomainCache.forEach((v, k) => { obj[k] = v; });
    window.localStorage.setItem(ALG_CACHE_KEY, JSON.stringify(obj));
  } catch (e) {
    // ignore
  }
};

// Background queue to classify algorithms sequentially and avoid rate limits
const algorithmQueue = [];
const algorithmPending = new Set();
let algorithmQueueProcessing = false;

const enqueueAlgorithmClassification = (algorithm) => {
  const key = String(algorithm || "").trim();
  if (!key) return;
  if (algorithmDomainCache.has(key)) return;
  if (algorithmPending.has(key)) return;
  algorithmPending.add(key);
  algorithmQueue.push(key);
  if (!algorithmQueueProcessing) processAlgorithmQueue();
};

const processAlgorithmQueue = async () => {
  algorithmQueueProcessing = true;
  while (algorithmQueue.length > 0) {
    const alg = algorithmQueue.shift();
    let attempt = 0;
    const maxRetries = 5;
    let done = false;

    while (!done && attempt <= maxRetries) {
      try {
        // perform direct classification and persist
        await doClassifyAlgorithmDirect(alg);
        done = true;
      } catch (err) {
        const msg = String(err && (err.message || err.toString() || ""));
        const isRateLimit = (err && err.code === "too_many_requests") || /too many requests|rate limit/i.test(msg);
        if (!isRateLimit) {
          // mark as failed but avoid retrying non-rate-limit errors
          algorithmDomainCache.set(alg, null);
          try { saveAlgorithmCache(); } catch (e) {}
          done = true;
        } else {
          attempt += 1;
          const backoff = 1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
          await sleep(backoff);
        }
      }
    }

    algorithmPending.delete(alg);
    // small pause between items
    await sleep(800 + Math.floor(Math.random() * 300));
  }
  algorithmQueueProcessing = false;
};

const doClassifyAlgorithmDirect = async (algorithm) => {
  if (!puterAuthToken || !algorithm) return null;
  const prompt = `Classify the following algorithm name into one of these domains only: forecasting, classification, clustering, association, decision, datamining, imageprocessing, or other. Respond with exactly one of those terms and nothing else. Algorithm: "${algorithm}"`;

  if (typeof window !== "undefined") {
    try { window.dispatchEvent(new CustomEvent("puter-loading", { detail: { loading: true } })); } catch (e) {}
  }

  try {
    const response = await puter.ai.chat(prompt, { stream: false });
    const domain = normalizePuterResponse(String(response));
    algorithmDomainCache.set(algorithm, domain);
    try { saveAlgorithmCache(); } catch (e) {}
    return domain;
  } finally {
    if (typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent("puter-loading", { detail: { loading: false } })); } catch (e) {}
    }
  }
};

if (typeof globalThis !== "undefined") {
  if (globalThis.PUTER_API_ORIGIN) {
    puter.defaultAPIOrigin = globalThis.PUTER_API_ORIGIN;
  }
  if (globalThis.PUTER_ORIGIN) {
    puter.defaultGUIOrigin = globalThis.PUTER_ORIGIN;
  }
}

// Membersihkan teks menjadi token yang siap diproses untuk pencocokan semantik.
export const preprocessText = (text) => {
  const tokens = String(text ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const filteredTokens = idStopwords.removeStopwords(tokens)
    .filter((word) => word.length > 2)
    .filter((word) => !academicStopwords.has(word));

  return filteredTokens;
};

// Membuat representasi TF-IDF dari kumpulan dokumen untuk pencarian berbasis vektor.
export const calculateTfIdf = (documents) => {
  const processedDocs = documents.map(preprocessText);
  const terms = [];
  const tfidfMatrix = [];

  processedDocs.forEach((words) => {
    words.forEach((word) => {
      if (!terms.includes(word)) {
        terms.push(word);
      }
    });
  });

  const termFrequencies = processedDocs.map((words) => {
    const termFrequency = {};
    words.forEach((word) => {
      termFrequency[word] = (termFrequency[word] || 0) + 1;
    });
    return termFrequency;
  });

  const idf = {};
  const numDocuments = documents.length;

  terms.forEach((term) => {
    let docCount = 0;
    processedDocs.forEach((words) => {
      if (words.includes(term)) {
        docCount += 1;
      }
    });
    idf[term] = Math.log(numDocuments / (docCount));
  });

  processedDocs.forEach((words, docIndex) => {
    const tfidfRow = terms.map((term) => {
      const tf = termFrequencies[docIndex][term] || 0;
      return tf * idf[term];
    });
    tfidfMatrix.push(tfidfRow);
  });

  return { tfidfMatrix, terms };
};

// Menghitung kemiripan kosinus antara dua vektor pembobotan.
export const calculateCosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i += 1) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (normA * normB);
};

// Menormalkan nilai algoritma dari data mentah menjadi daftar yang rapi.
export const normalizeAlgorithms = (algorithmValue) => {
  if (!algorithmValue) return [];

  const algorithms = Array.isArray(algorithmValue) ? algorithmValue : [algorithmValue];
  return algorithms
    .map((item) => String(item || "").trim())
    .filter(
      (item) =>
        item !== "" &&
        item.toLowerCase() !== "none" &&
        item !== "undefined" &&
        item !== "null"
    );
};

// Mengekstrak singkatan dari nama algoritma jika ada.
const extractAbbreviation = (algorithmName) => {
  const match = String(algorithmName || "").match(/\s*\/\s*([A-Za-z0-9-]+)\s*$/);
  return match ? match[1].toLowerCase().trim() : null;
};

// Mengekstrak nama utama algoritma sebelum bagian pembagian seperti tanda slash.
const extractFullName = (algorithmName) => {
  return String(algorithmName || "")
    .split(/\s*\/\s*/)[0]
    .toLowerCase()
    .trim();
};

// Membuat bentuk kanonik dari nama algoritma untuk pencocokan yang lebih konsisten.
export const getAlgorithmCanonical = (algorithmName) => {
  const normalized = String(algorithmName || "").toLowerCase().replace(/\s+/g, " ").trim();
  const abbrev = extractAbbreviation(algorithmName);
  const fullName = extractFullName(algorithmName);

  return {
    original: algorithmName,
    normalized,
    fullName,
    abbreviation: abbrev,
    canonical: abbrev ? `${fullName}|${abbrev}` : fullName,
  };
};

// Menormalkan dokumen artikel agar format datanya konsisten untuk diproses lebih lanjut.
export const normalizeArticle = (doc) => {
  const data = doc.data();
  const normalizeAlgorithm = (value) => {
    const label = String(value || "").trim().replace(/\s+/g, " ");
    if (!label || label.toLowerCase() === "none") {
      return "";
    }

    return label
      .split("/")[0]
      .replace(/\b(?:method|algorithm|algoritma)\b$/i, "")
      .trim();
  };

  const normalizeAuthor = (value) => {
    const author = String(value || "").trim().replace(/\s+/g, " ");
    return author.replace(/^(?:nim|nrp|npm)[\s:.-]*\d+\s*/i, "");
  };

  const normalizedAlgorithms = Array.from(
    new Set(
      normalizeAlgorithms(data.algorithm || [])
        .map(normalizeAlgorithm)
        .filter(Boolean)
    )
  );

  return {
    id: doc.id,
    title: String(data.title || "").trim(),
    author: normalizeAuthor(data.author || data.Author || ""),
    date: String(data.date || "").trim(),
    link: String(data.link || "").trim(),
    algorithm: normalizedAlgorithms,
    abstract: String(data.abstract || "").trim(),
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    conclusion: String(data.conclusion || "").trim(),
    University: String(data.University || data.university || "").trim(),
  };
};

// Mengambil daftar algoritma unik dari seluruh artikel yang tersedia.
export const getAllUniqueAlgorithms = (articles) => {
  const algorithms = new Set();
  articles.forEach((article) => {
    const values = Array.isArray(article.algorithm) ? article.algorithm : article.algorithm || [];
    const algorithmList = Array.isArray(values) ? values : [values];

    algorithmList.forEach((item) => algorithms.add(String(item).toLowerCase().trim()));
  });

  return Array.from(algorithms);
};

const escapeRegExp = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const containsWholePhrase = (text, phrase) => {
  const normalizedText = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const normalizedPhrase = String(phrase || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalizedText || !normalizedPhrase) return false;
  if (normalizedText === normalizedPhrase) return true;

  const regex = new RegExp(`(^|\\s)${escapeRegExp(normalizedPhrase)}($|\\s)`);
  return regex.test(normalizedText);
};

const normalizeAlgorithmText = (value) => {
  let normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!normalized) return "";

  normalized = normalized.replace(/\bfuzzy\s+/g, "");

  if (/\b(k[- ]?nearest|knn|k[- ]?nn|k nearest neighbours|k nearest neighbors|k-nearest neighbours|k-nearest neighbors)\b/.test(normalized)) {
    return "k-nearest neighbor";
  }

  if (/\bmonte\s+carlo\b/.test(normalized)) {
    return "monte carlo";
  }

  if (/\b(exponential|triple exponential|exponential smoothing|exponential smoothening|tes)\b/.test(normalized)) {
    return "exponential smoothing";
  }

  if (/\btrend\s+projection\b/.test(normalized)) {
    return "trend projection";
  }

  if (/\btime\s*series\b/.test(normalized)) {
    return "time series";
  }

  if (/\bmoving\s+average(s)?\b/.test(normalized)) {
    return "moving average";
  }

  return normalized;
};

const standardizeAlgorithmName = (algorithmName) => {
  return normalizeAlgorithmText(algorithmName);
};

const getAlgorithmKey = (algorithmName) => getAlgorithmCanonical(standardizeAlgorithmName(algorithmName)).canonical;

const isAlgorithmMatch = (algorithmName, queryAlgorithmCanonical) => {
  const algorithmCanonical = getAlgorithmCanonical(algorithmName);

  if (algorithmCanonical.canonical === queryAlgorithmCanonical.canonical) return true;
  if (algorithmCanonical.normalized === queryAlgorithmCanonical.normalized) return true;
  if (queryAlgorithmCanonical.abbreviation && algorithmCanonical.fullName === queryAlgorithmCanonical.abbreviation) return true;
  if (algorithmCanonical.abbreviation && algorithmCanonical.abbreviation === queryAlgorithmCanonical.normalized) return true;
  if (containsWholePhrase(algorithmCanonical.normalized, queryAlgorithmCanonical.normalized)) return true;
  if (containsWholePhrase(queryAlgorithmCanonical.normalized, algorithmCanonical.normalized)) return true;

  const parts = algorithmCanonical.normalized.split("/").map((part) => part.trim());
  for (const part of parts) {
    if (part.length > 3 && containsWholePhrase(queryAlgorithmCanonical.normalized, part)) {
      return true;
    }
  }

  return false;
};

// Mendeteksi algoritma yang muncul dalam kueri pengguna.
export const detectAlgorithmsInQuery = (query, allAlgorithms) => {
  const queryCanonical = getAlgorithmCanonical(query);
  const foundAlgorithms = new Set();

  allAlgorithms.forEach((algorithm) => {
    if (isAlgorithmMatch(algorithm, queryCanonical)) {
      foundAlgorithms.add(algorithm);
    }
  });

  return Array.from(foundAlgorithms);
};


// Menentukan bahasa teks untuk pemilihan strategi penerjemahan.
export const detectLanguage = (text) => {
  const language = franc(String(text || "").trim(), {
    minLength: 3,
  });

  if (language === "ind") {
    return "id";
  }

  return "en";
};

// Menerjemahkan kueri pengguna ke bahasa target untuk pencarian yang lebih luas.
export const translateQuery = async (text, targetLang = "en") => {
  try {
    const sourceLanguage = detectLanguage(text);

    if (sourceLanguage === "en") {
      return text;
    }

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|${targetLang}`;
    // Use a resilient fetch with timeout and retry/backoff to avoid inconsistent results
    const data = await fetchJsonWithRetry(url, {}, 2, 5000, 300);

    if (data && data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }

    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

// Helper: fetch JSON with timeout, retries and exponential backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJsonWithRetry(url, options = {}, retries = 2, timeoutMs = 5000, backoffMs = 300) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status} ${response.statusText} ${text}`);
      }

      const json = await response.json();
      return json;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) {
        throw err;
      }
      const wait = backoffMs * Math.pow(2, attempt);
      // small jitter
      await sleep(wait + Math.floor(Math.random() * 100));
    }
  }
}

// Menghitung kesesuaian judul artikel terhadap kueri pengguna.
const calculateTitleRelevance = (articleTitle, query) => {
  const titleWords = preprocessText(articleTitle);
  const queryWords = preprocessText(query);

  if (titleWords.length === 0 || queryWords.length === 0) return 0;

  const matches = queryWords.filter((word) => titleWords.includes(word)).length;
  const relevance = matches / queryWords.length;

  return relevance;
};

// Menghitung kesesuaian kata kunci artikel terhadap kueri pengguna.
const calculateKeywordRelevance = (articleKeywords, query) => {
  if (!articleKeywords || articleKeywords.length === 0) return 0;

  const queryWords = preprocessText(query);
  if (queryWords.length === 0) return 0;

  const keywordText = articleKeywords.join(" ").toLowerCase();
  const keywordWords = preprocessText(keywordText);
  const matches = queryWords.filter((word) => keywordWords.includes(word)).length;
  const relevance = matches / queryWords.length;

  return relevance;
};
export const recommendAlgorithm = async (
  inputQuery,
  articlesData,
  tfidfMatrix,
  terms,
  queriedAlgorithms = [],
  maxResults = 20
) => {
  const processedQuery = preprocessText(inputQuery);
  const queryVector = terms.map((term) => processedQuery.filter((q) => q === term).length);

  const allAlgorithmEntries = [];

  for (let index = 0; index < tfidfMatrix.length; index += 1) {
    const vector = tfidfMatrix[index];
    const tfidfSimilarity = calculateCosineSimilarity(vector, queryVector);
    const article = articlesData[index];

    const titleRelevance = calculateTitleRelevance(article.title, inputQuery);
    const keywordRelevance = calculateKeywordRelevance(article.keywords, inputQuery);
    const combined = titleRelevance * 0.4 + keywordRelevance * 0.3 + tfidfSimilarity * 0.3;

    const algorithms = Array.isArray(article.algorithm) ? article.algorithm : [article.algorithm];

    for (const algorithm of algorithms) {
      const standardizedAlgorithm = standardizeAlgorithmName(algorithm);
      const similarity = combined;

      allAlgorithmEntries.push({
        id: article.id,
        title: article.title,
        algorithm: standardizedAlgorithm,
        similarity,
      });
    }
  }

  const algorithmStats = {};

  allAlgorithmEntries.forEach((entry) => {
    if (entry.similarity <= 0) return;
    const algorithmKey = getAlgorithmKey(entry.algorithm);
    if (!algorithmStats[algorithmKey]) {
      algorithmStats[algorithmKey] = {
        algorithm: standardizeAlgorithmName(entry.algorithm),
        ids: new Set(),
        maxSimilarity: 0,
        bestEntry: entry,
      };
    }

    const stats = algorithmStats[algorithmKey];
    stats.ids.add(entry.id);
    stats.maxSimilarity = Math.max(stats.maxSimilarity, entry.similarity);
    if (entry.similarity > stats.bestEntry.similarity) {
      stats.bestEntry = entry;
    }
  });

  const aggregatedAlgorithms = Object.values(algorithmStats).map((stats) => ({
    algorithm: stats.algorithm,
    id: stats.bestEntry.id,
    title: stats.bestEntry.title,
    articleCount: stats.ids.size,
    maxSimilarity: stats.maxSimilarity,
    articleIds: Array.from(stats.ids),
  }));

  const sortByAggregateScore = (a, b) => {
    if (b.maxSimilarity !== a.maxSimilarity) {
      return b.maxSimilarity - a.maxSimilarity;
    }
    if (b.articleCount !== a.articleCount) {
      return b.articleCount - a.articleCount;
    }
    return 0;
  };

  const rankedAlgorithms = aggregatedAlgorithms
    .filter((item) => item.maxSimilarity > 0)
    .sort(sortByAggregateScore);

  if (queriedAlgorithms.length === 0) {
    return rankedAlgorithms.slice(0, maxResults);
  }

  const queriedCanonical = queriedAlgorithms.map((item) => getAlgorithmCanonical(item));
  const filteredAlgorithms = rankedAlgorithms.filter((algorithmData) => {
    const algorithmCanonical = getAlgorithmCanonical(algorithmData.algorithm);
    const shouldRemove = queriedCanonical.some((qCanonical) => isAlgorithmMatch(algorithmData.algorithm, qCanonical));
    return !shouldRemove;
  });

  return filteredAlgorithms.slice(0, maxResults);
};

const sortAlgorithmCandidates = (items) => {
  return items.slice().sort((a, b) => {
    if (b.maxSimilarity !== a.maxSimilarity) {
      return b.maxSimilarity - a.maxSimilarity;
    }
    if (b.articleCount !== a.articleCount) {
      return b.articleCount - a.articleCount;
    }
    return 0;
  });
};

// Menggabungkan rekomendasi algoritma dari kueri bahasa Indonesia dan Inggris.
export const recommendAlgorithmDualLanguage = async (
  queryIndonesia,
  queryEnglish,
  articlesData,
  tfidfMatrix,
  terms,
  queriedAlgorithms = []
) => {
  const recommendsIndonesia = await recommendAlgorithm(
    queryIndonesia,
    articlesData,
    tfidfMatrix,
    terms,
    queriedAlgorithms,
    100
  );

  const recommendsEnglish =
    queryEnglish !== queryIndonesia
      ? await recommendAlgorithm(queryEnglish, articlesData, tfidfMatrix, terms, queriedAlgorithms, 100)
      : [];

  const mergedMap = new Map();
  const articleMapById = new Map(articlesData.map((article) => [article.id, article]));

  const addOrMergeAlgorithm = (algorithm) => {
    const algorithmKey = getAlgorithmKey(algorithm.algorithm);
    const existing = mergedMap.get(algorithmKey);
    const incomingIds = new Set(Array.isArray(algorithm.articleIds) ? algorithm.articleIds : []);

    if (!existing) {
      mergedMap.set(algorithmKey, {
        id: algorithm.id,
        title: algorithm.title,
        algorithm: algorithm.algorithm,
        maxSimilarity: algorithm.maxSimilarity || algorithm.similarity,
        articleIds: incomingIds,
      });
      return;
    }

    const candidateMaxSimilarity = algorithm.maxSimilarity || algorithm.similarity;
    existing.articleIds = new Set([...existing.articleIds, ...incomingIds]);
    if (candidateMaxSimilarity > existing.maxSimilarity) {
      existing.maxSimilarity = candidateMaxSimilarity;
      existing.id = algorithm.id;
      existing.title = algorithm.title;
      existing.algorithm = algorithm.algorithm;
    }
  };

  recommendsIndonesia.forEach(addOrMergeAlgorithm);
  recommendsEnglish.forEach(addOrMergeAlgorithm);

  return Array.from(mergedMap.values())
    .map((item) => {
      const universityCounts = Array.from(item.articleIds).reduce((counts, articleId) => {
        const article = articleMapById.get(articleId);
        const university = article?.University || article?.university;
        const normalizedUniversity = university && String(university).trim();
        if (!normalizedUniversity) return counts;

        if (!counts[normalizedUniversity]) {
          counts[normalizedUniversity] = 0;
        }
        counts[normalizedUniversity] += 1;
        return counts;
      }, {});

      const universityLabels = Object.entries(universityCounts).map(
        ([universityName, count]) => `${universityName}: ${count}`
      );

      return {
        id: item.id,
        title: item.title,
        algorithm: item.algorithm,
        maxSimilarity: item.maxSimilarity,
        articleCount: item.articleIds.size,
        universityLabels,
      };
    })
    .sort((a, b) => {
      if (b.maxSimilarity !== a.maxSimilarity) {
        return b.maxSimilarity - a.maxSimilarity;
      }
      if (b.articleCount !== a.articleCount) {
        return b.articleCount - a.articleCount;
      }
      return 0;
    })
    .slice(0,100);
};


export const recommendArticles = (inputQuery, articlesData, tfidfMatrix, terms) => {
  const processedQuery = preprocessText(inputQuery);
  const queryVector = terms.map((term) => processedQuery.filter((q) => q === term).length);

  const scoredArticles = tfidfMatrix.map((vector, index) => {
    const tfidfScore = calculateCosineSimilarity(vector, queryVector);
    const article = articlesData[index];

    const titleRelevance = calculateTitleRelevance(article.title, inputQuery);
    const keywordRelevance = calculateKeywordRelevance(article.keywords, inputQuery);
    const regexscore = titleRelevance * 0.4 + keywordRelevance * 0.3 + tfidfScore * 0.3;

    return {
      article,
      similarity: regexscore,
    };
  });

  scoredArticles.sort((a, b) => b.similarity - a.similarity);

  return scoredArticles
    .filter((item) => item.similarity > 0)
    .slice(0, 100)
    .map(({ article, similarity }) => ({
      ...article,
      similarity,
    }));
};

// Menggabungkan rekomendasi artikel dari dua bahasa kueri.
export const recommendArticlesDualLanguage = (
  queryIndonesia,
  queryEnglish,
  articlesData,
  tfidfMatrix,
  terms,
  queriedAlgorithms = []
) => {
  const resultsIndonesia = recommendArticles(queryIndonesia, articlesData, tfidfMatrix, terms);
  const resultsEnglish =
    queryEnglish !== queryIndonesia
      ? recommendArticles(queryEnglish, articlesData, tfidfMatrix, terms)
      : [];

  const queryCanonicalList = queriedAlgorithms.map((item) => getAlgorithmCanonical(item));

  const hasQueryAlgorithmOnly = (article) => {
    const algorithms = Array.isArray(article.algorithm) ? article.algorithm : article.algorithm ? [article.algorithm] : [];
    if (algorithms.length !== 1) return false;

    return algorithms.some((algorithm) =>
      queryCanonicalList.some((qCanonical) => isAlgorithmMatch(algorithm, qCanonical))
    );
  };

  const mergedMap = new Map();

  resultsIndonesia.forEach((article) => {
    mergedMap.set(article.id, {
      ...article,
      similarity: article.similarity,
    });
  });

  resultsEnglish.forEach((article) => {
    if (mergedMap.has(article.id)) {
      const existing = mergedMap.get(article.id);
      existing.similarity = Math.max(existing.similarity, article.similarity);
    } else {
      mergedMap.set(article.id, {
        ...article,
        similarity: article.similarity,
      });
    }
  });

  return Array.from(mergedMap.values())
    .filter((item) => item.similarity > 0)
    .filter((item) => !hasQueryAlgorithmOnly(item))
    .sort((a, b) => b.similarity - a.similarity);
};

const domainMap = {
  forecasting: "forecasting",
  classification: "classification",
  clustering: "clustering",
  association: "association",
  decision: "decision",
  datamining: "datamining",
  imageprocessing: "imageprocessing",
  other: "other",
};

const normalizePuterResponse = (text) => {
  const normalized = String(text || "").toLowerCase().trim();
  for (const key of Object.keys(domainMap)) {
    if (normalized.includes(key)) {
      return domainMap[key];
    }
  }
  return null;
};

const getQueryAlgorithmDomain = async (query) => {
  return classifyQueryWithPuter(query);
};

const classifyQueryWithPuter = async (query) => {
  if (!puterAuthToken || !query) return null;

  const prompt = `Classify the following research query into one of these domains only: forecasting, classification, clustering, association, decision, datamining, imageprocessing, or other. Respond with exactly one of those terms and nothing else. Query: "${query}"`;

  try {
    if (typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent("puter-loading", { detail: { loading: true } })); } catch (e) {}
    }

    const response = await puter.ai.chat(prompt, { stream: false });
    return normalizePuterResponse(String(response));
  } catch (error) {
    console.warn("Puter.ai query domain classification failed.", error);
    return null;
  } finally {
    if (typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent("puter-loading", { detail: { loading: false } })); } catch (e) {}
    }
  }
};

const classifyAlgorithmWithPuter = async (algorithm) => {
  if (!puterAuthToken || !algorithm) return null;
  if (algorithmDomainCache.has(algorithm)) return algorithmDomainCache.get(algorithm);

  // If running in browser/UI, enqueue background classification and return null immediately
  if (typeof window !== "undefined") {
    try { enqueueAlgorithmClassification(algorithm); } catch (e) {}
    return null;
  }

  // In non-browser environments (server), attempt direct classification with retries
  let attempt = 0;
  const maxRetries = 3;
  while (attempt <= maxRetries) {
    try {
      return await doClassifyAlgorithmDirect(algorithm);
    } catch (err) {
      const msg = String(err && (err.message || err.toString() || ""));
      const isRateLimit = (err && err.code === "too_many_requests") || /too many requests|rate limit/i.test(msg);
      if (!isRateLimit || attempt === maxRetries) {
        algorithmDomainCache.set(algorithm, null);
        try { saveAlgorithmCache(); } catch (e) {}
        return null;
      }
      attempt += 1;
      await sleep(1000 * Math.pow(2, attempt - 1));
    }
  }
  return null;
};

// Prewarm Puter.ai classifications for a list of algorithm names.
// Runs with limited concurrency and small delay between batches so it doesn't hammer the API.
export const prewarmAlgorithmDomains = async (
  algorithms = [],
  concurrency = 1,
  batchDelayMs = 1000,
  maxRetries = 5
) => {
  if (!puterAuthToken || !Array.isArray(algorithms) || algorithms.length === 0) return;

  const unique = Array.from(new Set(algorithms.map((a) => String(a || "").trim()).filter(Boolean)));

  // Process sequentially (concurrency=1) to avoid rate limits; retry on 429 with exponential backoff
  for (let idx = 0; idx < unique.length; idx += 1) {
    const alg = unique[idx];
    let attempt = 0;
    let succeeded = false;

    while (attempt <= maxRetries && !succeeded) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await classifyAlgorithmWithPuter(alg);
        succeeded = true;
      } catch (err) {
        const msg = String(err && (err.message || err.toString() || ""));
        const isRateLimit = (err && err.code === "too_many_requests") || /too many requests|rate limit/i.test(msg);

        if (!isRateLimit) {
          // non-rate-limit error: stop retrying this algorithm
          succeeded = true; // mark done to continue
          break;
        }

        attempt += 1;
        const backoff = batchDelayMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 200);
        // eslint-disable-next-line no-await-in-loop
        await sleep(backoff);
      }
    }

    // small pause between items to be nice to the API
    if (idx + 1 < unique.length) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(batchDelayMs + Math.floor(Math.random() * 200));
    }
  }
};
