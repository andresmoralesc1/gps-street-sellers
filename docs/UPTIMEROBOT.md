# UptimeRobot Configuration

GPS Street Sellers uses [UptimeRobot](https://uptimerobot.com) (free tier: 50 monitors, 5-min checks) for external uptime monitoring. Caddy + PM2 are inside this VPS, so without an external check you wouldn't notice if both go down (e.g. OOM kill of PM2 daemon).

## Monitor 1 — Primary health check

| Field | Value |
|---|---|
| Monitor Type | HTTP(s) |
| Friendly Name | `gps.andresmorales.com.co` |
| URL | `https://gps.andresmorales.com.co/api/health` |
| Monitoring Interval | 5 minutes |
| Monitor Timeout | 30 seconds |
| Keyword (optional) | `ok` — ensures the body returns `{ "ok": true }` not an error page |
| Alert Contacts | Email (your address), Telegram bot (optional) |

## How to set up

1. Sign up at https://uptimerobot.com (free).
2. Click **+ Add New Monitor**.
3. Fill the fields above.
4. Under **Alert Contacts**, add your email. (And a Telegram bot via the integrations page if you want push.)
5. Save. UptimeRobot will probe every 5 minutes.

## Expected response from `/api/health`

```json
{ "ok": true, "db": "ok", "uptime": 12345 }
```

- If the body changes (e.g. DB error) or the request times out, UptimeRobot fires an alert.
- The keyword check `ok` ensures we only trigger when the body actually says the app is healthy.

## Why `/api/health` and not `/`

- `/` is a heavy SPA render that needs Supabase + DB + map tiles to load.
- `/api/health` is a 5-line handler that returns DB ping + process uptime — fast and deterministic.
- If even the health endpoint is down, the whole app is down.

## Fallback / TODO

- Add a second monitor pointing at `/api/health` over HTTP (port 80) once a Caddy HTTP→HTTPS redirect is set, so a TLS issue alone is caught.
- Status page: UptimeRobot Public Status Pages (free, 1 page) at `status.andresmorales.com.co` if/when DNS is wired.