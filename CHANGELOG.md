# Changelog

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
