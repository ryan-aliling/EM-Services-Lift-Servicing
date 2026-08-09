# ai-reflection

## How AI tools were used during this project

I used AI mainly as a pair-programmer for the Lifts feature (backend CRUD, frontend integration, and the CSV import add-on), leaning on it most in three ways:

- **Code review / explain-then-fix**: After writing the initial lift backend (model, controller, routes), I asked it to walk me through the logic so I could understand what to improve. It didn't just explain — it actually traced the require paths across `Lift.js` → `liftController.js` → `liftRoutes.js` → `server.js` and caught that the router was never mounted, that `utils/ApiError`, `asyncHandler`, and `apiResponse` were referenced but didn't exist yet, and that the auth middleware I'd written the routes against also didn't exist. It gave me the option to fix it myself or have it build the missing pieces — I let it build them, and it verified the fix by requiring the modules directly and checking they loaded without errors.
- **Integration debugging**: When I pasted in the frontend `features/lift` files and asked it to check they worked with my backend, it found real integration bugs (missing npm deps like MUI/formik/yup, broken relative import paths, an icon typo, `<Lifts/>` never actually mounted in `Workspace.jsx`) rather than just assuming the backend was wrong. It also caught a real backend bug in the process — duplicate `liftCode` was throwing a raw Mongo 500 instead of a clean 400 error — and fixed it on both ends so the frontend's error toast actually had something sensible to show.
- **Feature building**: For the CSV import feature, I described what I wanted in one line ("can u add a csv only import feature") and it delivered a full vertical slice — a `/api/lifts/import` endpoint that processes rows individually so one bad row doesn't kill the batch, plus a frontend importer with a `.csv`-only guard, a hand-rolled CSV parser, a header-alias map, a template download link, and a results dialog showing per-row failures.

## What worked well

- Giving it a real symptom ("page isn't loading", "server runs on 3000 but db is hosted on 5000") instead of a guess at the cause was more useful than me trying to diagnose it first — it found the actual root cause (an unmounted route with a typo'd filename) instead of chasing the port/CORS theory I initially assumed was the problem.
- It consistently distinguished "this needs a decision from you" (e.g. auth strategy, whether to strip `requireAuth`/`requireRole` until a login system exists) from "this is just broken, I'll fix it" — so I stayed in control of the architectural calls instead of AI silently deciding for me.
- It verified its own work before telling me it was done — installing deps and requiring modules directly, spinning up a throwaway in-memory MongoDB and driving the real UI in headless Chromium to confirm the Lifts page actually worked end-to-end, then tearing the temporary test infra back down. That made "should work" into "confirmed working," which mattered a lot for something as easy to half-fix as a full-stack CRUD feature.

## Lessons learned

- Committing code that claims something is done (e.g. a commit message saying a route was "mounted in server.js") when it actually wasn't cost me a debugging session later — I should verify claims like that against the actual file before moving on, not just trust the commit message.
- Pinning dependency versions (MUI to ^6, `@mui/x-data-grid` to ^7) mattered — letting `npm install` pull the latest tag introduced a much newer major version that broke `Stack`/`Grid` and threw console warnings I didn't understand until AI traced it back to a version mismatch.
- It's worth explicitly telling the AI what it *can't* verify (e.g. no real `DATABASE_URL`/Atlas connection available) so the confidence of "verified" claims stays honest — it flagged this itself each time rather than overstating what had actually been tested, which is the behavior I want to keep relying on.
