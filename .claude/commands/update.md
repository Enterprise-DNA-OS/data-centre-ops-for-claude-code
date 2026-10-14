---
description: "Correct asset records from evidence"
---

# update

Correct asset records from evidence. Use the change workflow for a physical move or retirement.

```bash
npm run centre -- update --ref="AKL-DB01" --owner="Operations" --actor="Operator" --evidence="Owner register"
```

Replace sample values with the operator's records. Read before writing. Use --json for structured results. If a reference is ambiguous, list the choices and ask. No sends or physical device control.
