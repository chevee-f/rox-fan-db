# Deploy RoX (spawn tracker + site)

You need **Node 22.5+**, **WebSockets** (Socket.IO), and a **persistent disk** for `data/trackers.db`.

## Fastest path: Railway (good for friend testing)

Gives a free URL like `https://your-app.up.railway.app` — no domain required yet.

### 1. Push code to GitHub

```powershell
cd D:\Projects\RoX
git init
git add .
git commit -m "Initial deploy"
```

Create a new repo on GitHub, then:

```powershell
git remote add origin https://github.com/YOUR_USER/rox.git
git branch -M main
git push -u origin main
```

### 2. Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your `rox` repo
3. Railway detects `Dockerfile` automatically

### 3. Persistent database (important)

Without this, shared groups reset on every redeploy.

1. In your Railway service → **Volumes** → **Add Volume**
2. Mount path: `/app/data`
3. Redeploy

### 4. Environment variables

In **Variables**, add:

| Variable | Value | Why |
|----------|--------|-----|
| `AUTO_APPROVE_GROUPS` | `true` | Any new tracker ID works without manual approval (testing only) |
| `ADMIN_SECRET` | long random string | Passphrase for `/ops-console.html` and admin API |
| `UMAMI_WEBSITE_ID` | UUID from Umami | **Free** analytics (recommended — see below) |
| `PORT` | (Railway sets this automatically) | |

Turn `AUTO_APPROVE_GROUPS` off before a public launch. Approve groups at **`/ops-console.html`** (sign in with `ADMIN_SECRET`).

### Optional: visitor analytics (free options)

Plausible is **paid after a trial** — use one of these instead. Only **one** provider runs; priority: Umami → Cloudflare → Plausible.

#### Option A — Umami Cloud (recommended, free Hobby plan)

1. Sign up at [cloud.umami.is](https://cloud.umami.is) (free tier: ~100K events/month, 3 sites).
2. **Add website** → copy the **Website ID** (UUID).
3. Railway → **Variables**:
   ```
   UMAMI_WEBSITE_ID=your-uuid-here
   ```
4. Redeploy. Dashboard updates within a few minutes.

#### Option B — Cloudflare Web Analytics (free forever)

1. Free [Cloudflare](https://dash.cloudflare.com) account → **Analytics & Logs** → **Web Analytics**.
2. **Add a site** → choose **JS snippet** → copy the **token** from the beacon code.
3. Railway → **Variables**:
   ```
   CLOUDFLARE_ANALYTICS_TOKEN=your-token-here
   ```
4. Redeploy. View stats in the Cloudflare dashboard (no Umami account needed).

#### Option C — Plausible (paid after trial)

Only if you prefer Plausible later:

```
PLAUSIBLE_DOMAIN=rox-fan-db.up.railway.app
```

Admin page (`/ops-console.html`) is excluded from all analytics.

### 5. Get your URL

**Settings** → **Networking** → **Generate Domain**

Share with friends:

- Site: `https://YOUR-APP.up.railway.app/`
- Timers: `https://YOUR-APP.up.railway.app/timers.html`

### 6. How friends test shared spawns

1. **Host**: Timers → create a group → copy **Tracker ID** → **Start sharing**
2. **Guest**: Enter tracker ID + nickname → host **Accept** in permissions panel
3. Timers sync live over Socket.IO

---

## Manual allowlist (production)

Use the **Ops Console** — not linked from the public site:

```
https://YOUR-APP.up.railway.app/ops-console.html
```

Sign in with the same value as `ADMIN_SECRET`. Approve tracker IDs, view LIVE/idle status, and revoke access.

CLI alternative (`ROX_ADMIN_URL` + `ADMIN_SECRET` on your PC): see [ADMIN.md](./ADMIN.md).

---

## Alternative: Fly.io

```powershell
fly auth login
fly launch
fly volumes create rox_data --size 1
```

In `fly.toml`, mount the volume to `/app/data`, set `AUTO_APPROVE_GROUPS=true`, then `fly deploy`.

---

## Alternative: Oracle Cloud free VM (long-term, $0)

1. Create an **Always Free** ARM VM (Ubuntu)
2. Install Node 22, clone repo, `npm ci && npm start`
3. Use **pm2** or systemd to keep it running
4. Open port 80/443 with nginx + Let's Encrypt when you have a domain

Best when you buy a domain next week — point DNS at the VM IP.

---

## Health check

`GET /health` → `{ "ok": true }`

Use this for uptime monitors.
