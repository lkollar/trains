# Cannon Street Line PWA

Simple PWA showing live departures between Eltham (ELW) and London Cannon Street
(CST), both directions. Highlights loop service (long duration or many stops),
shows cancellations/delays, and refreshes every 60s.

## Data source

Uses departureboard.io public API:
`/api/v1.0/getFormattedJourneyByCRS?sourceCRS=ELW&destCRS=CST`

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints. Run the install command only on first setup or
after dependencies change.
