# Troubleshooting

With Claude Code, type `/fix-360` and describe what you see.

## The menu does not appear
- Reload the sheet and wait 10 seconds.
- Check that the code was saved: Extensions → Apps Script. The file should start with "nonprofit-360".
- If it still does not appear, Google may be waiting for your permission: open **Extensions → Apps Script**, press **Run** at the top, and allow. Then reload the sheet.

## "Google hasn't verified this app"
This is normal for a script your organisation owns. Press **Advanced → Go to (your project) (unsafe) → Allow**. It runs
only in your account.

## "Not allowed: only the evaluation admin can do this"
The person using the menu is not the **Admin email** in the Settings tab. Sign in with the admin account, or correct that row.

## Staff see "This page is for the team of … only"
- They opened the link with a personal Google account. Ask them to open it in a browser where only their work account is
  signed in, or in a private window.
- Or they are not in the Team tab, or are marked "no" under Included.

## Staff see "You need access" or "Sorry, unable to open the file"
The page is not published for everyone in the organisation:
1. Extensions → Apps Script → Deploy → Manage deployments.
2. Press the pencil. **Who has access:** Anyone within (your organisation).
3. Version: New version → Deploy.

## People see old wording after a change
A new version was not published. Deploy → Manage deployments → pencil → Version: **New version** → Deploy.
Check that the dialog shows a *new* version number: the dropdown can quietly stay on an old version. The page address
stays the same.

## The check says a manager is missing
The Manager cell must be the manager's email, or their name written *exactly* as in the Team tab.

## Someone has fewer than 3 raters
Add a real work link in the Work links tab: someone who really works with them. Then make the pairings again. If there
is truly nobody else, their results will be discussed in a conversation rather than shown as scores. That is on purpose.

## Emails did not arrive
- Look in the admin's Gmail **Sent** folder.
- Ask people to check Spam and Promotions.
- Google limits emails per day (about 1,500 for Workspace accounts, fewer for new accounts).

## The logo does not show
- Google Drive link: the admin's account must be able to open the file.
- Web address: it must be a direct link to an image (ending in .png or .jpg).
- Very large images (over about 900 KB) are skipped. Use a smaller version.

## "Reports made for some people so far"
That is on purpose: Google limits one run to 6 minutes. Choose **Make the reports** again; it continues in the same folder.

## Charts are missing in the reports
Chart images need Google's chart service. Run «Make the reports» again. If they are still missing, the tables are all
still correct; open an issue on GitHub (without any real names or data).

## Automatic upload with Claude Code
Easiest: type `/fix-360` in Claude Code and paste the message you see. Otherwise:
- **"User has not enabled the Apps Script API":** open https://script.google.com/home/usersettings, switch it on, wait a
  minute, try again.
- **Login problems:** `npx --yes @google/clasp@3.4.1 logout`, then `login` again with the admin's work account.
- **Anything else:** use copy and paste instead. Put `org/build/Code.gs` (or `dist/Code.gs`) into Extensions → Apps Script.

## Numbers look wrong
- Run **Update results** again.
- Check **Review decisions**: a keep or exclude there changes the numbers.
- Check **Flags**: automatically excluded ratings are listed there.
