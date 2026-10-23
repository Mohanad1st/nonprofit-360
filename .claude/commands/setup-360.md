---
description: Set up the 360 evaluation for your organisation, step by step — Claude prepares everything and guides the few clicks only you can do
---

# Set up the 360 evaluation for this organisation

Follow the rules in `CLAUDE.md`. The person is probably not technical. Speak their language, one question at a time,
plain words, and do all technical work yourself. Keep a short checklist of the 8 stages below and tell them where they are
("Step 3 of 8"). If a `org/` folder already exists, read it and continue from the first unfinished stage instead of starting over.

## Stage 1 — Welcome and three quick questions
Say in two sentences what this is: a free, confidential 360 evaluation that runs in their own Google account. Everyone rates
themselves and is rated by their manager and the people they work with. Only the admin sees results, and only after
deciding to share.
Then ask, one at a time (offer the recommended option first):
1. Language for their team: Arabic or English.
2. Does the organisation use **Google Workspace** (work emails like name@example.org managed by Google)? If not, explain
   that the page needs it to know who is who safely, and that registered nonprofits get it free through
   Google for Nonprofits (https://www.google.com/nonprofits/). Staff without a work email can still take part on paper.
3. Who is the **admin** — the one person who will see results (usually the executive director or HR lead) — and their work email.

## Stage 2 — The organisation and its values
Copy `org.example/` (English) or `org.example-ar/` (Arabic) to `org/`, then fill `org/settings.json` from their answers:
- organisation name, the name of this round (e.g. "2026"), deadline, admin email, signature ("Name — Title"), time zone;
- up to four values with one line each on what it means in this evaluation (offer the defaults in their language as a
  starting point and invite them to change the wording);
- optionally a tagline, a logo (a Google Drive link or an image web address), two brand colours, and one or two lines on
  this year's organisation targets.
Read back a short summary and ask "anything to change?".

## Stage 3 — The team
First say in one sentence: what they share with you here (names, work emails, who manages whom) is sent to Anthropic so
you can help; you never need ratings or comments, and they should not paste them. If that is not acceptable, offer to
guide them to fill the Team tab in the sheet themselves instead (the by-hand route), and continue from Stage 6.
Then ask them to share the team in whatever form is easiest:
- paste a list into the chat;
- give a spreadsheet file (CSV or Excel) — read it; for Excel, read it with a small script;
- or describe it team by team.
For each person you need: name, work email (empty = no email, they rate on paper), department, job title, and direct
manager. Write `org/team.csv`. Exactly one person has no manager (the head of the organisation). Ask about anyone who
should be left out this round (new joiners, people leaving): write `no` under `included`.
Then read the team back as a simple tree (manager → team) and ask them to confirm it is right.

## Stage 4 — Who works with whom (the most important part for fairness)
Explain in one line: managers and their teams are paired automatically. The managers who report to the head also rate
each other (they can turn that off). Now we add people who really work together across teams, each with a reason.
Ask team by team: "Who does <person> work with closely outside their own team, and on what?" Write each answer as a row
in `org/work-links.csv` with a short reason the rater will see (e.g. "Purchase requests for program supplies") and
whether it goes both ways. Also ask: "Is there anyone who should never rate a particular person?" (for example a close
family relationship or an open dispute) → `org/never-pair.csv`.
Optional: which departments rate which → `org/department-links.csv` (or turn department ratings off).
If they do not know who works with whom, do not guess: tell them that once the sheet is live, the menu «Ask managers who
works with whom» emails each manager a short page to fill in, and the answers land in the «Work links» tab.

## Stage 5 — Check and review together
Run `node tools/check-org.js`. Fix what you can yourself. For each warning, explain it in one plain sentence and ask what
they want. The usual ones:
- someone would be rated by fewer than 3 people, so their results cannot be shown without revealing raters. Suggest a
  real work link;
- someone would rate too many people.
Open `org/build/review.html` for them (or describe it): who rates whom and why. Ask them to look at it and confirm.
If they want to change the questions or the wording, use `/customize-360` now.

## Stage 6 — Build and put it in their Google account
Run the tests quickly (`npm run test:fast`), then `node tools/build.js --org`.
Choose the path with them. Recommend A; B always works.
- **A. Automatic (recommended):**
  1. They open https://script.google.com/home/usersettings and switch on "Google Apps Script API". Tell them exactly
     that, then wait.
  2. Run `npx --yes @google/clasp@3.4.1 login`. A browser window opens; they choose their work account and allow. Explain
     it only lets this computer upload the script to their own Google account.
  3. Run `node tools/push.js create`. It makes a new Google Sheet in their Drive with everything inside, and prints its
     link: give them that link to click.
  If any step fails, explain the message in plain words and switch to B.
- **B. Copy and paste:**
  1. They create a new blank Google Sheet.
  2. Extensions → Apps Script.
  3. Delete what is there and paste the whole of `org/build/Code.gs` (open the file for them, or tell them where it
     is). Save.
Either way:
1. They reload the sheet and choose menu «360 → Start setup».
2. Google asks for permission the first time. Explain what they will see ("Google hasn't verified this app": click
   Advanced → Go to …). That is normal for a script they own, and it runs only in their account.
3. The side panel shows their settings already filled in. They press «Save and build my tabs».
4. Their team, links and questions appear in the tabs.

## Stage 7 — Publish the page and see it
Guide them through menu «4) Publish the personal page». Read the steps with them, one by one:
- Deploy → New deployment → Web app;
- Execute as **Me**;
- Who has access: **anyone in their organisation**;
- Deploy → copy the address ending in /exec → paste it in the box → Save.
Then menu «Try it: run a test with made-up people». Show them the test reports and the dashboard, then «Try it: clear the test».
Then «5) Send me a preview»: the email reaches only them. Ask them to open it, press the button, and look at their own
page. Offer to adjust any wording.

## Stage 8 — Ready to invite (their decision)
Summarise in plain words:
- how many people will be invited;
- how many take part on paper;
- the deadline.
Say clearly that invitations go only when they choose «6) Send the invitations to the team» and confirm, and that you
will not send anything yourself. Offer a short message they can post in their team chat announcing it (in their language).
If anyone has no email, remind them of «Make paper forms for people without email».
Finish with what happens next (`/run-cycle`): progress, reminders, results, reports.
