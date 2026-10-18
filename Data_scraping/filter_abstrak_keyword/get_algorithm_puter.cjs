#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const inputDataFile = process.argv[2] || process.env.DATA_FILE || "./data_fix.json";
const outputDataFile =
  process.argv[3] ||
  process.env.OUTPUT_FILE ||
  inputDataFile.replace(/\.json$/i, "_with_algorithm.json");
const apiKey = process.env.PUTER_API_KEY || process.env.PUTER_AI_API_KEY || "";
const apiUrl = process.env.PUTER_API_URL || process.env.PUTER_BASE_URL || "";

function normalizeText(text) {
  return (text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;|/\\]+/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function toTitleCase(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase());
}

function parseDetectedAlgorithm(text) {
  const cleaned = normalizeText(text || "");
  if (!cleaned) return [];

  const candidates = [];
  const patterns = [
    { name: "Naive Bayes", regex: /\bnaive\s+bayes\b|\bnb\b/i },
    { name: "Support Vector Machine", regex: /\bsvm\b|support\s+vector\s+machine/i },
    { name: "K-Nearest Neighbor", regex: /\bk[- ]?nn\b|knn|k-nearest\s+neighbor/i },
    { name: "Decision Tree", regex: /decision\s+tree|c4\.5|id3/i },
    { name: "Random Forest", regex: /random\s+forest/i },
    { name: "Convolutional Neural Network", regex: /\bcnn\b|convolutional\s+neural/i },
    { name: "Artificial Neural Network", regex: /\bann\b|artificial\s+neural/i },
    { name: "Fuzzy K-NN", regex: /fuzzy\s+k[- ]?nn|fuzzy\s+knn/i },
    { name: "Fuzzy C-Means", regex: /fuzzy\s+c[- ]?means|\bfcm\b/i },
    { name: "Fuzzy Logic", regex: /fuzzy\s+logic|fuzzy/i },
    { name: "K-Means", regex: /k[- ]?means/i },
    { name: "Apriori", regex: /\bapriori\b/i },
    { name: "Analytical Hierarchy Process", regex: /\bahp\b|analytic\s+hierarchy/i },
    { name: "Simple Additive Weighting", regex: /\bsaw\b|simple\s+additive\s+weighting/i },
    { name: "Weighted Product", regex: /\bwp\b|weighted\s+product/i },
    { name: "TOPSIS", regex: /\btopsis\b|technique\s+for\s+order/i },
    { name: "MOORA", regex: /\bmoora\b|multi-objective\s+optimization/i },
    { name: "VIKOR", regex: /\bvikor\b/i },
    { name: "OCRA", regex: /\bocra\b|operational\s+competitiveness/i },
    { name: "COPRAS", regex: /\bcopras\b|complex\s+proportional/i },
    { name: "Monte Carlo", regex: /monte\s+carlo/i },
    { name: "Trend Projection", regex: /trend\s+projection|trend\s+analysis/i },
    { name: "Moving Average", regex: /moving\s+average|exponential\s+smoothing/i },
    { name: "Waterfall", regex: /\bwaterfall\b/i },
    { name: "RAD", regex: /rapid\s+application\s+development|\brad\b/i },
    { name: "Principal Component Analysis", regex: /\bpca\b|principal\s+component/i },
    { name: "Local Binary Pattern Histogram", regex: /local\s+binary\s+pattern|\blbph\b/i },
    { name: "Haar Cascade", regex: /haar\s+cascade/i },
    { name: "YOLO", regex: /\byolo\b|you\s+only\s+look\s+once/i },
    { name: "Regression", regex: /regression\s+analysis|linear\s+regression/i },
    { name: "Time Series", regex: /time\s+series|arima/i },
    { name: "Black Box Testing", regex: /black\s+box\s+testing/i },
    { name: "Word Embedding", regex: /word\s+embedding/i },
    { name: "Clustering", regex: /clustering/i },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(cleaned)) {
      candidates.push(pattern.name);
    }
  }

  if (!candidates.length) {
    const directMatches = cleaned.match(/(?:algoritma|metode|method|algorithm)\s*[:\-]\s*([A-Za-z0-9 /&+.-]+)/i);
    if (directMatches && directMatches[1]) {
      candidates.push(toTitleCase(directMatches[1].replace(/\s+/g, " ")));
    }
  }

  return [...new Set(candidates)].slice(0, 8);
}

