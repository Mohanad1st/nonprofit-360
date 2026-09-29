# Security

nonprofit-360 handles personal data: names, work emails, and performance ratings with comments. It is built so that the
data never leaves the organisation's own Google account.

## Design
- **With Claude Code (optional):** what the admin types or pastes into Claude (names, work emails, who manages whom) is
  sent to Anthropic so Claude can answer. The setup never asks for ratings or comments. Organisations that cannot share
  a team list with an AI service should use the by-hand setup.
- **No server.** Everything runs in Google Apps Script inside the organisation's Google Workspace. The project has no
  analytics and no calls to any third party. The only outside request is optional: fetching the logo from the web
  address the admin sets.
- **Sign-in is Google's.**
  - The page is published "Execute as: me" with "Who has access: anyone within the organisation".
  - It identifies each person from their Google account; people cannot choose who they are.
- **The admin check.**
  - Google lets a published page call any public function, so every public function except `doGet`, `submitEval` and
    `saveDraft` starts with `requireOwner_()`. A test enforces this.
  - `submitEval` and `saveDraft` accept only the signed-in person's own tasks. They validate everything on the server.
- **Confidentiality.**
  - Each person's page receives only their own tasks and answers.
  - Employee reports contain no names, emails or warnings; a test checks this.
  - Groups below the minimum size are merged.
- **Paper entries** are possible only for the admin, only for people without an email, and are marked as entered by the admin.

## Permissions Google will ask for, and why
| Permission | Why the tool needs it |
|---|---|
| See and edit your spreadsheets | Read the team and write answers and results into the evaluation sheet |
| See, edit and create Google Docs | Write the reports and paper forms |
| See and edit files in Google Drive | Create the private reports folder next to your sheet, and read the logo if it is a Drive file |
| Send email as you | Send the invitations, reminders and your preview (only when you press the button) |
| Connect to an external service | Only to fetch your logo, if you give a web address for it |
| Show things inside Google apps | The menu, the setup panel and the dialogs |

## Keeping it safe (for the admin)
- **Anyone who can edit the evaluation sheet can also change its script and make themselves admin.** Keep the sheet
  private to the admin; share results by sharing individual report files, never the sheet.
- Do not share the control sheet or add editors. Anyone who can edit it can read every answer.
- Keep the published page on "anyone within the organisation", never "anyone".
- Use a work account with two-step verification.
- If you used Claude Code: the `org/` folder holds your team list. It is ignored by git. Delete it when you no longer need it.

## Reporting a vulnerability
Please **do not open a public issue**. Use GitHub's private vulnerability reporting on this repository (Security →
Report a vulnerability). Describe it with the made-up example team only. We aim to reply within 7 days.

## Audit
The latest security and production-readiness audit, with every finding and its fix, is in [docs/SECURITY-AUDIT.md](docs/SECURITY-AUDIT.md).
