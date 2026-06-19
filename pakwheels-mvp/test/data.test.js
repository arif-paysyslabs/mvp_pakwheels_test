/* eslint-disable security/detect-non-literal-fs-filename */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

let originalCars;

before(() => {
  originalCars = fs.readFileSync(path.join(DATA_DIR, 'cars.json'), 'utf8');
});

after(() => {
  fs.writeFileSync(path.join(DATA_DIR, 'cars.json'), originalCars);
});

describe('JSON data files', () => {
  it('cars.json should be valid JSON and contain an array', () => {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cars.json'), 'utf8'));
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
  });

  it('each car should have required fields', () => {
    const cars = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cars.json'), 'utf8'));
    for (const car of cars) {
      assert.ok(car.id, `Car missing id: ${JSON.stringify(car)}`);
      assert.ok(car.make, `Car ${car.id} missing make`);
      assert.ok(car.model, `Car ${car.id} missing model`);
      assert.ok(typeof car.price === 'number', `Car ${car.id} price not a number`);
      assert.ok(car.price > 0, `Car ${car.id} price must be positive`);
      assert.ok(car.city, `Car ${car.id} missing city`);
      assert.ok(typeof car.year === 'number', `Car ${car.id} year not a number`);
      assert.ok(car.km !== undefined, `Car ${car.id} missing km`);
      assert.ok(car.seller, `Car ${car.id} missing seller`);
      assert.ok(car.seller.name, `Car ${car.id} missing seller name`);
      assert.ok(car.seller.phone, `Car ${car.id} missing seller phone`);
    }
  });

  it('car IDs should be unique', () => {
    const cars = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cars.json'), 'utf8'));
    const ids = cars.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('makes.json should be valid JSON with unique names', () => {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'makes.json'), 'utf8'));
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    const names = data.map(m => m.name);
    assert.equal(new Set(names).size, names.length);
  });

  it('cities.json should contain an array of strings', () => {
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cities.json'), 'utf8'));
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data.every(c => typeof c === 'string'));
  });

  it('featured cars should have featured=true', () => {
    const cars = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cars.json'), 'utf8'));
    const featured = cars.filter(c => c.featured === true);
    assert.ok(featured.length > 0, 'No featured cars found');
  });

  it('all car years should be between 2000 and 2026', () => {
    const cars = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cars.json'), 'utf8'));
    for (const car of cars) {
      assert.ok(car.year >= 2000 && car.year <= 2026, `Car ${car.id} invalid year: ${car.year}`);
    }
  });

  it('all prices should be under 100 crore', () => {
    const cars = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'cars.json'), 'utf8'));
    for (const car of cars) {
      assert.ok(car.price <= 100_000_000, `Car ${car.id} price too high: ${car.price}`);
    }
  });

  it('each make in makes.json should have id and name', () => {
    const makes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'makes.json'), 'utf8'));
    for (const m of makes) {
      assert.ok(typeof m.id === 'number');
      assert.ok(typeof m.name === 'string');
      assert.ok(m.name.length > 0);
    }
  });

  it('bikes.json should be valid JSON and contain an array', () => {
    const bikes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bikes.json'), 'utf8'));
    assert.ok(Array.isArray(bikes));
    assert.ok(bikes.length >= 10);
  });

  it('each bike should have required fields', () => {
    const required = ['id', 'make', 'model', 'year', 'price', 'city', 'km', 'fuel', 'transmission', 'bodyType', 'engineCC', 'features', 'images'];
    const bikes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bikes.json'), 'utf8'));
    for (const bike of bikes) {
      for (const field of required) {
        assert.ok(Object.hasOwn(bike, field), `Bike ${bike.id} missing ${field}`);
      }
    }
  });

  it('bike IDs should be unique', () => {
    const bikes = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'bikes.json'), 'utf8'));
    const ids = bikes.map(b => b.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});
