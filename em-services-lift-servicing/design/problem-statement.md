# Problem Statement

## The problem

Every lift under a town council must be regularly serviced and inspected to keep its BCA
certification, and a single town council can have hundreds of lifts, each maintained by a
different contractor. EM Services runs a spot-check process on top of that servicing to
catch what the contractor missed — but the process is entirely paper-based today:

1. LMS staff plan the spot-check schedule against the monthly lift servicing schedule.
2. The lift technician completes servicing.
3. An LMS staff member inspects the site the next (or a following) day and fills in a
   paper inspection report.
4. Any defect found is phoned or emailed to the lift servicing supervisor for
   rectification.
5. The lift technician has two weeks to fix the defect.
6. LMS staff and the lift company do a joint inspection; the technician endorses the
   clearing of the defect.
7. The paper form is filed.

This breaks down in predictable ways: paper forms go missing, handwriting is illegible,
records have to be kept for up to five years for audit purposes (mountains of paper to
store and retrieve), and there's no automated way to chase a contractor on an
outstanding defect — someone has to remember to follow up by phone or email.

## Target users / stakeholders

- **LMS staff (EM Services)** — plan spot-check schedules, do the physical inspection,
  fill in the report, and log defects. The primary day-to-day users of this system.
- **Lift servicing supervisors** — notified of defects, coordinate rectification with
  the lift company.
- **Lift company technicians / contractors** — receive the defect, fix it, and need to
  submit proof of the fix. Not a logged-in user of this system (see Scope below) — they
  interact through the same channels they always have (photos/signature captured by EM
  staff on their behalf), but the workflow that used to be entirely manual is now
  digitised end to end.
- **Town councils** — the indirect stakeholder: BCA compliance and audit records exist
  for their benefit, even though they don't touch the system directly.

## What success looks like

Straight from the brief EM Services gave (Daniel Koh, 10 Jun 2026): replace the paper
trail with a digital one that's faster to fill in, harder to lose, and easier to audit.
Concretely:

- Defects are sent to the lift company automatically (rather than a phone call someone
  has to remember to make), with an acknowledgement captured on the platform.
- The lift company can submit proof of rectification (photos + signature) directly,
  instead of a physical joint inspection being the only way to close out a defect.
- Every step is timestamped, so there's a real audit log instead of a stack of paper
  forms with handwritten dates.
- Less time spent on paperwork and travel; less paper printed and stored.
- Records survive the required multi-year retention without a physical archive.

## Scope & constraints (from the original brief)

- **Mobile-friendly**: the person filling in a spot-check report is standing in a lift
  lobby, not at a desk — the form has to work on a phone as well as a laptop.
- **Photos are opt-in, not automatic**: attaching a photo to every minor issue would
  slow the platform down as photo volume grows, so photos are for defects that actually
  need visual evidence, not a blanket requirement on every checklist line.
- **Storage discipline**: photo size/quantity was flagged as a real constraint up front,
  not an afterthought — this shaped the decision to use Cloudinary (see
  `architecture.md`) rather than storing file bytes on our own server.
- **Yearly archival**: records should be exportable/downloadable by year rather than
  living forever in one ever-growing table.
- **Admin & access control**: the system needs real user/role management (who can add
  equipment, who can see what) rather than one shared login.

## What this project actually implements

Mapped onto the five-step client workflow (**Lifts → Scheduling → Inspections → Defects
→ Rectifications** — see `architecture.md` and `er-diagram.md` for the technical detail):

- A structured digital checklist matching the paper spot-check form, replacing free-text
  handwriting with real form fields.
- Severity tagging on every defect (Minor / Major / Critical).
- Photo upload and e-signature capture via Cloudinary, so proof-of-fix photos and the
  inspector's/technician's signature are attached directly to the digital record instead
  of a separate paper trail. Photos (not signatures) are compressed client-side before
  upload — downscaled and re-encoded as JPEG — directly addressing the brief's storage/
  bandwidth concern ("platform will get slower due to loading of photo").
- Role-based accounts (Master / Admin / Staff) so account provisioning and access are
  actually controlled, replacing a single shared login.
- A fully soft-deleted audit trail — nothing a Staff/Admin/Master user deletes is
  physically destroyed, so the multi-year audit requirement is met by design rather than
  by manual archiving discipline.
- An Admin/Master-only **Audit Log** page surfacing that trail as an actual readable feed
  (most-recent-first, filterable by feature/action) across all five workflow steps,
  instead of the audit trail only existing implicitly in the database.
- CSV import/export and PDF export, for the "download as file" / bulk-record-handling
  need called out in the original brief.
