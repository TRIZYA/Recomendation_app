const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const { PDFParse } = require("pdf-parse");

function isNumericValue(value) {
  return /^-?\d+$/.test(String(value || ""));
}

function looksLikeOutputFile(value) {
  return typeof value === "string" && /\.(json|txt|csv)$/i.test(value);
}

// Ambil argumen dari terminal saat skrip dijalankan.
const cliArgs = process.argv.slice(2);

// Default input/output dan mode pemrosesan.
let inputDataFile = cliArgs[0] || process.env.DATA_FILE || "./hasil_clean_unisba_2023_2025.json";
let outputDataFile = process.env.OUTPUT_FILE || inputDataFile.replace(/\.json$/i, "_processed.json");
let mode = (process.env.MODE || "full").toLowerCase();
let limit = Number.parseInt(process.env.LIMIT || process.env.SLICE || process.env.SLICE_COUNT || "0", 10);

// Parsing argumen tambahan seperti --all, --slice 5, atau mode full/keywords/conclusion.

for (let index = 1; index < cliArgs.length; index += 1) {
  const arg = cliArgs[index];
  const normalized = (arg || "").toLowerCase();

  if (arg === "--all") {
    limit = 0;
  } else if (arg === "--slice" || arg === "--limit") {
    const nextValue = cliArgs[index + 1];
    if (isNumericValue(nextValue)) {
      limit = Number.parseInt(nextValue, 10);
      index += 1;
    }
  } else if (normalized.startsWith("--slice=" ) || normalized.startsWith("--limit=")) {
    const value = normalized.split("=")[1];
    if (isNumericValue(value)) {
      limit = Number.parseInt(value, 10);
    }
  } else if (isNumericValue(arg)) {
    limit = Number.parseInt(arg, 10);
  } else if (looksLikeOutputFile(arg)) {
    outputDataFile = arg;
  } else if (["full", "keywords", "conclusion"].includes(normalized)) {
    mode = normalized;
  }
}

// Baca file JSON input yang berisi daftar data penelitian.
let data;
try {
  data = JSON.parse(fs.readFileSync(inputDataFile, "utf-8"));
} catch (err) {
  console.error("❌ Gagal load JSON:", err.message);
  process.exit(1);
}

// Normalisasi teks agar hasil ekstraksi lebih konsisten.
function normalizeText(text) {
  return (text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function isPdfLink(link) {
  return /\.pdf($|\?|#)/i.test(link || "");
}

function normalizeRepositoryUrl(url) {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "repository.unhas.ac.id" ||
      parsed.hostname === "eprints.umg.ac.id" ||
      parsed.hostname === "digilib.uin-suka.ac.id" ||
      parsed.hostname === "repository.unisbablitar.ac.id" ||
      parsed.hostname === "repository.unugiri.ac.id"
    ) {
      parsed.protocol = parsed.protocol || "https:";
      parsed.port = "";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {}

  return url;
}

function isLikelyPdfAnchor(href, text) {
  if (!href) return false;

  const lowerHref = href.toLowerCase();
  const lowerText = (text || "").toLowerCase();

  if (lowerHref.includes("preview")) return false;
  if (lowerHref.includes("thumbnail") && lowerText.includes("preview")) return false;
  if (/\/preview\b/.test(lowerHref) && lowerText.includes("preview")) return false;

  if (isPdfLink(href)) return true;
  if (lowerHref.includes("/article/download/")) return true;
  if (lowerHref.includes("/article/view/") && lowerText.includes("pdf")) return true;
  if (lowerHref.includes("download") && lowerText.includes("pdf")) return true;
  if (lowerText.includes("pdf") && !lowerHref.startsWith("javascript:")) return true;

  return false;
}

function scorePdfLink(link) {
  const lower = (link || "").toLowerCase();
  let score = 0;

  if (/(kesimpulan|conclusion)/.test(lower)) score += 100;
  if (/(bab\s*v|bab\s*5|chapter\s*5)/.test(lower)) score += 80;
  if (/\/article\/view\/\d+\/\d+/.test(lower)) score += 50;
  if (/\/article\/download\//.test(lower)) score += 50;
  if (lower.includes("pdf")) score += 20;

  return score;
}

function sortPdfLinks(links) {
  return [...new Set(links)].sort((a, b) => scorePdfLink(b) - scorePdfLink(a));
}

async function getPdfLinks(url) {
  try {
    if (!url) return [];
    if (isPdfLink(url)) return [url];

    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 20000,
    });

    const $ = cheerio.load(res.data);
    const links = new Set();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text();

      if (!isLikelyPdfAnchor(href, text)) return;

      try {
        links.add(new URL(href, url).href);
      } catch {}
    });

    const citationPdfUrl = $('meta[name="citation_pdf_url"]').attr("content");
    if (citationPdfUrl) {
      try {
        links.add(new URL(citationPdfUrl, url).href);
      } catch {}
    }

    const pdfLink = $('link[type="application/pdf"]').attr("href");
    if (pdfLink) {
      try {
        links.add(new URL(pdfLink, url).href);
      } catch {}
    }

    return sortPdfLinks([...links]);
  } catch {
    return [];
  }
}

