# Why there is no front end

This base is for a data centre operator reviewing racks, asset ownership, planned allocations, change requests and audit evidence. The records stay in a database the operator owns. The agent runs the recurring work and renders read-only reports.

The free version has no mobile scanning, offline field capture, drag-and-drop rack elevations, live sensor polling, device discovery, remote power control, service topology inference or redundant-feed simulation. It uses top-level rack units and declared watts. It does not model blades, half-width devices, zero-U placement or cooling. Keep the engineering and monitoring tools required to operate the facility.

An operator can use the records and review paperwork without a front end. Enterprise DNA scopes connections, a web front end, phone workflows and a different stack for a custom version when required. No capability is present merely because it can be built.

PGlite runs locally. PostgreSQL can host the same schema for trusted operators. Roles and network access must be configured for that deployment. This is not a public or multi-tenant application. The actor field records attribution but does not authenticate a reviewer. Database owners can edit history.

Omni by Enterprise DNA installs and runs the agreed version for one setup fee, then a retainer.
