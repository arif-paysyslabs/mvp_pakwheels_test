const express = require('express');
const fs = require('fs');
const path = require('path');

/* eslint-disable security/detect-non-literal-fs-filename */
function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', file), 'utf8'));
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(__dirname, 'data', file), JSON.stringify(data, null, 2));
}
/* eslint-enable security/detect-non-literal-fs-filename */

function getNextId(items, startingId) {
  return items.length > 0 ? Math.max(...items.map(item => item.id)) + 1 : startingId;
}

function asText(value, field, options = {}) {
  const { required = true, fallback = '' } = options;
  if (value === undefined || value === null || value === '') {
    if (required) throw new Error(`${field} is required`);
    return fallback;
  }
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new Error(`${field} is required`);
  return trimmed.slice(0, 500);
}

function asInteger(value, field, options = {}) {
  const { min = 0, max = Number.MAX_SAFE_INTEGER } = options;
  if (!Number.isInteger(value)) throw new Error(`${field} must be an integer`);
  if (value < min || value > max) throw new Error(`${field} is out of range`);
  return value;
}

function asTextArray(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  return value.map(item => asText(item, field, { required: false })).filter(Boolean).slice(0, 30);
}

function asImageArray(value) {
  if (value === undefined) return ['https://placehold.co/600x400/9ca3af/ffffff?text=New+Listing'];
  if (!Array.isArray(value)) throw new Error('images must be an array');
  const images = value.map(item => asText(item, 'images', { required: false })).filter(Boolean).slice(0, 10);
  if (!images.every(image => /^https?:\/\//i.test(image))) {
    throw new Error('images must contain http or https URLs');
  }
  return images.length > 0 ? images : ['https://placehold.co/600x400/9ca3af/ffffff?text=New+Listing'];
}

function sanitizeSeller(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('seller is required');
  return {
    name: asText(value.name, 'seller.name'),
    phone: asText(value.phone, 'seller.phone'),
    type: asText(value.type, 'seller.type', { required: false, fallback: 'Individual' })
  };
}

function sanitizeVehicleInput(body, vehicleType) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Request body must be an object');
  const defaultBodyType = vehicleType === 'bike' ? 'Motorcycle' : 'Sedan';
  const defaultEngineCC = vehicleType === 'bike' ? 125 : 1300;

  return {
    make: asText(body.make, 'make'),
    model: asText(body.model, 'model'),
    variant: asText(body.variant, 'variant', { required: false, fallback: 'Standard' }),
    year: asInteger(body.year, 'year', { min: 1900, max: 2026 }),
    price: asInteger(body.price, 'price', { min: 1 }),
    city: asText(body.city, 'city'),
    km: asInteger(body.km, 'km', { min: 0 }),
    fuel: asText(body.fuel, 'fuel', { required: false, fallback: 'Petrol' }),
    transmission: asText(body.transmission, 'transmission', { required: false, fallback: 'Manual' }),
    bodyType: asText(body.bodyType, 'bodyType', { required: false, fallback: defaultBodyType }),
    engineCC: body.engineCC === undefined ? defaultEngineCC : asInteger(body.engineCC, 'engineCC', { min: 1 }),
    color: asText(body.color, 'color', { required: false, fallback: 'White' }),
    registeredIn: asText(body.registeredIn, 'registeredIn', { required: false, fallback: body.city }),
    assembly: asText(body.assembly, 'assembly', { required: false, fallback: 'Local' }),
    features: asTextArray(body.features, 'features'),
    description: asText(body.description, 'description', { required: false, fallback: 'No description provided.' }),
    images: asImageArray(body.images),
    seller: sanitizeSeller(body.seller)
  };
}

function applyListingFilters(items, query) {
  let filtered = items;
  const { make, model, city, minPrice, maxPrice, minYear, maxYear, fuel, transmission, search } = query;

  if (make) filtered = filtered.filter(item => item.make.toLowerCase() === make.toLowerCase());
  if (model) filtered = filtered.filter(item => item.model.toLowerCase().includes(model.toLowerCase()));
  if (city) filtered = filtered.filter(item => item.city.toLowerCase() === city.toLowerCase());
  if (minPrice) filtered = filtered.filter(item => item.price >= Number.parseInt(minPrice, 10));
  if (maxPrice) filtered = filtered.filter(item => item.price <= Number.parseInt(maxPrice, 10));
  if (minYear) filtered = filtered.filter(item => item.year >= Number.parseInt(minYear, 10));
  if (maxYear) filtered = filtered.filter(item => item.year <= Number.parseInt(maxYear, 10));
  if (fuel) filtered = filtered.filter(item => item.fuel.toLowerCase() === fuel.toLowerCase());
  if (transmission) filtered = filtered.filter(item => item.transmission.toLowerCase() === transmission.toLowerCase());
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(item =>
      item.make.toLowerCase().includes(s) ||
      item.model.toLowerCase().includes(s) ||
      item.variant.toLowerCase().includes(s) ||
      item.city.toLowerCase().includes(s)
    );
  }

  return filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
}