function extractKeywordsFromText(text) {
  const idPattern = /(kata[\s-]?kunci|keywords)\s*[:\-]\s*(.+?)(?=\n\n|\n[A-Z]|ABSTRACT|PENDAHULUAN|INTRODUCTION)/is;
  const enPattern = /keywords\s*[:\-]\s*(.+?)(?=\n\n|\nintroduction|abstract|1\.|I\.)/is;

  const match = text.match(idPattern) || text.match(enPattern);
  if (!match) return null;

  return match[2]
    .split(/[,;]+/)
    .map((k) => k.trim())
    .filter((k) => k.length > 2 && !k.match(/^\d+\./) && !k.includes(".."))
    .slice(0, 8);
}

function parseKeywordsList(text) {
  return normalizeText(text || "")
    .split(/[;,\.\n]+/)
    .map((k) => k.replace(/^(kata\s*kunci|keywords)\s*[:\-]?/i, "").trim())
    .map((k) => k.replace(/^\*+\s*/, "").replace(/^[\-–]\s*/, "").trim())
    .filter((k) => k && k.length > 1 && !/^(kata\s*kunci|keywords)$/i.test(k))
    .slice(0, 12);
}

function extractMetaField($, names) {
  for (const name of names) {
    const value = $(`meta[name="${name}"]`).attr("content") || $(`meta[property="${name}"]`).attr("content");
    if (value && value.trim()) return value.trim();
  }
  return "";
}

