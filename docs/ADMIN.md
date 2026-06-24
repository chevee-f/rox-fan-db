# Admin: allowlist a tracker ID

After a host creates a group in the app, they copy the **tracker ID** (e.g. `TRK-A7F3K9`) and send it to you.

```bash
npm run list-groups
```

### Railway (production database)

`railway shell` / `railway run` = your PC only. Use the admin API or `railway ssh`:

```powershell
$env:ROX_ADMIN_URL="https://YOUR-APP.up.railway.app"
$env:ADMIN_SECRET="your-secret"
npm run list-groups
```

## Activate an ID

Open the SQLite database at `data/trackers.db` and run:

```sql
INSERT INTO approved_groups (tracker_id, notes)
VALUES ('TRK-A7F3K9Q', 'Guild MVP board - PlayerX');
```

On Railway, run SQL inside the container: `railway shell`, then use `node -e` or the approve script above.

## Check status

```sql
SELECT tracker_id, sharing_active, title, host_nickname, started_at, stopped_at
FROM approved_groups
WHERE tracker_id = 'TRK-A7F3K9Q';
```

## Revoke an ID

```sql
DELETE FROM approved_groups WHERE tracker_id = 'TRK-A7F3K9Q';
```

This cascades and removes timers, members, and permissions for that group.

## Run the server

Requires **Node.js 22.5+** (uses built-in `node:sqlite`).

```bash
npm install
npm start
```

Open `http://localhost:3000/timers.html`.
