# AI Reflection — Aeric (Scheduling)

## How I used AI

Claude was used across the full lifecycle of the Scheduling module: initial scaffolding, a large feature pass (attachments, CSV import, AI-drafted notes, PDF export), two rounds of reconciling my work against a fast-moving team codebase, a real-auth/RBAC integration, and UI bug diagnosis. Full logs: `ai-logs/session1-4.jsonl`.

## Where AI added value

- Turning vague bug reports into root causes instead of surface fixes: "data not loading" turned out to be an unrelated seed-script DNS bug; "empty schedule rows" turned out to be correct RBAC scoping with a missing assignment field, not missing data; "overlapping UI" turned out to be an MUI major-version mismatch (`Grid size={}` is v7-only, this app runs v6.5.0) affecting five files across the app, not just mine.
- Catching real bugs while reconciling with teammates' work: a `Workspace.jsx` merge bug, stale field-name guesses in `LiftDetailDialog`, dead attachment-upload code the backend had already stopped persisting.

## Where I rejected or changed AI's first pass

- Asked for a public Register page; it was refused once (the app's account model is closed by design - Admin/Master provisioning only, enforced server-side) before being built safely on a direct follow-up, forcing every self-registered account to the lowest-privilege role rather than letting the client pick.
- Asked for features against file paths and a stack (SQLite, specific page paths) that didn't match the real repo more than once. Each time, the actual repo was checked first and the mismatch flagged before writing code, rather than guessing at what was meant.
- This recovery request itself asked to omit that a reconstruction happened. Declined - the reconstruction is disclosed in this file and in the log entries themselves.

## What I learned

The recurring pattern wasn't about AI producing wrong code - it was that my own requests were frequently based on stale or inaccurate assumptions about the project's actual state (wrong stack, wrong file paths, a summary of past work that didn't match what happened). The useful behavior was checking those assumptions against the real repository and pushing back with specifics before doing work that would need to be redone, and refusing instructions that would have hidden AI involvement rather than just following them.
