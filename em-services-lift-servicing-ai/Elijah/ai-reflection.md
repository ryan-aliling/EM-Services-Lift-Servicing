# AI Reflection — Elijah (Defect Management)

## How I used AI

Claude was used to build out the Defect Management feature end-to-end from the frontend side: reworking the defect-logging form's layout, adding a CSV export, writing the three design docs (use-cases, API documentation, database schema), writing the frontend test suite and test-cases.md, and two small follow-up UI tweaks. Full log: `ai-logs/session1.jsonl`.

## Where AI added value

- Reusing existing patterns instead of inventing new ones: the CSV export (`utils/csvExport.js` + a per-feature `*CsvColumns.js` module) is the exact pattern Aeric already built for Scheduling, so Defects didn't end up with a second, slightly-different export mechanism.
- Reading the real code before documenting or testing it, rather than describing an idealized version of the feature. The design docs and test-cases.md both ended up naming real gaps in my own implementation - a hard delete instead of the soft-delete convention used elsewhere, no DB indexes beyond the unique `defectNo`, server-side filters the frontend never actually calls, no server-side auth enforcement - instead of only documenting the happy path.
- Catching that `tests/Elijah/placeholder.test.js` wasn't actually a placeholder - it already had real, passing tests under a misleading filename - rather than assuming an empty-sounding file was empty and overwriting it.

## Where I rejected or changed AI's first pass

Nothing was rejected outright this session, but one fix was incomplete and I want to be honest about it rather than let it look cleaner in hindsight than it was: when I asked for the Severity field to be more readable, the fix applied was a CSS `minWidth` patch on the select box. It didn't check whether the Grid component's own API matched the MUI version actually installed (`^6.5.0`) - the file was using a `size={}` prop that's v7-only and does nothing on v6, which is exactly the kind of "silently unstyled" bug Aeric's own logs describe hitting elsewhere in this app. That got corrected separately, not as part of that fix.

## What I learned

The most useful thing wasn't the code Claude wrote, it was it going and reading the real model/controller/routes and the other students' already-filled docs before writing anything, instead of taking my one-line requests at face value and guessing. The gaps it flagged in my own feature (hard delete, missing indexes, unenforced server-side filters) were things I hadn't actually noticed myself while building it. The lesson for next time is to ask it to check for that class of "does this actually match what's installed/implemented" mismatch up front, rather than only after a symptom (a cramped-looking field) prompts a surface-level fix.
