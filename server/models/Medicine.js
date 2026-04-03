const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  id: { type: Number, unique: true },
  branded: { type: String, required: true },
  generic: { type: String, required: true },
  brandedPrice: { type: Number, required: true },
  genericPrice: { type: Number, required: true },
  composition: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  packSize: { type: String, default: '' },
  usage: { type: String, default: '' },
  category: { type: String, default: 'Allopathy' },
  similar: { type: [String], default: [] },
  description: { type: String, default: '' },
}, {
  timestamps: true,
});

// Text index for search
medicineSchema.index({ branded: 'text', generic: 'text', composition: 'text' });

module.exports = mongoose.model('Medicine', medicineSchema);
