const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

const data = JSON.parse(fs.readFileSync("data.json", "utf-8"));

async function getDetail(url) {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(res.data);

    // ===== ABSTRACT (FIX SESUAI HTML) =====
    let abstract = $("h2:contains('Abstract')")
      .next("p")
      .text()
      .trim();

    // ===== KEYWORDS (FIX SESUAI HTML) =====
    let keywordText = $("th:contains('Keywords')")
      .next("td")
      .text();

    let keywords = keywordText
      .split(/,|;/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k !== "");

    return {
      abstract: abstract || "tidak ditemukan",
      keywords: keywords.length ? keywords : ["tidak ada"]
    };

  } catch (err) {
    return {
      abstract: "error",
      keywords: ["error"]
    };
  }
}

async function process() {
  let results = [];

  for (let item of data) {
    console.log("Ambil:", item.title);

    const detail = await getDetail(item.link);

    results.push({
      ...item,
      abstract: detail.abstract,
      keywords: detail.keywords
    });

    // delay biar gak diblok
    await new Promise(r => setTimeout(r, 700));
  }

  fs.writeFileSync(
    "hasil_final.json",
    JSON.stringify(results, null, 2)
  );

  console.log("✅ DONE CUYY (abstract + keyword masuk semua)");
}

process();