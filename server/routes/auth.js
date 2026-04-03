const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  buildSearchHistoryEntry,
  clearSearchHistory,
  createUser,
  findSafeUserById,
  findUserByEmail,
  getSearchHistory,
  sameSearchHistoryEntry,
  sanitizeUser,
  updateSearchHistory,
  updatePreferences,
  upsertDemoUser,
  verifyUser,
} = require('../utils/userStore');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const deriveRole = (user) => {
  if (user?.role) {
    return user.role;
  }

  return user?.email === 'demo-admin@medai.com' ? 'admin' : 'user';
};

const formatAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  theme: user.theme,
  language: user.language,
  role: deriveRole(user),
  token: generateToken(user._id),
});

const getAuthenticatedUserId = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'No token' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id;
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
    return null;
  }
};

// @route   POST /api/auth/signup
// @desc    Register a new user
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (req.app.locals.useFileAuth) {
      const userExists = await findUserByEmail(email);
      if (userExists) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      const user = await createUser({ name, email, password });
      return res.status(201).json(formatAuthResponse(user));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({ name, email, password });
    return res.status(201).json(formatAuthResponse(sanitizeUser(user.toObject())));
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    if (req.app.locals.useFileAuth) {
      const user = await verifyUser(email, password);

      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      return res.json(formatAuthResponse(user));
    }

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      return res.json(formatAuthResponse(sanitizeUser(user.toObject())));
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get('/me', async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    if (req.app.locals.useFileAuth) {
      const user = await findSafeUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json(user);
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ ...user.toObject(), role: deriveRole(user) });
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// @route   POST /api/auth/demo
// @desc    Login as demo user
router.post('/demo', async (req, res) => {
  try {
    const role = req.body?.role === 'admin' ? 'admin' : 'user';

    if (req.app.locals.useFileAuth) {
      const demoUser = await upsertDemoUser(role);
      return res.json(formatAuthResponse(demoUser));
    }

    const demoEmail = role === 'admin' ? 'demo-admin@medai.com' : 'demo@medai.com';
    const demoName = role === 'admin' ? 'Demo Admin' : 'Demo User';
    let demoUser = await User.findOne({ email: demoEmail });

    if (!demoUser) {
      demoUser = await User.create({
        name: demoName,
        email: demoEmail,
        password: 'demo123',
      });
    }

    return res.json(formatAuthResponse({ ...sanitizeUser(demoUser.toObject()), role }));
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/auth/preferences
// @desc    Update user preferences (theme, language)
router.put('/preferences', async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }
    const { theme, language } = req.body;

    if (req.app.locals.useFileAuth) {
      const user = await updatePreferences(userId, { theme, language });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json(user);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { theme, language },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ ...user.toObject(), role: deriveRole(user) });
  } catch (error) {
    return res.status(400).json({ message: 'Error updating preferences', error: error.message });
  }
});

// @route   GET /api/auth/search-history
// @desc    Get saved medicine search history for the current user
router.get('/search-history', async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    if (req.app.locals.useFileAuth) {
      const history = await getSearchHistory(userId);
      if (!history) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ history });
    }

    const user = await User.findById(userId).select('searchHistory');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ history: user.searchHistory || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to load search history', error: error.message });
  }
});

// @route   POST /api/auth/search-history
// @desc    Save a medicine to the current user's search history
router.post('/search-history', async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    const historyEntry = buildSearchHistoryEntry(req.body?.medicine);
    if (!historyEntry.medicineId && !historyEntry.branded && !historyEntry.generic) {
      return res.status(400).json({ message: 'A medicine is required to save search history' });
    }

    if (req.app.locals.useFileAuth) {
      const history = await updateSearchHistory(userId, req.body?.medicine);
      if (!history) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(201).json({ history });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentHistory = Array.isArray(user.searchHistory)
      ? user.searchHistory.map((entry) => (typeof entry.toObject === 'function' ? entry.toObject() : entry))
      : [];

    user.searchHistory = [
      historyEntry,
      ...currentHistory.filter((entry) => !sameSearchHistoryEntry(entry, historyEntry)),
    ].slice(0, 8);

    await user.save();

    return res.status(201).json({ history: user.searchHistory });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to save search history', error: error.message });
  }
});

// @route   DELETE /api/auth/search-history
// @desc    Clear the current user's medicine search history
router.delete('/search-history', async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req, res);
    if (!userId) {
      return;
    }

    if (req.app.locals.useFileAuth) {
      const history = await clearSearchHistory(userId);
      if (history === null) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ history });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { searchHistory: [] },
      { new: true }
    ).select('searchHistory');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ history: user.searchHistory || [] });
  } catch (error) {
    return res.status(500).json({ message: 'Unable to clear search history', error: error.message });
  }
});

module.exports = router;
