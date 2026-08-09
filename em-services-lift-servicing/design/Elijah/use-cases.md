# Use Cases — Defect Management

Feature owner: Elijah

## Scope

Defect Management is a **standalone** record of lift-related defects — independent of any single inspection report. A defect can be logged from a formal inspection finding, but just as often it comes from a building manager complaint, a tenant report, or a routine walk-through, so the feature does not require a linked inspection to exist. This is deliberately separate from the lightweight defect sub-records embedded directly on an inspection report (`Inspection.defects`, owned by the Inspections feature) — those track findings *within* one report using a simpler `Open → Acknowledged → Verified` lifecycle; a standalone `Defect` here has its own fuller lifecycle (`Open → In Progress → Resolved → Closed`, reopenable) and its own defect number, independent of any report. This feature does not perform the actual repair work — that is the Rectifications feature's job; Defect Management only tracks *that* a defect exists and *what state* it's in.

## Actors

Roles are the real 3-value RBAC (`Master`/`Admin`/`Staff`) built for the whole app — there
is no "Manager" role and no separate read-only tier for Defects specifically.

| Actor | Description |
| --- | --- |
| Staff, Admin, Master | Any authenticated role can log new defects, edit any field on an existing defect, advance/reopen status, view/search/filter the list and stats, and export the defect list. Defects aren't ownership-scoped the way Scheduling is — a Staff member can work on any defect, not just ones tied to their own assigned schedules. |
| Admin, Master only | The one action Staff can't do: delete a defect. |
| System | Assigns defect numbers, enforces required fields and valid status transitions, snapshots the lift code at creation time. |

## Use Case Diagram (textual)

```
Staff/Admin/Master ──┬── Log Defect
                      ├── View / Search / Filter Defects
                      ├── View Defect Stats
                      ├── Edit Defect Details
                      ├── Update Defect Status
                      └── Export Defect List (CSV)

Admin/Master ── Delete Defect
```

## UC1 — Log Defect

- **Actor:** Staff, Admin, Master
- **Precondition:** A defect has been observed (via inspection, complaint, or walk-through).
- **Main flow:**
  1. Staff opens the Defects tab and clicks "Log Defect".
  2. Staff fills in Title, Location, and Severity (required), and optionally Description, a linked Lift, and Reported By.
  3. Staff submits the form.
  4. System validates required fields, generates the next defect number (`DEF-0001`, `DEF-0002`, …), snapshots the linked lift's code if one was chosen, and creates the record with status `Open`.
- **Alternate/edge flows:**
  - Title, Location, or Severity missing/blank → 400 with the specific missing field name(s).
  - A `liftId` is supplied but doesn't resolve to a real lift → 400 ("Selected lift not found") rather than silently creating a dangling reference.
  - No lift selected → allowed; the defect is logged against the free-text Location alone (e.g. "Blk 12 lift lobby") since the exact lift isn't always known yet.

## UC2 — View / Search / Filter Defects

- **Actor:** Staff, Admin, Master
- **Main flow:**
  1. Actor opens the Defects tab; the list loads sorted by most recently reported first.
  2. Actor filters by Status and/or Severity, and/or free-text searches by defect number, title, location, or lift code.
  3. List updates in place without navigating away.
- **Edge flow:** No defects match the current filters/search → empty state message, not an error.
- **Implementation note:** the backend (`GET /api/defects`) already supports server-side `status`, `severity`, and `q` query filters, but the current frontend applies filtering client-side over the full fetched list — functionally equivalent at today's data volume, but worth revisiting if the defect list grows large.

## UC3 — View Defect Stats

- **Actor:** Staff, Admin, Master
- **Main flow:** The top of the Defects page shows summary counts — Total, Open, In Progress, Resolved — as stat cards, giving an at-a-glance read on backlog health without opening the full list.
- **Note:** the backend also computes `closed` and `criticalOpen` (open/in-progress defects that are `Critical` severity) counts; these are available from `GET /api/defects/stats` but not yet surfaced as cards in the current UI.

## UC4 — Edit Defect Details

