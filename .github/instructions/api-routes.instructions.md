---
description: "Use when modifying API routes, adding endpoints, or working on backend logic in app.js. Covers route patterns, filtering, ID generation, and data validation conventions."
applyTo: "pakwheels-mvp/app.js"
---

# API Route Guidelines

## Architecture

All routes live in `app.js` inside the `createApp()` factory function. The module exports `{ createApp, readJSON, writeJSON }`.

## Data Helpers

- `readJSON(filename)` — reads and parses JSON from `data/` directory
- `writeJSON(filename, data)` — stringifies and writes JSON to `data/` directory
- Both use `path.join(DATA_DIR, filename)` — the `data/` prefix prevents path traversal
- ESLint `security/detect-non-literal-fs-filename` is intentionally disabled for these operations

## Route Patterns

### GET List Endpoints (`/api/cars`, `/api/bikes`)

1. Read JSON file → get array
2. Apply filters from query params (all additive AND logic)
3. Case-insensitive string comparisons using `.toLowerCase()`
4. Sort: featured items first — `(b.featured ? 1 : 0) - (a.featured ? 1 : 0)`
5. Return 200 with JSON array

### GET Single Item (`/api/cars/:id`, `/api/bikes/:id`)

1. Find by `parseInt(id)` — IDs are numbers
2. Return 404 with `{ error: 'Message' }` if not found
3. Return 200 with item object

### POST Endpoints (`/api/cars`, `/api/bikes`)

1. Read existing array
2. Generate ID: `Math.max(...items.map(i => i.id)) + 1` — **must handle empty arrays** (Math.max on empty returns -Infinity)
3. Auto-set fields: `featured: false`, `isCertified: false`, `postedDate: new Date().toISOString().split('T')[0]`
4. Push to array, write back
5. Return 201 with created item

## Filtering Conventions

- All filters are additive (AND condition)
- String filters: case-insensitive `.toLowerCase()` comparison
- Numeric filters: `parseInt()` on query param values — **no decimal handling**
- Search filter: checks across `make`, `model`, `variant`, `city` fields
- Available filters: `make`, `model`, `city`, `minPrice`, `maxPrice`, `minYear`, `maxYear`, `fuel`, `transmission`, `search`

## ID Generation

```javascript
const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
```

- Car IDs: sequential from 1
- Bike IDs: start at 1001

## Response Format

- **Success**: 200 (GET) or 201 (POST) with JSON body
- **Error**: 404 with `{ error: 'Descriptive message' }`

## Adding a New Endpoint

1. Add route inside `createApp()`
2. Use `readJSON`/`writeJSON` for data access
3. Follow existing filter/sort/response patterns
4. Add tests in `test/api.test.js`
5. If new data file needed, add to `data/` and update `test/data.test.js`
