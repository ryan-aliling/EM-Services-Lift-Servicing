# API Documentation — Rectifications & Authentication/RBAC

Feature owner: Ryan
Base paths: `/api/rectifications` and `/api/auth` (both mounted in `backend/src/server.js`)

All request/response bodies are JSON. All success responses use the shape
`{ "success": true, "message": "...", "data": ... }` from `backend/src/utils/apiResponse.js`.
All error responses use `{ "success": false, "message": "..." }`, thrown as an `ApiError`
(`backend/src/utils/ApiError.js`) and caught by the app-wide error-handler middleware.

See [[database-schema]] for the full field list on both models.

---

# Part 1 — Rectifications (`/api/rectifications`)

## Auth

Every endpoint requires `Authorization: Bearer <token>`. Missing/invalid/expired tokens get a
401. On top of that, two endpoints require a specific role:

| Endpoint | Auth |
| --- | --- |
| `GET /`, `GET /:id`, `POST /`, `PUT /:id` | Any authenticated role (Master/Admin/Staff) |
| `PATCH /:id/endorse` | Admin or Master only |
| `DELETE /:id` | Admin or Master only |

Unlike Inspections/Scheduling, Rectifications has no ownership-scoping rule for Staff — a Staff
member can create or edit a rectification for any defect, not just ones tied to their own
assigned schedules.

---

## GET /api/rectifications

List rectification records (excludes soft-deleted), sorted by `createdAt` descending, with
`defectId` populated to a summary of the linked defect.

**Query parameters (optional):**

| Param | Type | Description |
| --- | --- | --- |
| `liftId` | ObjectId string | Restricts to rectifications for one lift. Since this model has no `liftId` field of its own, the server first resolves that lift's Defect ids, then filters `defectId` against that set. Added for the Lift Workflow's Rectifications step. |

**200 OK**
```json
{
  "success": true,
  "message": "OK",
  "data": [
    {
      "_id": "66c2a1...",
      "defectId": {
        "_id": "66c1f3...",
        "defectNo": "DEF-0007",
        "title": "Door sensor misaligned",
        "description": "Sticky on close",
        "liftId": "66c1e0...",
        "liftCode": "L-102"
      },
      "rectifiedBy": "J. Tan",
      "liftCompanyName": "Koh Lift Services",
      "dateRectified": "2026-07-10T00:00:00.000Z",
      "proofPhotos": ["https://res.cloudinary.com/.../rectifications/photo1.jpg"],
      "signatureUrl": "https://res.cloudinary.com/.../rectifications/signature.png",
      "remarks": "",
      "status": "Submitted",
      "endorsedBy": "",
      "endorsedDate": null,
      "isDeleted": false,
      "createdAt": "2026-07-10T09:00:00.000Z",
      "updatedAt": "2026-07-10T09:00:00.000Z"
    }
  ]
}
```

---

## GET /api/rectifications/:id

