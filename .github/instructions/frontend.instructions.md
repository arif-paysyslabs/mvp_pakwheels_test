---
description: "Use when working on frontend HTML, CSS, or JavaScript in the public/ directory. Covers styling patterns, color palette, responsive layout, and API integration conventions."
applyTo: "public/**"
---

# Frontend Guidelines

## Tech Stack

- Vanilla HTML/CSS/JS — no frameworks, no build step
- Font: Inter (Google Fonts), weights 400–800
- All CSS is inline `<style>` in each HTML file (no external stylesheets)
- All JS is inline `<script>` at the bottom of each HTML file

## Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Amber | `#f59e0b` | Primary actions, CTAs, featured badges, logo accent |
| Amber hover | `#d97706` | Button hover states |
| Green | `#059669` | Prices, certified badges, contact buttons |
| Green hover | `#047857` | Green button hover |
| Dark | `#1f2937` | Header, footer, secondary buttons |
| Dark hover | `#374151` | Dark button hover |
| Gray bg | `#f3f4f6` | Page background |
| Gray text | `#6b7280` | Secondary text, meta info |
| White | `#fff` | Cards, form backgrounds |

## Layout Patterns

- **Container**: `max-width: 1200px` (index), `1000px` (car detail), `640px` (sell form)
- **Card grid**: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` with `gap: 20px`
- **Form rows**: `grid-template-columns: 1fr 1fr` with `gap: 16px`
- **Detail page**: 2-column grid `1.2fr 1fr`
- **Responsive breakpoint**: `@media (max-width: 768px)` — single column, stacked search bar

## Component Patterns

- **Cards**: White bg, `border-radius: 12px`, subtle `box-shadow`, hover lift (`translateY(-4px)`)
- **Badges**: `border-radius: 20px`, `font-size: 11px`, `font-weight: 700`, `text-transform: uppercase`
- **Buttons**: `border-radius: 6-8px`, `font-weight: 600-700`, transition on background
- **Form inputs**: `border: 1px solid #d1d5db`, `border-radius: 8px`, focus `border-color: #f59e0b`

## API Integration

- Fetch data from `/api/cars`, `/api/bikes`, `/api/makes`, `/api/cities`
- `car.html` reads `id` and `type` from `URLSearchParams` to load vehicle details
- `index.html` reads `type` param to switch between cars/bikes view
- `sell.html` fetches cities from API but has **hardcoded** make options (not from API)

## Pitfalls

- **sell.html makes are hardcoded**: If adding a new make, update both `makes.json` AND the `<select>` in sell.html
- **No client-side routing**: All navigation is full page loads or `window.location`
- **Price formatting**: Use `pkr.toLocaleString('en-PK')` with `'PKR '` prefix
- **Image placeholders**: Use `https://placehold.co/600x400/9ca3af/ffffff?text=Label`
