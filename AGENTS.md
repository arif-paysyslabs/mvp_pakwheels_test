# PakWheels MVP — Agent Guidelines

## Project Overview

PakWheels MVP is a vehicle listing platform (cars & bikes) for the Pakistani market. Express.js backend serves a RESTful API and static HTML frontend. Data is stored as JSON files — no database.

## Tech Stack

- **Runtime**: Node.js (no TypeScript)
- **Framework**: Express ^4.21
- **Testing**: Node.js built-in `node:test` + `assert/strict`
- **Coverage**: c8
- **Linting**: ESLint 10+ flat config with `eslint-plugin-security`
- **Frontend**: Vanilla HTML/CSS/JS (no framework)

## Build & Run Commands

All commands run from `pakwheels-mvp/`:

```bash
npm start          # Start server (node server.js)
npm run dev        # Dev mode with --watch
npm test           # Run tests (node --test test/*.test.js)
npm run coverage   # Coverage report via c8
```

Server runs on `http://localhost:3000`.

## Architecture

- **`app.js`** — Express app factory (`createApp()`). Exports `{ createApp, readJSON, writeJSON }`. All routes and data helpers live here.
- **`server.js`** — Entry point, calls `createApp().listen()`.
- **`data/`** — JSON file storage (`cars.json`, `bikes.json`, `makes.json`, `cities.json`). Read/write via `readJSON`/`writeJSON` helpers.
- **`public/`** — Static HTML pages (`index.html`, `car.html`, `sell.html`).
- **`test/`** — Integration tests (`api.test.js`) and data validation tests (`data.test.js`).

## API Routes

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/cars` | Supports filters: make, model, city, minPrice, maxPrice, minYear, maxYear, fuel, transmission, search |
| GET | `/api/cars/:id` | Single car by ID |
| POST | `/api/cars` | Create car (featured/isCertified/postedDate are auto-set) |
| GET | `/api/bikes` | Same filters as cars |
| GET | `/api/bikes/:id` | Single bike by ID |
| POST | `/api/bikes` | Create bike (bike IDs start at 1001) |
| GET | `/api/makes` | `?type=car|bike` to filter |
| GET | `/api/cities` | Returns string array |

## Conventions

- **Filtering**: All query param filters are additive (AND). Case-insensitive comparisons. Featured items always sorted first.
- **ID generation**: `Math.max(...items.map(i => i.id)) + 1` — handle empty arrays.
- **Response format**: Success → 200/201 with JSON. Errors → 404 with `{ error: 'Message' }`.
- **ESLint**: Security plugin rules enforced. Inline disable for `security/detect-non-literal-fs-filename` on JSON file ops — this is intentional.
- **Frontend colors**: Amber `#f59e0b`, green `#059669`, dark `#1f2937`.

## Pitfalls

- **Test data restoration**: Tests save/restore original JSON files. Never run tests in parallel — they share the same data files.
- **POST endpoints**: Don't validate seller fields — be cautious when testing or extending.
- **sell.html**: Has hardcoded make options instead of fetching from `/api/makes`. If adding makes, update both `makes.json` and the HTML.
- **Price parsing**: Uses `parseInt()` — no decimal handling for prices.
- **Date auto-set**: `postedDate` uses `new Date().toISOString().split('T')[0]` which is timezone-dependent.