- **Actor:** Staff, Admin, Master
- **Main flow:** Staff corrects any field — title, location, linked lift, severity, description, or reported-by — on an existing defect, e.g. to fix a wrong initial entry.
- **Edge flow:** Editing is intentionally not locked by how far the defect's status has progressed (unlike inspection reports, which lock after `Submitted`) — a defect can be corrected right up until it's deleted.
- **Data integrity rule:** clearing Title or Location to blank is rejected (400) even though the field is technically present in the request body.

## UC5 — Update Defect Status

- **Actor:** Staff, Admin, Master
- **Main flow:**
  1. Staff advances a defect's status: `Open → In Progress → Resolved → Closed`.
  2. The UI's status dropdown only ever offers the valid next step(s) from the defect's current status, mirroring the backend's transition rules, so the user can't even attempt an invalid change.
- **Alternate flow — reopen:** a defect can move backwards — `In Progress → Open`, `Resolved → In Progress`, or `Closed → Open` — if a fix turns out not to have worked or was logged too early.
- **Edge flow:** an attempted transition outside the allowed set (e.g. `Open → Resolved`, skipping `In Progress`) → 400 listing the allowed next step(s).
- **Data integrity rule:** the first time status reaches `Resolved`, the system stamps `resolvedDate`; that timestamp is preserved even if the defect is later reopened, so "how long did this take to first resolve" stays answerable.

## UC6 — Link Defect to a Lift

- **Actor:** Staff, Admin, Master
- **Main flow:** Staff picks a lift from the Lifts directory when logging or editing a defect; the system snapshots that lift's code (`liftCode`) onto the defect at that moment.
- **Rationale:** the snapshot is deliberately not a live join — a defect is a historical record, so it shouldn't silently change if the lift is later reassigned to a different block.
- **Edge flow:** unlinking a lift (clearing the field) is allowed at any time; the location free-text field stands on its own regardless of whether a lift is linked.

## UC7 — Delete Defect

- **Actor:** Admin, Master only (Staff is forbidden)
- **Main flow:** Admin/Master deletes a defect logged by mistake or a duplicate entry.
- **Alternate/edge flows:**
  - Deleting an already-deleted or non-existent id → 404, not a silent success.
  - Staff attempts this action → 403.
- **Data integrity note:** this is a **soft** delete (`isDeleted: true`), matching every other model in the app — the record drops out of every list/get but isn't physically removed, and deleting a defect cascades to soft-delete any Rectification pointing at it (`cascadeFromDefects` in `backend/src/utils/cascadeDelete.js`).

## UC8 — Export Defect List (CSV)

- **Actor:** Staff, Admin, Master
- **Main flow:** Actor exports the currently filtered/searched defect list to a CSV file (defect no., title, location, lift, severity, status, reported by, reported date, description) for offline sharing or reporting.
- **Edge flow:** exporting an empty filtered list produces a header-only CSV rather than failing.

## Cross-cutting data integrity notes

- Every defect requires `title`, `location`, and `severity` — no orphaned/incomplete records.
- `severity` and `status` are each restricted to a fixed enum (`Defect.DEFECT_SEVERITIES`, `Defect.DEFECT_STATUSES`); any other value is rejected before it reaches Mongoose.
- Status changes are additionally constrained by an explicit transition map (`VALID_TRANSITIONS`) checked at the controller layer — the enum alone would allow illegal jumps (e.g. `Open` straight to `Resolved`); the transition map closes that gap.
- `defectNo` is derived from the current max in the collection (not an ever-incrementing counter), so deleting the highest-numbered defect and creating a new one reissues that number rather than skipping ahead — same approach used for inspection report numbers.
- `liftId` is optional; if supplied it must resolve to a real, existing lift, and `liftCode` is captured as a point-in-time snapshot rather than a live join.
- Every route requires a valid JWT (`requireAuth`); on top of that, `DELETE /:id` additionally requires `requireRole('Admin', 'Master')`. Everything else (create/edit/view/export) is open to any authenticated role, including Staff.
