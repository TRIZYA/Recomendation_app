const fs = require("fs");

// load file hasil scraping
const data = JSON.parse(
  fs.readFileSync("hasil_keyword2_kesimpulan.json", "utf-8")
);

// penampung
const adaKeyword = [];
const tidakAdaKeyword = [];

data.forEach((item, index) => {
  try {
    const conclusion = item.conclusion;

    // kondisi keyword valid
    if (
      conclusion !== "tidak ditemukan"
    ) {
      adaKeyword.push(item);
    } else {
      tidakAdaKeyword.push(item);
    }

  } catch (err) {
    console.log(`❌ Error di index ${index}`);
    tidakAdaKeyword.push(item);
  }
});

// simpan hasil
fs.writeFileSync(
  "data_with_keyword.json",
  JSON.stringify(adaKeyword, null, 2)
);

fs.writeFileSync(
  "data_without_keyword.json",
  JSON.stringify(tidakAdaKeyword, null, 2)
);

console.log("✅ DONE CUYY");
console.log("Ada keyword:", adaKeyword.length);
console.log("Tidak ada keyword:", tidakAdaKeyword.length);