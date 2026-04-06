# GFL Masters 2026 — Draft Pool

**GitHub Pages (frontend):** https://atomlinsonc.github.io/masters-pool-2026/
**GitHub Repo:** https://github.com/atomlinsonc/masters-pool-2026

A full-stack fantasy golf draft app for the 2026 Masters Tournament.

- **Frontend** → GitHub Pages (static, served from `docs/`)
- **Backend API** → Vercel (serverless functions in `api/`)
- **Storage** → Upstash Redis (on Vercel) or `drafts.json` (local dev)

---

## Deploy the Backend to Vercel

### Step 1 — Import repo into Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"** → select `masters-pool-2026`
3. Leave all settings as default (Vercel auto-detects Node.js)
4. Click **Deploy** — you'll get a URL like `https://masters-pool-2026.vercel.app`

### Step 2 — Add Upstash Redis (persistent storage)

1. In your Vercel project → **Integrations** tab
2. Search for **Upstash Redis** → Add → Create a free Redis database
3. Click **Connect to Project** — Vercel injects these env vars automatically:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 3 — Point GitHub Pages at your Vercel URL

Edit one line in `docs/index.html`:

```html
<!-- Change this: -->
<meta name="api-base" content="" />

<!-- To this (your actual Vercel URL): -->
<meta name="api-base" content="https://masters-pool-2026.vercel.app" />
```

Then commit and push:
```bash
git add docs/index.html
git commit -m "Set Vercel API base URL"
git push
```

GitHub Pages updates automatically within ~60 seconds.

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

Click the **⚙** icon in the footer → enter password `masters2026`.

Or via curl:
```bash
curl -X POST https://your-app.vercel.app/api/admin \
  -H "Content-Type: application/json" \
  -d '{"password":"masters2026"}'
```

---

## Live Scores

Standings pull from the ESPN free API — no API key required:
```
https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga
```

If the Masters hasn't started or ESPN is down, the app shows a graceful error banner with the draft order only.

---

## File Structure

```
masters-pool-2026/
├── api/
│   ├── draft.js        ← GET + POST draft picks
│   ├── field.js        ← GET available golfers
│   ├── standings.js    ← GET group leaderboards + live ESPN data
│   └── admin.js        ← POST reset (password protected)
├── lib/
│   ├── data.js         ← Fixed draft order, golfer pool, group assignments
│   ├── storage.js      ← Upstash Redis / JSON file abstraction
│   └── espn.js         ← ESPN API fetcher + fuzzy name matcher
├── docs/               ← GitHub Pages frontend
│   ├── index.html
│   ├── style.css
│   └── app.js
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

---

## Draft Structure (fixed)

20 picks across 6 players. Each pick contributes to one or more of 4 group leaderboards.

| Pick | Player | Groups |
|------|--------|--------|
| 1 | Austin | 1, 2, 4 |
| 2 | Casey | 1, 2, 3, 4 |
| 3 | Mike | 1, 3, 4 |
| 4 | Mike | 1, 3, 4 |
| 5 | Casey | 1, 2, 3, 4 |
| 6 | Austin | 1, 2, 4 |
| 7 | Austin | 2 |
| 8 | Casey | 2 |
| 9 | Casey | 2 |
| 10 | Austin | 3 |
| 11 | Kenny | 3 |
| 12 | Tyler | 3 |
| 13 | Mike | 3 |
| 14 | Mike | 3 |
| 15 | Tyler | 3 |
| 16 | Kenny | 3 |
| 17 | Lev | 4 |
| 18 | Tyler | 4 |
| 19 | Tyler | 4 |
| 20 | Lev | 4 |
