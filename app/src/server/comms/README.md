# server/comms (HRM H3b)

Internal communications + document/policy library.

- `repository.ts` — `listAnnouncements` (pinned first) + author names; `listDocuments`
  - uploader names; `getDocument`.
- `service.ts` — `createAnnouncement` / `togglePinAnnouncement` / `deleteAnnouncement`;
  `uploadDocument` (R2 under the `documents/` key prefix, MIME + 10 MB guard, rollback
  on DB failure) / `deleteDocument` (row + R2).

Route `/thong-bao` (all staff read; create/upload = admin/hr). Documents stream via
the existing `/api/files/[...path]` route — a `documents/` branch there grants any
active staff read (company docs, no per-candidate scoping). Announcements are shown
to all logged-in users; their reach widens once employee self-service accounts land
(D-ESS).