// --- AI Valuation Engine ---

/**
 * Compute a fair market valuation for a vehicle based on comparable listings.
 * Uses a weighted k-nearest-neighbors approach over the existing data.
 */
function computeValuation(vehicle, allListings) {
  const { make, model, year, km, city, fuel, transmission } = vehicle;

  // Score each listing for similarity (0–1 per factor)
  const scored = allListings.map(listing => {
    let score = 0;
    let maxScore = 0;

    // Make match (most important — weight 3)
    maxScore += 3;
    if (listing.make.toLowerCase() === make.toLowerCase()) score += 3;

    // Model match (weight 3)
    maxScore += 3;
    if (listing.model.toLowerCase() === model.toLowerCase()) score += 3;

    // Year proximity (weight 2, within ±3 years)
    maxScore += 2;
    const yearDiff = Math.abs(listing.year - year);
    if (yearDiff <= 3) score += 2 * (1 - yearDiff / 3);

    // Mileage proximity (weight 1.5, within ±50%)
    maxScore += 1.5;
    if (km > 0) {
      const kmRatio = Math.abs(listing.km - km) / km;
      if (kmRatio <= 0.5) score += 1.5 * (1 - kmRatio / 0.5);
    }

    // City match (weight 1)
    maxScore += 1;
    if (listing.city.toLowerCase() === city.toLowerCase()) score += 1;

    // Fuel match (weight 0.5)
    maxScore += 0.5;
    if (listing.fuel.toLowerCase() === fuel.toLowerCase()) score += 0.5;

    // Transmission match (weight 0.5)
    maxScore += 0.5;
    if (listing.transmission.toLowerCase() === transmission.toLowerCase()) score += 0.5;

    const similarity = maxScore > 0 ? score / maxScore : 0;
    return { listing, similarity };
  });

  // Keep listings with meaningful similarity (at least same make)
  const comparables = scored
    .filter(s => s.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);

  if (comparables.length === 0) {
    return { estimatedPrice: null, confidence: 'low', comparables: [], dealScore: null };
  }

  // Weighted average price
  const totalWeight = comparables.reduce((sum, c) => sum + c.similarity, 0);
  const weightedPrice = comparables.reduce((sum, c) => sum + c.listing.price * c.similarity, 0) / totalWeight;

  // Price range (±15% for medium confidence, ±25% for low)
  const avgSimilarity = totalWeight / comparables.length;
  const confidence = avgSimilarity > 0.7 ? 'high' : avgSimilarity > 0.5 ? 'medium' : 'low';
  const spreadPct = confidence === 'high' ? 0.10 : confidence === 'medium' ? 0.15 : 0.25;

  const estimatedPrice = Math.round(weightedPrice);
  const priceRange = {
    low: Math.round(weightedPrice * (1 - spreadPct)),
    high: Math.round(weightedPrice * (1 + spreadPct))
  };

  // Depreciation forecast (simple linear: ~10% per year for cars in PK market)
  const currentYear = new Date().getFullYear();
  const vehicleAge = Math.max(currentYear - year, 0);
  const annualDepreciation = 0.10;
  const depreciation = [];
  for (let yr = 1; yr <= 3; yr++) {
    depreciation.push({
      year: currentYear + yr,
      estimatedValue: Math.round(estimatedPrice * Math.pow(1 - annualDepreciation, vehicleAge + yr) / Math.pow(1 - annualDepreciation, vehicleAge))
    });
  }

  return {
    estimatedPrice,
    priceRange,
    confidence,
    depreciation,
    comparables: comparables.map(c => ({
      id: c.listing.id,
      make: c.listing.make,
      model: c.listing.model,
      year: c.listing.year,
      price: c.listing.price,
      km: c.listing.km,
      city: c.listing.city,
      similarity: Math.round(c.similarity * 100) / 100
    }))
  };
}

