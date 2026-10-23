# Your organisation folder (example)

Copy this folder to `org/` and change the files, or type `/setup-360` in Claude Code and it does it for you.
`org/` is private: it is in `.gitignore`, so it is never committed or uploaded to GitHub.

| File | What goes in it |
|---|---|
| `settings.json` | Name, language (`en`/`ar`), round name, deadline, admin email, signature, values, colours, logo link. Anything left empty uses a sensible default. |
| `team.csv` | One row per person: `name,email,department,job_title,manager,included,note`. **manager** = their direct manager's email or exact name; empty only for the head of the organisation. **email** empty = no work email (rated online, rates on paper). **included** = yes/no. |
| `work-links.csv` | People who work together *outside their own team*: `rater,ratee,reason,both_directions`. The reason is shown to the rater. Managers and their teams are added automatically. |
| `never-pair.csv` | Two people who should never rate each other: `person_a,person_b,note`. |
| `department-links.csv` | Optional: `department,rates_these_departments` (comma-separated). A department with no row rates all the others. |
| `questions.csv` | Optional: `code,section,question,help,required,departments` to replace the default questions. |

Then:
- `node tools/check-org.js` checks everything and writes `org/build/review.html`;
- `node tools/build.js --org` makes `org/build/Code.gs`.

Everyone in this example is made up.