function extractFromHTMLImproved(html) {
  try {
    const $ = cheerio.load(html);

    const metaAbstract = extractMetaField($, ["eprints.abstract", "citation_abstract"]);
    const metaKeywords = extractMetaField($, ["eprints.keywords", "citation_keywords"]);
    const metaDescription = extractMetaField($, ["description", "og:description"]);

    const abstractHeading = $("h2, h3, h4").filter((_, el) => /abstract/i.test($(el).text())).first();
    let bodyAbstract = "";

    if (abstractHeading.length) {
      bodyAbstract = $(abstractHeading).nextUntil("h2, h3, h4").addBack().text();
    }

    const cleanedBodyAbstract = normalizeText(bodyAbstract || "")
      .replace(/\babstract\s*\(abstrak\)\s*/i, "")
      .split(/\n\s*(item type|subjects|depositing user|date deposited|last modified|uri)\b/i)[0]
      .replace(/\s{2,}/g, " ")
      .trim();

    const abstractText = metaAbstract || cleanedBodyAbstract || $("p").first().text() || "";
    const normalizedAbstract = normalizeText(abstractText || "")
      .replace(/\bkeywords?\s*[:\-].*$/is, "")
      .replace(/\babstract\s*\(abstrak\)\s*/i, "")
      .replace(/\bitem type\b.*$/i, "")
      .replace(/\bsubjects\b.*$/i, "")
      .replace(/\bdepositing user\b.*$/i, "")
      .replace(/\bdate deposited\b.*$/i, "")
      .replace(/\blast modified\b.*$/i, "")
      .replace(/\buri\b.*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const keywords = metaKeywords
      ? parseKeywordsList(metaKeywords)
      : (() => {
          const match = normalizedAbstract.match(/(?:kata\s*kunci|keywords?)\s*[:\-]\s*([^\n]+)/i);
          return match
            ? match[1]
                .split(/[,;]+/)
                .map((k) => k.trim())
                .filter((k) => k.length > 1)
            : ["tidak ditemukan"];
        })();

    const conclusion = normalizeText(
      normalizedAbstract.match(/(?:kesimpulan|conclusion)\s*[:\-]\s*(.+?)(?:\n\n|$)/is)?.[1] ||
        metaDescription ||
        "tidak ditemukan"
    );

    return {
      abstract: normalizedAbstract || null,
      keywords: keywords.length ? keywords : ["tidak ditemukan"],
      conclusion: conclusion && conclusion !== "tidak ditemukan" ? conclusion : "tidak ditemukan",
    };
  } catch {
    return null;
  }
}

async function extractFromPDFImproved(pdfUrl) {
  try {
    const res = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const contentType = (res.headers["content-type"] || "").toLowerCase();
    const buffer = Buffer.from(res.data || []);
    const prefix = buffer.slice(0, 8).toString("utf8");

    if (!contentType.includes("pdf") && !prefix.startsWith("%PDF")) {
      return null;
    }

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = typeof result === "string" ? result : result.text || "";

    return {
      keywords: extractKeywordsFromText(text) || ["tidak ditemukan"],
      conclusion: extractConclusionFromText(text),
    };
  } catch {
    return null;
  }
}

function isConclusionHeading(line) {
  const value = (line || "").trim().toLowerCase();
  return (
    /^kesimpulan(\b|:|\s)/i.test(value) ||
    /^simpulan(\b|:|\s)/i.test(value) ||
    /^conclusion(s)?(\b|:|\s)/i.test(value) ||
    /^\d+(\.\d+)*\s*(kesimpulan|simpulan|conclusion(s)?)(\b|:|\s)/i.test(value) ||
    /^bab\s*(vii|7)\b.*(penutup|kesimpulan|conclusion)/i.test(value) ||
    /^bab\s*v\b.*(kesimpulan|conclusion)/i.test(value) ||
    /^bab\s*5\b.*(kesimpulan dan saran|conclusion)/i.test(value) ||
    /^v\.?\s*(kesimpulan|conclusion)/i.test(value) ||
    /^vii\.?\s*(penutup|kesimpulan|conclusion)/i.test(value)
  );
}

function extractInlineConclusion(line) {
  const match = (line || "").match(/^(?:kesimpulan|simpulan|conclusion(?:s)?)\s*[:\-]?\s*(.+)$/i);
  if (!match || !match[1]) return null;

  const content = normalizeText(match[1]);
  return content.length >= 40 ? content : null;
}

function findSectionStartIndex(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(bab\s*5|bab\s*v\b|5\.\d+|v\.\d+|\b5\.1\b)/i.test(lines[i])) {
      return i;
    }
    if (/^\s*(bab\s*5\b.*(kesimpulan|saran)|bab\s*v\b.*(kesimpulan|saran))/i.test(lines[i])) {
      return i;
    }
  }

  return -1;
}

function findSectionEndIndex(lines, startIndex) {
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (/^\s*(bab\s*6|bab\s*vi\b|6\.\d+|vi\.\d+)/i.test(lines[i])) {
      return i;
    }
    if (/^\s*(daftar\s+pustaka|referensi|bibliografi|lampiran)/i.test(lines[i])) {
      return i;
    }
  }

  return lines.length;
}

function extractChapter5Text(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const lines = normalized.split("\n");
  const startIndex = findSectionStartIndex(lines);
  if (startIndex < 0) return null;

  const endIndex = findSectionEndIndex(lines, startIndex);
  const slice = normalizeText(lines.slice(startIndex, endIndex).join("\n"));

  return slice.length ? slice : null;
}

function extractConclusionByMarkers(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  let startIndex = -1;
  const lower = normalized.toLowerCase();
  const candidateMarkers = [
    "\n5.1 kesimpulan",
    "\n5.1 simpulan",
    "\n7.1 kesimpulan",
    "\n7.1 simpulan",
    "\nbab vii penutup",
    "\nbab vii kesimpulan",
    "\nbab 5 penutup",
    "\nbab 5 kesimpulan",
    "\nkesimpulan",
    "\nsimpulan",
    "\nconclusion",
  ];

  for (const marker of candidateMarkers) {
    const index = lower.lastIndexOf(marker);
    if (index > startIndex) {
      startIndex = index + 1;
    }
  }

  if (startIndex < 0) return null;

  const tail = normalized.slice(startIndex);
  const stopPatterns = [
    /\n\s*7\.2\s*saran\b/i,
    /\n\s*saran\b/i,
    /\n\s*bab\s*viii\b/i,
    /\n\s*daftar\s+pustaka\b/i,
    /\n\s*referensi\b/i,
    /\n\s*bibliografi\b/i,
    /\n\s*lampiran\b/i,
  ];

  let stopIndex = tail.length;
  for (const pattern of stopPatterns) {
    const match = tail.match(pattern);
    if (match && typeof match.index === "number" && match.index < stopIndex) {
      stopIndex = match.index;
    }
  }

  const result = normalizeText(tail.slice(0, stopIndex));
  if (result.length < 120) return null;
  return result;
}

