# Record checks and their sources

Checked 14 October 2026. The `compliance` command reports exceptions, not a certificate or a conclusion that a facility complies with law. It does not direct electrical work. A qualified person determines which rules apply to the actual work and jurisdiction.

| Rule | Record check | Basis and limit |
|---|---|---|
| OPS-01 | Missing owner, stale audit, incomplete dimensions, overlapping placement, declared power over budget, overdue follow-up or change | Internal demo operating policy. The 90-day audit interval is configurable policy, not a statutory deadline. Watts are recorded allocations, not measured demand or an electrical circuit rating. |
| NZ-ELEC-01 | Electrical change lacks a practitioner reference | [WorkSafe: getting electrical work done](https://www.worksafe.govt.nz/managing-health-and-safety/consumers/safe-living-with-electricity/getting-electrical-work-done/). Prescribed work requires an authorised practitioner. The CLI records the operator's verification reference, not a live licence lookup. Approval is blocked if it is absent. |
| NZ-ELEC-02 | Completed electrical change marked certificate-required lacks its reference | [WorkSafe: construction and certification](https://www.worksafe.govt.nz/topic-and-industry/electricity/installations-and-networks/low-voltage-electrical-installations/construction-and-certification/), and [WorkSafe high-risk database](https://portal.worksafe.govt.nz/eghrd/). The responsible practitioner classifies the work and required documents. Completion is blocked when a certificate was marked required and no reference is supplied. |

A work order is not a Certificate of Compliance, Electrical Safety Certificate or Record of Inspection. The software does not issue any of them, submit a statutory record, verify licence validity or decide that an electrical installation is safe. Record all required documents in the evidence reference and keep their originals.

NZ checks are a starting record checklist. Australian sites need rules scoped to their state or territory with their qualified adviser. No Australian certification claim is made. Site change procedures, isolation, permit-to-work and emergency response remain with competent people.

Approvals require a different actor name from the requester and preserve before/after records. Identity is supplied by a trusted operator, not proven by an authentication service. Configure authenticated roles before sharing a production database. RLS is enabled with no public policies; database-owner access is needed for this operator tool.
