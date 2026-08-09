# AI Reflection — Elijah (Defect Management)

## How I used AI

Claude was used to build the defect management module itself, as well as add additional features such as the ability to edit an already made defect for easier use for users.

## Where AI added value

AI was able to create features I wanted, added the CRUD to my defect management module and create the tests for my defect management module.

## Where I rejected or changed AI's first pass

AI wrote the MongoDB integration code (schema, connection, queries) but couldn't test it against a live database due to sandbox network restrictions. I had to do the actual database setup (MongoDB Atlas account, connection string, debugging auth errors) and verify the app worked end-to-end myself.

## What I learned

I learned that prompts for claude had to be specific in order to get the features I want. I also had to learn how to fix errors and mistakes that claude ai may have gotten wrong in the code, as well as re-prompting the ai to get what I want if what the code created was what I did not want.
