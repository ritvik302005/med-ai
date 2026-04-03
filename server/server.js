const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');

const csvDatasetPath = path.join(__dirname, 'data', 'medicines_from_csv.json');
const defaultDatasetPath = path.join(__dirname, 'data', 'medicines.json');

const loadFallbackMedicines = () => {
  const selectedPath = fs.existsSync(csvDatasetPath) ? csvDatasetPath : defaultDatasetPath;
  const raw = fs.readFileSync(selectedPath, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
};

dotenv.config();

const app = express();

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/pharmacies', require('./routes/pharmacies'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MedAI API is running',
    dataSource: app.locals.useFileDb ? 'file-fallback' : 'mongodb',
    authMode: app.locals.useFileAuth ? 'file-fallback' : 'mongodb',
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  const dbConnected = await connectDB();

  app.locals.useFileDb = !dbConnected;
  app.locals.useFileAuth = !dbConnected;

  if (!dbConnected) {
    app.locals.fileMedicines = loadFallbackMedicines();
    console.log('Using local file data fallback for medicines API');
    console.log('Using local file data fallback for auth API');
  }

  app.listen(PORT, () => {
    console.log(`MedAI Server running on port ${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
  });
};

startServer();
