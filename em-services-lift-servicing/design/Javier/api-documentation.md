# API Documentation — Inspections

Feature owner: Javier
Base path: `/api/inspections` (mounted in `backend/src/server.js`)

> Updated after auth/RBAC landed on top of this feature - every route below now requires a
> valid JWT, which wasn't true when this doc was first written. See "Auth" on each endpoint.

All request/response bodies are JSON. All success responses use the shape
`{ "success": true, "message": "...", "data": ... }` from `backend/src/utils/apiResponse.js`.
All error responses use `{ "success": false, "message": "..." }`, thrown as an `ApiError`
(`backend/src/utils/ApiError.js`) and caught by the app-wide error-handler middleware in
`server.js`.

> **Note on response shape:** this differs from Scheduling's error shape (`{ "error": "..." }` —
> see `design/Aeric/api-documentation.md`). Both features currently coexist with different error
> envelopes; worth a team decision on which to standardise on before the final submission.

See [[inspections-database-schema]] for the full field list.

## Auth

Every endpoint below requires `Authorization: Bearer <token>` (a JWT issued by `/api/auth/login`
— see `design/<auth owner>/api-documentation.md`). Missing/invalid/expired tokens get a 401. On
top of that, two endpoints require a specific role:

| Endpoint | Auth |
| --- | --- |
| `GET /`, `GET /stats`, `GET /:id` | Any authenticated role |
| `POST /`, `PUT /:id` | Any authenticated role, but see the Staff/schedule-ownership rule below |
| `PATCH /:id/notify-contractor` | Admin or Master only |
| `DELETE /:id` | Admin or Master only |

**Staff/schedule-ownership rule** (applies to `POST /` and `PUT /:id`): if the request includes
a `scheduleId`, and the caller's role is `Staff`, that schedule's `assignedStaffId` must match
the caller — otherwise 403 "You can only work with a schedule assigned to you". Does not apply
to Admin/Master, and does not apply if no `scheduleId` is supplied at all.

---

## GET /api/inspections

List inspection reports (excludes soft-deleted ones), sorted by `inspectionDate` descending.

**Query parameters (optional):**

| Param | Type | Description |
| --- | --- | --- |
| `status` | string | One or more of `Draft`, `Submitted`, `Under Review`, `Closed`, comma-separated for a multi-select filter (e.g. `?status=Draft,Submitted`). |
| `q` | string | Case-insensitive substring match against `reportNo`, `liftCode`, `block`, `contractor`, or `inspectorName`. |
| `liftId` | ObjectId string | Restricts to reports for one lift. Added for the Lift Workflow's Inspections step, which scopes the whole list to whichever lift is currently selected. |

