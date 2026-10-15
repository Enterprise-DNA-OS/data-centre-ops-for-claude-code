# Data Centre Operations for Claude Code

Know what is in each cabinet, what fits next and which change needs review. Asset records, capacity checks and site paperwork in a database you own.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install and explore the fictional demo. | Your cabinet rules, exports, reports, connections and approved workflows. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=sunbird-dctrack) · [Instead of Sunbird dcTrack](https://enterprisedna.co/omni/instead-of/sunbird-dctrack?utm_source=github&utm_medium=readme&utm_campaign=sunbird-dctrack)

## Quick start

Node 20 or later. No separate database installation is required for the local demo.

```bash
git clone https://github.com/Enterprise-DNA-OS/data-centre-ops-for-claude-code.git
cd data-centre-ops-for-claude-code
npm install
npm run demo
npm run centre -- weekly-review
npm run view
npm run docs
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. AGENTS.md points at the same operating rules as CLAUDE.md. PGlite stores local records under .data/. DATABASE_URL selects PostgreSQL for trusted operators. Never seed a shared database.

The fictional Harbour Hosting demo has Auckland and Wellington cabinets, production and backup devices, a network link, an overdue audit, missing ownership, declared power over budget and a late electrical change without practitioner evidence. Demo dates are relative to today. Repeating the seed preserves existing records.

## The weekly rituals

Start Monday with /racks, /attention and /change-window, then /weekly-review. Before allocating space, use /capacity. Review /audit-due and /warranty-review with the asset register. Use /plan-change, /approve-change and /complete-change to record the request, independent review and completed work. /draft-work-order prepares paperwork without sending it.

32 CLI commands and 36 slash-command recipes. Each CLI command accepts --json. Names are case-insensitive, site/name disambiguates devices and cabinets, and partial UUIDs work. Ambiguous references list choices and exit 1. Every mutation requires --actor. Read the matching recipe before acting.

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
- /docs, /view, /customise and /new-view: branded paperwork, reports and tested customisation.

## What a capacity answer means

Installed and planned assets consume declared rack units and watts. The capacity command finds contiguous space, rejects overlaps and refuses a fit when cabinet limits or existing device inputs are unknown. Retired and stored devices do not consume installed space. Planned change requests are requests, not capacity reservations. Completion rechecks capacity because another allocation can arrive after approval.

This is a records and planning base, not a claim to reproduce every dcTrack feature. It does not discover hardware, poll sensors, model cooling or redundant feeds, control power, or infer service dependencies. Impact means recorded direct neighbours only. Watts are declared allocations, never measured draw or electrical ratings. A fit does not authorise installation.

## Ten questions this build answers

These are runnable examples, not claims that Sunbird cannot answer them. Sunbird supports custom reports too.

1. Which cabinets can take a four-unit device with a declared 1200-watt allocation? Run `capacity --height=4 --power-w=1200`.
2. Which capacity answers are blocked by missing facts? Run `attention`.
3. Which installed devices have gone more than 90 days without a recorded audit? Run `audit-due`.
4. Which change requests are overdue or awaiting review? Run `change-window`.
5. Which directly connected devices need a review before we move this server? Run `impact --ref=AKL-DB01`.
6. Which business owners have unknown power allocations? Run `owner-review`.
7. Which warranties have expired or end within 60 days? Run `warranty-review`.
8. Which electrical change records lack practitioner evidence? Run `compliance`.
9. Who changed a record and when? Run `activity`.
10. What belongs in the Monday capacity and change review? Run `weekly-review`.

## Bring your records

```bash
npm run centre -- import sunbird-dctrack --file=imports/items.csv --actor="Your name" --dry-run
npm run centre -- import sunbird-dctrack --file=imports/items.csv --actor="Your name"
```

The supported CSV import brings across cabinet and item records. It preserves item source columns, rejects malformed rows atomically and requires --update to replace changed records. Unknown dimensions and power stay unknown. Use an empty database for a real import, not the demo database. [Export steps, field mapping and limits](docs/replace-sunbird-dctrack.md).

## Documents, views and record checks

Edit brand.json once. npm run docs produces draft change work orders and asset audit sheets. npm run view produces weekly, rack-register and controls reports. Generated files stay outside Git. Print reviewed HTML to PDF from your browser.

/compliance checks internal record policy and missing New Zealand electrical-work references. It never certifies work, decides applicable law or proves a licence is current. [Rules, official sources and jurisdiction limits](docs/compliance.md). [What a front end adds](docs/why-no-front-end.md).

Actor names are attribution, not authenticated identity. Database owners can edit history. Production use needs controlled database access, backups and the site's own approval procedures. No sends, physical controls or remote device writes are implemented. Corrections use update; a physical move follows the change workflow.

## Your first hour: ten things to ask for

1. Put our name and logo on the work order.
2. Preview the actual item export before writing anything.
3. Map our visible export columns.
4. Record our cabinet sizes and planning budgets from the site plan.
5. Add our business owners.
6. List assets missing a recent audit.
7. Find room for the next approved device allocation.
8. Show neighbours connected to the server we plan to move.
9. Prepare the Monday review and a draft work order.
10. Add our inspection interval as a tested rule.

/customise writes a migration and tests the requested behaviour. /new-view adds a read-only report. No application front end is required for these workflows.

## Price context

Sunbird publishes dcTrack at US$19.50 per cabinet per month, US$234 per cabinet annually. The offer is US-only and subscriptions require an annual commitment paid up front. Users, sites and assets are unlimited. These are not ANZ quotes. [Vendor pricing](https://www.sunbirddcim.com/pricing), checked 14 October 2026. [Selection evidence and scores](docs/research.md).

## Verification

npm test uses an isolated temporary database and exercises every CLI command, placement and power arithmetic, stale audits, change approval, practitioner and certificate references, port uniqueness, ambiguous names, import rollback and idempotency, source retention, complete exports, draft files and escaped HTML. It refuses a nonempty TEST_DATABASE_URL database. CI defines Node 20/22 on Windows and Linux, plus PostgreSQL 17. Check the actual workflow result before claiming platform verification.

MIT. Not affiliated with Sunbird or Anthropic. Hosting and agent usage have their own costs. Enterprise DNA brings across the agreed records, builds the business rules and operates the custom version through Omni by Enterprise DNA for one setup fee, then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=sunbird-dctrack).
