# nonprofit-360 — Security and production-readiness audit (2026-09-29)

## Verdict
**GO for public release**, once the repository settings listed at the end are switched on after publishing.

**How it was checked:**
- Five independent reviews: access control and confidentiality; injection; correctness and robustness; repository and
  CI hardening against OpenSSF Scorecard and GitHub community standards; beginner documentation.
- A clean install in a real Google Workspace account.
- The private leak scan over every file and the whole git history.

**What was found and fixed:**
- One high-severity security issue: spreadsheet formula injection.
- Two confidentiality leaks in the employee copy.
- Four high-severity robustness bugs.

Every fix is covered by an automatic test. No finding lets a staff member act as someone else, read another person's
answers, or see who rated them.

## Findings (severity-ranked)

### High — Spreadsheet formula injection into the admin's results tabs  [CONFIRMED · FIXED]
- **Evidence:** staff free text (the manager's own part, the member's hard moment, recognition notes) reached `setValues` unchanged in `src/Process.gs` `writeTab_`. A comment starting with `=` became a live formula in the admin's sheet, for example `=IMAGE("https://…"&TEXTJOIN(…))`.
- **Impact:** confidential answers could be sent to an outside site when the admin pressed «Update results».
- **Fix:** `safeCell_` / `safeRows_` in `src/Sheets.gs` write every text cell starting with `= + - @` as plain text. This is applied to every sheet writer. Test: `test/smoke.js`.

### High — A copy of the sheet kept using the original file  [CONFIRMED · FIXED]
- **Evidence:** `src/Settings.gs` `book_()` always opened the remembered sheet id. The "copy the sheet for next year" advice would have written into last year's file.
- **Fix:**
  - `book_()` prefers the sheet the script lives in. When the remembered id differs, it forgets that sheet's data: tab ids, the report job, and the invitation list.
  - A new «Start a new round» command.
  - Tests: `test/smoke.js`.

### High — Settings prepared with Claude Code could be silently replaced by defaults  [CONFIRMED · FIXED]
- **Evidence:** `src/Setup.gs` `wizardSave` ignored `ORG_SEED.settings` for fields the side panel does not show, including the minimum group size.
- **Fix:** the fallback order is now the panel's value → what the sheet already had → the prepared value → the default.

### High — The analysis could crash on a department rating from someone who left  [CONFIRMED · FIXED]
- **Evidence:** `src/Logic.gs` department matrix, `matrix[rater.dept]` undefined.
- **Impact:** «Update results», reminders and reports would all stop.
- **Fix:** a guard, plus a unit test.

### High — Invitations had no protection against Google's email limits  [CONFIRMED · FIXED]
- **Evidence:** `src/Process.gs` `sendInvitationsNow_`. If the run stopped partway, sending again emailed everyone twice.
- **Fix:**
  - The tool checks the remaining daily email allowance before each email and keeps to the time budget.
  - Everyone already invited is remembered, so sending again continues with the rest and nobody receives it twice.
  - Reminders now report how many were actually sent.
  - Tests: `test/smoke.js`.

### Medium — Employee copy: a small team's leadership comments were quoted  [CONFIRMED · FIXED]
- **Evidence:** `src/Reports.gs` `employeeReport_`. Leadership examples were listed even when fewer than the minimum group rated the leadership.
- **Impact:** a manager with one or two team members could read their exact words.
- **Fix:** leadership scores and examples are shown only with enough leadership raters. Test with a one-person team.

### Medium — Employee copy: one recognition note reached several people  [CONFIRMED · FIXED]
- **Evidence:** one self-evaluation note, which names everyone the writer recognised, was copied into each recognised person's report.
- **Fix:** the employee copy shows only the count; the note stays in the admin copy. Test: `test/smoke.js`.

### Medium — Per-item scores from very few raters  [CONFIRMED · FIXED]
- **Evidence:** the employee copy showed an item's average even when fewer than the minimum answered that item, because "I don't know" answers do not count.
- **Fix:** an item's score, chart bar, strength, development area and blind spot appear only with enough answers for that item.

### Medium — Reports made in rounds were fragile  [CONFIRMED · FIXED]
- **Evidence:** `src/Reports.gs` `makeReportsFrom_`:
  - progress was saved only at the end of a round;
  - the time budget ignored the analysis time;
  - a trashed folder or an old job was still resumed.
- **Fix:** progress is saved after each person, the budget counts from the start of the run, and a job expires after 12 hours or when its folder is in the bin.

### Medium — People marked "not included" after pairing stayed on lists  [CONFIRMED · FIXED]
- **Evidence:** `src/Logic.gs` `tasksFor_` and `validateSubmission_` used the whole team, including inactive people.
- **Fix:** such people disappear from lists, can no longer be rated, and do not count as pending.

