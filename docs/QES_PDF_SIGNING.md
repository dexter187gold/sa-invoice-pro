# Cryptographic / QES PDF signing (South Africa)

## Reality
A **Qualified Electronic Signature (QES)** under the ECT Act requires a certificate from an accredited authentication service provider (ASP), not only a drawn name on a PDF.

## Accredited providers (examples – verify current list)
- Search SAPO / Department of Communications accredited ASPs
- Commercial CAs offering SA digital certificates (e.g. providers such as LAWTrust and others – confirm accreditation yourself)

## What the app does
- **Operational attestation** (name, title, date) – already in PDFs.
- **Optional**: upload path documentation for future PKCS#12 integration.
- Browser-based true PAdES QES needs certificate + specialized libraries and is not “checkbox complete” without your cert.

## Practical workflow today
1. Generate tax invoice PDF from SA Invoice Pro.
2. Sign with your organisation’s approved digital signing tool / Adobe with company cert if you have one.
3. Or print and wet-ink where acceptable.
