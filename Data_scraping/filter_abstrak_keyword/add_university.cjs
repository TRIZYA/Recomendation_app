const fs = require("fs");
const path = require("path");

// Contoh pakai:
// node add_university.cjs ./hasil_clean_unisba_2023_2025.json "Universitas Islam Bandung"

const cliArgs = process.argv.slice(2);
const inputFile = cliArgs[0] || "./hasil_clean_unisba_2023_2025.json";
const universityName = cliArgs[1] || "Universitas Islam Bandung";
const outputFile = cliArgs[2] || inputFile.replace(/\.json$/i, "_with_university.json");

function addUniversityField(data, university) {
  if (!Array.isArray(data)) return data;

  return data.map((item) => {
    if (!item || typeof item !== "object") return item;

    return {
      ...item,
      university,
    };
  });
}

try {
  const rawData = fs.readFileSync(inputFile, "utf-8");
  const parsedData = JSON.parse(rawData);
  const updatedData = addUniversityField(parsedData, universityName);

  fs.writeFileSync(outputFile, JSON.stringify(updatedData, null, 2));

  console.log("✅ Selesai menambahkan field university.");
  console.log(`📁 Input : ${path.resolve(inputFile)}`);
  console.log(`📁 Output: ${path.resolve(outputFile)}`);
  console.log(`🏫 University: ${universityName}`);
} catch (error) {
  console.error("❌ Gagal memproses file:", error.message);
  process.exit(1);
}
