# Tapo · Energy Consumption Dashboard

A free, **100% client-side** web app to visualize the energy consumption of your
TP-Link **Tapo** smart plugs. Register one item per plug, drop in the
`Consumo de energía(kWh)` Excel file exported from the Tapo app, and get two
hourly charts for any day:

1. **Consumption per peripheral** — each item as its own colored line (kWh per hour).
2. **Total consumption (sum)** — the summed kWh of all items per hour (Endesa-style).

Both charts show the **total energy consumed** for the selected day and can be
**downloaded as PNG**. Spanish 2.0TD tariff bands are drawn in the background.

No backend, no accounts, no tracking — your files are parsed in the browser and
saved only to your own `localStorage`.

## Features

- Drag-and-drop (or click) upload of binary Tapo `.xls` exports (parsed with SheetJS).
- Multiple items, each with a name, color, re-upload and delete.
- Day picker built from the days present in your data, **newest first**.
- Per-day per-item and aggregated hourly kWh charts (Chart.js).
- Per-day total consumed readout + one-click PNG export per chart.
- Persistent across reloads via `localStorage`; responsive, mobile-first layout.

## Tech stack

Vite · TypeScript (no framework) · SheetJS (`xlsx`) · Chart.js 4 +
`chartjs-plugin-annotation`. Unit tests with Vitest.

## Develop

```bash
npm install
npm run dev      # start the dev server
npm test         # run the unit tests (Vitest)
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

## Deploy

`npm run build` produces a fully static `dist/` folder. The Vite `base` is
relative (`./`), so it works at a domain root **or** any sub-path. Upload `dist/`
to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3, …) — no
server-side code is required.

## How to export the data from Tapo

In the Tapo app open a smart plug → **Energy usage / Consumo** → export, and pick
the **`Consumo de energía`** report. That `.xls` is what you drop onto an item.
