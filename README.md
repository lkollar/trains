# Cannon Street Line PWA

Simple PWA showing live departures between Eltham (ELW) and London Cannon Street
(CST), both directions. Highlights loop service (long duration or many stops),
shows cancellations/delays, and refreshes every 60s.

## Data source

Uses departureboard.io public API:
`/api/v1.0/getFormattedJourneyByCRS?sourceCRS=ELW&destCRS=CST`

## Run locally

```bash
python3 -m http.server
```

Open `http://localhost:8000`.

## Deploy

Serve the repo root on `trains.kollar.me` over HTTPS for PWA install.
