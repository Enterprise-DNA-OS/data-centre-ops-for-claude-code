---
description: "Read docs/replace-sunbird-dctrack"
---

# import

Read docs/replace-sunbird-dctrack.md. Preview the whole export, reconcile totals, then repeat without --dry-run. Changed records require --update. Original columns are retained.

```bash
npm run centre -- import sunbird-dctrack --file=imports/items.csv --actor="Operator" --dry-run
```

Replace sample values with the operator's records. Read before writing. Use --json for structured results. If a reference is ambiguous, list the choices and ask. No sends or physical device control.
