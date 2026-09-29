# Architecture

nonprofit-360 is one Google Apps Script project, bound to one Google Sheet. It has no server and no database: the sheet is
the database, Google accounts are the sign-in, and Google Docs are the reports.

```
          ┌──────────────── the organisation's Google account ────────────────┐
 staff ──▶│  Web app (WebApp.gs)  ──▶  validate (Logic.gs)  ──▶  Answers tab   │
 (phone)  │   one page, knows who you are from your Google account            │
          │                                                                    │
 admin ──▶│  Sheet menu (Setup.gs)  ── pairings, checks, invitations (Process) │
          │  Tabs: Settings, Team, Work links, Questions … results, dashboard  │
          │  Reports (Reports.gs) ──▶ private Drive folder (Google Docs)       │
          └────────────────────────────────────────────────────────────────────┘
```

## Source files (`src/`, joined in this order by `tools/build.js`)
| File | Role | Uses Google services? |
|---|---|---|
| `Strings.en.gs`, `Strings.ar.gs` | Every word shown to people, same keys in both | no |
| `I18n.gs` | `t_(key, vars)` in the organisation's language; `clientStrings_()` for the page | no |
| `Settings.gs` | The Settings schema, `cfg_()`, colours, values, finding tabs by a stable id, `requireOwner_()` | only when running in Google |
| `Bank.gs` | The default question bank (EN/AR), `Q_()`, and the made-up example team | no |
| `Logic.gs` | Pairing rules, answer validation, the whole analysis, task lists, drafts | **no** (pure) |
| `Checks.gs` | Plain-language checks of team and links | no |
| `TestData.gs` | Made-up answers with known stories, for tests and the built-in test | no |
| `Sheets.gs` | Reading and writing the tabs | yes |
| `Setup.gs` | Menu, setup side panel, `ORG_SEED`, checks, pairings, publishing help | yes |
| `Process.gs` | Results tabs, dashboard charts, emails, invitations, reminders, test run | yes |
| `Reports.gs` | Google Docs reports (admin copy, employee copy, organisation) and paper forms | yes |
| `WebApp.gs` | `doGet`, `submitEval`, `saveDraft`, the page's HTML, CSS and JavaScript | yes |

Everything in `Logic.gs`, `Checks.gs`, `Bank.gs` and the string files runs in Node: that is what the tests exercise.

## Key design decisions
- **Codes, not labels.** Stored answers and anything the analysis compares against are language-neutral codes (`WEEKLY`,
  `SET_NO`, `DISC_DOC`, `KEEP`, `HIGH`). Labels come from the word lists only when shown. Switching language never breaks data.
- **Tabs are found by a remembered id.** Their names follow the language, and renaming a tab by hand is safe.
- **The personal page runs as the admin.** Google lets a page call any public function, so every public function except
  `doGet`, `submitEval` and `saveDraft` begins with `requireOwner_()`. A test enforces this.
  - `submitEval` and `saveDraft` accept only the signed-in person's own tasks. The one exception is a paper entry by the admin.
- **Validation happens on the server.** Nothing the browser sends is trusted: people, frequency, choices, scores and
  example lengths are all checked again.
- **Drafts are last-write-wins, per task.** They are saved in a hidden tab and in the browser. A draft older than the
  last sent answer is ignored.
- **Right-to-left done properly.**
  - The page is `dir="rtl"`, with logical CSS (`margin-inline-*`, `text-align:start`).
  - Emails carry `dir` and alignment.
  - Docs paragraphs use `setLeftToRight(false)` and are never right-aligned: in RTL, "right" means "end".
  - Doc tables are reversed, because Docs tables have no direction.
- **The organisation seed.** The public `dist/Code.gs` has `ORG_SEED = null`. A Claude Code build appends
  `ORG_SEED = {…}` from the private `org/` folder. The setup side panel then fills the tabs from it.

## The analysis (`analyze_`)
1. Keep the latest answer per (form, rater, rated person).
2. Derive the true relationship from the team structure; the rater's claim is ignored.
3. Exclude automatically:
   - ratings nobody asked for;
   - the same extreme score (1 or 5) on every item.
   The admin's keep or exclude in «Review decisions» wins.
4. Work out weighted averages per item and per group (manager, team, colleagues). The weight comes from how often the
   rater works with the person.
5. Apply the confidentiality rules: a group is shown separately only with MIN_GROUP raters or more, and a person's
   results are releasable only with MIN_GROUP raters or more.
6. Find:
   - strengths and areas to develop;
   - blind spots (self versus others);
   - outlier raters;
   - mutual flattery;
   - low responsiveness;
   - low completion.
7. Look at managers and teams:
   - how the manager rates the team compared with how others rate the same people, and how the team rates the leadership;
   - accountability rows per member: expectations set, weaknesses discussed, what the manager did, and the member's view.
8. Departments: how each is seen by the others; the matrix; examples.
9. Recognition and quiet stars.

## Tests (`test/`)
| Test | What it proves |
|---|---|
| `unit.js` | The seven known stories of the example data are detected, and the rules, checks and validation behave, in EN and AR. |
| `i18n.js` | Every key exists in both languages with the same placeholders, and every key the code uses exists. No Arabic is typed into code, and no hard-coded labels appear on the page. |
| `smoke.js` | The whole flow runs against fake Google services in both languages. Employee copies leak no names or warnings. No email goes to paper people. Every admin function refuses non-admins, and every public function checks the admin. |
| `leaks.js` | No real emails, Google ids, big embedded files, secrets or organisation data folders are in the project. |
| `drafts.js` | Stop and continue, on the same device and on another one. An old draft never overwrites a newer answer. |
| `browser.js` | Real Chrome, phone width: every example person, both languages. The welcome page shows, empty sends are blocked, every task is filled by clicking and accepted by the real server checks, the direction is right, and nothing is wider than the screen. |

What the tests cannot prove, the clean install checks: that Google's own services behave (permissions, Docs, charts,
mail). See `docs/en/setup-guide.md`.
