# GFL Masters 2026 — Draft Pool

A full-stack fantasy golf draft app for the 2026 Masters Tournament, hosted on Vercel.

## Quick Start (Local Dev)

```bash
cd masters-pool
npm install
npm run dev
# opens at http://localhost:3000
```

Locally, draft picks are stored in `drafts.json`. No database setup needed.

---

## Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Set up Upstash Redis (for persistent storage on Vercel)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Open your project → **Integrations** tab → search for **Upstash Redis** → Add
3. Create a free Redis database (select the region closest to you)
4. Click **Connect to Project** — Vercel auto-injects:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

> **Without Upstash:** The app falls back to `drafts.json` (local only — won't persist across Vercel function invocations).

### 3. Deploy
```bash
npm run deploy
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/draft` | Full draft state + next pick |
| `POST` | `/api/draft` | Submit a pick `{ pickNumber, golfer }` |
| `GET` | `/api/field` | Available (undrafted) golfers |
| `GET` | `/api/standings` | 4 group leaderboards with live Masters data |
| `POST` | `/api/admin` | Reset draft `{ password: "masters2026" }` |

---

## Admin Reset

1. Click the **⚙** icon in the footer
2. Enter password: `masters2026`
3. Confirm reset

Or via curl:
```bash
curl -X POST https://your-app.vercel.app/api/admin \
  -H "Content-Type: application/json" \
  -d '{"password":"masters2026"}'
```

---

## Live Scores

Standings pull from the ESPN free API:
```
https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga
```

No API key required. If the Masters hasn't started or the API is down, the app shows a graceful error banner and displays the draft order without scores.

---

## Draft Structure

20 picks across 6 players (Austin, Casey, Mike, Kenny, Tyler, Lev). Each pick contributes to one or more of 4 group leaderboards. The draft order and group assignments are fixed in `lib/data.js`.

---

## File Structure

```
masters-pool/
├── api/
│   ├── draft.js        ← GET + POST draft
│   ├── field.js        ← GET available golfers
│   ├── standings.js    ← GET group leaderboards
│   └── admin.js        ← POST reset
├── lib/
│   ├── data.js         ← Draft order, golfer pool
│   ├── storage.js      ← KV / JSON file abstraction
│   └── espn.js         ← ESPN API fetcher + name matcher
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── drafts.json         ← Local dev storage (auto-created)
├── vercel.json
├── package.json
└── README.md
```
