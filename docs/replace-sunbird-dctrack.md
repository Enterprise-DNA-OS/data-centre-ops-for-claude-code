# Bring a dcTrack item export across

The supported switch is the item register, followed by review of rack limits and working procedures. It is not a migration of the full dcTrack installation or Power IQ telemetry.

1. In dcTrack, open the Assets Items List. Select the records and visible columns needed for the migration, including Location, Item Name or Name, Cabinet, Class, Status, U Position, RU Height and Serial Number. Include owner, make and model where available.
2. Choose Export Items Exactly as Shown and All pages after checking the filters. Use Export to CSV, save the file under imports/, and keep an unchanged original. The [vendor user guide, export section around printed page 432](https://s3.amazonaws.com/dcTrack.Docs/dcTrack_6.0.3_GA/dcTrack_6.0.3_User_Guide.pdf) documents exporting the item list. This is an older guide reopened on 14 October 2026; the menu and column labels vary by installed version. A [later vendor release note](https://www.sunbirddcim.com/blog/introducing-dctrack-90) also documents CSV chart-detail exports. This importer expects item-list records, not aggregated charts.
3. On an empty local database run npm run migrate, then preview:

```bash
npm run centre -- import sunbird-dctrack --file=imports/items.csv --actor="Your name" --dry-run
```

4. Reconcile the row count and preview. Apply the same command without --dry-run. A changed existing record requires --update. Imports are atomic; malformed dates, numbers, duplicate identities or unknown statuses roll back every row. No email, API credentials or vendor account is needed.

| Export columns | Record mapping |
|---|---|
| Location or Site; Item Name or Name | Site and asset identity, retained exactly |
| Cabinet | Cabinet at that site; missing cabinet dimensions stay unknown |
| Class or Item Class = Cabinet | Cabinet definition; RU Height sets its size, power stays unknown |
| U Position / UPosition / RU Position | Starting rack unit |
| RU Height / RUHeight / Height (U) | Asset or cabinet height |
| Power Budget (W) / Power Allocation (W) | Optional explicit watt allocation; these are supported enrichment columns, not a promise that the standard export has them |
| Status / Item Status | Installed, Planned, Storage, In Storage, Archived or Retired, case-insensitive |
| Owner / Customer, Serial Number / SerialNumber, Make, Model | Descriptive fields |
| All item columns | Original source object, including custom columns |

An unchanged reimport does not duplicate devices. Site and name are the key; renames need an explicit operator mapping. Every original CSV row, including custom cabinet columns, is retained with its import batch. Keep the original file as well. Imported records can be incomplete: the attention report makes missing dimensions, power, ownership and audits visible. A cabinet name is never assumed to mean a 42U cabinet.

Then run inventory, attention and compliance. Set cabinet units and planning budgets with set-rack and evidence. Enrich asset power allocations with update. Record a real audit with audit. Verify rack occupancy against the original export and site inventory before relying on capacity answers. Do not use the seeded fictional database for real imports.

Separate exports or mapping are required for ports, circuits, connections, audit history, changes, attachments and library models. The free importer does not reconstruct those from item rows. Zero-U, blade and half-width layouts need a domain extension before planning. Live power and environmental readings are not imported. Enterprise DNA maps these agreed sources into a custom version.

One import command brings the supported item records across in a day; full operational cutover follows reconciliation and site acceptance. Export returns all database records as a versioned JSON snapshot; it is not a dcTrack restore file. Back up the database as well as the originals.
