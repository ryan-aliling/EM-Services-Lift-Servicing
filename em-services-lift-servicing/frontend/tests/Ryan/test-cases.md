# Frontend Test Cases — Rectifications

Feature owner: Ryan
Automated in: `RectificationForm.test.jsx` (Vitest + Testing Library / jsdom). `defectApi` and
the shared `useFileUpload` hook are mocked so no real network/S3 calls happen and canvas
drawing doesn't need to be simulated for every case (see note on #6 below).

Run with: `npm run test:ryan` (see `frontend/package.json`).

| # | Test case | Steps | Expected result |
| --- | --- | --- | --- |
| 1 | Create mode — title & button set | Render `<RectificationForm rectification={null} />` | Title reads "New Rectification"; "Save as Draft" and "Submit" buttons both render, no single "Save Changes" button |
| 2 | Create mode — required-field validation | Click "Save as Draft" with all fields empty | Inline errors for Defect/Rectified By/Date Rectified appear; `onSubmit` is never called |
| 3 | Submit disabled with no photos and no signature | Render create mode | The "Submit" button is disabled |
| 4 | Submit disabled with photos but no signature | Render edit mode with `proofPhotos` set but no `signatureUrl` | The "Submit" button is still disabled (a photo alone isn't enough) |
| 5 | Shows all uploaded photos in the gallery | Render edit mode with 2 `proofPhotos` URLs | Both photo thumbnails render (queried by their `alt` text) |
| 6 | Signature pad renders when there's no signature yet | Render create mode | The signature drawing canvas is present; no "Redraw Signature" button (nothing to redraw) |
| 7 | Existing signature shown as a static image, not the pad | Render edit mode with a `signatureUrl` already set | The signature `<img>` renders instead of the canvas, plus a "Redraw Signature" button |
| 8 | Edit mode pre-fills existing values | Render edit mode with a sample rectification | Rectified By / Lift Company inputs show the existing values, not blank |
| 9 | Defect picker is locked once a record exists | Render edit mode | The Defect field is disabled (which defect this rectifies can't change after creation) |
| 10 | Submitted record shows one "Save Changes" button | Render with `status: "Submitted"` | Neither "Save as Draft" nor "Submit" render; a single "Save Changes" button does, and photo/signature controls stay enabled |
| 11 | Endorsed record disables photo/signature editing | Render with `status: "Endorsed"` and a `signatureUrl` | No "Add Photo(s)" button and no "Redraw Signature" button render; only "Save Changes" is offered |

## Manual / exploratory checks (not automated)

| # | Test case | Expected result |
| --- | --- | --- |
| 12 | Draw on the signature pad, then check the Submit button (with a photo already attached) | Button becomes enabled the moment a stroke is drawn - jsdom (used by the automated suite) doesn't implement `<canvas>` rendering, so this path is exercised manually against the real browser instead |
| 13 | Click "Clear" on the signature pad after drawing | Canvas resets to blank and Submit becomes disabled again until re-drawn |
| 14 | Select multiple photo files at once in the file picker | Each uploads in turn (progress shown per file) and appears as a thumbnail as soon as its upload finishes |
| 15 | Remove a photo thumbnail before submitting | Thumbnail disappears immediately; if it was the last photo, Submit becomes disabled again |
| 16 | Submit a fully-filled form | Record appears in the Rectifications table with status "Submitted" and the first photo as its thumbnail |
| 17 | Click a row to open the detail view | Full photo gallery, signature, and remarks are visible; clicking a photo enlarges it |
| 18 | Click "Endorse" on a Submitted record, enter a name, confirm | Record moves to "Endorsed" with that name and today's date shown in the detail view |
| 19 | Try to delete a Submitted or Endorsed record | Delete action isn't offered in the table for non-Draft rows |
