const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

const fileSearchFilter = (medicines, search) => {
  if (!search || !search.trim()) return medicines;

  const searchLower = search.trim().toLowerCase();
  return medicines.filter((item) =>
    [item.branded, item.generic, item.composition]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(searchLower))
  );
};

// @route   GET /api/medicines
// @desc    Search medicines or get all (paginated)
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;

    if (req.app.locals.useFileDb) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const fileMedicines = req.app.locals.fileMedicines || [];
      const filtered = fileSearchFilter(fileMedicines, search).sort((a, b) =>
        String(a.branded).localeCompare(String(b.branded))
      );
      const start = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(start, start + limitNum);

      return res.json({
        medicines: paginated,
        total: filtered.length,
        page: pageNum,
        pages: Math.ceil(filtered.length / limitNum),
        source: 'file-fallback',
      });
    }

    let query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = {
        $or: [
          { branded: searchRegex },
          { generic: searchRegex },
          { composition: searchRegex },
        ],
      };
    }

    const medicines = await Medicine.find(query)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ branded: 1 });

    const total = await Medicine.countDocuments(query);

    res.json({
      medicines,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/medicines/:id
// @desc    Get a single medicine by its ID field
router.get('/:id', async (req, res) => {
  try {
    if (req.app.locals.useFileDb) {
      const fileMedicines = req.app.locals.fileMedicines || [];
      const medicine = fileMedicines.find((item) => item.id === parseInt(req.params.id));

      if (!medicine) {
        return res.status(404).json({ message: 'Medicine not found' });
      }

      return res.json({ ...medicine, source: 'file-fallback' });
    }

    const medicine = await Medicine.findOne({ id: parseInt(req.params.id) });

    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    res.json(medicine);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