**200 OK**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "_id": "66c1f2...",
      "reportNo": "INSP-0001",
      "liftId": "66c1e0...",
      "scheduleId": null,
      "liftCode": "L-102",
      "block": "Blk 12A",
      "inspectionDate": "2026-07-08T00:00:00.000Z",
      "inspectorName": "Jessica S.",
      "contractor": "Koh Lift Services",
      "compliance": "Defect Found",
      "checklist": [ { "item": "Door operation", "result": "Fail", "remarks": "Sticky on close" } ],
      "defects": [ { "_id": "66c1f3...", "description": "...", "severity": "Major", "photoUrl": "https://res.cloudinary.com/...", "status": "Open", "raisedDate": "2026-07-08T..." } ],
      "overallStatus": "Draft",
      "contractorNotifiedAt": null,
      "notes": "",
      "isDeleted": false,
      "createdAt": "2026-07-08T09:00:00.000Z",
      "updatedAt": "2026-07-08T09:00:00.000Z"
    }
  ]
}
```

---

## GET /api/inspections/stats

Summary counts for the dashboard/stat cards (excludes soft-deleted reports).

**200 OK**
```json
{
  "success": true,
  "message": "OK",
  "data": { "total": 4, "draft": 1, "submitted": 2, "closed": 1, "withDefects": 3, "criticalOpen": 1 }
}
```
`submitted` combines `Submitted` and `Under Review`. `criticalOpen` counts embedded defects with
`severity: "Critical"` whose `status` is not yet `"Verified"`.

---

## GET /api/inspections/:id

**200 OK** — report object (same shape as the list endpoint's items).
**404 Not Found** — `{ "success": false, "message": "Inspection report not found" }` (also
returned for a soft-deleted report's id, same as a genuinely unknown one).

---

## POST /api/inspections

Create a new inspection report. Default `overallStatus` is `Draft`.

**Request body:**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `liftId` | ObjectId string | ✅ | Must resolve to a real `Lift` document — server looks it up and snapshots `liftCode`/`block` from it. |
| `scheduleId` | ObjectId string | – | Optional. If supplied: must resolve to a real, non-deleted Schedule whose own `liftId` (if set) matches this `liftId`; see the Staff-ownership rule under Auth above. |
| `inspectionDate` | ISO date string | ✅ | Rejected if later than the current date/time. |
| `inspectorName` | string | ✅ | |
| `contractor` | string | – | defaults to `''` |
| `checklist` | array | – | `[{ item, result, remarks }]`; defaults to `[]` |
| `defects` | array | – | `[{ description, severity, photoUrl, status }]`; defaults to `[]` |
| `overallStatus` | string (enum) | – | defaults to `'Draft'` |
| `notes` | string | – | defaults to `''` |

`compliance` is never taken from the client — always derived as `"Defect Found"` if
`defects.length > 0`, else `"Pass"`.

**201 Created** — the created report object.

**400 Bad Request:**
- Missing required field: `"Missing required field(s): liftId, inspectorName"`
- `liftId` doesn't resolve to a real lift: `"Selected lift not found"`
- `scheduleId` doesn't resolve to a real schedule: `"Selected schedule not found"`
- `scheduleId` belongs to a different lift: `"Selected schedule is for a different lift"`
- `inspectionDate` in the future: `"Inspection date cannot be in the future"`

**403 Forbidden** — Staff caller using another staff member's assigned schedule: `"You can only work with a schedule assigned to you"`

---

## PUT /api/inspections/:id

Partial update. **Only allowed while the report is still `Draft`.**

**200 OK** — the updated report object. If `liftId` changes, `liftCode`/`block` are
re-snapshotted. If `defects` changes, `compliance` is re-derived. If either `scheduleId` or
`liftId` changes, the schedule/lift consistency + Staff-ownership checks re-run against the
resulting combination.

**400 Bad Request:**
- Report is no longer `Draft`: `"Only draft reports can be edited. This report has already been submitted."`
- Same schedule/date validation errors as `POST`.

**403 Forbidden** — same Staff-ownership rule as `POST`.
**404 Not Found** — `"Inspection report not found"`.

---

## PATCH /api/inspections/:id/notify-contractor

Admin/Master only. Requires at least one logged (embedded) defect.

**200 OK** — `{ "success": true, "message": "Contractor notified for INSP-0001", "data": {...} }`.
Side effects: `contractorNotifiedAt` set to now, every `Open` embedded defect → `Acknowledged`,
`overallStatus` → `Under Review`.

**400 Bad Request** — no defects logged: `"No defects logged on this report to notify the contractor about"`
**403 Forbidden** — caller is Staff.
**404 Not Found** — `"Inspection report not found"`.

---

## DELETE /api/inspections/:id

Admin/Master only. **Soft delete** — only allowed while the report is still `Draft`.

**200 OK**
```json
{ "success": true, "message": "INSP-0001 deleted", "data": { "cascaded": { "defects": 1, "rectifications": 0 } } }
```
`cascaded` reports how many standalone Defects (and, transitively, Rectifications) were also
soft-deleted because they referenced this report via `inspectionId` — see
[[inspections-database-schema]]'s "Delete is now soft" section.

**400 Bad Request** — report is no longer Draft: `"Only draft reports can be deleted. Submitted reports are kept for audit purposes."`
**403 Forbidden** — caller is Staff.
**404 Not Found** — `"Inspection report not found"`.
