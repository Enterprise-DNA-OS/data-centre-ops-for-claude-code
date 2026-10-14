---
description: "Write the agreed change"
---

# plan-change

Write the agreed change. For electrical work use --kind=electrical and --licensed-worker="Verified practitioner reference". Set --coc-required only when the responsible practitioner identifies that requirement. No work is executed.

```bash
npm run centre -- plan-change --ref="AKL-DB01" --reference="CHG-103" --kind=move --rack="AKL-A02" --start=10 --due=YYYY-MM-DD --reason="Approved request" --rollback="Reviewed rollback procedure" --actor="Requester"
```

Replace sample values with the operator's records. Read before writing. Use --json for structured results. If a reference is ambiguous, list the choices and ask. No sends or physical device control.
