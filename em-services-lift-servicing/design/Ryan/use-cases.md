# Use Cases — Rectifications & Authentication/RBAC

Feature owner: Ryan

## Scope

This covers the two things I own: the **Rectifications** feature (the final step of the
client's spot-check workflow) and the **Authentication / Role-Based Access Control** system
that every other feature in the app now sits behind.

**Rectifications** covers the last step of the chain: **"Lift company submits proof of fix
(photos + signature); EM staff review and endorse."** A defect only reaches Rectifications
once it's been logged (Defects feature, owned by Elijah) — this feature doesn't create or
edit defects, it closes them out.

> **Navigation update:** Rectifications used to be its own top-level tab. It's since been
> folded into the combined **Lift Workflow** (`frontend/src/features/lift-workflow/`): a user
> picks a lift, then steps through Scheduling → Inspections → Defects → **Rectifications** for
> that one lift via `WorkflowStepper.jsx`. The use cases below describe the same underlying
> behaviour — the CRUD/API is unchanged — just reached by first selecting a lift (and, inside
> that step, a specific defect) rather than a standalone tab.

**Authentication/RBAC** isn't a client-workflow step — it's the access-control layer wrapped
around every feature (Lifts, Scheduling, Inspections, Defects, Rectifications) after the app
moved off a hardcoded dev user. Three roles exist: **Master**, **Admin**, **Staff**. There is
deliberately no "Manager" role (retired) and no Contractor-facing login (out of scope for this
pass — a lift company only appears in the data as `liftCompanyName`/`rectifiedBy` text fields,
not as a system user).

## Actors

| Actor | Description |
| --- | --- |
| Staff | Can create/submit/edit rectification records. Cannot endorse and cannot delete, under any circumstance — not even their own Draft. Not restricted to defects tied to their own assigned schedules (defects, unlike schedules, aren't ownership-scoped). |
| Admin / Master | Everything a Staff user can do, plus **Endorse** and **Delete** (Draft-only). Master can additionally create Admin or Staff accounts; Admin can only create Staff accounts. |
| Lift Company / Contractor | Represented only as free-text data (`rectifiedBy`, `liftCompanyName`) entered on their behalf by EM staff — not a system user, no login of their own. |
| System | Derives whether a record can be "Submitted" from whether a photo + signature exist, locks photos/signature once Endorsed, advances the linked Defect's own status on endorsement, and soft-deletes/blocks deletion once a record is no longer Draft. |
| Unauthenticated visitor | Can only reach `POST /api/auth/login` and `POST /api/auth/register`; every other route in the app returns 401 without a valid token. |

## Use Case Diagram (textual)

```
Staff ──┬── Create Rectification (Draft or Submit)
        ├── View / Filter Rectifications
        ├── Edit Rectification (not yet Endorsed)
        ├── Log In
        └── Self-Register (always as Staff)

Admin / Master ──┬── (everything Staff can do)
                  ├── Endorse Rectification
                  ├── Delete Rectification (Draft only)
                  ├── Create Account (Admin: Staff only: Master: Admin or Staff)
                  ├── List Accounts
                  └── Deactivate Account

System ── Derive Submittable status from photos + signature
        ── Lock photos/signature once Endorsed
        ── Advance linked Defect's status on endorsement
        ── Enforce JWT on every route, re-checked per request
```

## UC1 — Create Rectification Record

- **Actor:** Staff, Admin, Master
- **Precondition:** A Defect already exists for the lift being worked on (Defects feature).
- **Main flow:**
  1. User opens the Rectifications step for a lift and picks the defect being closed out
     (`DefectSelect`, scoped to that lift when reached via the Lift Workflow).
  2. User fills in who fixed it (`rectifiedBy`), the lift company, and the date rectified.
  3. User uploads one or more proof photos and draws a signature on the signature pad.
  4. User picks **"Save as Draft"** (no photo/signature required yet) or **"Submit"**.
- **Alternate/edge flows:**
  - `defectId`, `rectifiedBy`, or `dateRectified` missing → 400, "Missing required field(s): …".
  - `defectId` doesn't resolve to a real, non-deleted Defect → 400, "Selected defect not found".
  - "Submit" clicked with no photo or no signature → rejected client-side before the request is
    even sent, and re-validated server-side regardless (`assertSubmittable`).
  - A caller explicitly requests a status other than `Draft`/`Submitted` on create → 400
    (`Endorsed` can only ever be reached via UC4, never directly on create).

## UC2 — View / Filter Rectifications

- **Actor:** Staff, Admin, Master
- **Main flow:**
  1. Actor opens the Rectifications step; the list loads newest-first, each row showing the
     linked defect's description/number, lift company, date, and status badge
     (Draft/Submitted/Endorsed).
  2. When reached via the Lift Workflow, the list is scoped to the selected lift — resolved by
     first finding that lift's Defect ids, then matching `defectId` against those (Rectification
     has no `liftId` of its own).
  3. Clicking a row opens the full detail view: defect summary, all proof photos in a gallery,
     the signature image, remarks, and endorsement info if endorsed.

## UC3 — Edit Rectification

- **Actor:** Staff, Admin, Master
- **Main flow:**
  1. User opens a Draft or Submitted record and changes any field, including replacing photos
     or re-drawing the signature.
  2. If the edited record is still `Draft` and now has a photo + signature, it can be resubmitted
     the same way as UC1; if it's already `Submitted`, saving keeps it `Submitted`.
- **Alternate/edge flows:**
  - Record is `Endorsed` → photos and signature are locked (disabled in the UI, and rejected
    server-side even if called directly: "Cannot edit photos or signature on an endorsed
    rectification"). Remarks and the other descriptive fields can still be corrected.
  - A plain edit tries to set `status` to `Endorsed` directly → 400, "Use PATCH /:id/endorse to
    mark a rectification as Endorsed" — endorsement is only ever reachable through UC4.
  - Edit tries to change `status` while the record is already `Endorsed` → 400, regardless of
    what status is requested.

## UC4 — Endorse Rectification

- **Actor:** Admin, Master only (Staff is forbidden)
- **Precondition:** Record's status is `Submitted`.
- **Main flow:**
  1. After the joint on-site inspection confirms the fix, an Admin/Master opens the Submitted
     record and clicks "Endorse," entering their name as `endorsedBy`.
  2. System sets status to `Endorsed`, stamps `endorsedBy`/`endorsedDate`, and — in the same
     action — advances the linked Defect forward (`Open → Closed`, `In Progress → Resolved`) if
     that transition is still valid for the defect's current state.
- **Alternate/edge flows:**
  - Record isn't currently `Submitted` (still `Draft`, or already `Endorsed`) → 400, "Cannot
    endorse a rectification with status "X" - it must be "Submitted" first".
  - `endorsedBy` left blank → 400, required.
  - The linked Defect was independently moved to a state the transition map doesn't allow (e.g.
    already `Closed`) → the defect is silently left alone; the endorsement itself still succeeds
    (the rectification's own endorsement must never be blocked by an unrelated defect-side edge
    case).
  - Staff attempts this action → 403, regardless of who created the record.

## UC5 — Delete Rectification

- **Actor:** Admin, Master only
- **Precondition:** Record's status is `Draft`.
- **Main flow:** Admin/Master deletes a still-in-progress Draft; system soft-deletes it
  (`isDeleted: true`), so it drops out of every list/get but isn't physically removed.
- **Alternate/edge flows:**
  - Record is `Submitted` or `Endorsed` → 400, "Cannot delete a rectification with status "X" -
    only "Draft" records can be deleted" — once a lift company has submitted proof, the record
    is part of the compliance trail and can never disappear.
  - Staff attempts this action → 403.

## UC6 — Log In

- **Actor:** Any registered user (Master/Admin/Staff)
- **Main flow:** User submits email + password to `/api/auth/login`; on success, receives a JWT
  (8h expiry) and their public profile (id/name/email/role), which the frontend stores and
  attaches to every subsequent request.
- **Alternate/edge flows:**
  - Wrong password, or an email that doesn't exist → the same generic "Invalid email or
    password" either way, so a caller can't use the error message to enumerate valid accounts.
  - Account has been deactivated (`isDeleted: true`) → same generic invalid-credentials message;
    a deactivated account also can't use an already-issued token past its next request, since
    every request re-checks the account still exists (see System actor).

## UC7 — Self-Register

- **Actor:** Unauthenticated visitor
- **Main flow:** Visitor submits name/email/password to `/api/auth/register`; account is created
  with role forced to `Staff` — the caller can never pick their own role through this endpoint.
- **Alternate/edge flows:**
  - Email already registered → 400.
  - Password doesn't meet the minimum (8+ characters, at least one letter and one number) → 400.
  - This endpoint was refused once at first ask, on the grounds that the app's account model is
    meant to be closed by design (Admin/Master provisioning only) — it was rebuilt on a direct
    follow-up specifically so that self-registration can never produce anything above the
    lowest-privilege role.

## UC8 — Create / List / Deactivate Accounts

- **Actor:** Admin, Master
- **Main flow:**
  1. Master creates an Admin or Staff account; Admin creates a Staff account only — both via the
     same `POST /api/auth/users`, with the eligibility check done against the caller's own role.
  2. Master sees every account; Admin's account list is silently filtered to Staff only, so an
     Admin never even sees who the other Admins/Master are.
  3. Either can deactivate an account they're allowed to see (Admin: Staff only) — the account's
     `isDeleted` flips true, and it can no longer log in or use an already-issued token.
- **Alternate/edge flows:**
  - Staff attempts to create any account → 403.
  - Admin attempts to create an Admin or Master account → 403.
  - `role` isn't one of `Master`/`Admin`/`Staff`, or is `Master` itself (Master accounts are
    never created through this endpoint) → 400/403.
  - A caller tries to deactivate their own account → 400, rejected explicitly so an Admin/Master
    can't accidentally lock themselves out.
