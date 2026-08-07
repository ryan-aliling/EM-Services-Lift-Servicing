# API Documentation — Inspections

Feature owner: Javier
Base path: `/api/inspections` (mounted in `backend/src/server.js`)
Auth: none yet — the assignment guide treats user accounts as shared, non-core infrastructure.
All endpoints are currently open.

All request/response bodies are JSON. All success responses use the shape
`{ "success": true, "message": "...", "data": ... }` from `backend/src/utils/apiResponse.js`.
All error responses use `{ "success": false, "message": "..." }`, thrown as an `ApiError`
(`backend/src/utils/ApiError.js`) and caught by the global error-handler middleware added to
`server.js` while building this module.

> **Note on response shape:** this differs from Scheduling's error shape (`{ "error": "..." }` —
> see `design/Aeric/api-documentation.md`). Both features currently coexist with different error
> envelopes; worth a team decision on which to standardise on before the final submission, since
> a shared API client currently has to handle both shapes.

See [[inspections-database-schema]] for the full field list.

---

## GET /api/inspections

List inspection reports, sorted by `inspectionDate` descending (most recent first).

**Query parameters (optional):**

| Param | Type | Description |
| --- | --- | --- |
| `status` | string | One or more of `Draft`, `Submitted`, `Under Review`, `Closed`, comma-separated for a multi-select filter (e.g. `?status=Draft,Submitted`). |
| `q` | string | Case-insensitive substring match against `reportNo`, `liftCode`, `block`, `contractor`, or `inspectorName`. |

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
      "defects": [ { "_id": "66c1f3...", "description": "...", "severity": "Major", "photoUrl": "", "status": "Open", "raisedDate": "2026-07-08T..." } ],
      "overallStatus": "Draft",
      "contractorNotifiedAt": null,
      "notes": "",
      "createdAt": "2026-07-08T09:00:00.000Z",
      "updatedAt": "2026-07-08T09:00:00.000Z"
    }
  ]
}
```

---

## GET /api/inspections/stats

Summary counts for the dashboard/stat cards.

**200 OK**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "total": 4,
    "draft": 1,
    "submitted": 2,
    "closed": 1,
    "withDefects": 3,
    "criticalOpen": 1
  }
}
```
`submitted` combines the `Submitted` and `Under Review` counts (both represent "in flight, not
yet closed"). `criticalOpen` counts defects with `severity: "Critical"` whose `status` is not yet
`"Verified"`.

---

## GET /api/inspections/:id

Fetch a single report by id.

**200 OK** — report object (same shape as the list endpoint's items)

**404 Not Found** — `{ "success": false, "message": "Inspection report not found" }`

---

## POST /api/inspections

Create a new inspection report. Default `overallStatus` is `Draft`.

**Request body:**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `liftId` | ObjectId string | ✅ | Must resolve to a real `Lift` document — server looks it up and snapshots `liftCode`/`block` from it. |
| `scheduleId` | ObjectId string | – | Optional link to the scheduled visit this report follows up on. Not validated against the Schedule collection (an unknown id is stored as-is — kept intentionally loose since Scheduling is owned by a different feature). |
| `inspectionDate` | ISO date string | ✅ | Rejected if later than the current date/time. |
| `inspectorName` | string | ✅ | |
| `contractor` | string | – | defaults to `''` |
| `checklist` | array | – | `[{ item, result, remarks }]`; defaults to `[]` |
| `defects` | array | – | `[{ description, severity, photoUrl, status }]`; defaults to `[]` |
| `overallStatus` | string (enum) | – | defaults to `'Draft'` |
| `notes` | string | – | defaults to `''` |

`compliance` is never taken from the client — it's always derived server-side as
`"Defect Found"` if `defects.length > 0`, else `"Pass"`.

**Example:**
```json
{
  "liftId": "66c1e0...",
  "scheduleId": "66c1d0...",
  "inspectionDate": "2026-08-06",
  "inspectorName": "Jessica S.",
  "contractor": "Koh Lift Services",
  "checklist": [ { "item": "Door operation", "result": "Fail", "remarks": "Sticky on close" } ],
  "defects": [ { "description": "Door safety edge misaligned", "severity": "Major" } ]
}
```

**201 Created** — the created report object.

**400 Bad Request:**
- Missing required field: `{ "success": false, "message": "Missing required field(s): liftId, inspectorName" }`
- `liftId` doesn't resolve to a real lift: `{ "success": false, "message": "Selected lift not found" }`
- `inspectionDate` is in the future: `{ "success": false, "message": "Inspection date cannot be in the future" }`

---

## PUT /api/inspections/:id

Partial update — accepts any subset of the report's fields. **Only allowed while the report is
still `Draft`** (client feedback: "shouldn't be able to edit after submitting").

**Example:**
```json
{ "overallStatus": "Submitted" }
```

**200 OK** — the updated report object. If `liftId` is changed, `liftCode`/`block` are
re-snapshotted from the new lift. If `defects` is changed, `compliance` is re-derived.

**400 Bad Request:**
- Report is no longer `Draft`: `{ "success": false, "message": "Only draft reports can be edited. This report has already been submitted." }`
- `inspectionDate` is in the future (same rule as create).

**404 Not Found** — `{ "success": false, "message": "Inspection report not found" }`

---

## PATCH /api/inspections/:id/notify-contractor

Marks the contractor as notified of the report's defects. Requires at least one logged defect.

**200 OK**
```json
{ "success": true, "message": "Contractor notified for INSP-0001", "data": { "...": "updated report" } }
```
Side effects: sets `contractorNotifiedAt` to now, flips every `Open` defect to `Acknowledged`,
and sets `overallStatus` to `Under Review`.

**400 Bad Request** — no defects logged: `{ "success": false, "message": "No defects logged on this report to notify the contractor about" }`

**404 Not Found** — `{ "success": false, "message": "Inspection report not found" }`

---

## DELETE /api/inspections/:id

Hard delete — **only allowed while the report is still `Draft`**. Submitted reports are kept
permanently for audit purposes (no soft-delete flag needed here since Drafts were never official
records to begin with).

**200 OK**
```json
{ "success": true, "message": "INSP-0001 deleted", "data": null }
```

**400 Bad Request** — report is no longer Draft: `{ "success": false, "message": "Only draft reports can be deleted. Submitted reports are kept for audit purposes." }`

**404 Not Found** — `{ "success": false, "message": "Inspection report not found" }`
