const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Medicine = require('./models/Medicine');
const { parseMedicineCsv } = require('./utils/medicineCsv');

dotenv.config();

const csvPath = process.argv[2];

if (!csvPath) {
  console.error('Usage: node importCsvToMongo.js <absolute-csv-path>');
  process.exit(1);
}

async function run() {
  try {
    const resolvedCsvPath = path.resolve(csvPath);
    if (!fs.existsSync(resolvedCsvPath)) {
      throw new Error(`CSV not found: ${resolvedCsvPath}`);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const medicines = await parseMedicineCsv(resolvedCsvPath);
    console.log(`Parsed ${medicines.length} rows`);

    await Medicine.deleteMany({});
    console.log('Cleared existing medicines');

    const batchSize = 5000;
    for (let index = 0; index < medicines.length; index += batchSize) {
      const batch = medicines.slice(index, index + batchSize);
      await Medicine.insertMany(batch, { ordered: false });
      console.log(`Inserted ${Math.min(index + batchSize, medicines.length)}/${medicines.length}`);
    }

    console.log('CSV import complete');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

run();
