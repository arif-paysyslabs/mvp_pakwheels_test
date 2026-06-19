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

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/sell', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sell.html'));
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

  return app;
}

module.exports = { createApp, readJSON, writeJSON };
