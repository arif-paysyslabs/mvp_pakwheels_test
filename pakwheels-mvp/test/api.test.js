const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createApp, readJSON, writeJSON } = require('../app');

const DATA_DIR = path.join(__dirname, '..', 'data');
let server;
let baseUrl;
let originalCars;
let originalBikes;

function fetch(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function validVehicle(overrides = {}) {
  return {
    make: 'TestBrand',
    model: 'TestModel',
    variant: 'Base',
    year: 2024,
    price: 1000000,
    city: 'Karachi',
    km: 1000,
    fuel: 'Petrol',
    transmission: 'Manual',
    bodyType: 'Sedan',
    engineCC: 1000,
    color: 'Red',
    registeredIn: 'Karachi',
    assembly: 'Local',
    features: [],
    description: 'Test vehicle',
    images: ['https://placehold.co/600x400/000/fff?text=Test'],
    seller: { name: 'Test User', phone: '0300-0000000', type: 'Individual' },
    ...overrides
  };
}

before(() => {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  originalCars = fs.readFileSync(path.join(DATA_DIR, 'cars.json'), 'utf8');
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  originalBikes = fs.readFileSync(path.join(DATA_DIR, 'bikes.json'), 'utf8');
  const app = createApp();
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(() => {
  writeJSON('cars.json', JSON.parse(originalCars));
  writeJSON('bikes.json', JSON.parse(originalBikes));
  server.close();
});

describe('API endpoints', () => {
  it('GET /sell serves the sell page', async () => {
    const { status, body } = await fetch(`${baseUrl}/sell`);
    assert.equal(status, 200);
    assert.equal(typeof body, 'string');
    assert.match(body, /Post Your Ad/i);
    assert.match(body, /id="sellForm"/);
  });

  it('GET /api-docs serves the API docs page', async () => {
    const { status, body } = await fetch(`${baseUrl}/api-docs`);
    assert.equal(status, 200);
    assert.equal(typeof body, 'string');
    assert.match(body, /API Documentation/i);
    assert.match(body, /SwaggerUIBundle/);
  });

  it('GET /api/cars returns all cars', async () => {
    const { status, body } = await fetch(`${baseUrl}/api/cars`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length === 20);
  });

  it('GET /api/cars returns featured cars first', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars`);
    const firstFeatured = body[0].featured;
    assert.equal(firstFeatured, true);
  });

  it('GET /api/cars?make=Toyota filters correctly', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?make=toyota`);
    assert.ok(body.every(c => c.make === 'Toyota'));
  });

  it('GET /api/cars?model=Civic filters by partial model match', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?model=vic`);
    assert.ok(body.length > 0);
    assert.ok(body.every(c => c.model.toLowerCase().includes('vic')));
  });

  it('GET /api/cars?city=Karachi filters correctly', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?city=Karachi`);
    assert.ok(body.every(c => c.city === 'Karachi'));
  });

  it('GET /api/cars?minPrice=5000000&maxPrice=10000000 filters by price', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?minPrice=5000000&maxPrice=10000000`);
    assert.ok(body.every(c => c.price >= 5000000 && c.price <= 10000000));
  });

  it('GET /api/cars?minYear=2020&maxYear=2022 filters by year', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?minYear=2020&maxYear=2022`);
    assert.ok(body.length > 0);
    assert.ok(body.every(c => c.year >= 2020 && c.year <= 2022));
  });

  it('GET /api/cars?fuel=CNG filters by fuel', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?fuel=CNG`);
    assert.ok(body.every(c => c.fuel === 'CNG'));
  });

  it('GET /api/cars?transmission=Manual filters by transmission', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?transmission=Manual`);
    assert.ok(body.every(c => c.transmission === 'Manual'));
  });

  it('GET /api/cars?search=corolla searches across fields', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?search=corolla`);
    assert.ok(body.length > 0);
    assert.ok(body.some(c => c.model.toLowerCase().includes('corolla')));
  });

  it('GET /api/cars/:id returns a single car', async () => {
    const { status, body } = await fetch(`${baseUrl}/api/cars/1`);
    assert.equal(status, 200);
    assert.equal(body.id, 1);
    assert.ok(body.make);
    assert.ok(body.model);
  });

  it('GET /api/cars/:id returns 404 for non-existent car', async () => {
    const { status, body } = await fetch(`${baseUrl}/api/cars/99999`);
    assert.equal(status, 404);
    assert.ok(body.error);
  });

  it('POST /api/cars creates a new car listing', async () => {
    const newCar = validVehicle({
      description: 'Test car',
      featured: true,
      isCertified: true,
      postedDate: '2000-01-01'
    });

    const { status, body } = await fetch(`${baseUrl}/api/cars`, {
      method: 'POST',
      body: JSON.stringify(newCar)
    });

    assert.equal(status, 201);
    assert.equal(body.make, 'TestBrand');
    assert.equal(body.featured, false);
    assert.equal(body.isCertified, false);
    assert.equal(body.postedDate, new Date().toISOString().split('T')[0]);

    const cars = readJSON('cars.json');
    const saved = cars.find(c => c.id === body.id);
    assert.ok(saved);
    assert.equal(saved.make, 'TestBrand');
  });

  it('POST /api/cars applies defaults for optional fields', async () => {
    const newCar = {
      make: 'DefaultBrand',
      model: 'DefaultModel',
      year: 2024,
      price: 900000,
      city: 'Islamabad',
      km: 1200,
      seller: { name: 'Default User', phone: '0300-1111111' }
    };

    const { status, body } = await fetch(`${baseUrl}/api/cars`, {
      method: 'POST',
      body: JSON.stringify(newCar)
    });

    assert.equal(status, 201);
    assert.equal(body.variant, 'Standard');
    assert.equal(body.fuel, 'Petrol');
    assert.equal(body.transmission, 'Manual');
    assert.equal(body.bodyType, 'Sedan');
    assert.equal(body.engineCC, 1300);
    assert.equal(body.color, 'White');
    assert.equal(body.registeredIn, 'Islamabad');
    assert.equal(body.assembly, 'Local');
    assert.deepEqual(body.features, []);
    assert.equal(body.description, 'No description provided.');
    assert.deepEqual(body.images, ['https://placehold.co/600x400/9ca3af/ffffff?text=New+Listing']);
    assert.equal(body.seller.type, 'Individual');
  });

  it('POST /api/cars rejects missing required fields', async () => {
    const beforeCount = readJSON('cars.json').length;
    const { status, body } = await fetch(`${baseUrl}/api/cars`, {
      method: 'POST',
      body: JSON.stringify({ make: 'Toyota' })
    });

    assert.equal(status, 400);
    assert.ok(body.error);
    assert.equal(readJSON('cars.json').length, beforeCount);
  });

  it('POST /api/cars rejects malformed request bodies', async () => {
    const beforeCount = readJSON('cars.json').length;
    const { status, body } = await fetch(`${baseUrl}/api/cars`, {
      method: 'POST',
      body: JSON.stringify([])
    });

    assert.equal(status, 400);
    assert.match(body.error, /Request body/);
    assert.equal(readJSON('cars.json').length, beforeCount);
  });

  it('POST /api/cars rejects blank required text', async () => {
    const beforeCount = readJSON('cars.json').length;
    const { status, body } = await fetch(`${baseUrl}/api/cars`, {
      method: 'POST',
      body: JSON.stringify(validVehicle({ make: '   ' }))
    });

    assert.equal(status, 400);
    assert.match(body.error, /make is required/);
    assert.equal(readJSON('cars.json').length, beforeCount);
  });

  it('POST /api/cars rejects invalid field types and ranges', async () => {
    const beforeCount = readJSON('cars.json').length;
    const cases = [
      { payload: validVehicle({ model: 123 }), message: /model must be a string/ },
      { payload: validVehicle({ year: 2026.5 }), message: /year must be an integer/ },
      { payload: validVehicle({ price: 0 }), message: /price is out of range/ },
      { payload: validVehicle({ features: 'ABS' }), message: /features must be an array/ },
      { payload: validVehicle({ images: 'https://example.com/car.jpg' }), message: /images must be an array/ },
      { payload: validVehicle({ seller: null }), message: /seller is required/ }
    ];

    for (const testCase of cases) {
      const { status, body } = await fetch(`${baseUrl}/api/cars`, {
        method: 'POST',
        body: JSON.stringify(testCase.payload)
      });

      assert.equal(status, 400);
      assert.match(body.error, testCase.message);
    }

    assert.equal(readJSON('cars.json').length, beforeCount);
  });

  it('POST /api/cars starts IDs at 1 when the data file is empty', async () => {
    writeJSON('cars.json', []);

    const { status, body } = await fetch(`${baseUrl}/api/cars`, {
      method: 'POST',
      body: JSON.stringify(validVehicle())
    });

    assert.equal(status, 201);
    assert.equal(body.id, 1);
    assert.equal(readJSON('cars.json').length, 1);

    writeJSON('cars.json', JSON.parse(originalCars));
  });

  it('GET /api/makes returns all makes', async () => {
    const { status, body } = await fetch(`${baseUrl}/api/makes`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    assert.ok(body[0].name);
  });

  it('GET /api/cities returns all cities', async () => {
    const { status, body } = await fetch(`${baseUrl}/api/cities`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    assert.equal(typeof body[0], 'string');
  });

  it('combined filters work together', async () => {
    const { body } = await fetch(`${baseUrl}/api/cars?make=Toyota&city=Karachi`);
    assert.ok(body.every(c => c.make === 'Toyota' && c.city === 'Karachi'));
  });
});

describe('Bike API endpoints', () => {
  it('GET /api/bikes returns all bikes', async () => {
    const { status, body } = await fetch(`${baseUrl}/api/bikes`);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body));
    assert.ok(body.length >= 10);
  });

  it('GET /api/bikes returns featured bikes first', async () => {
    const { body } = await fetch(`${baseUrl}/api/bikes`);
    if (body.length > 0 && body[0].featured) {
      assert.equal(body[0].featured, true);
    }
  });

  it('GET /api/bikes?make=Honda filters correctly', async () => {
    const { body } = await fetch(`${baseUrl}/api/bikes?make=Honda`);
    assert.ok(body.every(b => b.make === 'Honda'));
    assert.ok(body.length > 0);
  });

  it('GET /api/bikes?city=Karachi filters correctly', async () => {
    const { body } = await fetch(`${baseUrl}/api/bikes?city=Karachi`);
    assert.ok(body.every(b => b.city === 'Karachi'));
  });

  it('GET /api/bikes/:id returns a single bike', async () => {
    const { status, body } = await fetch(`${baseUrl}/api/bikes/1001`);
    assert.equal(status, 200);
    assert.equal(body.id, 1001);
    assert.ok(body.make);
    assert.ok(body.model);
  });

  it('GET /api/bikes/:id returns 404 for non-existent bike', async () => {
    const { status, body } = await fetch(`${baseUrl}/api/bikes/99999`);
    assert.equal(status, 404);
    assert.ok(body.error);
  });

  it('GET /api/makes?type=bike returns only bike makes', async () => {
    const { body } = await fetch(`${baseUrl}/api/makes?type=bike`);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    assert.ok(body.every(m => m.category === 'bike' || m.category === 'both'));
  });

  it('GET /api/makes?type=car returns only car makes', async () => {
    const { body } = await fetch(`${baseUrl}/api/makes?type=car`);
    assert.ok(Array.isArray(body));
    assert.ok(body.length > 0);
    assert.ok(body.some(m => m.name === 'Toyota'));
    assert.ok(!body.some(m => m.name === 'Yamaha'));
  });

  it('POST /api/bikes creates a new bike listing', async () => {
    const newBike = validVehicle({
      model: 'TestBike',
      price: 80000,
      city: 'Lahore',
      km: 500,
      bodyType: 'Motorcycle',
      engineCC: 125,
      color: 'Black',
      registeredIn: 'Lahore',
      description: 'Test bike',
      images: ['https://placehold.co/600x400/000/fff?text=TestBike'],
      featured: true,
      isCertified: true,
      postedDate: '2000-01-01'
    });

    const { status, body } = await fetch(`${baseUrl}/api/bikes`, {
      method: 'POST',
      body: JSON.stringify(newBike)
    });

    assert.equal(status, 201);
    assert.equal(body.make, 'TestBrand');
    assert.equal(body.featured, false);
    assert.equal(body.isCertified, false);
    assert.equal(body.postedDate, new Date().toISOString().split('T')[0]);

    const bikes = readJSON('bikes.json');
    const saved = bikes.find(b => b.id === body.id);
    assert.ok(saved);
    assert.equal(saved.make, 'TestBrand');
  });

  it('POST /api/bikes applies bike defaults for optional fields', async () => {
    const newBike = {
      make: 'DefaultBikeBrand',
      model: 'DefaultBikeModel',
      year: 2024,
      price: 85000,
      city: 'Multan',
      km: 250,
      images: [],
      seller: { name: 'Bike User', phone: '0300-2222222' }
    };

    const { status, body } = await fetch(`${baseUrl}/api/bikes`, {
      method: 'POST',
      body: JSON.stringify(newBike)
    });

    assert.equal(status, 201);
    assert.equal(body.bodyType, 'Motorcycle');
    assert.equal(body.engineCC, 125);
    assert.deepEqual(body.images, ['https://placehold.co/600x400/9ca3af/ffffff?text=New+Listing']);
    assert.equal(body.registeredIn, 'Multan');
    assert.equal(body.seller.type, 'Individual');
  });

  it('POST /api/bikes rejects non-http image URLs', async () => {
    const beforeCount = readJSON('bikes.json').length;
    const newBike = {
      make: 'TestBrand', model: 'TestBike', year: 2024,
      price: 80000, city: 'Lahore', km: 500,
      images: ['javascript:alert(1)'],
      seller: { name: 'Test User', phone: '0300-0000000' }
    };

    const { status, body } = await fetch(`${baseUrl}/api/bikes`, {
      method: 'POST',
      body: JSON.stringify(newBike)
    });

    assert.equal(status, 400);
    assert.match(body.error, /images/);
    assert.equal(readJSON('bikes.json').length, beforeCount);
  });

  it('POST /api/bikes starts IDs at 1001 when the data file is empty', async () => {
    writeJSON('bikes.json', []);

    const { status, body } = await fetch(`${baseUrl}/api/bikes`, {
      method: 'POST',
      body: JSON.stringify(validVehicle({ price: 75000 }))
    });

    assert.equal(status, 201);
    assert.equal(body.id, 1001);
    assert.equal(readJSON('bikes.json').length, 1);

    writeJSON('bikes.json', JSON.parse(originalBikes));
  });
});
