# NYC Warming Centers Map — prototype

A UX prototype for exploring which mapping features an in-house NYC map build would need. All location details are sample data; addresses come from the NYC311 warming centers page.

## Run locally

```bash
npm install
npm run dev
```

## Stack

- Vite + React + TypeScript
- MapLibre GL JS with OpenFreeMap vector tiles (no API key)
- NYC GeoSearch for address search (no API key)
- Data: `public/centers.csv`
