# Changelog

## 1.2.0 — 2026-10-01
Easier to start, and more useful after the results.

- **Try-it demo:** the real staff page with a made-up team, in English and Arabic, in any browser, with no sign-in (`docs/demo/`, built by `tools/demo.js`).
- **Ask managers who works with whom:** one email per manager with a link to a short page; for each person in their team they pick the colleagues they work with outside the team, and on what. Answers go straight into «Work links», marked with the manager's name. Only a manager, only for their own team, only real colleagues.
- **Role questions:** ready-made questions for field teams, finance and admin, management and volunteers, switched off until the admin turns them on for their departments. They are rated and reported for those people only, and kept apart from the 8 core questions so comparisons stay fair.
- **After the results:** a conversation guide in each admin copy, an agreed-actions table in each employee copy, an «Agreed actions» tab, a one-click calendar reminder about 3 months later, and «Follow up agreed actions», which emails each manager the open actions of their team.

## 1.1.0 — 2026-09-30
Easier for people who are not technical.

- **Pictures for every admin step:** the setup side panel, the 360 menu and Start here tab, Google's permission screens, and publishing the page (numbered like the steps).
- **Paper forms:** a new menu item, «Enter answers from paper forms», shows one link per person. There is no more typing `?as=` onto an address.
- **Honest guide:** Claude's price is stated; time now includes asking managers who works with whom; Claude asks before each step; Git on Windows.
- **Troubleshooting:** what to send your Google administrator if scripts are blocked.
- **Privacy:** says plainly that editors of the sheet and Workspace super administrators can see answers.
- **Arabic tab names** use spaces instead of underscores. Sheets set up with 1.0.0 are still found, and are renamed the next time you save the setup.
- The publish window's steps now match the guide's numbering.
- **First-time path:** tell the team first (the ready announcement now says to open the invitation with the work account), how to know the invitations went out, which folder to choose after unzipping, Git listed up front on Windows, the "Select all" box on Google's permission screen, and the new sheet's link printed after the automatic upload.
- **Tidier docs:** one Arabic note on AI-drafted wording, the product document moved to the developer links, the security review kept as a dated record, and the picture scripts documented for contributors.

## 1.0.0 — 2026-09-29
First public release.

- **Personal evaluation page:** one page for everyone, in English or Arabic (fully right-to-left). It saves as people type, so they can stop and continue on any device.
- **Setup:** a side panel in the sheet, tabs with plain explanations, and checks that explain problems in plain words.
- **Pairings:** every pairing has a written reason; managers ↔ teams, managers ↔ managers, and the work links you add. "Never pair" removes a pair in both directions.
- **Manager accountability questions**, with mirror questions for team members.
- **Results:**
  - progress, flags and review decisions (keep or exclude);
  - results by person, heat map, departments, recognition, managers and teams;
  - summary and a dashboard with charts.
- **Reports:**
  - an admin copy and an employee copy per person (no names, no warnings, small groups protected);
  - an organisation report.
  - Reports are made in rounds for large teams.
- **Paper forms** for staff without email; the admin enters them.
- **Invitations and reminders:** they respect Google's daily email limit and never reach anyone twice.
- **«Start a new round»** for next year.
- **Claude Code setup:** `/setup-360`, `/customize-360`, `/run-cycle`, `/fix-360`.
- **Security:**
  - a formula-injection guard;
  - an admin check on every command;
  - server-side validation;
  - a leak test for employee copies.
  See [docs/SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md).
