---
description: "Record an audit already performed"
---

# audit

Record an audit already performed. Never assert that a physical check happened without evidence.

```bash
npm run centre -- audit --ref="AKL-DB01" --date=YYYY-MM-DD --actor="Operator" --evidence="Verified asset label and cabinet location"
```

Replace sample values with the operator's records. Read before writing. Use --json for structured results. If a reference is ambiguous, list the choices and ask. No sends or physical device control.
