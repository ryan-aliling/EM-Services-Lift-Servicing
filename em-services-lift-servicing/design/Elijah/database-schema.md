# Database Schema — Defect Management

Feature owner: Elijah
Collection: `defects` (Mongoose model `Defect`, `backend/src/models/defects/Defect.js`)

## Fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Mongo-generated primary key. |
| `defectNo` | String (trimmed, unique) | ✅ | — | System-assigned, e.g. `"DEF-0007"`. Derived from the current max in the collection rather than an ever-incrementing counter, so deleting the highest-numbered defect and creating a new one reissues that number instead of skipping ahead (same approach as `reportNo` on inspections). |
| `title` | String (trimmed) | ✅ | — | Short summary, e.g. "Door not closing fully". |
| `description` | String (trimmed) | – | `''` | Free-text detail. |
| `liftId` | ObjectId (ref `Lift`) | – | `null` | Optional link to a real lift asset — a defect can be logged against a general location before the specific lift is confirmed. |
| `liftCode` | String (trimmed) | – | `''` | Snapshot of the linked lift's code, taken at the moment `liftId` is set. Not a live join — a defect is a historical record and shouldn't silently change if the lift's block is reassigned later. |
| `location` | String (trimmed) | ✅ | — | Free-text location, e.g. "Blk 12 lift lobby". Stands independently of `liftId`/`liftCode`. |
| `severity` | String (enum) | ✅ | — | One of `Minor`, `Major`, `Critical` — matches the severity terminology already used for defects embedded on inspection reports, for consistency across the app. |
| `status` | String (enum) | – | `'Open'` | One of `Open`, `In Progress`, `Resolved`, `Closed`. This is a fuller, independent lifecycle from the `Open`/`Acknowledged`/`Verified` status used for defects embedded directly on an `Inspection` document — the two are not the same state machine. |
| `reportedBy` | String (trimmed) | – | `'Unknown'` | Name/role of whoever reported the defect. |
| `reportedDate` | Date | – | `Date.now` at creation | When the defect was logged. Drives the list's default sort order. |
| `resolvedDate` | Date | – | `null` | Set once, the first time `status` reaches `Resolved`. Preserved even if the defect is later reopened, so "time to first resolve" stays answerable. |
| `createdAt` / `updatedAt` | Date | auto | — | From Mongoose `{ timestamps: true }`. |

## Indexes

| Index | Purpose |
| --- | --- |
| `{ defectNo: 1 }` (unique) | Implicit from `unique: true` on the field — prevents two defects from ever sharing a defect number, and supports exact-match lookups by number. |

No additional explicit indexes are defined yet. Unlike Scheduling (which indexes `scheduledDate` and `status` to support its list sort and filters), Defect Management's `status`/`severity`/`q` filters and `reportedDate` sort currently run against the collection's default index only — worth adding `{ reportedDate: -1 }`, `{ status: 1 }`, and `{ severity: 1 }` if the collection grows large enough for this to matter.

## Relationships

```
Defect ──(optional, liftId)──▶ Lift             [Lifts feature — snapshot via liftCode,
                                                   not a live join]

Defect ── conceptually related to, but NOT the same records as ──▶
Inspection.defects[]                             [Inspections feature — a lightweight defect
                                                   sub-document embedded per inspection report,
                                                   with its own simpler Open/Acknowledged/Verified
                                                   lifecycle. A standalone Defect here can originate
                                                   from an inspection finding, a tenant complaint, or
                                                   a routine walk-through — it has no required link
                                                   back to any specific Inspection document.]

Defect ── expected upstream of ──▶ Rectification  [Rectifications feature — future/other student's
                                                     work; owns the actual repair record. Defect
                                                     Management only tracks that a defect exists and
                                                     its current status, not how it gets fixed.]
```

## Data integrity rules enforced

1. **Required fields** — `title`, `location`, and `severity` cannot be omitted (Mongoose `required: true`, re-checked in the controller for a friendlier 400 message).
2. **Closed severity/status enums** — `severity` and `status` can only ever be one of their fixed known values (`Defect.DEFECT_SEVERITIES`, `Defect.DEFECT_STATUSES`); any other string is rejected by Mongoose validation.
3. **Status transition map** — beyond the enum, `status` changes are further constrained by an explicit `VALID_TRANSITIONS` map checked at the controller layer (e.g. `Open` cannot jump straight to `Resolved`); this is stricter than what the enum alone would allow, and mirrors the same "no illegal jumps" principle used for inspection report `overallStatus`.
4. **Unique, reissuable defect numbers** — `defectNo` is unique at the schema level, and reissued from the current max on each creation rather than monotonically incremented, so the numbering stays gap-free even after deletions.
5. **Point-in-time lift snapshot, not a live join** — `liftCode` is captured once, when `liftId` is set, and does not update if the underlying lift record changes later.
6. **No orphaned lift references** — if `liftId` is supplied (on create or update), it must resolve to an existing `Lift` document or the request is rejected with 400.
7. **Hard delete, no audit trail** — `DELETE /api/defects/:id` permanently removes the document (`findByIdAndDelete`). This is a deliberate deviation from the soft-delete (`isDeleted`) convention used by Scheduling, and means deleted defects are not recoverable or auditable today — a known gap rather than an oversight, flagged here for whoever picks up data-integrity hardening next.
