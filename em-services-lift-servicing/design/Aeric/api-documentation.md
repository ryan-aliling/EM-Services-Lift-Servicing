# API Documentation — Scheduling

Feature owner: Aeric
Base path: `/api/scheduling` (mounted in `backend/src/server.js`)
Auth: none yet — the assignment guide treats user accounts as shared, non-core infrastructure. All endpoints are currently open; see [[schedule-status-enum]] for the one piece of server-side business validation in place.

All request/response bodies are JSON. All responses use the schedule shape documented in [[scheduling-database-schema]].

---

## GET /api/scheduling

List schedules (excludes soft-deleted records), sorted by `scheduledDate` ascending.

**Query parameters (optional):**

| Param | Type | Description |
| --- | --- | --- |
| `status` | string | One of `Scheduled`, `Assigned`, `In Progress`, `Completed`, `Cancelled`. Exact match. |
| `date` | string (`YYYY-MM-DD`) | Returns schedules whose `scheduledDate` falls within that calendar day. |

**Example:**
```
GET /api/scheduling?status=Scheduled&date=2026-08-10
```

**200 OK**
```json
[
  {
    "_id": "66b1f2...",
    "townCouncil": "Tampines Town Council",
    "liftCompany": "ABC Lifts Pte Ltd",
    "blockAddress": "Blk 201 Tampines St 21",
    "liftId": null,
    "scheduledDate": "2026-08-10T00:00:00.000Z",
    "assignedInspector": "John Tan",
    "status": "Scheduled",
    "notes": "",
    "isDeleted": false,
    "createdAt": "2026-08-06T03:00:00.000Z",
    "updatedAt": "2026-08-06T03:00:00.000Z"
  }
]
```

**500** — unexpected server/DB error: `{ "error": "Failed to fetch schedules" }`

---

## GET /api/scheduling/:id

Fetch a single schedule by id.

**200 OK** — schedule object (same shape as above)

**404 Not Found** — id doesn't exist or is soft-deleted: `{ "error": "Schedule not found" }`

**400 Bad Request** — id is not a valid ObjectId: `{ "error": "Invalid schedule id" }`

---

## POST /api/scheduling

Create a new schedule. Default `status` is `Scheduled`.

**Request body:**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `townCouncil` | string | ✅ | |
| `liftCompany` | string | ✅ | |
| `blockAddress` | string | ✅ | |
| `scheduledDate` | ISO date string | ✅ | |
| `assignedInspector` | string | – | defaults to `''` |
| `notes` | string | – | defaults to `''` |

**Example:**
```json
{
  "townCouncil": "Tampines Town Council",
  "liftCompany": "ABC Lifts Pte Ltd",
  "blockAddress": "Blk 201 Tampines St 21",
  "scheduledDate": "2026-08-10",
  "assignedInspector": "John Tan",
  "notes": "Monthly spot-check"
}
```

**201 Created** — the created schedule object.

**400 Bad Request** — a required field is missing: `{ "error": "townCouncil, liftCompany, blockAddress and scheduledDate are required" }`

---

## PUT /api/scheduling/:id

Partial update — accepts any subset of the schedule fields, including `status` transitions (`Scheduled → Assigned → In Progress → Completed`, or `Cancelled` from any state). One endpoint handles both field edits and status changes so the frontend can send a small diff rather than the whole record.

**Example — advance status:**
```json
{ "status": "Assigned", "assignedInspector": "John Tan" }
```

**200 OK** — the updated schedule object.

**400 Bad Request:**
- `status` is not one of `Schedule.STATUS_VALUES`: `{ "error": "status must be one of Scheduled, Assigned, In Progress, Completed, Cancelled" }`
- Mongoose validation failure (e.g. clearing a required field): `{ "error": "Failed to update schedule" }`

**404 Not Found** — id doesn't exist or is soft-deleted: `{ "error": "Schedule not found" }`

---

## DELETE /api/scheduling/:id

Soft delete — sets `isDeleted: true`. The record is excluded from all subsequent GET requests but is never physically removed (audit trail / data integrity per client feedback).

**200 OK**
```json
{ "message": "Schedule deleted", "id": "66b1f2..." }
```

**404 Not Found** — id doesn't exist or was already deleted: `{ "error": "Schedule not found" }`

---

## Error format

All error responses share the shape `{ "error": "<message>" }` so the frontend's shared `handle()` helper (`frontend/src/features/scheduling/api.js`) can surface `err.message` directly in the UI.
