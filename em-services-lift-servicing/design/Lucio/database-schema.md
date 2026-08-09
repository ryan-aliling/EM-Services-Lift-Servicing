# Database Schema — Lift Records

Feature owner: Lucio
Collection: `lifts` (Mongoose model `Lift`, `backend/src/models/lifts/Lift.js`)

See [[lift-api-documentation]] for how these fields are exposed over HTTP.

## Fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Mongo-generated primary key. |
| `liftCode` | String (trimmed) | ✅ | — | `unique: true`. The human-facing identifier used everywhere else in the app (Schedule/Inspection/Defect snapshot this as `liftCode`; see Relationships below). |
| `block` | String (trimmed) | ✅ | — | e.g. `"A"`. |
| `unit` | String (trimmed) | ✅ | — | e.g. `"01-01"`. |
| `type` | String (enum) | ✅ | — | One of `Passenger`, `Freight`, `Mixed` (`Lift.LIFT_TYPES`). |
| `capacity` | Number | ✅ | — | Kilograms; `min: 1`. |
| `status` | String (enum) | – | `'Active'` | One of `Active`, `Maintenance`, `Out of Service`, `Decommissioned` (`Lift.LIFT_STATUSES`). |
| `manufacturer` | String (trimmed) | – | `''` | |
| `installDate` | Date | – | `null` | |
| `lastServiced` | Date | – | `null` | Drives the frontend's "service overdue" warning icon — `isServiceDue()` (`frontend/src/utils/liftHelpers.js`) flags a lift once 180+ days have passed since this date, or if it's never been set at all. Purely a frontend-computed indicator; nothing server-side tracks or alerts on it. |
| `isDeleted` | Boolean | – | `false` | Soft-delete flag, same pattern as every other model in the app (`Schedule`, `Inspection`, `Defect`, `Rectification`, `User`). All controller queries filter on `isDeleted: false`; `DELETE` sets this instead of removing the document. |
| `createdAt` / `updatedAt` | Date | auto | — | From Mongoose `{ timestamps: true }`. |

## Indexes

| Index | Purpose |
| --- | --- |
| `{ liftCode: 1 }` (unique, **partial**: `isDeleted: false`) | Enforced by `liftSchema.index({ liftCode: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } })` — a *partial* unique index, not a plain `unique: true` on the field. This means only non-deleted lifts have to be collision-free on `liftCode`; a soft-deleted lift keeps its original code (so its snapshot references from Schedule/Inspection/Defect stay meaningful), while that same code becomes reissuable to a brand-new lift — e.g. a decommissioned unit physically replaced in the same shaft. |

`status`/`type` have no dedicated index — the collection is expected to stay small (one document
per physical lift asset, not per event/visit like the other four feature collections), so an
unindexed filter scan is an acceptable tradeoff here.

## Relationships

```
Lift ──(optional, liftId)──▶ Schedule       [Scheduling feature]
Lift ──(liftId)──▶ Inspection                [Inspections feature — every inspection is against a lift]
Lift ──(optional, liftId)──▶ Defect          [Defects feature]
```

Lift is the root of the client's workflow chain: **Lift → Schedule → Inspection → Defect →
Rectification** (see `design/er-diagram.md`). Every downstream feature holds `liftId` as a
forward reference (nullable everywhere except Inspection) rather than Lift holding a list of
its own schedules/inspections/defects — that direction keeps Lift Records independent of
whichever of those four features happens to exist yet, and is why `LiftSelect.jsx` degrades to
manual entry instead of failing outright if the Lifts router isn't reachable.

**Snapshots, not live joins.** Schedule/Inspection/Defect each copy `liftCode` (and Inspection
also copies `block`) onto their own document at creation time, rather than relying on a live
populate of `liftId` every time. This means editing a lift's `block`/`unit`/`liftCode` after the
fact does **not** retroactively change how it reads on historical Schedule/Inspection/Defect
records — those snapshots are point-in-time by design, the same reasoning the other features use
for not silently rewriting history when the lift's own details change later.

`LiftDetailDialog` doesn't rely on any of these `liftId` FKs being populate-joined server-side —
it makes four independent client-side calls (`GET /api/scheduling|inspections|defects|
rectifications?liftId=...`) and merges the results into tabs, so it works even against whichever
subset of those routers happens to be mounted.

## Delete is soft, same pattern as the rest of the app

`deleteLift` uses `Lift.findOneAndUpdate({ _id, isDeleted: false }, { isDeleted: true })` rather
than a hard delete — the document is never physically removed, matching `Schedule`/`Inspection`/
`Defect`/`Rectification`/`User`. Scoping the query to `isDeleted: false` also means deleting an
already-deleted (or non-existent) id correctly 404s instead of silently "succeeding" again.

**Lift isn't wired into `cascadeDelete.js`.** That utility only cascades *downward* starting from
a Schedule (Schedule → Inspection → Defect → Rectification) — soft-deleting a Lift doesn't cascade
to any Schedule/Inspection/Defect that still references it via `liftId`, and none of those
records are hidden just because their Lift was. This is a real asymmetry worth knowing: a
soft-deleted lift disappears from `GET /api/lifts`, but a Schedule pointing at it via `liftId`
still resolves fine (`LiftDetailDialog`'s per-tab fetches aren't affected either way, since they
query each other feature directly by `liftId`, not through the Lift document). Adding Lift as a
cascade root would be a natural next increment on top of the current shared utility, not a
redesign of it.

## Data integrity rules enforced

1. **Required fields** — `liftCode`, `block`, `unit`, `type`, `capacity` (Mongoose `required:
   true`, re-checked in the controller for a friendlier combined 400 message naming every
   missing field at once).
2. **Unique `liftCode` among active lifts** — enforced by the partial unique index; a
   duplicate-key error (Mongo code `11000`) is caught in the controller on both create and
   update and turned into a plain `Lift code "X" already exists` 400 instead of a raw Mongo
   error. Soft-deleted lifts are excluded from the uniqueness check, so their code is reusable.
3. **No hard deletes** — `isDeleted` soft-delete keeps every lift ever created queryable for
   audit purposes (and keeps historical Schedule/Inspection/Defect snapshots meaningful), even
   after "deletion".
4. **Closed enums** — `type` and `status` can only ever be one of their respective known values,
   enforced by Mongoose's `enum` validator at the schema level (not re-validated in the
   controller the way Scheduling re-checks `status` — an invalid enum value here surfaces as an
   uncaught Mongoose `ValidationError`, which the app-wide error handler turns into a generic
   `500` rather than a `400`).
5. **`capacity` sanity bound** — `min: 1`, so a lift can't be saved with zero/negative capacity.
6. **No orphaned records** — every lift stands alone with all of its own descriptive fields
   captured directly on it; nothing about a lift's own record depends on Schedule/Inspection/
   Defect existing.
