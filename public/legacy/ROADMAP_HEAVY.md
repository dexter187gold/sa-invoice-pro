# Deferred / heavy items (not fake-implemented)

## Full SARS eFiling / e@syFile
Requires SARS APIs, certificates, employer registration and ongoing tax-table maintenance.
Status: **not in 2.1.0** — payroll remains indicative.

## Cryptographic QES PDF signing
Requires accredited certificates and legal process under ECT Act.
Status: operational attestation only (name/title/date).

## Separate native codebase per industry
Current design: one engine + `profiles/*.json`. Native forks multiply cost massively.
Status: profile packs only.

## Silent update with no user click
Requires Windows Service installed with elevation.
Status: launcher auto-update with user click + progress (2.0.3+). Backup before apply in 2.1.0.
