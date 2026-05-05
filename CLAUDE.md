# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GeoHelpDesk is a client-side-only SPA for exploring Google Street View car (GeoHints vehicle) coverage across countries. It uses Leaflet.js for interactive map visualization and has no build system — files are served directly as-is.

## Running the App

There is no build step. Serve the root directory with any static file server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

No npm, no bundler, no transpiler. Dependencies (Leaflet.js) load from CDN in `index.html`.

## Architecture

### Pages
- `index.html` + `app.js` — Main map view with country selection and vehicle gallery
- `filters.html` + `filters.js` — Secondary page for filtering countries by metadata (driving side, camera generation, coverage year, etc.)

### Data Layer
The app uses three globally-scoped data sources (no module system):
- `window.GOOGLE_CARS` (from `cars-data.js`) — Vehicle photo arrays keyed by country name
- `window.COUNTRY_FILTER_DATA` (from `filters-data.js`) — Country metadata for filters
- `countries.geo.json` — Fetched at runtime; provides country/territory polygon geometry

`cars-data.js` and `filters-data.js` are **generated files** — do not edit them manually. They are regenerated from the source `.txt` files (`DrivingSide.txt`, `Years.txt`, `Lines.txt`, `CameraGens.txt`).

### Core Logic in `app.js`
- `normalise(value)` — Normalizes country names (accents, aliases, special chars) for matching between GeoJSON and data files
- `dataNameFor(feature)` — Maps a GeoJSON feature to its key in `GOOGLE_CARS`/`COUNTRY_FILTER_DATA`
- `featureAt(latlng)` — Point-in-polygon test for click → country detection; handles multipolygons and antimeridian-wrapping coordinates
- `selectLayer(layer, name)` — Renders the vehicle gallery sidebar for the selected country
- `cacheImagesFor(list)` — Sends image URLs to the Service Worker for offline caching

### Territory Handling
18 smaller territories (e.g. Gibraltar, Réunion) are represented as clickable markers overlaid on the map, not as GeoJSON polygons, because they are too small to click reliably. They are defined in `app.js` with explicit lat/lng and a `parent` property for name resolution.

### Service Worker (`sw.js`)
Dual-cache strategy: stale-while-revalidate for app assets, cache-first for images. The app shell (HTML/JS/CSS/GeoJSON) is cached on install. Images are cached on demand when a country is selected.

## Responsive Layout
- **Desktop (> 900px)**: Two-column grid — map left, vehicle panel right
- **Tablet/mobile (≤ 900px)**: Map full-width, vehicle panel as draggable bottom sheet with snap points
- **Small mobile (≤ 560px)**: Stacked header, single-column grid

## Key Conventions
- Country name matching uses `normalise()` extensively — any new country data must use names that resolve correctly through this function or have an explicit alias added.
- `filters-data.js` structure: each entry has `drivingSide`, `euPlates`, `lines`, `years` (array), `gens` (array). The `years` array uses `null` as a sentinel for "unknown/no coverage".
- Territory markers in `app.js` use the `territories` array — add new small territories here rather than relying on GeoJSON polygon clicking.
