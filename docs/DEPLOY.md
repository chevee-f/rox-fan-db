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
| `AUTO_APPROVE_GROUPS` | `true` | Any new tracker ID works without manual SQL (fine for testing with friends) |
| `PORT` | (Railway sets this automatically) | |

Turn `AUTO_APPROVE_GROUPS` off before a public launch.

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

If `AUTO_APPROVE_GROUPS` is not set, approve IDs **on the live server** (not your PC).

### Railway — approve the **live** database

`railway shell` and `railway run` both run on **your PC** (you'll see `D:\Projects\RoX\data\trackers.db`). They do **not** update production.

**Easiest for testing:** set `AUTO_APPROVE_GROUPS=true` in Railway Variables and redeploy.

**Manual approve (recommended):** set an admin secret and call the API from your PC:

1. Railway → Variables:
   - `ADMIN_SECRET` = a long random string you keep private
   - `AUTO_APPROVE_GROUPS` = `false` (or leave unset)
2. Redeploy
3. From your PC:

```powershell
$env:ROX_ADMIN_URL="https://YOUR-APP.up.railway.app"
$env:ADMIN_SECRET="your-secret-here"
npm run approve -- TRK-6JSB78 "Guild Timers"
npm run list-groups
```

**SSH into the container** (alternative):

```powershell
railway ssh
npm run approve -- TRK-6JSB78 "Guild board"
```

First `railway ssh` may prompt you to register an SSH key.

### Local dev

```bash
npm run approve -- TRK-A7F3K9Q "Guild board"
npm run list-groups
```

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
