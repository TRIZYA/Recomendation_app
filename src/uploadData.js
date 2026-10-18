import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { createHash } from "crypto";
import process from "process";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// menyiapkan dirname (karena ES module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 memaksa memuat .env dari root
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});
dotenv.config();

console.log("ENV CHECK:", {
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID
});

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 MUAT DATA - sesuaikan path
const datajsonPath = path.resolve(__dirname, "./data/data_fix.json");
const articlesData = JSON.parse(
  fs.readFileSync(datajsonPath, "utf8")
);

// ==============================
// 🧠 PEMBERSIHAN AMAN SEKALI
// ==============================
const cleanData = (article) => {
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

  return {
    // 📘 Informasi dasar
    title: String(article.title || "").trim(),
    author: normalizeAuthor(article.author),

    // 📅 Tanggal
    date: String(article.date || "").trim(),

    // 🔗 Tautan & skor
    link: String(article.link || "").trim(),
    // 🔥 PERBAIKI ALGORITMA (INI KRUSIAL)
    algorithm: (() => {
      if (!article.algorithm) return [];

      const algorithmList = Array.isArray(article.algorithm)
        ? article.algorithm
        : [article.algorithm];

      return Array.from(
        new Set(
          algorithmList
            .map(normalizeAlgorithm)
            .filter((value) => value && value !== "undefined" && value !== "null")
        )
      );
    })(),

    // 📝 Kolom isi
    abstract: String(article.abstract || "").trim(),

    // 🏷️ Kata kunci (selalu array)
    keywords: (() => {
      if (!article.keywords) return [];
      
      let k = Array.isArray(article.keywords)
        ? article.keywords
        : [article.keywords];

      return k
        .map(x => String(x).trim())
        .filter(x => x !== "" && x !== "undefined" && x !== "null");
    })(),

    // 📋 Kesimpulan
    conclusion: String(article.conclusion || "").trim(),

    // 🎓 Universitas / kampus
    University: String(article.University || article.university || "").trim()
  };
};

const normalizeKeyPart = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const buildFallbackKey = (article) =>
  [
    normalizeKeyPart(article.title),
    normalizeKeyPart(article.author),
    normalizeKeyPart(article.date || ""),
  ].join("|");

const buildLookupKey = (article) => {
  const linkKey = normalizeKeyPart(article.link);

  if (linkKey) {
    return `link:${linkKey}`;
  }

  return `fallback:${buildFallbackKey(article)}`;
};

const buildDocumentId = (article) =>
  createHash("sha1")
    .update(buildLookupKey(article))
    .digest("hex");

// ==============================
// UNGGAH + DEBUG
// ==============================
const uploadData = async () => {
  console.log(`\n📊 Starting upload of ${articlesData.length} articles...\n`);
  const existingArticlesSnapshot = await getDocs(collection(db, "articles"));
  const existingArticlesByKey = new Map();
  existingArticlesSnapshot.forEach((documentSnapshot) => {
    const data = documentSnapshot.data();
    const key = buildLookupKey(data);

    if (!existingArticlesByKey.has(key)) {
      existingArticlesByKey.set(key, []);
    }

    existingArticlesByKey.get(key).push(documentSnapshot.ref);
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < articlesData.length; i++) {
    const article = articlesData[i];

    try {
      const cleanArticle = cleanData(article);
      const lookupKey = buildLookupKey(cleanArticle);
      const matchedRefs = existingArticlesByKey.get(lookupKey) || [];

      // 🔥 DEBUG MINIMAL (agar tidak terlalu banyak log)
      if (i % 50 === 0 || i === articlesData.length - 1) {
        console.log(`PROCESSING [${i + 1}/${articlesData.length}]: ${cleanArticle.title.substring(0, 50)}...`);
      }

      if (matchedRefs.length > 0) {
        await Promise.all(
          matchedRefs.map((articleRef) => setDoc(articleRef, cleanArticle, { merge: true }))
        );
        updatedCount += matchedRefs.length;
      } else {
        const articleRef = doc(collection(db, "articles"), buildDocumentId(cleanArticle));
        await setDoc(articleRef, cleanArticle, { merge: true });
        existingArticlesByKey.set(lookupKey, [articleRef]);
        createdCount += 1;
      }

      if (i % 50 === 0 || i === articlesData.length - 1) {
        console.log(`✅ SUCCESS`);
      }
    } catch (error) {
      console.error(`\n❌ ERROR DI INDEX ${i}`);
      console.error("📄 DATA:", {
        title: article.title,
        author: article.author,
        date: article.date,
        algorithmCount: article.algorithm?.length || 0
      });
      console.error("❌ DETAIL ERROR:", error.message);

      // ⛔ HENTIKAN AGAR DATA RUSAK TIDAK BERLANJUT
      break;
    }
  }

  console.log(`\n✅ Upload selesai!`);
  console.log(`📁 Data baru ditambahkan: ${createdCount}`);
  console.log(`♻️ Data diperbarui: ${updatedCount}\n`);
};

uploadData();