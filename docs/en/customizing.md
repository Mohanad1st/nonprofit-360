# Customising

Everything below can be changed in the sheet, with no code. With Claude Code, type `/customize-360` and describe what you want.

## Your identity
In the **Settings** tab, change the value of:
- **Organisation name**;
- **Tagline**;
- **Signature**;
- **Logo**: a Google Drive file link (the file must be viewable by the admin) or an image web address;
- **Main colour** and **Second colour**, as colour codes like `#1f5f8b`.

## Your values
**Value 1–4** and **What value N means here**. These are shown on the welcome page, in the email and on the paper form.
Leave a name empty to show fewer values. Write each meaning as what the value asks of people *in this evaluation*, for
example "Trust: rate only what you have seen yourself."

## Language
**Settings → Language:** `en` or `ar`. Then run **360 evaluation → 1) Setup and settings** and save. Tab names switch
language, and everything people see follows.

When you switch language after setting up, the **Questions** tab keeps its current wording. To get the default questions
in the new language, delete the Questions tab and run the setup again.

## Questions (the Questions tab)
| Column | Meaning |
|---|---|
| Code | The question's id. **Keep the codes of built-in questions**: the analysis uses them. For a new question, use a new code: C9 in the core section, L8 in leadership, S_X1 for a new open self-evaluation question. |
| Section | Core — everyone · Leadership — managers · Department → department · Rated by the manager only · Self-evaluation — open · Self-evaluation — managers · Manager's own part · Member about their manager · Notes when rating anyone. |
| Question | The words people see. Reword freely. |
| Explanation | One line per point. The first line is shown under the question; the rest appear under "More…". |
| Required | yes · no · if low (required only after a score of 1 or 2). |
| Only for departments | Optional. Department names separated by commas, to ask a question only there (for example a sales-target question for the sales team). |
| In use | Write "no" to switch a question off without deleting it. |

**Codes the analysis relies on:**
- C1 is responsiveness, used for the "slow to respond" flag.
- C2 is communication.
- L4 is owning the team's results, used for the manager signal.
- X1 is achieving what was expected.
- H_SET, H_DISC, H_DID and H_MINE are the manager's own part; M_SET and M_TOLD are the member's mirror answers.
- S_EXPECT, S_ACH and S_PLAN are used in the reports.
- O_START and O_KEEP are the notes.
You can reword all of these, but keep them in use.

## Rules (Settings tab)
| Setting | Default | Effect |
|---|---|---|
| Minimum group size | 3 | Results for a group, or for a person, are shown only with at least this many raters. Do not go below 3. |
| Managers rate each other | yes | The managers who report to the head of the organisation all rate each other. |
| Head rated by direct reports only | yes | The head of the organisation is rated only by the people who report to them. |
| Departments rate each other | yes | Each person also rates the departments their team works with (see Department links). |
| Shortest example allowed | 30 | Characters needed in an example after a 1, 2 or 5. |
| Advanced numbers | — | How sensitive the flags are. Change them only if you understand the effect. |

## The tool's own words (buttons, emails, reports)
These live in `src/Strings.en.gs` and `src/Strings.ar.gs`. Changing them needs a code change:
1. Edit both files, or use Claude Code.
2. Run `npm test`.
3. Build with `npm run build`.
4. Paste the new `dist/Code.gs` into your script.
5. Publish a new version.

## Adding a language
1. Copy `src/Strings.en.gs` to `src/Strings.xx.gs` and rename `STR_EN` to `STR_XX`.
2. Translate the values, keeping the keys and the `{placeholders}`.
3. Add the language in `tr_()` (`src/I18n.gs`), `lang_()` (`src/Settings.gs`) and the build order (`tools/lib.js`).
4. Add a default question bank for it in `src/Bank.gs`.
5. Make `test/i18n.js` check the new file, and run it.
