# nonprofit-360 — Product requirements

**Status:** version 1.0 · **Licence:** MIT · **Languages:** English, Arabic (right-to-left)

## 1. The problem
Small and medium nonprofits want fair, evidence-based performance conversations. They usually cannot afford HR software,
have no IT staff, and often work in Arabic as well as English. What they end up using is:
- annual reviews written by one manager, which miss most of the picture and let a weak manager blame the team;
- generic survey forms, where answers are not confidential, anyone can rate anyone, and nothing is analysed;
- paid 360 tools, which cost per person per year, need a server or a vendor, and rarely support Arabic properly.

## 2. Who it is for
| User | Needs |
|---|---|
| **The admin** (executive director, HR or operations lead) — usually not technical | Set it up in an afternoon; see progress; get honest, clear results; decide what each person sees. |
| **Staff** — including field staff on phones, and people without a work email | A short, clear, kind experience in their language; confidence that their answers are private; stop and continue later. |
| **Managers** | Fair feedback on their leadership; a chance to show what support they gave their team. |
| **A volunteer or consultant helping the nonprofit** | Understand and adapt it quickly; trust it with personal data. |

## 3. Goals
1. **Free to run.** Nothing to host or pay; it runs in the organisation's own Google Workspace (free for registered nonprofits). The optional Claude Code helper needs a paid Claude plan.
2. **Set up without code.** Through the setup side panel and tabs, or by talking to Claude Code (`/setup-360`), which does the technical work.
3. **Fair by design.**
   - Every pairing has a written reason (people who really work together).
   - Scores of 1, 2 or 5 need a real example.
   - "I don't know" never counts against anyone.
   - Ratings are weighted by how often the rater works with the person.
4. **Confidential by design.**
   - Only the admin sees individual answers.
   - A group's results show only when at least the minimum number of people rated (default 3).
   - Employee copies carry no names and no warnings.
   - Nothing is shown to anyone until the admin decides.
5. **Honest signals, not verdicts.** It flags patterns worth a closer look:
   - a manager who rates the team far below everyone else while the team rates the leadership low;
   - criticism without follow-up;
   - expectations never set;
   - revenge or flattery ratings;
   - quiet stars.
6. **Bilingual.** Every word exists in English and Arabic. Arabic is truly right-to-left in the page, the emails, the sheet, the reports and the paper forms.

## 4. Non-goals (version 1)
- Payroll, contracts or automatic decisions: the tool gives evidence for a human conversation.
- Organisations without Google Workspace. Personal Gmail accounts cannot be told apart safely; secret-link sign-in is on the future list.
- Real-time dashboards for managers. Only the admin sees results.
- More than two languages out of the box. Adding one means adding one word-list file.

## 5. What it does
### 5.1 Setup
- **Setup side panel:**
  - language;
  - organisation name;
  - round name;
  - deadline;
  - admin email;
  - signature;
  - tagline;
  - logo link;
  - two colours;
  - up to four values with their meaning;
  - organisation targets;
  - an optional made-up example team to try it first.
- **Tabs the admin fills, each with a note explaining it:** Team, Work links (with reasons), Never pair, Department
  links, Questions.
- **Check my team and links:** plain-language errors and advice, including "this person would have fewer than 3 raters".
- **Claude Code path:**
  - an interview writes a private `org/` folder;
  - a build bakes it into the organisation's own copy;
  - clasp puts it in their Google account;
  - the setup fills every tab.

### 5.2 Who rates whom
- **Added automatically:**
  - every manager ↔ each member of their team;
  - the managers under the head of the organisation rate each other (can be turned off);
  - the head is rated only by direct reports (can be turned off).
- **Work links** add the people who really work together, with the reason the rater sees. "Never pair" removes a pair in
  both directions.
- **The result is a list the admin can read and edit** before inviting anyone.

### 5.3 The personal page
- **One address for everyone.** It knows who opened it from their Google account; nobody can pretend to be someone else.
- **First screen: "Before we start".** It says what this is, why, the organisation's values, and how to fill it in.
- **Then the person's own list:**
  - the self-evaluation;
  - the people shown because they work together, each with the reason;
  - the departments they deal with.
- **Rating:**
  - tap 1–5 or "I don't know";
  - the lines under each item explain it;
  - an example box appears for 1, 2 and 5;
  - required parts are outlined in red when missing.
- **Manager questions:**
  - A manager rating their own team member also answers: did you set expectations? did you discuss the weaknesses? what
    did you do to help? what was your own part?
  - The member answers the mirror questions about their manager.
- **Saving:**
  - answers save automatically every few seconds, on the server and in the browser;
  - people can stop, change device, and continue;
  - they can edit after sending, until the deadline.
- **Works on a phone**, in both directions.

### 5.4 Paper
- A printable Google Doc for each person without email: the self-evaluation and everyone they rate.
- The admin types the returned answers through an admin-only address. The answers are marked as entered by the admin.

### 5.5 Invitations and reminders
- A preview to the admin first.
- One personal email per person, with one button and their own task list.
- Reminders go only to people who have not finished.
- Every send asks for confirmation. No email ever goes to people without one.

### 5.6 Results (admin only)
- **Tabs:**
  - Progress;
  - Flags, with rater names for the admin;
  - Review decisions, where keep or exclude beats the automatic rules;
  - Results by person;
  - Heat map;
  - Departments;
  - Recognition;
  - Managers and teams;
  - Manager accountability;
  - Summary, a first indication that is never a decision;
  - Dashboard, with charts.
- **Automatic exclusions:** a rating nobody asked for, and the same extreme score on every item. The admin can bring
  either back.
- **Reports in a private folder:**
  - the admin's full copy per person;
  - the employee copy;
  - the organisation report.
  - Charts in each.

## 6. Privacy and safety rules
1. Data lives only in the organisation's own Google Sheet and Drive. The project has no server, no analytics and no third party.
2. The page runs with the admin's permission but shows each person only their own tasks and their own answers. Every admin action checks the admin's email first.
3. Minimum group size (default 3) for anything shown to the rated person. Smaller groups are merged into "others".
4. Employee copies contain no rater names, no emails and no warnings. An automatic test checks this.
5. Nothing is shared automatically. Reports are created in the admin's private folder.
6. The Claude Code path keeps the organisation's data in `org/`, which is never committed. What the admin types or pastes
   into Claude (names, work emails, reporting lines) is sent to Anthropic; the guides say so plainly, the setup never asks
   for ratings or comments, and the by-hand route needs no AI service at all.

## 7. What success looks like
| Measure | Target |
|---|---|
| Time for a non-technical admin to set up (team of 20, with Claude Code) | under 2 hours |
| Staff completion before the deadline | 90% or more |
| Time for a person to finish their self-evaluation | about 10 minutes |
| People with enough raters to receive results | 90% or more |
| Employee copies containing a rater's name | 0 (tested) |
| Words missing in Arabic or English | 0 (tested) |

## 8. Quality gates (every change)
Run with `npm test`:
- unit tests of the analysis and rules in both languages;
- the language check;
- a whole-flow test against fake Google services;
- public leak rules;
- a stop-and-continue browser test;
- a real-browser test of every example person in both languages.

## 9. Future list
- Sign-in by secret personal links, for organisations without Google Workspace.
- More languages (French, Spanish, Urdu, Turkish): one word-list file each.
- A comparison with the previous round per person.
- Optional anonymous open comments to the organisation as a whole.
- A ready template sheet ("Make a copy") so paste is not needed.
