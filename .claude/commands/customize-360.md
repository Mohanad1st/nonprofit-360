---
description: Change the questions, values, wording, branding or who rates whom — safely, in both languages
---

# Customise the 360 evaluation

Follow `CLAUDE.md`. Ask what they want to change, in plain words, then do it and show them the result.

**Where each change goes:**
- **Their values, tagline, name, colours, logo, deadline or signature:**
  - before the sheet exists: `org/settings.json`;
  - after: tell them to change the row in the sheet's «Settings» tab. Offer to write the exact new text for them.
- **Questions** (reword, add, remove, limit to one department):
  - before the sheet exists: write `org/questions.csv`. Start by exporting the default bank of their language, with
    `code,section,question,help,required,departments` columns, so they only edit what they want.
  - after: they edit the «Questions» tab directly; explain the columns in one line each.
  - Keep the codes: the analysis uses them. C1 is responsiveness, C2 communication, L4 owning the team's results, X1
    achieving what was expected, and H_*/M_* are the manager-accountability questions.
  - New questions get new codes (C9, L8, S_X1…).
  - Rating sections: CORE, LEAD, DEPT, HEAD_ITEMS. Open sections: SELF_OPEN, SELF_HEAD, HEAD_OPEN, MEMBER_OPEN,
    PERSON_OPEN. Required = yes, no, or "if low".
- **Who rates whom:** edit `org/work-links.csv` / `org/never-pair.csv`, or the sheet's «Work links» and «Never pair» tabs,
  then menu 2 and menu 3 again. Always keep a reason on every pair.
- **Rules** (managers rate each other; the head is rated by direct reports only; departments rate each other; minimum
  group size): these are Settings rows. Explain the effect of each change in one sentence before making it. Never go below
  3 for the minimum group without saying once that small groups can reveal who said what.
- **Words of the tool itself** (buttons, emails, reports):
  - change `src/Strings.en.gs` and `src/Strings.ar.gs` together;
  - run `node test/i18n.js`, then `npm run test:fast`;
  - rebuild with `node tools/build.js --org` and update their sheet (`node tools/push.js update`, or paste again). Then
    publish a new version of the page (Deploy → Manage deployments → edit → New version).

Mark any new Arabic or English wording you wrote as needing a native speaker's review.
After any change to people or links, run `node tools/check-org.js` (or menu 2 in the sheet) and explain the result.