function parseAiText(rawText) {
  const text = normalizeText(rawText || "");
  if (!text) return [];

  const bracketMatch = text.match(/\[(.*?)\]/s);
  if (bracketMatch) {
    const items = bracketMatch[1]
      .split(/,|;|\n/)
      .map((x) => x.replace(/^["'`\s]+|["'`\s]+$/g, ""))
      .filter(Boolean);
    if (items.length) return items;
  }

  const jsonMatch = text.match(/\{[^]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (parsed && typeof parsed === "object") {
        const values = [parsed.algorithm, parsed.algorithms, parsed.method, parsed.methods, parsed.result];
        return ensureArray(values.find((v) => v));
      }
    } catch {}
  }

  const lines = text
    .split(/\n|\r/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean);
  if (lines.length) return lines.slice(0, 8);

  return parseDetectedAlgorithm(text);
}

async function callPuterAI(title, abstract, keywords, conclusion) {
  if (!apiKey) return [];

  const prompt = [
    "Kamu adalah extractor metode/algoritma dari karya ilmiah.",
    "Berdasarkan data berikut, tulis hanya array JSON berisi nama algoritma/metode utama yang paling relevan.",
    "Contoh: [\"Naive Bayes\", \"K-Nearest Neighbor\"].",
    "",
    `Judul: ${title || "-"}`,
    `Abstrak: ${abstract || "-"}`,
    `Keyword: ${Array.isArray(keywords) ? keywords.join(", ") : (keywords || "-")}`,
    `Kesimpulan: ${conclusion || "-"}`,
  ].join("\n");

  const urls = [
    apiUrl,
    "https://api.puter.com/ai",
    "https://api.puter.com/v1/chat/completions",
  ].filter(Boolean);

  const payload = {
    model: process.env.PUTER_MODEL || "gpt-4.1-mini",
    messages: [
      { role: "system", content: "Return only valid JSON array of algorithm names, no explanation." },
      { role: "user", content: prompt },
    ],
    temperature: 0,
    max_tokens: 150,
  };

  for (const url of urls) {
    try {
      const res = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      });

      const content =
        res?.data?.choices?.[0]?.message?.content ||
        res?.data?.output?.text ||
        res?.data?.result ||
        res?.data?.content ||
        "";

      const parsed = parseAiText(content);
      if (parsed.length) return parsed;
    } catch {}
  }

  return [];
}

function normalizeAlgorithms(values) {
  return [...new Set(ensureArray(values).map((item) => String(item).trim()).filter(Boolean))]
    .map((item) => item.replace(/^\[|\]$/g, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function processItem(item) {
  const existing = ensureArray(item.algorithm);
  if (existing.length) {
    return { ...item, algorithm: existing };
  }

  const text = [
    item.title || "",
    item.abstract || "",
    Array.isArray(item.keywords) ? item.keywords.join(" ") : item.keywords || "",
    item.conclusion || "",
  ].join("\n\n");

  const aiResult = await callPuterAI(item.title || "", item.abstract || "", item.keywords || [], item.conclusion || "");
  const detected = normalizeAlgorithms(aiResult.length ? aiResult : parseDetectedAlgorithm(text));

  return {
    ...item,
    algorithm: detected.length ? detected : [],
  };
}

async function main() {
  if (!fs.existsSync(inputDataFile)) {
    console.error(`❌ File input tidak ditemukan: ${inputDataFile}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(inputDataFile, "utf-8"));
  } catch (err) {
    console.error("❌ Gagal membaca JSON:", err.message);
    process.exit(1);
  }

  if (!Array.isArray(data)) {
    console.error("❌ Format JSON harus berupa array.");
    process.exit(1);
  }

  const results = [];
  let updated = 0;
  let skipped = 0;
  let index = 0;

  console.log(`🚀 Memproses ${data.length} item dari ${path.resolve(inputDataFile)}`);
  if (!apiKey) {
    console.log("ℹ️ PUTER_API_KEY tidak ditemukan, memakai fallback heuristic lokal.");
  }

  for (const item of data) {
    index += 1;
    const title = (item.title || "").substring(0, 70);
    process.stdout.write(`[${index}/${data.length}] ${title}\r`);

    const result = await processItem(item);
    if (result.algorithm && result.algorithm.length) {
      updated += 1;
    } else {
      skipped += 1;
    }
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  fs.writeFileSync(outputDataFile, JSON.stringify(results, null, 2));

  console.log("\n✅ Selesai");
  console.log(`📁 Input : ${path.resolve(inputDataFile)}`);
  console.log(`📁 Output: ${path.resolve(outputDataFile)}`);
  console.log(`🧠 Diisi algorithm: ${updated}/${data.length}`);
  console.log(`⏭️ Tanpa algorithm: ${skipped}/${data.length}`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
