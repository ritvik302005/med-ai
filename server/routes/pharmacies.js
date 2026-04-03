const express = require('express');
const axios = require('axios');

const router = express.Router();
const TOMTOM_PLACEHOLDERS = new Set([
  'YOUR_TOMTOM_API_KEY_HERE',
  'WFVUaQWb4tz1RBk0zsz65O2mTeQhGEiU',
]);

const FALLBACK_STORES = [
  {
    id: 'ja-delhi-connaught-place',
    name: 'Jan Aushadhi Kendra',
    address: 'Connaught Place, New Delhi',
    city: 'New Delhi',
    position: { lat: 28.6315, lon: 77.2167 },
    phone: '+91-11-43000001',
  },
  {
    id: 'ja-noida-sector18',
    name: 'Jan Aushadhi Kendra',
    address: 'Sector 18, Noida',
    city: 'Noida',
    position: { lat: 28.5706, lon: 77.3272 },
    phone: '+91-120-4300002',
  },
  {
    id: 'ja-bengaluru-indiranagar',
    name: 'Jan Aushadhi Kendra',
    address: 'Indiranagar, Bengaluru',
    city: 'Bengaluru',
    position: { lat: 12.9784, lon: 77.6408 },
    phone: '+91-80-4300003',
  },
  {
    id: 'ja-mumbai-andheri',
    name: 'Jan Aushadhi Kendra',
    address: 'Andheri East, Mumbai',
    city: 'Mumbai',
    position: { lat: 19.1136, lon: 72.8697 },
    phone: '+91-22-4300004',
  },
  {
    id: 'ja-kolkata-salt-lake',
    name: 'Jan Aushadhi Kendra',
    address: 'Salt Lake, Kolkata',
    city: 'Kolkata',
    position: { lat: 22.5726, lon: 88.4335 },
    phone: '+91-33-4300005',
  },
];

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatFallbackStores(lat, lon, limit) {
  return FALLBACK_STORES.map((store) => ({
    ...store,
    distanceKm: Number(
      distanceKm(lat, lon, store.position.lat, store.position.lon).toFixed(1)
    ),
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${store.position.lat},${store.position.lon}`,
  }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

function normalizeSearchQuery(value) {
  const query = String(value || 'pharmacy').trim();
  return query || 'pharmacy';
}

function isGenericPharmacyQuery(query) {
  const normalized = normalizeSearchQuery(query).toLowerCase();
  return [
    'pharmacy',
    'pharmacies',
    'medical store',
    'medical stores',
    'drug store',
    'drug stores',
  ].includes(normalized);
}

function buildSearchPlan(query, radiusMeters) {
  const normalized = normalizeSearchQuery(query);
  const genericQuery = isGenericPharmacyQuery(normalized);
  const searchPlan = [];

  if (genericQuery) {
    searchPlan.push({
      label: 'category-search',
      url: 'https://api.tomtom.com/search/2/categorySearch/pharmacy.json',
      params: { radius: radiusMeters },
    });
  }

  searchPlan.push({
    label: `keyword:${normalized}`,
    url: `https://api.tomtom.com/search/2/search/${encodeURIComponent(normalized)}.json`,
    params: { radius: radiusMeters },
  });

  if (!genericQuery) {
    searchPlan.push({
      label: 'keyword:pharmacy',
      url: 'https://api.tomtom.com/search/2/search/pharmacy.json',
      params: { radius: radiusMeters * 2 },
    });
  }

  return searchPlan;
}

async function runTomTomSearch({
  apiKey,
  lat,
  lon,
  limit,
  query,
  radiusMeters,
}) {
  const requests = buildSearchPlan(query, radiusMeters);
  const seen = new Set();
  const results = [];

  for (const search of requests) {
    const response = await axios.get(search.url, {
      params: {
        lat,
        lon,
        limit,
        key: apiKey,
        language: 'en-GB',
        ...search.params,
      },
      timeout: 8000,
    });

    for (const item of response.data?.results || []) {
      const key = item.id || `${item.position?.lat}-${item.position?.lon}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push(item);
      }
    }

    if (results.length > 0) {
      return results;
    }
  }

  return results;
}

function formatTomTomStore(item, lat, lon) {
  const lat2 = Number.isFinite(item.position?.lat) ? item.position.lat : lat;
  const lon2 = Number.isFinite(item.position?.lon) ? item.position.lon : lon;
  const distanceMeters =
    Number(item.dist) || distanceKm(lat, lon, lat2, lon2) * 1000;

  return {
    id: item.id || `${lat2}-${lon2}`,
    name: item.poi?.name || 'Pharmacy',
    address: item.address?.freeformAddress || 'Address unavailable',
    city: item.address?.municipality || item.address?.countrySubdivision || '',
    position: { lat: lat2, lon: lon2 },
    distanceKm: Number((distanceMeters / 1000).toFixed(1)),
    phone: item.poi?.phone || '',
    website: item.poi?.url || '',
    categories: Array.isArray(item.poi?.categories) ? item.poi.categories.join(', ') : '',
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${lat2},${lon2}`,
    tomtomUrl: `https://www.tomtom.com/en_gb/maps/?zoom=16&lat=${lat2}&lng=${lon2}`,
  };
}

// @route   GET /api/pharmacies/nearby
// @desc    Nearby pharmacy search with TomTom fallback
router.get('/nearby', async (req, res) => {
  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  const limit = Math.min(Number(req.query.limit) || 8, 20);
  const query = normalizeSearchQuery(req.query.query);
  const radiusMeters = Number(req.query.radius) || 5000;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ message: 'Valid lat and lon query parameters are required' });
  }

  const apiKey = process.env.TOMTOM_API_KEY;
  const hasTomTomKey =
    apiKey && apiKey.trim() !== '' && !TOMTOM_PLACEHOLDERS.has(apiKey);

  if (!hasTomTomKey) {
    return res.json({
      stores: formatFallbackStores(lat, lon, limit),
      source: 'offline-fallback',
    });
  }

  try {
    const results = await runTomTomSearch({
      apiKey,
      lat,
      lon,
      limit,
      query,
      radiusMeters,
    });

    const stores = results
      .map((store) => formatTomTomStore(store, lat, lon))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return res.json({
      stores,
      source: 'tomtom',
    });
  } catch (error) {
    return res.json({
      stores: formatFallbackStores(lat, lon, limit),
      source: 'offline-fallback',
      warning: error.message,
    });
  }
});

module.exports = router;