**200 OK** — single record, `defectId` fully populated.
**404 Not Found** — `{ "success": false, "message": "Rectification not found" }` (also returned
for a soft-deleted record's id).

---

## POST /api/rectifications

Create a new rectification. Status defaults based on what's provided if not explicitly sent.

**Request body:**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `defectId` | ObjectId string | ✅ | Must resolve to a real, non-deleted `Defect`. |
| `rectifiedBy` | string | ✅ | |
| `liftCompanyName` | string | – | defaults to `''` |
| `dateRectified` | ISO date string | ✅ | |
| `proofPhotos` | array of string | – | Cloudinary URLs via the shared `useFileUpload` hook; empty entries filtered out. |
| `signatureUrl` | string | – | Cloudinary URL of the drawn e-signature. |
| `remarks` | string | – | defaults to `''` |
| `status` | string (enum) | – | If omitted: `'Submitted'` if both a photo and a signature are already present, else `'Draft'`. Only `Draft`/`Submitted` accepted here — `Endorsed` is rejected (see `PATCH /:id/endorse`). |

**201 Created** — the created record.

**400 Bad Request:**
- Missing required field: `"Missing required field(s): defectId, rectifiedBy, dateRectified"`
- `defectId` doesn't resolve: `"Selected defect not found"`
- `status: 'Endorsed'` requested directly: rejected (only `Draft`/`Submitted` allowed on create)
- Requested/inferred status is `Submitted` but photo or signature missing:
  `"Cannot submit without at least 1 proof photo and a signature"` (message adapts to whichever
  is missing)

---

## PUT /api/rectifications/:id

Partial update. Any field may be omitted to leave it unchanged.

**200 OK** — the updated record.

**400 Bad Request:**
- Record is `Endorsed` and the request touches `proofPhotos`/`signatureUrl`:
  `"Cannot edit photos or signature on an endorsed rectification"`
- `rectifiedBy` sent as empty/whitespace: `"Rectified By cannot be empty"`
- `defectId` changed but doesn't resolve: `"Selected defect not found"`
- `status` change requested while record is `Endorsed`: `"Cannot change the status of an
  endorsed rectification"`
- `status: 'Endorsed'` requested via this endpoint: `"Use PATCH /:id/endorse to mark a
  rectification as Endorsed"`
- `status` set to anything outside `Draft`/`Submitted`/`Endorsed`: `"Invalid status \"X\""`
- `status: 'Submitted'` requested but photo/signature still missing: same message as `POST`

**404 Not Found** — `"Rectification not found"`.

---

## PATCH /api/rectifications/:id/endorse

Admin/Master only. The only way a record can ever become `Endorsed`.

**Request body:** `{ "endorsedBy": "string" }` — required.

**200 OK** — `{ "success": true, "message": "Rectification endorsed", "data": {...} }`.
Side effects: `status` → `Endorsed`, `endorsedBy`/`endorsedDate` stamped, and the linked Defect
is advanced (`Open → Closed`, `In Progress → Resolved`) if that transition is still valid for
its current status — silently skipped (not an error) if the defect is missing or the transition
no longer applies.

**400 Bad Request:**
- Record isn't currently `Submitted`: `"Cannot endorse a rectification with status \"X\" - it
  must be \"Submitted\" first"`
- `endorsedBy` missing/blank: `"endorsedBy is required to endorse a rectification"`

**403 Forbidden** — caller is Staff.
**404 Not Found** — `"Rectification not found"`.

---

## DELETE /api/rectifications/:id

Admin/Master only. **Soft delete** — only allowed while `status` is still `Draft`.

**200 OK** — `{ "success": true, "message": "Rectification deleted", "data": null }`.

**400 Bad Request** — record isn't `Draft`: `"Cannot delete a rectification with status \"X\" -
only \"Draft\" records can be deleted"`
**403 Forbidden** — caller is Staff.
**404 Not Found** — `"Rectification not found"`.

---

# Part 2 — Authentication & Accounts (`/api/auth`)

## Auth (on this router itself)

| Endpoint | Auth |
| --- | --- |
| `POST /login`, `POST /register` | Public — no token required |
| `GET /me` | Any authenticated role |
| `POST /users` | Any authenticated role, but see the eligibility rules below (checked in the controller, not via role middleware, since who's allowed to create what depends on the caller's *own* role) |
| `GET /users`, `PATCH /users/:id/deactivate` | Admin or Master only |

Every protected route uses the same `Authorization: Bearer <token>` header as every other
feature's routes. Tokens are signed with an 8-hour flat expiry and carry `{ userId, role, name,
email }`; `requireAuth` re-checks the account still exists and isn't deactivated on **every**
request, not just at login — so deactivating an account takes effect on its very next call
rather than waiting for the token to expire.

---

## POST /api/auth/login

**Request body:** `{ "email": "string", "password": "string" }`

**200 OK**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "66c0a1...", "name": "J. Tan", "email": "j.tan@example.com", "role": "Staff" }
  }
}
```

**400 Bad Request** — `email`/`password` missing.
**401 Unauthorized** — `"Invalid email or password"`, returned identically whether the email
doesn't exist, the account is deactivated, or the password is simply wrong — never reveals
which.

---

## POST /api/auth/register

Public self-service signup. Always creates a `Staff` account — the caller can never choose
their own role here.

**Request body:** `{ "name": "string", "email": "string", "password": "string" }`
Password must be 8+ characters with at least one letter and one number.

**201 Created** — `{ "id", "name", "email", "role": "Staff" }`.

**400 Bad Request:**
- Missing field(s).
- Invalid email format, or password doesn't meet the minimum.
- Email already registered: `"An account with that email already exists"`.

---

## GET /api/auth/me

**200 OK** — the caller's own `{ id, name, email, role }`, read from the token's already-
verified `req.user` (no extra database round trip).

---

## POST /api/auth/users

Create an Admin or Staff account. Master accounts are never created through this endpoint.

**Request body:** `{ "name", "email", "password", "role": "Admin" | "Staff" }`

**Eligibility (enforced in the controller):**
| Caller role | May create |
| --- | --- |
| Master | Admin or Staff |
| Admin | Staff only |
| Staff | Nobody |

**201 Created** — `{ "id", "name", "email", "role" }`.

**400 Bad Request** — missing fields, invalid email/password, `role` not a recognised value, or
email already registered.
**403 Forbidden:**
- `"Staff cannot create accounts"`
- `"Master accounts cannot be created through this endpoint"`
- `"Admin can only create Staff accounts"`

---

## GET /api/auth/users

List active (non-deactivated) accounts.

**200 OK** — array of `{ name, email, role, createdBy, createdAt }`, sorted by name. An Admin
caller's result is silently filtered to `role: 'Staff'` only — an Admin never sees the account
list for other Admins or the Master account. Master sees everyone.

**403 Forbidden** — caller is Staff.

---

## PATCH /api/auth/users/:id/deactivate

Soft-deletes (`isDeleted: true`) the target account, ending its access immediately (see
`requireAuth`'s per-request re-check above).

**200 OK** — `{ "success": true, "message": "Account deactivated", "data": { "id": "..." } }`.

**400 Bad Request** — caller targets their own account: `"Cannot deactivate your own account"`.
**403 Forbidden:**
- Caller is Staff.
- Caller is Admin and the target isn't a Staff account: `"Admin can only deactivate Staff
  accounts"`.
**404 Not Found** — `"Account not found"`.
