---
description: "Add a planned asset only from supplied details"
---

# add

Add a planned asset only from supplied details. Placement must pass the record checks.

```bash
npm run centre -- add --site="Auckland" --name="AKL-NEW" --rack="AKL-A02" --start=20 --height=2 --power-w=500 --owner="Operations" --actor="Operator"
```

Replace sample values with the operator's records. Read before writing. Use --json for structured results. If a reference is ambiguous, list the choices and ask. No sends or physical device control.