function extractConclusionFromText(text) {
  const normalized = extractChapter5Text(text);
  if (!normalized) return null;

  const lines = normalized.split("\n");
  const startIndices = [];
  const collected = [];
  let wordCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (isConclusionHeading(lines[i])) {
      startIndices.push(i);
    }
  }

  const startIndex = startIndices.length ? startIndices[startIndices.length - 1] : -1;

  if (startIndex >= 0) {
    const inline = extractInlineConclusion(lines[startIndex]);
    if (inline) {
      collected.push(inline);
      wordCount += inline.split(/\s+/).length;
    }
  }

  if (startIndex === -1) {
    const directMatch = normalized.match(/(?:kesimpulan|conclusion)\s*[:\-]\s*(.+)$/is);
    if (directMatch && directMatch[1]) {
      const content = normalizeText(directMatch[1]);
      return content.length >= 80 ? content : null;
    }
    return extractConclusionByMarkers(normalized);
  }

  for (let i = startIndex + 1; i < lines.length && wordCount < 400; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/^(?:\d+(\.\d+)*|bab\s*(vii|7)|vii)\b.*(saran|daftar pustaka|referensi|bibliografi|lampiran)/i.test(line)) break;
    if (/^\d+(\.\d+)*\s+[A-Z]/.test(line) && !/^\d+(\.\d+)*\s*(?:1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.)/.test(line)) break;
    if (line.length < 15) continue;

    collected.push(line);
    wordCount += line.split(/\s+/).length;
  }

  const result = normalizeText(collected.join(" "));
  if (result.length < 80) return null;
  if (/error!\s*bookmark/i.test(result)) return null;

  const lower = result.toLowerCase();
  if (/(bab\s*iv|bab\s*6|bab\s*vi|daftar pustaka|referensi|bibliografi)/i.test(lower) && !/(kesimpulan|simpulan|conclusion)/i.test(lower)) {
    return extractConclusionByMarkers(normalized);
  }

  return result;
}

async function extractConclusionFromPDF(pdfUrl) {
  try {
    const res = await axios.get(pdfUrl, {
      responseType: "arraybuffer",
      timeout: 60000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const buffer = Buffer.from(res.data || []);
    const prefix = buffer.slice(0, 8).toString("utf8");
    const contentType = (res.headers["content-type"] || "").toLowerCase();

    if (!contentType.includes("pdf") && !prefix.startsWith("%PDF")) {
      return null;
    }

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = typeof result === "string" ? result : result.text || "";

    return extractConclusionFromText(text);
  } catch {
    return null;
  }
}

async function extractConclusionFromHTML(url) {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 30000,
    });

    const $ = cheerio.load(res.data);
    const metaDescription = $("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || "";
    const abstractHeading = $("h2, h3, h4").filter((_, el) => /abstract|abstrak/i.test($(el).text())).first();
    const bodyText = abstractHeading.length ? $(abstractHeading).nextUntil("h2, h3, h4").addBack().text() : $("body").text();

    return extractConclusionFromText(bodyText) || extractConclusionFromText(metaDescription) || null;
  } catch {
    return null;
  }
}

function hasPlaceholderKeyword(value) {
  if (!Array.isArray(value)) return true;
  return value.length === 0 || value.some((item) => !item || item === "tidak ditemukan");
}

function hasPlaceholderConclusion(value) {
  const normalized = normalizeText(value).toLowerCase();
  return !normalized || normalized === "tidak ditemukan";
}

