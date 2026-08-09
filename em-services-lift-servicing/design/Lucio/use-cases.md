# Use Cases — Lift Records

Feature owner: Lucio

## Scope

Lift Records is the asset registry the rest of the app is built on top of — the master list of
physical lifts (code, block/unit, type, capacity, status, manufacturer, install date, last
serviced) that Scheduling, Inspections, and Defects optionally link to via `liftId`
(`LiftSelect.jsx`, shared across those features' forms). It is deliberately **not** one of the
four numbered steps in the client's spot-check workflow (Schedule → Inspect → Defect → Rectify)
— it's the underlying asset data those steps hang off of, which is why every downstream
feature's `liftId` is optional rather than a hard dependency: Scheduling, Inspections, and
Defects were all built and can all run before a single Lift record exists, and can be backfilled
with a real link later. This feature owns only the lift's own attributes and CRUD — it does not
perform or record any scheduling, inspection, defect, or rectification activity itself; those
are surfaced read-only, pulled live from each owning feature, in the Lift Detail view (UC3).

## Actors

| Actor | Description |
| --- | --- |
| Admin / Master | Full control: create, edit, delete, bulk-import, and export lifts. The only roles that see the "Add Lift" / "Import CSV" controls at all (`canEdit` gate in the UI). |
| Staff | Read-only: search/filter the lift list, view a lift's full cross-feature history, export CSV. Cannot create, edit, delete, or import — grantless by design, unlike Rectifications/Inspections where Staff can write. |
| System | Enforces required fields, unique `liftCode`, closed `type`/`status` enums, computes the "service overdue" flag, and reports per-row success/failure on CSV import. |
| Other features (Scheduling, Inspections, Defects) | Consume Lift records as an optional forward reference (`liftId`) via the shared `LiftSelect` picker; each degrades to manual entry if the Lifts router isn't reachable, so none of them is hard-blocked on this feature. |

## Use Case Diagram (textual)

```
Admin / Master ──┬── Create Lift
                  ├── Edit Lift
                  ├── Delete Lift
                  ├── Import Lifts (CSV)
                  └── Download Import Template

Staff ──┬── View / Filter / Search Lifts
        ├── View Lift Detail & Cross-Feature History
        └── Export Lift List (CSV)

Admin / Master ── (also has every Staff use case above)

Scheduling / Inspections / Defects ── Link to a Lift via LiftSelect (optional, forward reference)
```

## UC1 — Create Lift

- **Actor:** Admin, Master
- **Main flow:**
  1. Admin/Master clicks "Add Lift" and fills in Lift Code, Block, Unit, Type, and Capacity
     (the required set); Status defaults to `Active`, and Manufacturer/Install Date/Last
     Serviced are optional.
  2. Admin/Master submits the form.
  3. System validates required fields and `liftCode` uniqueness, then creates the record.
- **Alternate/edge flows:**
  - Missing required field (`liftCode`, `block`, `unit`, `type`, or `capacity`) → 400,
    "Missing required field(s): …".
  - `liftCode` already in use → 400, `Lift code "X" already exists`.
  - Staff attempts this action → 403 (blocked by `requireRole('Admin', 'Master')` before the
    request even reaches the controller).

## UC2 — View / Filter / Search Lifts

- **Actor:** Admin, Master, Staff (any authenticated role)
- **Main flow:**
  1. Actor opens the Lifts tab; the list loads newest-first, alongside stat cards (Total,
     Active, Under Maintenance, Out of Service).
  2. Actor filters by Status and/or Type, and free-text searches across lift code, block, unit,
     and manufacturer.
  3. List updates client-side without a page reload.
- **Edge flow:** No lifts match the current filters → grid shows an empty state ("No lifts
  match the current filters"), not an error.

## UC3 — View Lift Detail & Cross-Feature History

- **Actor:** Admin, Master, Staff
- **Main flow:**
  1. Actor clicks the "View history" action on any lift row, opening `LiftDetailDialog`.
  2. Dialog shows four tabs — Schedules, Inspections, Defects, Rectifications — each fetched
     live from that feature's own API, scoped to this lift's id, with a status badge per row
     using each feature's own color/status vocabulary.
  3. Clicking any row in a tab closes the dialog and deep-links into the combined Lift Workflow
     tab for that lift, at the matching step.
- **Edge flow:** Any one of the four feature calls fails independently (e.g. that feature's
  router isn't mounted yet) → that tab falls back to an empty list rather than one failed call
  blanking out the whole dialog (`Promise.all` over four independently-caught calls).

## UC4 — Edit Lift

- **Actor:** Admin, Master
- **Main flow:** Admin/Master corrects any field on an existing lift — e.g. advancing `status`
  to `Maintenance`, updating `lastServiced` after a service visit, or fixing a mis-typed block.
- **Alternate/edge flows:**
  - Changing `liftCode` to one already used by another lift → 400, same duplicate message as
    create.
  - Staff attempts this action → 403.

## UC5 — Delete Lift

- **Actor:** Admin, Master
- **Main flow:** Admin/Master removes a lift entered by mistake or decommissioned lifts no
  longer worth tracking.
- **Data integrity note:** unlike every other feature in this app (Scheduling, Inspections,
  Defects, Rectifications all use `isDeleted` soft delete), deleting a Lift is a genuine hard
  delete (`findByIdAndDelete`) — there is no `isDeleted` field on the model at all. A lift with
  existing Schedule/Inspection/Defect records pointing at it via `liftId` is not blocked from
  deletion and those records are not cleaned up or cascaded — see [[lift-database-schema]] for
  the full note on this asymmetry.
- **Edge flow:** Deleting an already-deleted or non-existent id → 404, not a silent success.
  Staff attempts this action → 403.

## UC6 — Export Lift List (CSV)

- **Actor:** Admin, Master, Staff
- **Main flow:** Actor exports the currently filtered lift list to CSV (lift code, block, unit,
  type, capacity, status, manufacturer, last serviced) for offline sharing or record-keeping.
  Available to every role, including Staff, since it's read-only.
- **Edge flow:** Exporting an empty filtered list produces a header-only CSV rather than
  failing.

## UC7 — Import Lifts (CSV)

- **Actor:** Admin, Master
- **Main flow:**
  1. Admin/Master downloads the CSV template (pre-filled header row + one example row) to see
     the expected columns.
  2. Admin/Master selects a `.csv` file; the frontend parses it and posts the parsed rows in one
     batch to `POST /api/lifts/import`.
  3. System creates rows **one at a time** (not `insertMany`) so one bad row doesn't abort the
     whole batch, and reports exactly which row failed and why.
  4. Result dialog shows "Imported N of M lift(s)", with a per-row reason for any failures.
- **Alternate/edge flows:**
  - Selected file isn't a `.csv` → rejected client-side before any request is sent.
  - Empty rows array (e.g. header-only file) → 400, "No rows to import".
  - A row is missing a required field, or reuses an existing `liftCode` → that row is recorded
    in `failed` (with its 1-based CSV line number and reason) while every other valid row still
    commits.
  - Staff attempts this action → 403.

## Cross-cutting data integrity notes

- Every lift requires `liftCode`, `block`, `unit`, `type`, and `capacity` — no orphaned/
  incomplete records.
- `liftCode` is globally unique (Mongo unique index), re-checked at the controller level (`code
  11000`) for a friendlier 400 message than a raw duplicate-key error.
- `type` and `status` are restricted to fixed enums (`Passenger`/`Freight`/`Mixed` and
  `Active`/`Maintenance`/`Out of Service`/`Decommissioned`) at the schema level.
- Unlike the four workflow features that reference it, Lift has **no soft delete** — see UC5 and
  [[lift-database-schema]].
- `GET /api/lifts` and `GET /api/lifts/:id` are readable by any authenticated role; every write
  action (create/update/delete/import) is Admin/Master only, per the capability matrix in
  `design/Ryan/use-cases.md`.
