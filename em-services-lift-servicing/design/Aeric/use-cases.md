# Use Cases — Scheduling

Feature owner: Aeric

## Scope

The Scheduling feature covers step 1 of the client's spot-check workflow: **"LMS staff plan the schedule according to monthly lift servicing schedule."** It does not cover performing the inspection itself (Inspections feature) or fixing defects (Rectifications feature) — per client feedback, this system is a lift **inspection** tool, not a lift **servicing/maintenance** tool.

## Actors

| Actor | Description |
| --- | --- |
| LMS Staff (Scheduler) | Plans the monthly spot-check schedule, assigns inspectors, exports the schedule for planning meetings. |
| Lift Inspector | Assigned to a scheduled spot-check; sees their own upcoming schedule. |
| Supervisor | Views schedule status across all inspectors for oversight/QA purposes (spot check on the spot-checkers). |
| System | Enforces required fields, valid status transitions, and soft-delete data integrity. |

## Use Case Diagram (textual)

```
LMS Staff ───┬── Create Schedule
             ├── View / Filter Schedules
             ├── Edit Schedule Details
             ├── Assign Inspector
             ├── Update Schedule Status
             ├── Cancel Schedule (soft delete)
             └── Export Schedule List (CSV)

Lift Inspector ── View Assigned Schedules (filtered view of "View / Filter Schedules")

Supervisor ── View Schedules by Status (filtered view of "View / Filter Schedules")
```

## UC1 — Create Schedule

- **Actor:** LMS Staff
- **Precondition:** Monthly servicing plan / town council contract is known.
- **Main flow:**
  1. Staff opens the Scheduling tab and fills in Town Council, Lift Company, Block/Lift Address, and the scheduled spot-check date.
  2. Staff optionally assigns an inspector and adds notes.
  3. Staff submits the form.
  4. System validates required fields and creates the schedule with status `Scheduled`.
- **Alternate/edge flows:**
  - Missing required field (Town Council, Lift Company, Block Address, or Date) → system rejects with 400 and field-level message.
  - Scheduled date in the past → allowed (staff may be logging a backfilled schedule) but the UI flags it visually so it isn't mistaken for an upcoming job.

## UC2 — View / Filter Schedules

- **Actor:** LMS Staff, Lift Inspector, Supervisor
- **Main flow:**
  1. Actor opens the Scheduling tab; the list loads sorted by soonest scheduled date.
  2. Actor filters by status (`Scheduled` / `Assigned` / `In Progress` / `Completed` / `Cancelled`) and/or by a specific date.
  3. List updates without navigating to a different page (client feedback: "combine pages", "easy user flow").
- **Edge flow:** No schedules match the filter → list shows an empty state, not an error.

## UC3 — Assign Inspector

- **Actor:** LMS Staff
- **Main flow:**
  1. Staff edits a `Scheduled` entry and sets an inspector name.
  2. Status is advanced to `Assigned`.
- **Edge flow:** Reassigning an inspector after work has started (`In Progress`) is still allowed — the system does not lock the field, but the status is left unchanged.

## UC4 — Update Schedule Status

- **Actor:** LMS Staff (drives the status), system displays progress like a delivery tracker (client feedback: "easy user flow" / progress bar).
- **Main flow:**
  1. Staff advances status along `Scheduled → Assigned → In Progress → Completed`.
  2. UI shows a stepper so any actor always knows "where is this job right now".
- **Edge flow:** Status set to `Cancelled` from any state (e.g. site access denied) — terminal, excluded from "upcoming" views.
- **Data integrity rule:** the system only accepts the five defined status values; any other value is rejected with 400 (see [[schedule-status-enum]]).

## UC5 — Edit Schedule Details

- **Actor:** LMS Staff
- **Main flow:** Staff corrects a mis-typed block address, date, or notes on an existing, non-deleted schedule.
- **Edge flow:** Editing a `Completed` schedule is still permitted (e.g. correcting a typo after the fact) — the system does not hard-lock records, but this is expected to be rare and is visible in the record's `updatedAt` timestamp for audit purposes.

## UC6 — Cancel Schedule (soft delete)

- **Actor:** LMS Staff
- **Main flow:** Staff deletes a schedule entered by mistake or no longer needed.
- **Data integrity rule:** deletion is a *soft* delete (`isDeleted: true`) — the record is hidden from all list/detail views but never physically removed, preserving the audit trail (client feedback: "keeping the integrity of data").
- **Edge flow:** Deleting an already-deleted or non-existent id → 404, not a silent success.

## UC7 — Export Schedule List (CSV)

- **Actor:** LMS Staff
- **Main flow:** Staff exports the currently filtered schedule list to a CSV file for the monthly planning meeting / offline sharing with town councils (client feedback: "mass import/export").
- **Edge flow:** Exporting an empty filtered list produces a header-only CSV rather than failing.

## Cross-cutting data integrity notes

- Every schedule requires `townCouncil`, `liftCompany`, `blockAddress`, and `scheduledDate` — no orphaned/incomplete records.
- `status` is restricted to a fixed enum (`Schedule.STATUS_VALUES`), preventing free-text/invalid states.
- `liftId` is an optional reference to the Lifts feature (now built, owned by Lucio) — kept optional even after Lifts landed, since a schedule can exist before the exact lift is pinned down.
- Soft delete (`isDeleted`) instead of hard delete, per client feedback on data integrity.
