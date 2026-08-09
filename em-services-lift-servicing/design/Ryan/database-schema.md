# Database Schema — Rectifications & Users

Feature owner: Ryan
Collections: `rectifications` (`backend/src/models/rectifications/Rectification.js`) and
`users` (`backend/src/models/users/User.js`)

See [[api-documentation]] for how these are exposed over HTTP.

---

# Part 1 — Rectification

## Fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Mongo-generated primary key. |
| `defectId` | ObjectId (ref `Defect`) | ✅ | — | The defect this record closes out. Always required — a rectification only exists in relation to a specific logged defect, unlike Inspection's optional `scheduleId`. |
| `rectifiedBy` | String (trimmed) | ✅ | — | Name of the lift company technician who did the fix. |
| `liftCompanyName` | String (trimmed) | – | `''` | |
| `dateRectified` | Date | ✅ | — | When the fix actually happened. |
| `proofPhotos` | Array of String | – | `[]` | Cloudinary URLs (via the app's shared signed-upload flow, `useFileUpload`). Not Mongoose-`required` even though at least one is conceptually needed before a record can be "Submitted" — enforced instead at the controller level only once someone tries to reach that status, so a `Draft` can be saved with zero photos. |
| `signatureUrl` | String | – | `''` | Same reasoning as `proofPhotos` — required to *submit*, not to save a Draft. |
| `remarks` | String (trimmed) | – | `''` | |
| `status` | String (enum: `Draft`, `Submitted`, `Endorsed`) | – | `'Draft'` | See lifecycle below. |
| `endorsedBy` | String (trimmed) | – | `''` | Filled in only by `PATCH /:id/endorse`. |
| `endorsedDate` | Date | – | `null` | Same. |
| `isDeleted` | Boolean | – | `false` | Soft delete — only settable while `status` is still `Draft`. |
| `createdAt` / `updatedAt` | Date | auto | — | From Mongoose `{ timestamps: true }`. |

## Status lifecycle

```
Draft ──(photo + signature present)──▶ Submitted ──(Admin/Master endorses)──▶ Endorsed
  ▲                                        │
  └────────────(edit, still Draft)─────────┘
```

- `Draft → Submitted`: either at creation (if a photo and signature are already attached) or via
  a later edit — always re-validated server-side (`assertSubmittable`), never trusted from the
  client just because the UI's "Submit" button was clicked.
- `Submitted → Endorsed`: **only** through the dedicated endorse endpoint, never a plain field
  edit — this is a distinct real-world action (the joint on-site sign-off) with its own actor
  (`endorsedBy`) and its own timestamp, not just another status value.
- `Endorsed` is terminal: no further status transition is possible, and `proofPhotos`/
  `signatureUrl` become immutable (the record is finalized for the compliance trail) — though
  `remarks` and the other descriptive fields can still be corrected afterward.
- Deletion is only possible from `Draft` — once a lift company has submitted proof, the record
  can never be removed, only endorsed or left as-is.

## Relationships

```
Defect ──(1:many, defectId)──▶ Rectification
Rectification ──(side effect on endorse)──▶ Defect.status
```

Rectification is the last link in the client's workflow chain: **Lift → Schedule → Inspection →
Defect → Rectification** — reflected in the UI as the four steps of
`frontend/src/features/lift-workflow/`. Unlike every other model in that chain, Rectification
has **no `liftId` field of its own** — it only reaches a lift transitively, through the Defect it
closes out. Scoping a list of rectifications to one lift (`GET /api/rectifications?liftId=...`)
means resolving that lift's Defect ids first, then filtering `defectId` against that set, rather
than a direct field match — see `listRectifications` in the controller.

**Endorsement drives the Defect forward.** Endorsing a rectification means EM staff have
confirmed, after the joint inspection, that the defect is actually fixed — so the same request
also advances the linked Defect's own status (`Open → Closed`, `In Progress → Resolved`), reusing
the exact transition map (`VALID_TRANSITIONS`) that Defect's own controller enforces, rather than
a separate, possibly-inconsistent set of rules. If the defect has already moved to some other
state independently (e.g. already `Closed`), or is missing entirely, that side effect is silently
skipped — the rectification's own endorsement must never be blocked by an unrelated defect-side
edge case.

## Delete is soft, and cascades from above

`isDeleted` follows the same pattern as every other model in this app. Rectification never
triggers a cascade of its own (it's the last step in the chain), but it's a **target** of
cascading deletes from above: soft-deleting a Defect (which itself cascades from an Inspection,
which cascades from a Schedule) also soft-deletes every Rectification pointing at that defect —
see `cascadeFromDefects` in `backend/src/utils/cascadeDelete.js`, shared infrastructure used by
Scheduling/Inspections/Defects/Rectifications together.

## Auth & role rules

Every route requires a valid JWT (`requireAuth`). On top of that:
- **Create / update**: any authenticated role (Master/Admin/Staff). No ownership-scoping rule
  here — unlike Scheduling/Inspections, a Staff member can work on a rectification for any
  defect, not just ones tied to their own assigned schedules.
- **Endorse / delete**: Admin or Master only — endorsement is a formal sign-off and deletion is a
  destructive action on a record that may already represent submitted compliance evidence, so
  both are kept out of Staff's reach entirely.

## Data integrity rules enforced

1. **Required fields** — `defectId`, `rectifiedBy`, `dateRectified` (checked in the controller
   for a friendly 400, on top of Mongoose's own `required: true`).
2. **`defectId` must resolve to a real, non-deleted Defect** — checked via `Defect.findOne`
   before creation or reassignment; rejected with 400 otherwise.
3. **`Submitted` is never free** — a record can't hold (or move to) `status: 'Submitted'`
   without both `proofPhotos.length > 0` and a non-empty `signatureUrl`, checked server-side
   regardless of what the client's form validation already enforced.
4. **`Endorsed` is only reachable one way** — rejected on create, and rejected as a target of a
   plain `PUT`; the only path is `PATCH /:id/endorse`, which additionally requires the record to
   already be `Submitted`.
5. **Endorsed records are immutable on the file fields** — `proofPhotos`/`signatureUrl` can't be
   touched by any update once `status === 'Endorsed'`.
6. **Delete lock** — only `Draft` records can be soft-deleted; `Submitted`/`Endorsed` records are
   permanent once created.
7. **Role-gated writes** — see "Auth & role rules" above.

---

# Part 2 — User

## Fields

| Field | Type | Required | Default | Notes |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | auto | — | Mongo-generated primary key. |
| `name` | String (trimmed) | ✅ | — | |
| `email` | String (trimmed, lowercased) | ✅ | — | `unique: true` — enforced at the schema level, and re-checked explicitly in the controller before insert for a friendlier 400 instead of a raw Mongo duplicate-key error. |
| `passwordHash` | String | ✅ | — | bcrypt hash (10 salt rounds) — the plaintext password is never stored or logged. |
| `role` | String (enum: `Master`, `Admin`, `Staff`) | ✅ | — | No "Manager" role — retired entirely, every check in the app was rebuilt against this real 3-value enum rather than relabeled. |
| `createdBy` | ObjectId (ref `User`) | – | `null` | Who provisioned this account, for auditability. `null` for accounts created outside the normal flow (e.g. the first Master account, seeded directly rather than created by another user). |
| `isDeleted` | Boolean | – | `false` | Soft delete, used here as "deactivated" rather than "removed" — see Auth & role rules below. |
| `createdAt` / `updatedAt` | Date | auto | — | From Mongoose `{ timestamps: true }`. |

Indexed on `role` (`userSchema.index({ role: 1 })`) since account-listing and Staff-scoping
queries filter on it frequently.

## Relationships

```
User ──(createdBy, self-referential)──▶ User
User ──(assignedStaffId, ref from Scheduling's own model)──▶ Schedule
```

`User` doesn't hold references *to* the feature models — the relationship runs the other way:
Schedule carries `assignedStaffId` (a real ref to `User`) as the source of truth for which Staff
member a visit belongs to, used to scope what a Staff caller can see/edit on Scheduling and,
transitively, on an Inspection created against that schedule. `assignedInspector` (the original
free-text field on Schedule) was deliberately kept alongside `assignedStaffId` rather than
replaced — it's now just a display snapshot, while `assignedStaffId` is the only thing access
control actually checks.

## Account-deactivation is soft delete, not removal

Deactivating a user (`PATCH /api/auth/users/:id/deactivate`) sets `isDeleted: true` — the
document isn't removed, so `createdBy` references and any historical `assignedInspector`/
`endorsedBy`/`rectifiedBy` text elsewhere in the app still make sense after someone leaves the
team. `requireAuth` re-checks `isDeleted: false` on **every** request (not just at login), so a
deactivated account's existing token stops working on its very next call instead of quietly
remaining valid until it expires.

## Auth & role rules enforced

1. **Three roles only** — `Master`, `Admin`, `Staff`, enforced by the schema's `enum`. No
   "Manager," no Contractor login (out of scope for this pass).
2. **Account-creation eligibility** — Master creates Admin or Staff; Admin creates Staff only;
   Staff creates nobody; `Master` accounts can never be created through `POST /api/auth/users`
   at all (only via direct seeding). Enforced in the controller, not the schema, since it depends
   on *who's asking*, not just what's in the request body.
3. **Self-registration is always Staff** — `POST /api/auth/register` never lets the caller
   choose a role, so it can't be used to self-provision anything above the lowest privilege
   level.
4. **An account can't deactivate itself** — checked explicitly, independent of role, so an
   Admin/Master can't accidentally lock themselves out.
5. **Admin's visibility is scoped to Staff** — `GET /api/auth/users` filters an Admin caller's
   results to `role: 'Staff'` only; Master sees every account.
6. **Password strength** — minimum 8 characters, at least one letter and one number, checked
   before hashing on both `register` and `createUser`.
7. **Email uniqueness** — enforced twice: the schema's `unique: true` index as the last line of
   defence, and an explicit pre-check in the controller for a clean 400 instead of a raw
   duplicate-key error surfacing to the client.

## Changes since initial build (for anyone diffing against an older copy of this doc)

- Replaced the app's hardcoded dev user entirely — this model, and the JWT/RBAC system built on
  top of it, didn't exist when the rest of the app's route files were first scaffolded (they
  each carried a standing "add auth once a login system exists" TODO, since removed).
  `assignedStaffId` was added to Schedule at the same time, plus a one-off migration script
  (`backend/scripts/migrateAssignedStaff.js`) that maps existing `assignedInspector` name
  strings to real `User` accounts where it can confidently match, and leaves `assignedStaffId:
  null` where it can't — it doesn't guess.
- Every resource router (Lifts, Scheduling, Inspections, Defects, Rectifications) now requires
  `requireAuth`, with specific endpoints additionally gated by `requireRole(...)` per the
  capability matrix in [[use-cases]].
