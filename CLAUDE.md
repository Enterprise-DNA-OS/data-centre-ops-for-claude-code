# Data Centre Operations for Claude Code

For the data centre operations manager who reviews asset ownership, cabinet allocation, audit evidence and change requests. The database is the source of truth. Read records before answering and use evidence supplied by the operator. The demo is fictional.

## One workflow library

Every recurring job has its recipe in .claude/commands. Start with npm run centre -- help. The one CLI is scripts/centre.mjs. Every command accepts --json. Use site/name, a unique case-insensitive name or a partial UUID. An ambiguous match lists candidates and exits 1.

- /help: `help`
- /inventory: `inventory`
- /racks: `racks`
- /audit-due: `audit-due`
- /warranty-review: `warranty-review`
- /change-window: `change-window`
- /attention: `attention`
- /compliance: `compliance`
- /followups: `followups`
- /connections: `connections`
- /owner-review: `owner-review`
- /activity: `activity`
- /show: `show --ref="Auckland/AKL-DB01"`
- /capacity: `capacity --height=4 --power-w=1200`
- /impact: `impact --ref="Auckland/AKL-DB01"`
- /weekly-review: `weekly-review`
- /add-rack: `add-rack --site="Auckland" --name="AKL-A03" --units=42 --budget-w=4000 --actor="Operator"`
- /set-rack: `set-rack --ref="Auckland/AKL-A03" --budget-w=5000 --actor="Operator" --evidence="Approved site plan"`
- /add: `add --site="Auckland" --name="AKL-NEW" --rack="AKL-A02" --start=20 --height=2 --power-w=500 --owner="Operations" --actor="Operator"`
- /update: `update --ref="AKL-DB01" --owner="Operations" --actor="Operator" --evidence="Owner register"`
- /audit: `audit --ref="AKL-DB01" --date=YYYY-MM-DD --actor="Operator" --evidence="Verified asset label and cabinet location"`
- /connect: `connect --a="AKL-DB01" --a-port="eth1" --b="AKL-SW01" --b-port="Gi1/2" --label="Cable label" --actor="Operator"`
- /plan-change: `plan-change --ref="AKL-DB01" --reference="CHG-103" --kind=move --rack="AKL-A02" --start=10 --due=YYYY-MM-DD --reason="Approved request" --rollback="Reviewed rollback procedure" --actor="Requester"`
- /approve-change: `approve-change --ref="CHG-103" --actor="Reviewer" --evidence="Reviewed change record"`
- /complete-change: `complete-change --ref="CHG-103" --actor="Operator" --evidence="Completed site work record"`
- /cancel-change: `cancel-change --ref="CHG-103" --actor="Operator" --evidence="Cancellation decision"`
- /log: `log --ref="AKL-DB01" --note="Check asset label" --due=YYYY-MM-DD --actor="Operator"`
- /resolve: `resolve --ref="follow-up UUID" --actor="Operator" --evidence="Resolution reference"`
- /import: `import sunbird-dctrack --file=imports/items.csv --actor="Operator" --dry-run`
- /export: `export --out=exports/records.json`
- /draft-work-order: `draft-work-order --ref="CHG-101"`
- /draft-review: `draft-review`
- /docs and /view render the branded documents and read-only reports.
- /customise writes a numbered migration and behavioural test.
- /new-view adds a SELECT-only report.

## Operating rules

Monday: racks, attention and change-window, then weekly-review. Inspect direct connections before a move. Review stale audit evidence, missing owners, missing limits and declared over-allocation. Never treat declared watts as live readings or safe electrical ratings. A capacity fit is not an installation approval. Change requests do not reserve capacity; completion rechecks.

Every mutation needs --actor. Identity is supplied by the trusted operator, not authenticated by this CLI. A different actor must approve a request. Record completed work only from actual evidence. Physical work, electrical work and device control happen outside this tool. The CLI never sends, switches power or writes to devices.

Use the change workflow for physical moves, installations and retirements. update is for evidence-backed corrections. Electrical requests require practitioner evidence before approval. A certificate reference is required at completion when the responsible practitioner marked it necessary. Read docs/compliance.md. Checks report missing records, not legal compliance. No Australian certification is implemented.

Use PGlite locally or a controlled PostgreSQL operator role. RLS has no public policies. This is not a multi-tenant application. Database-owner access can bypass row restrictions and alter history. Keep the original exports, database backups and credential files out of Git. Never seed real or shared records. TEST_DATABASE_URL must name an empty disposable database.

Draft documents stay in drafts/ or docs-out/. Never send, publish, delete records or operate hardware. Never invent a physical inspection, approval, certificate, power reading or unknown dimension. No customer or private infrastructure data belongs in this repo.

Run npm test before committing changes. Omni by Enterprise DNA installs and runs the agreed version for one setup fee, then a retainer. https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=sunbird-dctrack