/**
 * Compute a deal score for a listing compared to its valuation.
 * Returns: 'great_deal', 'good_price', 'fair_price', 'slightly_overpriced', 'overpriced'
 */
function computeDealScore(listing, valuation) {
  if (!valuation.estimatedPrice) return null;
  const ratio = listing.price / valuation.estimatedPrice;
  if (ratio <= 0.85) return 'great_deal';
  if (ratio <= 0.95) return 'good_price';
  if (ratio <= 1.05) return 'fair_price';
  if (ratio <= 1.15) return 'slightly_overpriced';
  return 'overpriced';
}

// --- Smart Recommendation Engine ---

/**
 * Recommend vehicles based on a target vehicle's attributes.
 * Uses a similarity score across make, model, price, year, km, city, fuel, bodyType.
 */
function computeRecommendations(target, allListings, limit = 6) {
  const maxPrice = target.price * 1.3;
  const minPrice = target.price * 0.7;

  const scored = allListings
    .filter(l => l.id !== target.id) // exclude the target itself
    .map(listing => {
      let score = 0;

      // Same make (strong signal)
      if (listing.make.toLowerCase() === target.make.toLowerCase()) score += 3;

      // Same model family
      if (listing.model.toLowerCase() === target.model.toLowerCase()) score += 2;

      // Price within ±30% budget
      if (listing.price >= minPrice && listing.price <= maxPrice) {
        const priceCloseness = 1 - Math.abs(listing.price - target.price) / (maxPrice - minPrice);
        score += 2 * priceCloseness;
      }

      // Year proximity (within ±2 years)
      const yearDiff = Math.abs(listing.year - target.year);
      if (yearDiff <= 2) score += 1.5 * (1 - yearDiff / 2);

      // Similar mileage (within ±40%)
      if (target.km > 0) {
        const kmRatio = Math.abs(listing.km - target.km) / target.km;
        if (kmRatio <= 0.4) score += 1 * (1 - kmRatio / 0.4);
      }

      // Same city
      if (listing.city.toLowerCase() === target.city.toLowerCase()) score += 1;

      // Same fuel type
      if (listing.fuel.toLowerCase() === target.fuel.toLowerCase()) score += 0.5;

      // Same body type
      if (listing.bodyType && target.bodyType && listing.bodyType.toLowerCase() === target.bodyType.toLowerCase()) score += 0.5;

      // Boost featured/certified
      if (listing.featured) score += 0.3;
      if (listing.isCertified) score += 0.3;

      return { listing, score };
    });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => ({
      id: r.listing.id,
      make: r.listing.make,
      model: r.listing.model,
      variant: r.listing.variant,
      year: r.listing.year,
      price: r.listing.price,
      km: r.listing.km,
      city: r.listing.city,
      fuel: r.listing.fuel,
      transmission: r.listing.transmission,
      bodyType: r.listing.bodyType,
      image: r.listing.images?.[0] || '',
      featured: r.listing.featured,
      isCertified: r.listing.isCertified,
      matchScore: Math.round(r.score * 10) / 10
    }));
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/sell', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sell.html'));
  });

  app.get('/valuation', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'valuation.html'));
  });

  app.get('/api-docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'api-docs.html'));
  });

  app.get('/api/cars', (req, res) => {
    res.json(applyListingFilters(readJSON('cars.json'), req.query));
  });

  app.get('/api/cars/:id', (req, res) => {
    const cars = readJSON('cars.json');
    const car = cars.find(c => c.id === parseInt(req.params.id));
    if (!car) return res.status(404).json({ error: 'Car not found' });
    res.json(car);
  });

  app.post('/api/cars', (req, res) => {
    try {
      const cars = readJSON('cars.json');
      const newCar = {
        id: getNextId(cars, 1),
        ...sanitizeVehicleInput(req.body, 'car'),
        featured: false,
        isCertified: false,
        postedDate: new Date().toISOString().split('T')[0]
      };
      cars.push(newCar);
      writeJSON('cars.json', cars);
      res.status(201).json(newCar);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/makes', (req, res) => {
    const makes = readJSON('makes.json');
    const { type } = req.query;
    if (type === 'bike') {
      res.json(makes.filter(m => m.category === 'bike' || m.category === 'both'));
    } else if (type === 'car') {
      res.json(makes.filter(m => m.category === 'car' || m.category === 'both'));
    } else {
      res.json(makes);
    }
  });

  app.get('/api/cities', (req, res) => {
    res.json(readJSON('cities.json'));
  });

  app.get('/api/bikes', (req, res) => {
    res.json(applyListingFilters(readJSON('bikes.json'), req.query));
  });

  app.get('/api/bikes/:id', (req, res) => {
    const bikes = readJSON('bikes.json');
    const bike = bikes.find(b => b.id === parseInt(req.params.id));
    if (!bike) return res.status(404).json({ error: 'Bike not found' });
    res.json(bike);
  });

  app.post('/api/bikes', (req, res) => {
    try {
      const bikes = readJSON('bikes.json');
      const newBike = {
        id: getNextId(bikes, 1001),
        ...sanitizeVehicleInput(req.body, 'bike'),
        featured: false,
        isCertified: false,
        postedDate: new Date().toISOString().split('T')[0]
      };
      bikes.push(newBike);
      writeJSON('bikes.json', bikes);
      res.status(201).json(newBike);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // --- AI Valuation & Recommendation Routes ---

  /**
   * POST /api/valuation
   * Estimate fair market price for a vehicle based on comparable listings.
   * Body: { type: 'car'|'bike', make, model, year, km, city, fuel, transmission }
   */
  app.post('/api/valuation', (req, res) => {
    try {
      const body = req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({ error: 'Request body must be an object' });
      }

      const vehicleType = body.type === 'bike' ? 'bike' : 'car';
      const dataFile = vehicleType === 'bike' ? 'bikes.json' : 'cars.json';
      const allListings = readJSON(dataFile);

      const vehicle = {
        make: asText(body.make, 'make'),
        model: asText(body.model, 'model'),
        year: asInteger(body.year, 'year', { min: 1900, max: 2026 }),
        km: asInteger(body.km, 'km', { min: 0 }),
        city: asText(body.city, 'city', { required: false, fallback: '' }),
        fuel: asText(body.fuel, 'fuel', { required: false, fallback: 'Petrol' }),
        transmission: asText(body.transmission, 'transmission', { required: false, fallback: 'Manual' })
      };

      const valuation = computeValuation(vehicle, allListings);
      res.json({ type: vehicleType, vehicle, valuation });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * GET /api/cars/:id/valuation
   * Get valuation + deal score for an existing car listing.
   */
  app.get('/api/cars/:id/valuation', (req, res) => {
    const cars = readJSON('cars.json');
    const car = cars.find(c => c.id === parseInt(req.params.id));
    if (!car) return res.status(404).json({ error: 'Car not found' });

    const valuation = computeValuation(car, cars);
    const dealScore = computeDealScore(car, valuation);
    res.json({ ...valuation, dealScore });
  });

  /**
   * GET /api/bikes/:id/valuation
   * Get valuation + deal score for an existing bike listing.
   */
  app.get('/api/bikes/:id/valuation', (req, res) => {
    const bikes = readJSON('bikes.json');
    const bike = bikes.find(b => b.id === parseInt(req.params.id));
    if (!bike) return res.status(404).json({ error: 'Bike not found' });

    const valuation = computeValuation(bike, bikes);
    const dealScore = computeDealScore(bike, valuation);
    res.json({ ...valuation, dealScore });
  });

  /**
   * GET /api/cars/:id/recommendations
   * Get smart recommendations similar to a given car.
   * Query: ?limit=6 (max 20)
   */
  app.get('/api/cars/:id/recommendations', (req, res) => {
    const cars = readJSON('cars.json');
    const car = cars.find(c => c.id === parseInt(req.params.id));
    if (!car) return res.status(404).json({ error: 'Car not found' });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 20);
    const recommendations = computeRecommendations(car, cars, limit);
    res.json(recommendations);
  });

  /**
   * GET /api/bikes/:id/recommendations
   * Get smart recommendations similar to a given bike.
   * Query: ?limit=6 (max 20)
   */
  app.get('/api/bikes/:id/recommendations', (req, res) => {
    const bikes = readJSON('bikes.json');
    const bike = bikes.find(b => b.id === parseInt(req.params.id));
    if (!bike) return res.status(404).json({ error: 'Bike not found' });

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 20);
    const recommendations = computeRecommendations(bike, bikes, limit);
    res.json(recommendations);
  });

  return app;
}

module.exports = { createApp, readJSON, writeJSON };
