# Database Schema — Scheduling

Feature owner: Aeric
Collection: `schedules` (Mongoose model `Schedule`, `backend/src/models/scheduling/Schedule.js`)

## Fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Mongo-generated primary key. |
| `townCouncil` | String (trimmed) | ✅ | — | e.g. "Tampines Town Council". Free text for now — could become a lookup once a Town Council directory exists. |
| `liftCompany` | String (trimmed) | ✅ | — | The servicing contractor being spot-checked, per the paper form's "Lift Company" field. |
| `blockAddress` | String (trimmed) | ✅ | — | Block/Lift address, e.g. "Blk 201 Tampines St 21". Matches the paper form's "Block/Lift Address" field. |
| `liftId` | ObjectId (ref `Lift`) | – | `null` | Link to the Lifts feature's model (now built, owned by Lucio). Stayed optional even after Lifts landed — a schedule can exist before the exact lift is pinned down, same "every link down the chain except the first is optional by design" rule the rest of the workflow chain follows (see `design/er-diagram.md`). |
| `scheduledDate` | Date | ✅ | — | The planned spot-check date. |
| `assignedInspector` | String (trimmed) | – | `''` | Name of the LMS staff/inspector assigned to perform the spot-check. |
| `status` | String (enum) | – | `'Scheduled'` | One of `Scheduled`, `Assigned`, `In Progress`, `Completed`, `Cancelled` — see [[schedule-status-enum]]. |
| `notes` | String (trimmed) | – | `''` | Free-text remarks (e.g. access instructions). |
| `isDeleted` | Boolean | – | `false` | Soft-delete flag. All controller queries filter on `isDeleted: false`; `DELETE` sets this instead of removing the document. |
| `createdAt` / `updatedAt` | Date | auto | — | From Mongoose `{ timestamps: true }`. |

## Indexes

| Index | Purpose |
| --- | --- |
| `{ scheduledDate: 1 }` | Supports the default "soonest first" list sort and the `?date=` filter. |
| `{ status: 1 }` | Supports the `?status=` filter used by status-based views (e.g. "what's still Scheduled this week"). |

## Relationships

```
Schedule ──(optional, liftId)──▶ Lift            [Lifts feature (Lucio) — built; a real FK,
                                                    still optional by design]
Schedule ──(optional, scheduleId)──▶ Inspection   [Inspections feature (Javier) — built; a real
                                                    ObjectId FK on Inspection.scheduleId, not the
                                                    lift+date matching originally planned before
                                                    Inspections existed. Optional because an
                                                    inspection can also be a walk-in with no prior
                                                    Schedule behind it.]
```

Scheduling is intentionally the *first* link in the chain (client workflow step 1: "LMS staff plan the schedule"). It does not own inspection results, defects, or rectifications — those belong to the Inspections/Defects/Rectifications features respectively, per the client's "we are lift **inspection**, not servicing" scope correction.

## Data integrity rules enforced

1. **Required fields** — `townCouncil`, `liftCompany`, `blockAddress`, `scheduledDate` cannot be omitted (Mongoose `required: true`, re-checked in the controller for a friendlier 400 message).
2. **Closed status enum** — `status` can only ever be one of five known values; any other string is rejected at the controller layer before it reaches Mongoose.
3. **No hard deletes** — `isDeleted` soft-delete keeps every schedule ever created queryable for audit purposes, even after "deletion".
4. **No orphaned records** — every schedule stands alone with the town council/lift company/block address captured directly on it (mirroring the paper form), so a schedule is always meaningful even before `liftId` is populated.
