# Admin: allowlist control

Hosts copy their **tracker ID** (e.g. `TRK-A7F3K9Q`) and send it to you before they can **Start sharing**.

## Ops Console (web UI)

Secret page — **not linked** from the public nav. Bookmark it:

```
https://YOUR-DOMAIN/ops-console.html
```

Local: `http://localhost:3000/ops-console.html`

1. Set `ADMIN_SECRET` on the server (Railway Variables, or `.env` locally).
2. Open the ops console URL.
3. Sign in with the same passphrase as `ADMIN_SECRET`.
4. **Approve Group** — enter tracker ID + optional notes.
5. **Revoke** — removes allowlist access and deletes that group's shared data.

Turn off `AUTO_APPROVE_GROUPS` when you want manual control only.

## CLI (optional)

```bash
npm run list-groups
npm run approve -- TRK-A7F3K9Q "Guild board"
```

Production from your PC (hits live API):

```powershell
$env:ROX_ADMIN_URL="https://YOUR-APP.up.railway.app"
$env:ADMIN_SECRET="your-secret"
npm run approve -- TRK-A7F3K9Q
```

## SQL (fallback)

```sql
INSERT INTO approved_groups (tracker_id, notes)
VALUES ('TRK-A7F3K9Q', 'Guild MVP board');

SELECT tracker_id, sharing_active, title, host_nickname, notes
FROM approved_groups;

DELETE FROM approved_groups WHERE tracker_id = 'TRK-A7F3K9Q';
```

## Run the server

Requires **Node.js 22.5+**.

```bash
npm install
npm start
```
