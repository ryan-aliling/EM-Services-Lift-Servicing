# Backend Test Cases — Rectifications

Feature owner: Ryan
Automated in: `rectification.test.js` (Jest + Supertest, against an in-memory MongoDB via
`mongodb-memory-server` — no real Atlas connection needed to run these). The test file mounts
only `rectificationsRoutes` (plus the same error-handling middleware `server.js` uses) rather
than requiring `server.js` itself, since that file connects to the real `DATABASE_URL` and
calls `app.listen` as a side effect of being imported.

Run with: `npm run test:ryan` (see `backend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | Create requires `defectId` | POST `/api/rectifications` with `rectifiedBy` + `dateRectified` only | 400; message names `defectId` as missing |
| 2 | Create requires `rectifiedBy` and `dateRectified` too | POST with only a valid `defectId` | 400; message names both missing fields |
| 3 | Create — `defectId` doesn't resolve to a real defect | POST with a well-formed but non-existent `defectId` | 400; "Selected defect not found" |
| 4 | Create — happy path, no photos/signature | POST with required fields only | 201; `status` defaults to `"Draft"`, `proofPhotos` is `[]`, `signatureUrl` is `""` |
| 5 | Create — auto-promotes to Submitted | POST with `proofPhotos` (1+) and `signatureUrl` set, no explicit `status` | 201; `status` is `"Submitted"` |
| 6 | Create — explicit `status: "Submitted"` without proof | POST with `status: "Submitted"` but no photos/signature | 400; message mentions both "at least 1 proof photo" and "a signature" |
| 7 | Create — explicit `status: "Submitted"` missing only the signature | POST with photos but no `signatureUrl`, `status: "Submitted"` | 400; message mentions "a signature" only |
| 8 | List — excludes soft-deleted records | Create two records, soft-delete one via DELETE, GET `/api/rectifications` | 200; only the non-deleted record is returned |
| 9 | List — populates defect summary | Create a record against a real defect, GET the list | 200; `defectId` in the response is an object with `defectNo`/`title`/`description`/`liftId` rather than a bare id string |
| 10 | Get one — unknown id | GET a well-formed but non-existent id | 404 |
| 11 | Get one — fully populated | GET an existing record's id | 200; `defectId` is populated |
| 12 | Update — can't submit without proof | PUT `status: "Submitted"` on a Draft record with no photos/signature | 400 |
| 13 | Update — can reach Submitted once proof is attached | PUT `proofPhotos` + `signatureUrl` + `status: "Submitted"` in one request | 200; `status` is `"Submitted"` |
| 14 | Update — can't set status directly to Endorsed | PUT `status: "Endorsed"` on a Submitted record | 400; message points at the endorse endpoint |
| 15 | Update — blocks photo/signature edits once Endorsed | Endorse a record, then PUT a new `proofPhotos` array | 400 |
| 16 | Update — still allows remarks once Endorsed | Endorse a record, then PUT a new `remarks` value | 200; `remarks` updates, `proofPhotos`/`signatureUrl` untouched |
| 17 | Update — unknown id | PUT a well-formed but non-existent id | 404 |
| 18 | Endorse — cannot endorse a Draft record | PATCH `/:id/endorse` on a freshly-created Draft record | 400; message says it must be "Submitted" first |
| 19 | Endorse — requires `endorsedBy` | PATCH `/:id/endorse` on a Submitted record with an empty body | 400 |
| 20 | Endorse — happy path | PATCH `/:id/endorse` with `endorsedBy` on a Submitted record | 200; `status` is `"Endorsed"`, `endorsedBy` matches, `endorsedDate` is set |
| 21 | Endorse — cannot endorse twice | Endorse a record, then PATCH `/:id/endorse` again | 400; message says it must be "Submitted" first |
| 22 | Delete — cannot delete a Submitted record | Submit a record, then DELETE it | 400; only Draft records can be deleted |
| 23 | Delete — cannot delete an Endorsed record | Endorse a record, then DELETE it | 400 |
| 24 | Delete — happy path on a Draft record | DELETE a freshly-created Draft record, then GET the same id | DELETE 200; subsequent GET 404 (soft-deleted, not just hidden) |
| 25 | Delete — unknown id | DELETE a well-formed but non-existent id | 404 |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 26 | Upload real photos and a drawn signature through the UI, then Submit | `POST /api/uploads/presign` is called once per file, each S3 URL lands in `proofPhotos`/`signatureUrl`, and the record shows as "Submitted" in the table |
| 27 | Open a Submitted record as EM staff and click Endorse | Prompted for an endorser name; after confirming, the record shows "Endorsed" with that name and today's date |
| 28 | Try to edit photos on an Endorsed record in the UI | Photo upload/remove controls and the signature pad are disabled; remarks stays editable |