### Medium — Numbers typed in Arabic digits or with commas broke the confidentiality minimum  [CONFIRMED · FIXED]
- **Evidence:** `Number('٣')` returns NaN, which made `MIN_GROUP` NaN.
- **Fix:** `toNumber_` in `src/Settings.gs`, plus a unit test.

### Medium — Department examples were required, then thrown away  [CONFIRMED · FIXED]
- **Evidence:** the page required an example after a 1, 2 or 5 on a department item, but did not send it.
- **Fix:** the example is sent, checked on the server and stored.

### Medium — The Windows upload helper passed the organisation name unquoted to the shell  [CONFIRMED · FIXED]
- **Evidence:** `tools/push.js` with `spawnSync(…, { shell: true })`.
- **Fix:** every argument is quoted, shell characters are refused, and the sheet title is reduced to safe characters.

### Medium — CI actions were pinned by tag and the secret-scan action has a non-open licence  [CONFIRMED · FIXED]
- **Fix:**
  - All actions are pinned to full commit SHAs, with least-privilege `permissions` per job and `persist-credentials: false`.
  - The gitleaks binary (MIT licence) is downloaded with its SHA-256 checked.
  - CodeQL runs with the `security-extended` queries.
  - Dependabot updates the actions.

### Medium — Honesty in the documentation  [CONFIRMED · FIXED]
- **Evidence:** the guides said the setup was "free, no third party" for every route. Two things were not stated:
  - the Claude Code route needs a paid Claude plan;
  - what the admin pastes into Claude (names, emails, reporting lines) is sent to Anthropic.
- **Fix:**
  - README, setup guide, FAQ, ethics guide, SECURITY and the PRD now say so plainly.
  - `CLAUDE.md` and `/setup-360` tell the admin before asking for the team, and never ask for ratings or comments.
  - The by-hand route is offered as the fully private alternative.

### Low — fixed
- The wizard showed error text as HTML; it now uses text.
- `portalUrl_` accepted any https address; it now requires `script.google.com`.
- The logo must be an image.
- The local review page did not escape quotes.
- Seeded question codes were not validated.
- `paperTarget_` did not refuse an empty active email.
- `readRecords_('')` returned everything.
- There was no flush before releasing the lock.
- A late autosave could bring back a draft that was just sent.
- Names and emails were written to execution logs; now only counts are.
- An unreadable stored answer was counted as an empty rating.
- Duplicate-name warning added; dedupe on a timestamp tie now keeps the latest.
- Per-answer text is capped so one answer fits in a Google cell.
- The test run now asks first when real answers exist.
- The Arabic tab name is now «نتائج_الأفراد».
- Community files added: PR template, issue template config, `.gitignore` for personal editor and assistant files, Node ≥ 22.

### Accepted by design (documented)
- **Anyone who can edit the evaluation sheet is effectively an admin.** They can also edit the bound script. `SECURITY.md` says to keep the sheet private and share individual report files instead.
- **Full Drive permission.** It is needed to put the private reports folder next to the sheet and to read a Drive logo. `SECURITY.md` lists every permission and why.
- **"Same extreme score on every item" is excluded automatically** (6 or more items, all 1 or all 5). The admin can bring it back with «keep». It now needs at least 6 core items.
- **The page's colleague list** (used for recognition) includes colleagues' work emails. This stays within the organisation's own domain.

## Verification
| Check | Result |
|---|---|
| Unit tests (both languages) | 136 / 136 |
| Whole flow against fake Google services (both languages), including the new injection, leak, resume, copy and new-round checks | 193 / 193 |
| Word lists: every key in English and Arabic, no hard-coded words | 775 keys each, 0 problems |
| Public leak rules (real emails, Google ids, secrets, big files) | clean |
| Private leak scan over files and full history (the origin organisation's names, emails, ids and logo) | 0 matches |
| gitleaks, working tree and history | no leaks |
| Real browser, every example person in both languages | 988 / 988 checks, 232 screens |
| Stop and continue (same device and another device) | 12 / 12 |
| Clean install in a real Google Workspace | setup, pairings, published page, real save and draft, Arabic switch, reports, paper form, preview email: all worked |

**Not verified live:**
- The automatic clasp upload path. It needs the organisation's own Google sign-in; the copy-and-paste path was verified.
- The date direction fix inside the Arabic page (verified locally).

## Fix backlog
All items above are done. Settings to switch on right after publishing:
- [ ] Repository description and topics
- [ ] Private vulnerability reporting (Security → Advisories). `SECURITY.md` and `CODE_OF_CONDUCT.md` rely on it.
- [ ] Secret scanning and push protection
- [ ] Dependabot alerts
- [ ] A ruleset on `main`: block force-pushes and deletion, and require the `tests` and `code scanning` checks
- [ ] Labels `bug`, `enhancement`, `wording`

## Out of scope / not re-audited
- Google's own services (Apps Script runtime, MailApp, Docs rendering).
- The Claude Code product itself.
- Native-speaker review of the Arabic and English copy, which is still needed.
