const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  theme: {
    type: String,
    enum: ['default', 'medical', 'emergency', 'luxury', 'cyber', 'forest', 'midnight'],
    default: 'medical',
  },
  language: { type: String, default: 'en' },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  searchHistory: [{
    medicineId: Number,
    branded: String,
    generic: String,
    composition: String,
    description: String,
    brandedPrice: Number,
    genericPrice: Number,
    category: String,
    searchedAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
