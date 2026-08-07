# Database Schema — Inspections

Feature owner: Javier
Collection: `inspections` (Mongoose model `Inspection`, `backend/src/models/inspections/Inspection.js`)

## Fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Mongo-generated primary key. |
| `reportNo` | String (unique, trimmed) | ✅ | — | Format `INSP-0001` etc. Assigned by the controller from the current max in the collection (not an ever-incrementing counter) — deleting the highest-numbered report and creating a new one reissues that number instead of skipping ahead. See [[inspection-report-numbering]]. |
| `liftId` | ObjectId (ref `Lift`) | ✅ | — | The lift this report is about. Source of truth for which lift; see `liftCode`/`block` below for why they're duplicated. |
| `scheduleId` | ObjectId (ref `Schedule`) | – | `null` | Optional link to the scheduled visit this report follows up on (client workflow: Lift → Schedule → Inspection). Left `null` for ad-hoc/walk-in inspections with no prior schedule entry. |
| `liftCode` | String (trimmed) | ✅ | — | **Snapshot**, not live-joined — copied from the referenced Lift at creation time (and re-copied if `liftId` changes while still Draft). An inspection report is a historical record; it shouldn't silently change if the lift's code/block gets edited months later. |
| `block` | String (trimmed) | ✅ | — | Same snapshot rule as `liftCode`. |
| `inspectionDate` | Date | ✅ | — | Cannot be in the future — the inspection must have already happened for a report to exist about it. Enforced both client-side (date input `max`) and server-side. |
| `inspectorName` | String (trimmed) | ✅ | — | LMS staff who performed the inspection. |
| `contractor` | String (trimmed) | – | `''` | The lift company/contractor responsible for the lift, notified if a defect is raised. |
| `compliance` | String (enum: `Pass`, `Defect Found`) | – | `'Pass'` | **Derived, not client-settable** — always recomputed server-side from whether `defects` is non-empty. There is no independent "Pass with defects" state. |
| `checklist` | Array of `{ item, result, remarks }` | – | `[]` | `result` is one of `Pass`, `Fail`, `N/A` (enum). `item` is currently seeded from a placeholder list (`inspectionConstants.js`) pending the client's real checklist document. |
| `defects` | Array of `{ _id, description, severity, photoUrl, status, raisedDate }` | – | `[]` | `severity`: `Minor`/`Major`/`Critical`. `status`: `Open`/`Acknowledged`/`Verified`. `photoUrl` is a compressed base64 data URL (client-side compression via `compressImage.js`) — not yet migrated to the repo's S3 presigned-upload flow (`routes/uploads.js`), which is currently disabled pending AWS credentials. Embedded on the Inspection document rather than a separate collection — see the note under Relationships below. |
| `overallStatus` | String (enum: `Draft`, `Submitted`, `Under Review`, `Closed`) | – | `'Draft'` | See [[inspection-status-enum]]. |
| `contractorNotifiedAt` | Date | – | `null` | Set by the notify-contractor action; `null` until then. |
| `notes` | String (trimmed) | – | `''` | Free-text remarks. |
| `createdAt` / `updatedAt` | Date | auto | — | From Mongoose `{ timestamps: true }`. |

## Relationships

```
Lift ──(1:many, liftId)──▶ Inspection
Schedule ──(optional 1:many, scheduleId)──▶ Inspection
Inspection ──(embedded, not a separate collection)──▶ Defect[]
```

Inspection sits at the middle of the client's workflow chain: **Lift → Schedule → Inspection →
Defect notification → Rectification.** `liftId` makes the Lift link real (an inspection must be
against an actual Lift record, picked via the shared `LiftSelect` component — not free text).
`scheduleId` makes the Schedule link *optional* by design, since a real inspector should still be
able to log a walk-in/ad-hoc check with no prior scheduled visit.

**Open design question, not yet resolved:** defects currently live only as `Inspection.defects[]`
— an embedded array, not their own collection. This was the simplest option while
Defects/Rectifications are still unbuilt (both are just README stubs as of this writing). If
those modules end up needing to independently query/update a defect's lifecycle after it leaves
Inspection (e.g. Rectification marking a specific defect as fixed), an embedded array becomes
awkward — three features can't all be the source of truth for the same document. Worth deciding
as a team before Defects/Rectifications' owners start building against one shape or the other;
the alternative is a standalone `Defect` model with an `inspectionId` back-reference, which
Inspection, Defects, and Rectification could all reference independently.

## Data integrity rules enforced

1. **Required fields** — `liftId`, `inspectionDate`, `inspectorName` (Mongoose `required: true`,
   re-checked in the controller for a friendlier 400 message).
2. **`liftId` must resolve to a real lift** — checked via `Lift.findById` before creation;
   rejected with a 400 rather than allowed to reference a non-existent/deleted lift.
3. **No future inspection dates** — enforced on both create and update.
4. **Report numbers never collide** — `unique: true` on `reportNo`, computed from the current max
   in the collection rather than trusted from the client.
5. **Edit/delete lock once submitted** — both enforced in the controller (not just hidden in the
   UI), so the rule can't be bypassed by calling the API directly. Editing/deleting is only
   permitted while `overallStatus === 'Draft'`.
6. **Compliance is never client-controlled** — always derived from `defects.length`, preventing a
   report from claiming "Pass" while defects are attached, or vice versa.
