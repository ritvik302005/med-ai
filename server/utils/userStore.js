const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const userDataPath = path.join(__dirname, '..', 'data', 'users.json');

function ensureUserFile() {
  if (!fs.existsSync(userDataPath)) {
    fs.writeFileSync(userDataPath, '[]\n', 'utf8');
  }
}

function readUsers() {
  ensureUserFile();
  const raw = fs.readFileSync(userDataPath, 'utf8');
  return JSON.parse(raw || '[]');
}

function writeUsers(users) {
  fs.writeFileSync(userDataPath, `${JSON.stringify(users, null, 2)}\n`, 'utf8');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function buildSearchHistoryEntry(medicine = {}) {
  const parsedMedicineId = Number.parseInt(
    String(medicine.id ?? medicine.medicineId ?? ''),
    10
  );

  return {
    medicineId: Number.isFinite(parsedMedicineId) ? parsedMedicineId : undefined,
    branded: String(medicine.brandedName || medicine.branded || '').trim(),
    generic: String(medicine.genericName || medicine.generic || '').trim(),
    composition: String(medicine.composition || '').trim(),
    description: String(medicine.description || '').trim(),
    brandedPrice: Number(medicine.brandedPrice || 0),
    genericPrice: Number(medicine.genericPrice || 0),
    category: String(medicine.category || 'General').trim(),
    searchedAt: new Date().toISOString(),
  };
}

function sameSearchHistoryEntry(left, right) {
  const leftId = Number(left?.medicineId);
  const rightId = Number(right?.medicineId);

  if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
    return leftId === rightId;
  }

  const leftBrand = String(left?.branded || '').trim().toLowerCase();
  const rightBrand = String(right?.branded || '').trim().toLowerCase();
  const leftGeneric = String(left?.generic || '').trim().toLowerCase();
  const rightGeneric = String(right?.generic || '').trim().toLowerCase();

  return leftBrand === rightBrand && leftGeneric === rightGeneric;
}

async function createUser({ name, email, password, role = 'user' }) {
  const users = readUsers();
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    _id: randomUUID(),
    name: String(name || '').trim(),
    email: normalizedEmail,
    password: passwordHash,
    avatar: '',
    theme: 'medical',
    language: 'en',
    role,
    searchHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);
  return sanitizeUser(newUser);
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return readUsers().find((user) => user.email === normalizedEmail) || null;
}

async function findSafeUserById(id) {
  const user = readUsers().find((entry) => entry._id === id);
  return user ? sanitizeUser(user) : null;
}

async function verifyUser(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    return null;
  }

  return sanitizeUser(user);
}

async function upsertDemoUser(role = 'user') {
  const users = readUsers();
  const email = role === 'admin' ? 'demo-admin@medai.com' : 'demo@medai.com';
  const name = role === 'admin' ? 'Demo Admin' : 'Demo User';
  const existingIndex = users.findIndex((user) => user.email === email);

  if (existingIndex >= 0) {
    const updatedUser = {
      ...users[existingIndex],
      name,
      role,
      updatedAt: new Date().toISOString(),
    };
    users[existingIndex] = updatedUser;
    writeUsers(users);
    return sanitizeUser(updatedUser);
  }

  const passwordHash = await bcrypt.hash('demo123', 10);
  const demoUser = {
    _id: randomUUID(),
    name,
    email,
    password: passwordHash,
    avatar: '',
    theme: 'medical',
    language: 'en',
    role,
    searchHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(demoUser);
  writeUsers(users);
  return sanitizeUser(demoUser);
}

async function updatePreferences(id, preferences) {
  const users = readUsers();
  const userIndex = users.findIndex((entry) => entry._id === id);

  if (userIndex === -1) {
    return null;
  }

  users[userIndex] = {
    ...users[userIndex],
    ...preferences,
    updatedAt: new Date().toISOString(),
  };

  writeUsers(users);
  return sanitizeUser(users[userIndex]);
}

async function getSearchHistory(id) {
  const user = readUsers().find((entry) => entry._id === id);

  if (!user) {
    return null;
  }

  return Array.isArray(user.searchHistory) ? user.searchHistory : [];
}

async function updateSearchHistory(id, medicine) {
  const users = readUsers();
  const userIndex = users.findIndex((entry) => entry._id === id);

  if (userIndex === -1) {
    return null;
  }

  const nextEntry = buildSearchHistoryEntry(medicine);
  const currentHistory = Array.isArray(users[userIndex].searchHistory)
    ? users[userIndex].searchHistory
    : [];

  users[userIndex] = {
    ...users[userIndex],
    searchHistory: [
      nextEntry,
      ...currentHistory.filter((entry) => !sameSearchHistoryEntry(entry, nextEntry)),
    ].slice(0, 8),
    updatedAt: new Date().toISOString(),
  };

  writeUsers(users);
  return users[userIndex].searchHistory;
}

async function clearSearchHistory(id) {
  const users = readUsers();
  const userIndex = users.findIndex((entry) => entry._id === id);

  if (userIndex === -1) {
    return null;
  }

  users[userIndex] = {
    ...users[userIndex],
    searchHistory: [],
    updatedAt: new Date().toISOString(),
  };

  writeUsers(users);
  return [];
}

module.exports = {
  buildSearchHistoryEntry,
  clearSearchHistory,
  createUser,
  findSafeUserById,
  findUserByEmail,
  getSearchHistory,
  normalizeEmail,
  sameSearchHistoryEntry,
  sanitizeUser,
  updateSearchHistory,
  updatePreferences,
  upsertDemoUser,
  verifyUser,
};
