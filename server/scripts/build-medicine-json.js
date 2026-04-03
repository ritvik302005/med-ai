const fs = require('fs');
const path = require('path');
const { parseMedicineCsv } = require('../utils/medicineCsv');

const inputPath = process.argv[2];
const outputPath =
  process.argv[3] || path.join(__dirname, '..', 'data', 'medicines_from_csv.json');

if (!inputPath) {
  console.error('Usage: node scripts/build-medicine-json.js <csv-path> [output-json-path]');
  process.exit(1);
}

async function run() {
  try {
    const resolvedInputPath = path.resolve(inputPath);
    const resolvedOutputPath = path.resolve(outputPath);

    if (!fs.existsSync(resolvedInputPath)) {
      throw new Error(`CSV not found: ${resolvedInputPath}`);
    }

    const medicines = await parseMedicineCsv(resolvedInputPath);
    fs.writeFileSync(resolvedOutputPath, `${JSON.stringify(medicines, null, 2)}\n`, 'utf8');

    console.log(`Wrote ${medicines.length} medicines to ${resolvedOutputPath}`);
  } catch (error) {
    console.error(`JSON build failed: ${error.message}`);
    process.exit(1);
  }
}

run();