// Proses satu item data: ambil keyword, conclusion, dan abstract jika perlu.
async function processItem(item) {
  const needsKeywords = ["full", "keywords"].includes(mode);
  const needsConclusion = ["full", "conclusion"].includes(mode);

  let finalAbstract = item.abstract || null;
  let finalKeywords = Array.isArray(item.keywords) && item.keywords.length ? item.keywords : ["tidak ditemukan"];
  let finalConclusion = item.conclusion || null;

  const normalizedLink = normalizeRepositoryUrl(item.link || item.url || "");
  if (!normalizedLink) {
    return {
      ...item,
      abstract: finalAbstract,
      keywords: finalKeywords,
      conclusion: finalConclusion || "tidak ditemukan",
    };
  }

  let pdfLinks = [];
  let htmlFallback = null;

  if (needsKeywords || needsConclusion) {
    pdfLinks = await getPdfLinks(normalizedLink);
  }

  if (needsKeywords || needsConclusion) {
    try {
      const htmlRes = await axios.get(normalizedLink, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 30000,
      });
      htmlFallback = extractFromHTMLImproved(htmlRes.data);
    } catch {}
  }

  if (needsKeywords && hasPlaceholderKeyword(finalKeywords)) {
    if (htmlFallback && htmlFallback.keywords && !htmlFallback.keywords.includes("tidak ditemukan")) {
      finalKeywords = htmlFallback.keywords;
    }

    for (const link of pdfLinks) {
      const result = await extractFromPDFImproved(link);
      if (result && result.keywords && !result.keywords.includes("tidak ditemukan")) {
        finalKeywords = result.keywords;
        break;
      }
    }
  }

  if (needsConclusion && hasPlaceholderConclusion(finalConclusion)) {
    const prioritizedPdfLinks = sortPdfLinks(
      pdfLinks.filter((link) => /(bab\s*5|bab\s*v\b|5\.1|kesimpulan|conclusion)/i.test(link))
    );
    const linksToScrape = prioritizedPdfLinks.length ? prioritizedPdfLinks : pdfLinks;

    for (const link of linksToScrape) {
      const conclusion = await extractConclusionFromPDF(link);
      if (conclusion) {
        finalConclusion = conclusion;
        break;
      }
    }

    if (hasPlaceholderConclusion(finalConclusion) && htmlFallback) {
      if (!hasPlaceholderConclusion(htmlFallback.conclusion)) {
        finalConclusion = htmlFallback.conclusion;
      }
    }

    if (hasPlaceholderConclusion(finalConclusion)) {
      const htmlConclusion = await extractConclusionFromHTML(normalizedLink);
      if (!hasPlaceholderConclusion(htmlConclusion)) {
        finalConclusion = htmlConclusion;
      }
    }
  }

  if (htmlFallback && htmlFallback.abstract && htmlFallback.abstract.length > 50) {
    finalAbstract = htmlFallback.abstract;
  }

  return {
    ...item,
    abstract: finalAbstract,
    keywords: finalKeywords,
    conclusion: finalConclusion || "tidak ditemukan",
  };
}

// Fungsi utama: jalankan pemrosesan untuk semua item yang dipilih.
async function main() {
  const results = [];
  let updatedKeywords = 0;
  let updatedConclusion = 0;

  // Jika limit > 0, hanya proses sebanyak limit item pertama.
  const itemsToProcess = limit > 0 ? data.slice(0, limit) : data;

  console.log(`🚀 Memproses ${itemsToProcess.length} item dengan mode: ${mode}${limit > 0 ? ` (limit ${limit})` : ""}`);

  for (let index = 0; index < itemsToProcess.length; index++) {
    const item = Array.isArray(itemsToProcess) ? itemsToProcess[index] : itemsToProcess[index];
    const title = (item.title || "").substring(0, 70);
    console.log(`[${index + 1}/${itemsToProcess.length}] ${title}`);

    const result = await processItem(item);
    if (!hasPlaceholderKeyword(result.keywords)) updatedKeywords += 1;
    if (!hasPlaceholderConclusion(result.conclusion)) updatedConclusion += 1;
    results.push(result);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  fs.writeFileSync(outputDataFile, JSON.stringify(results, null, 2));

  console.log("\n✅ Selesai");
  console.log(`📁 Input : ${path.resolve(inputDataFile)}`);
  console.log(`📁 Output: ${path.resolve(outputDataFile)}`);
  console.log(`🔑 Keyword terisi: ${updatedKeywords}/${itemsToProcess.length}`);
  console.log(`🧠 Conclusion terisi: ${updatedConclusion}/${itemsToProcess.length}`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
