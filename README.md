# 🚗 PakWheels MVP

A vehicle listing platform (cars & bikes) for the Pakistani market. Built with Express.js serving a RESTful API and static HTML frontend, with JSON file-based data storage.

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [Frontend Pages](#-frontend-pages)
- [Data Storage](#-data-storage)
- [Testing](#-testing)
- [Linting](#-linting)
- [Architecture & Conventions](#-architecture--conventions)
- [Known Limitations](#-known-limitations)

---

## 🛠 Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Runtime      | Node.js (no TypeScript)             |
| Framework    | Express ^4.21                       |
| Testing      | Node.js built-in `node:test` + `assert/strict` |
| Coverage     | c8                                  |
| Linting      | ESLint 10+ flat config + `eslint-plugin-security` |
| Frontend     | Vanilla HTML / CSS / JS (no framework) |
| Data Storage | JSON files (no database)            |

---

## 📁 Project Structure

```
pakwheels/
├── pakwheels-mvp/
│   ├── app.js              # Express app factory (createApp), routes & data helpers
│   ├── server.js           # Entry point — calls createApp().listen()
│   ├── eslint.config.js    # ESLint flat config with security plugin
│   ├── package.json        # Dependencies & scripts
│   ├── data/
│   │   ├── cars.json       # Car listings
│   │   ├── bikes.json      # Bike listings
│   │   ├── makes.json      # Vehicle makes (cars & bikes)
│   │   └── cities.json     # Pakistani cities
│   ├── public/
│   │   ├── index.html      # Homepage — search & featured listings
│   │   ├── car.html        # Car detail page
│   │   ├── sell.html       # Sell your vehicle form
│   │   ├── api-docs.html   # Interactive API documentation
│   │   ├── openapi.json    # OpenAPI 3.0 specification
│   │   └── logo.svg        # PakWheels logo
│   └── test/
│       ├── api.test.js     # API integration tests
│       └── data.test.js    # Data validation tests
├── .github/
│   └── instructions/       # Copilot agent instructions
├── AGENTS.md               # Agent guidelines for the project
└── README.md               # This file
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (for built-in test runner support)

### Installation

```bash
cd pakwheels-mvp
npm install
```

### Run the Server

```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

The server starts at **http://localhost:3000**.

---

## 📡 API Documentation

### Cars

| Method | Endpoint       | Description                          |
|--------|----------------|--------------------------------------|
| GET    | `/api/cars`    | List all cars (supports filtering)   |
| GET    | `/api/cars/:id`| Get a single car by ID               |
| POST   | `/api/cars`    | Create a new car listing             |

### Bikes

| Method | Endpoint        | Description                          |
|--------|-----------------|--------------------------------------|
| GET    | `/api/bikes`    | List all bikes (supports filtering)  |
| GET    | `/api/bikes/:id`| Get a single bike by ID              |
| POST   | `/api/bikes`    | Create a new bike listing            |

### Metadata

| Method | Endpoint     | Description                          |
|--------|--------------|--------------------------------------|
| GET    | `/api/makes` | List vehicle makes (`?type=car|bike`)|
| GET    | `/api/cities`| List Pakistani cities                |

### Query Parameters (Filtering)

All list endpoints (`/api/cars`, `/api/bikes`) support the following filters:

| Parameter     | Type   | Example              | Description                    |
|---------------|--------|----------------------|--------------------------------|
| `make`        | string | `?make=Toyota`       | Filter by make (case-insensitive) |
| `model`       | string | `?model=Corolla`     | Filter by model                |
| `city`        | string | `?city=Lahore`       | Filter by city                 |
| `minPrice`    | number | `?minPrice=500000`   | Minimum price                  |
| `maxPrice`    | number | `?maxPrice=5000000`  | Maximum price                  |
| `minYear`     | number | `?minYear=2015`      | Minimum year                   |
| `maxYear`     | number | `?maxYear=2023`      | Maximum year                   |
| `fuel`        | string | `?fuel=Petrol`       | Fuel type                      |
| `transmission`| string | `?transmission=Automatic` | Transmission type         |
| `search`      | string | `?search=civic`      | Text search across make, model, city |

> **Note:** All filters are additive (AND logic). Featured items are always sorted first in results.

### POST Body Example (Car)

```json
{
  "make": "Toyota",
  "model": "Corolla",
  "year": 2022,
  "price": 4500000,
  "city": "Lahore",
  "fuel": "Petrol",
  "transmission": "Automatic",
  "mileage": 25000,
  "sellerName": "Ahmed",
  "sellerPhone": "03001234567",
  "description": "Excellent condition, single owner",
  "images": ["https://example.com/car1.jpg"]
}
```

> Auto-set fields: `featured`, `isCertified`, `postedDate`, `id`

### Response Format

- **Success**: `200` or `201` with JSON body
- **Error**: `404` with `{ "error": "Message" }`

An interactive API docs page is also available at **http://localhost:3000/api-docs.html** with the OpenAPI spec at `/openapi.json`.

---

## 🖥 Frontend Pages

| Page          | URL               | Description                              |
|---------------|-------------------|------------------------------------------|
| Homepage      | `/`               | Search bar, featured & recent listings   |
| Car Detail    | `/car.html?id=X`  | Full details for a specific car          |
| Sell Vehicle  | `/sell.html`      | Form to list a car or bike for sale      |
| API Docs      | `/api-docs.html`  | Interactive API documentation            |

### Color Palette

| Color   | Hex       | Usage                    |
|---------|-----------|--------------------------|
| Amber   | `#f59e0b` | Primary accent / CTA     |
| Green   | `#059669` | Featured badge / success |
| Dark    | `#1f2937` | Headers / dark text      |

---

## 💾 Data Storage

All data is stored as JSON files in the `data/` directory — no database required.

| File          | Content                                  |
|---------------|------------------------------------------|
| `cars.json`   | Array of car listing objects             |
| `bikes.json`  | Array of bike listing objects (IDs ≥ 1001) |
| `makes.json`  | Vehicle makes with `type` (car or bike)  |
| `cities.json` | Array of Pakistani city name strings      |

Data is read/written via the `readJSON()` and `writeJSON()` helpers exported from `app.js`.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage report
npm run coverage
```

Tests are located in `test/`:

- **`api.test.js`** — Integration tests for all API endpoints
- **`data.test.js`** — Validation tests for data integrity

> ⚠️ **Important:** Tests save/restore original JSON files. Never run tests in parallel — they share the same data files.

---

## 🔍 Linting

```bash
# Run ESLint
npx eslint .
```

The project uses ESLint 10+ with a flat config and the `eslint-plugin-security` plugin for security-focused linting rules.

---

## 🏗 Architecture & Conventions

- **App Factory Pattern**: `createApp()` in `app.js` creates and returns the Express app, making it testable without starting the server.
- **Filtering**: All query param filters are additive (AND). Case-insensitive comparisons. Featured items always sorted first.
- **ID Generation**: `Math.max(...items.map(i => i.id)) + 1` — handles empty arrays gracefully.
- **Input Validation**: `asText()`, `asInteger()`, `asTextArray()`, `asImageArray()` helpers validate and sanitize POST body fields.
- **Auto-set Fields**: `featured`, `isCertified`, `postedDate` are automatically set on POST — not client-controllable.
- **Security**: ESLint security plugin rules enforced. Inline disable for `security/detect-non-literal-fs-filename` on JSON file ops (intentional).

---

## ⚠️ Known Limitations

- **No database**: Data is stored in JSON files — not suitable for production scale.
- **No seller validation**: POST endpoints don't validate seller fields thoroughly.
- **Hardcoded makes in sell.html**: The sell form has hardcoded make options instead of fetching from `/api/makes`. If adding makes, update both `makes.json` and the HTML.
- **Integer-only prices**: Uses `parseInt()` — no decimal handling for prices.
- **Timezone-dependent dates**: `postedDate` uses `new Date().toISOString().split('T')[0]` which is timezone-dependent.
- **No authentication**: No user auth or session management in this MVP.

---

## 📄 License

This project is for demonstration purposes.
