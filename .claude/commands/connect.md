---
description: "Record a connection already verified"
---

# connect

Record a connection already verified. The command does not connect or configure hardware.

```bash
npm run centre -- connect --a="AKL-DB01" --a-port="eth1" --b="AKL-SW01" --b-port="Gi1/2" --label="Cable label" --actor="Operator"
```

Replace sample values with the operator's records. Read before writing. Use --json for structured results. If a reference is ambiguous, list the choices and ask. No sends or physical device control.
