# API Documentation — Lift Records

Feature owner: Lucio
Base path: `/api/lifts` (mounted in `backend/src/server.js`)

All request/response bodies are JSON. All success responses use the shape
`{ "success": true, "message": "...", "data": ... }` from `backend/src/utils/apiResponse.js`.
All error responses use `{ "success": false, "message": "..." }`, thrown as an `ApiError`
(`backend/src/utils/ApiError.js`) and caught by the app-wide error-handler middleware.

See [[lift-database-schema]] for the full field list.

---

## Auth

Every endpoint requires `Authorization: Bearer <token>`. On top of that, write actions are
restricted to Admin/Master:

| Endpoint | Auth |
| --- | --- |
| `GET /`, `GET /stats`, `GET /:id` | Any authenticated role (Master/Admin/Staff) |
| `POST /`, `PUT /:id`, `DELETE /:id`, `POST /import` | Admin or Master only |

Unlike Scheduling/Inspections, there's no ownership-scoping rule here at all — Lift Records
aren't tied to any one Staff member, so every authenticated role sees the full list; Staff is
simply denied write access outright rather than scoped to a subset.

---

## GET /api/lifts

List lifts, sorted by `createdAt` descending.

**Query parameters (optional):**

| Param | Type | Description |
| --- | --- | --- |
| `status` | string | One of `Active`, `Maintenance`, `Out of Service`, `Decommissioned`. Exact match. |
| `type` | string | One of `Passenger`, `Freight`, `Mixed`. Exact match. |
| `q` | string | Case-insensitive substring match against `liftCode`, `block`, `unit`, or `manufacturer` (regex-escaped so punctuation in the search term can't break the query). |

**Example:**
```
GET /api/lifts?status=Active&q=blk%2012
```

**200 OK**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "_id": "66d1a2...",
      "liftCode": "LIFT-001",
      "block": "A",
      "unit": "01-01",
      "type": "Passenger",
      "capacity": 800,
      "status": "Active",
      "manufacturer": "Otis",
      "installDate": "2020-01-15T00:00:00.000Z",
      "lastServiced": "2026-05-01T00:00:00.000Z",
      "createdAt": "2026-05-02T03:00:00.000Z",
      "updatedAt": "2026-05-02T03:00:00.000Z"
    }
  ]
}
```

---

## GET /api/lifts/stats

Aggregate counts by status, backing the stat cards at the top of the Lifts screen.

**200 OK**
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "total": 42,
    "active": 35,
    "maintenance": 4,
    "outOfService": 2,
    "decommissioned": 1
  }
}
```

---

## GET /api/lifts/:id

Fetch a single lift by id.

**200 OK** — lift object (same shape as the list above).

**404 Not Found** — id doesn't exist: `{ "success": false, "message": "Lift not found" }`.

**Note:** unlike Scheduling's `GET /:id`, this route has no explicit ObjectId format check
before the query runs — a malformed (non-24-hex-char) id currently surfaces as an uncaught
Mongoose `CastError`, which the app-wide error handler returns as a generic `500` rather than a
`400`. The same applies to `PUT /:id` and `DELETE /:id` below.

---

## POST /api/lifts

Create a new lift. Default `status` is `Active`.

**Request body:**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `liftCode` | string | ✅ | Must be unique among non-deleted lifts (partial unique index — a soft-deleted lift's old code is reusable). |
| `block` | string | ✅ | |
| `unit` | string | ✅ | |
| `type` | string (enum) | ✅ | `Passenger`, `Freight`, or `Mixed`. |
| `capacity` | number | ✅ | Kilograms; must be ≥ 1. |
| `status` | string (enum) | – | defaults to `'Active'` |
| `manufacturer` | string | – | defaults to `''` |
| `installDate` | ISO date string | – | defaults to `null` |
| `lastServiced` | ISO date string | – | defaults to `null` |

**Example:**
```json
{
  "liftCode": "LIFT-001",
  "block": "A",
  "unit": "01-01",
  "type": "Passenger",
  "capacity": 800,
  "manufacturer": "Otis",
  "installDate": "2020-01-15"
}
```

**201 Created** — the created lift object.

**400 Bad Request:**
- Missing required field(s): `{ "success": false, "message": "Missing required field(s): liftCode, block" }`
- Duplicate `liftCode`: `{ "success": false, "message": "Lift code \"LIFT-001\" already exists" }`

**403 Forbidden** — caller is Staff.

---

## PUT /api/lifts/:id

Partial update — accepts any subset of the lift fields.

**Example:**
```json
{ "status": "Maintenance", "lastServiced": "2026-08-01" }
```

**200 OK** — the updated lift object.

**400 Bad Request** — duplicate `liftCode` (same message as create).

**403 Forbidden** — caller is Staff.
**404 Not Found** — `{ "success": false, "message": "Lift not found" }`.

---

## DELETE /api/lifts/:id

Soft delete — sets `isDeleted: true`, same pattern as every other feature in this app. The
record is excluded from all subsequent GET requests but is never physically removed, and its
`liftCode` becomes reissuable to a new lift (partial unique index — see
[[lift-database-schema]]). Note this router isn't wired into the shared
`cascadeDelete.js` utility: any Schedule/Inspection/Defect record whose `liftId` still points at
this lift is left exactly as-is (not hidden or cleaned up) — see [[lift-database-schema]].

**200 OK**
```json
{ "success": true, "message": "Lift deleted", "data": null }
```

**403 Forbidden** — caller is Staff.
**404 Not Found** — id doesn't exist (or was already deleted): `{ "success": false, "message": "Lift not found" }`.

---

## POST /api/lifts/import

Bulk-creates lifts from CSV rows already parsed into plain objects on the frontend
(`frontend/src/utils/csvImport.js`'s `rowsToLiftPayloads`). Rows are created one at a time —
rather than `Lift.insertMany` — so a bad row (missing field, duplicate `liftCode`) doesn't abort
the whole batch, and the response can report exactly which row failed and why.

**Request body:** `{ "rows": [{ liftCode, block, unit, type, capacity, ... }, ...] }`

**200 OK**
```json
{
  "success": true,
  "message": "Imported 2 of 3 lift(s)",
  "data": {
    "created": 2,
    "failed": [
      { "row": 4, "liftCode": "LIFT-002", "message": "Lift code \"LIFT-002\" already exists" }
    ]
  }
}
```
`row` is the 1-based line number in the original CSV file (accounting for the header row), not
a 0-based array index, so it matches what a user sees if they open the file themselves.

**400 Bad Request** — `rows` is missing, not an array, or empty: `{ "success": false, "message": "No rows to import" }`.

**403 Forbidden** — caller is Staff.

---

## Error format

All error responses share the shape `{ "success": false, "message": "<message>" }`, matching
every other feature's routes in this app (see `backend/src/server.js`'s bottom-of-file error
middleware). Any request without a valid `Authorization: Bearer <token>` is rejected before it
reaches this router at all (401, `middleware/auth.js`).
