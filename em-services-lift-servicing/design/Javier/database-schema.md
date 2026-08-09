# Database Schema — Inspections

Feature owner: Javier
Collection: `inspections` (Mongoose model `Inspection`, `backend/src/models/inspections/Inspection.js`)

> Updated after auth/RBAC, soft-delete, and the standalone Defects module landed on top of
> this feature - see the "Changes since initial build" section at the bottom for what's new
> and why.

## Fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Mongo-generated primary key. |
| `reportNo` | String (trimmed) | ✅ | — | Format `INSP-0001` etc. Assigned by the controller from the current max among **non-deleted** reports, not an ever-incrementing counter — deleting the highest-numbered report and creating a new one reissues that number instead of skipping ahead. Uniqueness is enforced by a partial index (`{ isDeleted: false }`), not a field-level `unique: true` — a plain unique field would make every reissue fail with a duplicate-key error against the soft-deleted report still holding that number. |
| `liftId` | ObjectId (ref `Lift`) | ✅ | — | The lift this report is about. Source of truth for which lift; see `liftCode`/`block` below for why they're duplicated. |
| `scheduleId` | ObjectId (ref `Schedule`) | – | `null` | Optional link to the scheduled visit this report follows up on (client workflow: Lift → Schedule → Inspection). Left `null` for ad-hoc/walk-in inspections with no prior schedule entry. If supplied, the controller validates it resolves to a real, non-deleted schedule **and** that the schedule's own `liftId` (when set) matches this report's `liftId` — an inspection can't claim to follow up on a schedule for a different lift. |
| `liftCode` | String (trimmed) | ✅ | — | **Snapshot**, not live-joined — copied from the referenced Lift at creation time (and re-copied if `liftId` changes while still Draft). An inspection report is a historical record; it shouldn't silently change if the lift's code/block gets edited months later. |
| `block` | String (trimmed) | ✅ | — | Same snapshot rule as `liftCode`. |
| `inspectionDate` | Date | ✅ | — | Cannot be in the future — the inspection must have already happened for a report to exist about it. Enforced both client-side (date input `max`) and server-side. |
| `inspectorName` | String (trimmed) | ✅ | — | LMS staff who performed the inspection. |
| `contractor` | String (trimmed) | – | `''` | The lift company/contractor responsible for the lift, notified if a defect is raised. |
| `compliance` | String (enum: `Pass`, `Defect Found`) | – | `'Pass'` | **Derived, not client-settable** — always recomputed server-side from whether `defects` is non-empty. There is no independent "Pass with defects" state. |
| `checklist` | Array of `{ item, result, remarks }` | – | `[]` | `result` is one of `Pass`, `Fail`, `N/A` (enum). `item` is currently seeded from a placeholder list (`inspectionConstants.js`) pending the client's real checklist document. |
| `defects` | Array of `{ _id, description, severity, photoUrl, status, raisedDate }` | – | `[]` | `severity`: `Minor`/`Major`/`Critical`. `status`: `Open`/`Acknowledged`/`Verified` (this embedded lifecycle is intentionally lighter-weight than the standalone `Defect` model's own status enum — see Relationships below). `photoUrl` is a real Cloudinary URL via the app's shared signed-upload flow (`useFileUpload` hook) — this used to be a compressed base64 data URL stored directly on the document; migrated once the shared upload infrastructure landed. |
| `overallStatus` | String (enum: `Draft`, `Submitted`, `Under Review`, `Closed`) | – | `'Draft'` | |
| `contractorNotifiedAt` | Date | – | `null` | Set by the notify-contractor action; `null` until then. |
| `notes` | String (trimmed) | – | `''` | Free-text remarks. |
| `isDeleted` | Boolean | – | `false` | Soft delete flag — see "Delete is now soft" below. |
| `createdAt` / `updatedAt` | Date | auto | — | From Mongoose `{ timestamps: true }`. |

## Relationships

```
Lift ──(1:many, liftId)──▶ Inspection
Schedule ──(optional 1:many, scheduleId)──▶ Inspection
Inspection ──(embedded)──▶ defects[] (lightweight, tied to this report's own checklist)
Inspection ──(optional 1:many, inspectionId back-reference)──▶ Defect (standalone collection, Elijah's feature)
```

Inspection sits in the middle of the client's workflow chain: **Lift → Schedule → Inspection →
Defect → Rectification** — now literally reflected in the UI as the four steps of
`frontend/src/features/lift-workflow/`, with `LiftWorkflowPage.jsx` letting a user pick a lift
and step through Scheduling → Inspections → Defects → Rectifications for that one lift.
`liftId` makes the Lift link real (an inspection must be against an actual Lift record, picked
via the shared `LiftSelect` component — not free text). `scheduleId` makes the Schedule link
*optional* by design, since a real inspector should still be able to log a walk-in/ad-hoc check
with no prior scheduled visit.

**Resolved: embedded defects vs. a standalone collection.** This doc used to flag "should
defects be their own collection" as an open question. Elijah's Defects feature resolved it by
building a standalone `Defect` model (`backend/src/models/defects/Defect.js`) with its own
`defectNo`/status lifecycle (`Open` → `In Progress` → `Resolved` → `Closed`) and an *optional*
`inspectionId` back-reference — a standalone defect doesn't have to trace back to an inspection
at all (e.g. a tenant complaint). This Inspection model's own embedded `defects[]` array was
**not** removed or replaced by that — the two now coexist, serving slightly different purposes:
- Embedded `defects[]` here: lightweight findings tied directly to *this specific report's*
  checklist (e.g. "Door operation" was marked Fail, here's what was wrong) — scoped to one
  report, simple Open/Acknowledged/Verified lifecycle, no separate CRUD surface of its own.
- Standalone `Defect`: a first-class record with its own number, its own longer status
  lifecycle, and the thing Rectification actually attaches to.
This is a legitimate but slightly overlapping design — worth a team conversation on whether the
embedded array should eventually just create a linked standalone `Defect` automatically rather
than the inspector duplicating effort across both, but out of scope to change unilaterally since
Defects/Rectifications are owned by other students.

## Delete is now soft, not hard

`isDeleted` was added after the initial build. Deleting an Inspection no longer removes the
document — it flips `isDeleted: true`, and every list/get endpoint filters on
`isDeleted: false`. This also **cascades**: soft-deleting an Inspection soft-deletes any
standalone Defect that referenced it via `inspectionId`, which in turn cascades to any
Rectification against those defects (see `backend/src/utils/cascadeDelete.js`, shared
infrastructure used by Scheduling/Inspections/Defects/Rectifications together). The rule for
*which* reports can be deleted at all is unchanged: only `Draft` reports, same as before.

## Auth & role rules (added after initial build)

Every route requires a valid JWT (`requireAuth` middleware) - there was no auth system when
this schema was first written. On top of that:
- **Create/update**: any authenticated role (Master/Admin/Staff) can create or edit their own
  Draft reports. A **Staff** caller is additionally restricted: if the inspection links to a
  schedule (`scheduleId`), that schedule's `assignedStaffId` must match the caller, or the
  request is rejected with 403 - a Staff member can't log an inspection against a colleague's
  assigned visit. This restriction does not apply to Admin/Master, and does not apply at all if
  no `scheduleId` is supplied.
- **Delete / notify-contractor**: Admin or Master only - these are treated as formal,
  destructive, or client-facing actions a Staff member shouldn't be able to trigger alone.

## Data integrity rules enforced

1. **Required fields** — `liftId`, `inspectionDate`, `inspectorName` (Mongoose `required: true`,
   re-checked in the controller for a friendlier 400 message).
2. **`liftId` must resolve to a real, non-deleted lift** — checked via
   `Lift.findOne({ _id: liftId, isDeleted: false })` before creation; rejected with a 400
   rather than allowed to reference a non-existent or soft-deleted lift.
3. **`scheduleId`, if supplied, must resolve to a real, non-deleted schedule for the same lift**
   (see Relationships above).
4. **No future inspection dates** — enforced on both create and update.
5. **Report numbers never collide among active reports** — enforced by a partial unique
   index on `reportNo` (`{ isDeleted: false }`), computed from the current max among
   non-deleted reports rather than trusted from the client.
6. **Edit/delete lock once submitted** — enforced in the controller (not just hidden in the UI),
   so the rule can't be bypassed by calling the API directly. Editing/deleting is only permitted
   while `overallStatus === 'Draft'`.
7. **Compliance is never client-controlled** — always derived from `defects.length`, preventing
   a report from claiming "Pass" while defects are attached, or vice versa.
8. **Role-gated writes** — see "Auth & role rules" above.

## Changes since initial build (for anyone diffing against an older copy of this doc)

- Added `isDeleted` (soft delete + cascade, replacing the original hard delete).
- Added schedule/lift consistency validation and Staff-ownership check on `scheduleId`.
- Every route now requires `requireAuth`; `notify-contractor` and `delete` additionally require
  `requireRole('Admin', 'Master')`.
- `defects[].photoUrl` migrated from base64 data URLs to real Cloudinary URLs via the shared
  `useFileUpload` hook.
- The "should defects be a separate collection" open question is resolved (see Relationships).
