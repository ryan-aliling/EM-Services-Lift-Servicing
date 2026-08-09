# AI Reflection — Ryan

## How I used AI

I used Claude for setting up the initial repo and shared project structure, building the Rectifications feature, swapping out S3 to Cloudinary for file uploads, merging four separate pages into one workflow, building the whole login/permissions system, and tracking down bug where lift pages were showing each other's data. Full logs are in `ai-logs/session1-5.jsonl`.

## Where AI added value

AI provided value with fixing bugs, such as when all lift's detail page was showing the same schedules, inspections, defects and rectifications. I pointed it out to the AI, and instead of just patching the one file I pointed at, it went through all four related parts of the backend, found that they were all missing the same filter, and caught a naming mismatch between the frontend and backend that I did not see. It also flagged certain code as something the team needed to actually decide on, instead than guessing.

The login and permissions system (Master/Admin/Staff roles) was also added using AI. It handled the database side, the middleware, every route that needed protecting, and the whole frontend login flow, then ran the tests afterward and told me the pass/fail numbers. It pointed out two test failures that already existed, instead of pretending everything was clean.

## Where I rejected or changed AI's first pass

One example was the file upload system. At the start of the project, the project setup used Amazon S3 for storing photos and signatures. Once I actually got to building the Rectifications feature and needed real uploads working, we decided to use Cloudinary instead. S3 had a lot of setup overhead for the project. Cloudinary just needed three values in an env file so it was easier to implement. I made sure the actual data being stored and every other feature's existing upload calls didn't need to change at all.

The second example was around cleaning up old role-checking code. The app had leftover checks that checked stuff like "is this user an Admin or a Manager," even though "Manager" wasn not a real role. Ai wanted to just rename every "Manager" to "Admin". I did not want that because it would have kept the old, overly simple permission logic in place under a different name instead of actually building out the three-role system properly (with Staff having its own limited access, which the old logic never accounted for at all). So I made it rebuild those checks properly instead.

One more example when adding the new proper "who is this schedule assigned to" field, the simplest thing would've been to just replace the old text field that stored a person's name with the new one. I kept both the old one just for display, the new one as the actual source for permissions, then I had it write a migration that only links up records it can confidently match, leaving the rest alone instead of guessing

## What I learned

Giving the AI the real diagnosis or problem instead of just a vague complaint got me better results and outputs. When I said exactly what was broken and where, it fixed it properly everywhere it applied instead of just where I pointed. When I described a general issue, results were still useful but needed more prompting and iterations.

I also learned that early decisions about shared stuff (like how file uploads work) are not easy to fix, because by the time I wanted to change it, other people's features already depended on it working a certain way. Next time I would want to flag "this is shared, treat it carefully" much earlier instead.

Another thing i learned is that AI will give you exactly what you ask for if it is what satisfies your request. It will not automatically know that a quick rename is not the same as actually fixing something. That part is my responsibility and I have to notice when a fix is actually just a shortcut and not a true fix, and I have to say clearly what I don't want, not just what I want.

Lastly, using it responsibly. The AI cannot be trusted blindly. I still had to actually read what it changed, run the tests myself, and check that what it said it did matched what was really in the code, instead of just accepting a summary.

I also noticed my prompts worked better the more concise and specific they were. Long, over-explained prompts did not necessarily get better results than a short one that clearly stated the actual problem or requirement, being clear mattered a lot more than being thorough.
