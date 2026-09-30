# Frequently asked questions

## Do we have Google Workspace?
If your work email ends in your organisation's own name (not @gmail.com) and you read it at mail.google.com, you have
Google Workspace. Not sure? Ask whoever set up your email. If you don't have it, registered nonprofits can get it free
through [Google for Nonprofits](https://www.google.com/nonprofits/); approval can take days to weeks, so start early.

**Is it really free?**
The tool is: it is open source (MIT licence) and runs inside your own Google Workspace, with nothing to host and nothing
to pay. The optional Claude Code helper needs a paid Claude plan; setting up by hand costs nothing.

**Where is our data stored?**
The answers and results live only in your Google Sheet and a private folder in your Google Drive. The project has no
server and no analytics. If you set up with Claude Code, what you type or paste into Claude (names, work emails, who
manages whom) is sent to Anthropic so Claude can answer you; ratings and comments never are.

**Can staff see each other's answers?**
No. Each person's page shows only their own tasks and their own answers. Only the admin sees individual answers.

**Can the person being rated find out who rated them?**
- The employee copy has no names.
- Groups smaller than the minimum (default 3) are merged into "others".
- Anyone with fewer raters gets no score summary.
- Written notes may reach the person without names, so ask raters to avoid details that give them away.

**Can someone fill it in for someone else?**
No. The page knows who opened it from their Google account. Only the admin can enter a paper form, and only for someone
without an email; those answers are marked as entered by the admin.

**What if someone has no work email?**
- They are rated online like everyone else.
- They rate others on a printed form: menu «Make paper forms for people without email».
- The admin types their answers in afterwards.

**What if someone stops halfway?**
Their answers save automatically every few seconds. They can come back later, on any device, and continue. They can also
edit after sending, until the deadline.

**How many people should rate each person?**
At least 3, so results can be shown without revealing raters. Usually 4–8 is best. The check tells you who would have too
few and who would have too many to rate.

**Can we use our own questions?**
Yes. Reword, add or switch off questions in the Questions tab. See [Customising](customizing.md).

**Does it work in Arabic?**
Yes, fully right-to-left: the page, emails, sheet, reports and paper forms. The Arabic text was drafted with AI help; have
a native speaker read it before your first round.

**Can we use it with personal Gmail accounts?**
Not yet. The page relies on Google Workspace to know safely who is who. Signing in with secret personal links is on the future list.

**How many emails can it send?**
Google limits emails per day: about 1,500 for Workspace accounts, and fewer for new accounts. For a small team it is never a problem.

**We changed something and people still see the old page.**
Publish a new version: Deploy → Manage deployments → pencil → Version: New version → Deploy. See [Troubleshooting](troubleshooting.md).

**Should results decide pay or contracts?**
The tool gives evidence for a human conversation, not decisions. If results will inform decisions, say so openly
beforehand, and always read them together with other evidence. See [Ethics and privacy](ethics-and-privacy.md).

**How do we stop, or remove everything afterwards?**
1. To stop the page: **Extensions → Apps Script → Deploy → Manage deployments**, choose the deployment → **Archive**.
   The link stops working at once.
2. To delete the data: delete the evaluation sheet and the reports and paper-form folders in Google Drive, then empty
   the Drive bin.
3. If you used Claude Code: delete the `org` folder inside the project folder on your computer.

**Where do we get help?**
Type `/fix-360` in Claude Code, read [Troubleshooting](troubleshooting.md), or open an issue on the project's GitHub
page (a free GitHub account is needed). Never include real names, emails or answers.
