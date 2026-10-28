# Maintenance notice

Edit `config/gen3/maintenance.json` to configure the notice. It ships disabled
with draft copy and empty dates. To enable it, set `enabled` to `true` and supply
both `startsAt` and `endsAt` as ISO timestamps with explicit timezone offsets, 
for example `2026-10-28T13:00:00-04:00`. Midnight after October 28 in New York is
`2026-10-29T00:00:00-04:00`. Choose the actual maintenance window before enabling.
Invalid, missing, or reversed dates suppress the notice.

The title, message, and button label are editable in the same file. Change `id`
for each new maintenance event so an earlier dismissal does not suppress it.
Configuration is bundled into the frontend and requires a rebuild/deployment.

The modal appears for authenticated users within the time window, including
users already signed in when the window starts. It waits for the cookie consent
modal to close. Dismissal survives navigation and refresh in the same browser tab
using session storage; a confirmed unauthenticated state clears it so the next
login shows it again. Each tab has its own dismissal state. If an entire logout
and login happens outside the tab without it observing the logged-out state,
its previous dismissal can remain. No token or account data is stored.

The notice closes automatically at the end of the window using the browser clock.
Storage-blocked browsers retain dismissal only while the component remains mounted.

Run the focused checks with:

```bash
NODE_OPTIONS=--no-experimental-strip-types npx jest --runInBand src/components/MaintenanceNotice.unit.test.tsx
```
