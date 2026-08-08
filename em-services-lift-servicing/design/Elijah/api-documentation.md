# API Documentation — Defect Management

Feature owner: Elijah
Base path: `/api/defects` (mounted in `backend/src/server.js`)
Auth: none yet — write routes have a standing TODO to add `requireAuth`/`requireRole('Admin', 'Manager')` once a login system exists and issues JWTs with a `role` claim (same TODO as `liftRoutes.js`). All endpoints are currently open regardless of the frontend's client-side `canEdit` gate.

All request/response bodies are JSON. Successful responses use the shared envelope `{ success: true, message, data }` (`backend/src/utils/apiResponse.js`); error responses use `{ success: false, message }` (global error handler in `server.js`). All `data` shapes below are the defect object documented in [[defect-database-schema]].

---

## GET /api/defects

List defects, sorted by `reportedDate` descending (most recent first).

**Query parameters (optional):**

| Param | Type | Description |
| --- | --- | --- |
| `status` | string or comma-separated list | One or more of `Open`, `In Progress`, `Resolved`, `Closed`. Exact match. |
| `severity` | string or comma-separated list | One or more of `Minor`, `Major`, `Critical`. Exact match. |
| `q` | string | Case-insensitive substring search across `defectNo`, `title`, `location`, and `liftCode`. |

**Example:**
```
GET /api/defects?status=Open,In Progress&severity=Critical&q=lobby
```

**200 OK**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "_id": "66b1f2...",
      "defectNo": "DEF-0007",
      "title": "Door not closing fully",
      "description": "Door bounces back roughly 5cm before fully closing.",
      "liftId": "66a0c1...",
      "liftCode": "L-102",
      "location": "Blk 12 lift lobby",
      "severity": "Major",
      "status": "Open",
      "reportedBy": "Building Manager",
      "reportedDate": "2026-08-06T03:00:00.000Z",
      "resolvedDate": null,
      "createdAt": "2026-08-06T03:00:00.000Z",
      "updatedAt": "2026-08-06T03:00:00.000Z"
    }
  ]
}
```

> Note: the current frontend (`Defects.jsx`) fetches the full unfiltered list and applies status/severity/search filtering client-side over that result — the query params above are supported by the backend but not yet wired up from the UI.

---

## GET /api/defects/stats

Summary counts for the dashboard stat cards. Must be routed before `GET /:id` so the literal path `stats` isn't mistaken for an id.

**200 OK**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "total": 24,
    "open": 9,
    "inProgress": 6,
    "resolved": 5,
    "closed": 4,
    "criticalOpen": 2
  }
}
```

`criticalOpen` counts defects with `severity: 'Critical'` whose status is not `Closed`. The current UI only renders `total`, `open`, `inProgress`, and `resolved` as stat cards — `closed` and `criticalOpen` are computed and available but not yet displayed.

---

## GET /api/defects/:id

Fetch a single defect by id.

**200 OK** — defect object (same shape as the list endpoint)

**404 Not Found**
```json
{ "success": false, "message": "Defect not found" }
```

---

## POST /api/defects

Log a new defect. Always created with `status: 'Open'` and `resolvedDate: null`, regardless of what's sent in the body.

**Request body:**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `title` | string | ✅ | |
| `location` | string | ✅ | |
| `severity` | string | ✅ | One of `Minor`, `Major`, `Critical`. |
| `description` | string | – | defaults to `''` |
| `liftId` | ObjectId string | – | must resolve to an existing `Lift` if provided; `liftCode` is snapshotted from it |
| `reportedBy` | string | – | defaults to `'Unknown'` |

**Example:**
```json
{
  "title": "Door not closing fully",
  "location": "Blk 12 lift lobby",
  "severity": "Major",
  "liftId": "66a0c1...",
  "reportedBy": "Building Manager",
  "description": "Door bounces back roughly 5cm before fully closing."
}
```

**201 Created** — the created defect object, with a system-assigned `defectNo` (e.g. `DEF-0007`).

**400 Bad Request:**
- Missing required field(s): `{ "success": false, "message": "Missing required field(s): title, location" }`
- `liftId` supplied but doesn't resolve to a real lift: `{ "success": false, "message": "Selected lift not found" }`

---

## PUT /api/defects/:id

Partial update — accepts any subset of fields, including a `status` change. Unlike inspection reports (which lock after `Submitted`), any field can be corrected regardless of the defect's current status; only `status` itself is constrained to a fixed transition map.

**Allowed status transitions:**

| From | Allowed next |
| --- | --- |
| `Open` | `In Progress`, `Closed` |
| `In Progress` | `Resolved`, `Open` |
| `Resolved` | `Closed`, `In Progress` |
| `Closed` | `Open` |

The first time a defect's status reaches `Resolved`, `resolvedDate` is stamped with the current time; it is not cleared if the defect is later reopened.

**Example — advance status:**
```json
{ "status": "In Progress" }
```

**Example — correct details:**
```json
{ "title": "Door not closing fully (both leaves)", "severity": "Critical" }
```

**200 OK** — the updated defect object.

**400 Bad Request:**
- Invalid status transition: `{ "success": false, "message": "Cannot change status from \"Open\" to \"Resolved\". Allowed next step(s): In Progress, Closed" }`
- `title` or `location` sent as an empty/blank string: `{ "success": false, "message": "Title cannot be empty" }` / `{ "success": false, "message": "Location cannot be empty" }`
- `liftId` supplied but doesn't resolve to a real lift: `{ "success": false, "message": "Selected lift not found" }`

**404 Not Found** — id doesn't exist: `{ "success": false, "message": "Defect not found" }`

---

## DELETE /api/defects/:id

**Hard** delete — the document is permanently removed with `findByIdAndDelete`. This is a deviation from the soft-delete convention used elsewhere in the app (e.g. Scheduling); there is currently no way to recover or audit a deleted defect.

**200 OK**
```json
{ "success": true, "message": "Defect deleted", "data": null }
```

**404 Not Found** — id doesn't exist: `{ "success": false, "message": "Defect not found" }`

---

## Error format

All error responses share the shape `{ "success": false, "message": "<message>" }`, produced by the shared `ApiError` class plus the global error handler in `server.js`. The frontend's `defectApi.js` reads `err.response?.data?.message` to surface these directly in the UI (via `notistack` snackbars).
