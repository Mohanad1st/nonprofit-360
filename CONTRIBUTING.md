# Contributing

Thank you for helping nonprofits run fairer evaluations. Contributions of every size are welcome: wording, translations,
bug fixes, and new features.

## Most useful right now
- **Native-speaker review** of the Arabic (`src/Strings.ar.gs`, `src/Bank.gs`, `docs/ar/`) and English texts.
- **New languages**: see [Customising → Adding a language](docs/en/customizing.md#adding-a-language).
- **Bug reports**. Always use the made-up example team; never paste real names or answers.

## How to work on the code
1. `git clone` the project. You need Node 22 or newer and Google Chrome for the browser tests.
2. Change files in `src/`, never `dist/Code.gs` (it is generated).
3. `npm run test:fast` while you work. Before a pull request, run `npm test` and `npm run build`, and commit the updated `dist/Code.gs`.
4. **Every word people see** goes in both `src/Strings.en.gs` and `src/Strings.ar.gs`, in the same change. `test/i18n.js` checks it.
5. **Every public function** (no trailing `_`) must start with `requireOwner_()`, unless it is `doGet`, `submitEval`,
   `saveDraft` or `onOpen`. The personal page runs with the admin's rights. `test/smoke.js` checks it.
6. **Values the analysis compares** are codes (`WEEKLY`, `SET_NO`, `KEEP`), never translated labels.
7. **No real data, ever.** Tests and examples use `@example.org`. `test/leaks.js` refuses real-looking emails, Google ids and secrets.
8. Arabic output must be truly right-to-left. For Google Docs, never set RIGHT alignment on RTL paragraphs: in RTL, "right" means "end".

## Pull requests
- One change per pull request, with a plain description of what it does for users.
- Mark new Arabic or English wording as "needs native review" in the description.
- CI runs the full test suite and a secret scan.
