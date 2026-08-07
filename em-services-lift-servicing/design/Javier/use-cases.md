# Use Cases — Inspections

Feature owner: Javier

## Scope

The Inspections feature covers steps 2–4 of the client's spot-check workflow: **"Lift technician
completed servicing," "LMS staff inspect the site on next/following day and fill the inspection
report," and "Finding on report (defect) will be informed to lift servicing supervisor for
rectification."** It logs the actual inspection (checklist + defects), and hands off to the
Rectification feature once a defect has been raised and the contractor notified — it does not
cover planning the visit (Scheduling) or performing the fix (Rectifications).

Per client feedback: the checklist form must match the client's real spot-check checklist
(currently placeholder items pending the client's actual document — see
`frontend/src/features/inspections/inspectionConstants.js`), and the client is renaming this
service from "servicing" to "supervision" (naming only, the workflow is unchanged).

## Actors

| Actor | Description |
| --- | --- |
| LMS Staff (Inspector) | Creates and fills in inspection reports during a spot-check, notifies the contractor of defects found. |
| Contractor / Lift Company | Notified when a defect is raised against a report; not a direct system user yet (no login system exists — see `frontend/src/context/AuthContext.jsx`), but represented by the `contractor` field and the notify-contractor action. |
| Supervisor | Views inspection history/status across all reports for oversight and audit purposes. |
| System | Assigns report numbers, enforces the audit-trail lock (no editing/deleting once submitted), derives compliance from logged defects, and snapshots lift details at the time of inspection. |

## Use Case Diagram (textual)

```
LMS Staff (Inspector) ───┬── Create Inspection Report
                          ├── View / Filter / Search Reports
                          ├── Edit Report (Draft only)
                          ├── Delete Report (Draft only)
                          ├── Mark Checklist Items (Pass/Fail/N-A, incl. bulk All Pass/All Fail)
                          ├── Log Defects (auto-unlocked once a checklist item fails)
                          ├── Notify Contractor of Defects
                          └── Export Report List (CSV)

Supervisor ── View Reports by Status (filtered view of "View / Filter / Search Reports")

System ── Assign/Reuse Report Numbers
        ── Snapshot Lift details onto the report at creation time
        ── Derive Compliance (Pass / Defect Found) from logged defects
        ── Lock report from edit/delete once no longer Draft
```

## UC1 — Create Inspection Report

- **Actor:** LMS Staff (Inspector)
- **Precondition:** The lift being inspected already exists as a Lift record (Lifts feature);
  optionally, a Scheduling entry exists for the visit being followed up on.
- **Main flow:**
  1. Staff opens the Inspections tab and clicks "New Inspection Report."
  2. Staff selects the lift from a live picker (`LiftSelect`) — not free-typed — and optionally
     links the scheduled visit it follows up on (`ScheduleSelect`, filtered to that lift).
  3. Staff fills in the inspection date (cannot be in the future — the inspection must have
     already happened), inspector name, and optional contractor.
  4. Staff works through the checklist (Pass/Fail/N-A per item, or bulk "All Pass"/"All Fail"),
     with remarks per item.
  5. If any checklist item is marked "Fail," a blank defect entry appears automatically for the
     staff member to describe the defect, set its severity, and attach a photo.
  6. Staff submits; system assigns a report number, snapshots the lift's code/block, derives
     compliance from whether any defects were logged, and saves the report as `Draft`.
- **Alternate/edge flows:**
  - No lift selected → rejected with a required-field error, no request sent.
  - Selected `liftId` doesn't resolve to a real Lift record (e.g. deleted between page load and
    submit) → 400 "Selected lift not found."
  - Inspection date in the future → rejected client-side (date picker `max`) and server-side.
  - All checklist items Pass/N-A → the Defects section stays locked; nothing can be typed in.

## UC2 — View / Filter / Search Reports

- **Actor:** LMS Staff, Supervisor
- **Main flow:**
  1. Actor opens the Inspections tab; the list loads sorted by inspection date (most recent
     first by default), with stat cards summarising totals/draft/submitted/critical-open counts.
  2. Actor searches by report number, lift code, block, or inspector name; the search box widens
     while focused or non-empty so long queries stay fully readable.
  3. Actor filters by one or more statuses at once (multi-select — e.g. Draft + Submitted
     together), and sorts by inspection date / report number / compliance with a separate
     ascending/descending toggle built into the same control.
  4. Clicking "View" opens the report as a full page within the tab (not a popup), showing the
     header fields, checklist table, and defect cards (with a photo lightbox).
- **Edge flow:** No reports match the filters → list shows an empty state, not an error.

## UC3 — Edit / Delete Report (Draft only)

- **Actor:** LMS Staff
- **Main flow:**
  1. Staff opens a `Draft` report from the list (Edit/Delete icons are only enabled for Drafts).
  2. Staff edits any field, including re-picking the lift (re-snapshots `liftCode`/`block` if
     changed) or the checklist/defects, and saves — or deletes the draft outright.
- **Alternate/edge flows:**
  - Report is `Submitted`/`Under Review`/`Closed` → Edit/Delete icons are disabled in the UI, and
    the API independently rejects the request even if called directly (client feedback:
    "shouldn't be able to edit after submitting"; kept for audit purposes on delete).

## UC4 — Notify Contractor of Defects

- **Actor:** LMS Staff
- **Precondition:** Report has at least one logged defect.
- **Main flow:**
  1. Staff triggers "Notify Contractor" on a report with defects.
  2. System records `contractorNotifiedAt`, flips each `Open` defect to `Acknowledged`, and moves
     the report's `overallStatus` to `Under Review`.
- **Alternate flow:** Report has zero defects → rejected, "No defects logged on this report to
  notify the contractor about."

## UC5 — Export Report List

- **Actor:** LMS Staff, Supervisor
- **Main flow:** Actor applies search/status filters, clicks "Export," and receives a CSV
  containing exactly the currently-filtered rows (report no., lift code, block, date, inspector,
  contractor, compliance, status, defect count).
