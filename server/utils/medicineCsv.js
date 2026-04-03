const fs = require('fs');
const csv = require('csv-parser');

function normalizeHeader(value) {
  return String(value || '')
    .replace(/^\uFEFF/, '')
    .trim();
}

function normalizeKey(value) {
  return normalizeHeader(value).toLowerCase();
}

function getField(row, candidateKeys) {
  const normalizedCandidates = candidateKeys.map(normalizeKey);

  for (const [key, value] of Object.entries(row || {})) {
    if (normalizedCandidates.includes(normalizeKey(key))) {
      return value;
    }
  }

  return '';
}

function toNumber(value) {
  const parsed = Number(String(value || '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function titleCase(value) {
  const source = String(value || '').trim().toLowerCase();
  return source ? source.charAt(0).toUpperCase() + source.slice(1) : 'Allopathy';
}

function buildComposition(row) {
  const comp1 = String(getField(row, ['short_composition1', 'composition1']) || '').trim();
  const comp2 = String(getField(row, ['short_composition2', 'composition2']) || '').trim();
  return [comp1, comp2].filter(Boolean).join(' + ');
}

function mapMedicineCsvRow(row) {
  const id = Number.parseInt(getField(row, ['id']), 10);
  if (!Number.isFinite(id)) {
    return null;
  }

  const branded = String(getField(row, ['name', 'branded']) || '').trim();
  if (!branded) {
    return null;
  }

  const brandedPrice = toNumber(
    getField(row, ['price(₹)', 'price(â‚¹)', 'price(Ã¢â€šÂ¹)', 'price'])
  );
  const composition = buildComposition(row);

  return {
    id,
    branded,
    generic: composition || branded,
    brandedPrice,
    genericPrice: Number((brandedPrice * 0.35).toFixed(2)),
    composition,
    manufacturer: String(getField(row, ['manufacturer_name', 'manufacturer']) || '').trim(),
    packSize: String(getField(row, ['pack_size_label', 'pack_size']) || '').trim(),
    usage: 'Consult your doctor or pharmacist for usage information.',
    category: titleCase(getField(row, ['type', 'category'])),
    similar: [],
    description: composition ? `${branded}. Contains: ${composition}` : branded,
  };
}

function parseMedicineCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => normalizeHeader(header),
        })
      )
      .on('data', (row) => {
        const mapped = mapMedicineCsvRow(row);
        if (mapped) {
          rows.push(mapped);
        }
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

module.exports = {
  mapMedicineCsvRow,
  parseMedicineCsv,
};
