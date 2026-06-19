---
description: "Add a new vehicle listing (car or bike) to the PakWheels MVP. Updates data files, sell form, and tests."
name: "Add Vehicle Listing"
argument-hint: "vehicle type and details (e.g., 'car: Toyota Yaris 2024')"
---

Add a new vehicle listing to the PakWheels MVP platform.

## Inputs

- **Vehicle type**: car or bike (from argument or ask user)
- **Vehicle details**: make, model, year, price, city, etc.

## Steps

1. **Determine vehicle type** — car or bike. If not specified in the argument, ask the user.

2. **Add to data file**:
   - For cars: edit `pakwheels-mvp/data/cars.json`
   - For bikes: edit `pakwheels-mvp/data/bikes.json`
   - Generate ID: `Math.max(...items.map(i => i.id)) + 1` (bikes start at 1001)
   - Include all required fields: id, make, model, variant, year, price, city, km, fuel, transmission, bodyType, engineCC, color, registeredIn, assembly, features, description, images, featured (false), isCertified (false), seller, postedDate
   - Use `https://placehold.co/600x400/9ca3af/ffffff?text=Make+Model` for images

3. **Update sell.html** (if adding a new make):
   - Check if the make already exists in the `<select id="make">` dropdown in `pakwheels-mvp/public/sell.html`
   - If not, add an `<option>` for the new make

4. **Update makes.json** (if adding a new make):
   - Check `pakwheels-mvp/data/makes.json`
   - If the make doesn't exist, add it with: `{ id: nextId, name: "MakeName", logo: "url", category: "car"|"bike"|"both" }`

5. **Run tests** to verify nothing is broken:
   ```bash
   cd pakwheels-mvp && npm test
   ```

6. **Verify** by starting the server and checking the listing appears on the homepage and detail page.
