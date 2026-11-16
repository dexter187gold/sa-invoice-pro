# SA Invoice Pro — User guide (beta)

**App:** https://sa-invoice-pro.pages.dev/  
**Version:** 6.68.0 public beta

---

## Getting started checklist

1. [ ] Open the app (web, Android, or Windows)
2. [ ] Save company profile + VAT setting
3. [ ] Add at least one client with a mobile number
4. [ ] Create a test quote or invoice and open the PDF
5. [ ] Download a JSON backup from Settings → Backup
6. [ ] (Optional) Install as PWA / home-screen app

---

## Daily workflow

### Invoices

- **New invoice** → client → lines → save
- Mark paid from the invoice list or payment flows
- Share PDF or WhatsApp reminder from the document actions

### Quotes

- Create quote → send to client → convert to invoice when accepted

### Tickets (jobs)

- Open ticket → update status / notes → invoice when the job is done

### Clients

- Keep phone numbers in international or local SA format for WhatsApp
- Statement / chase tools use the client’s contact details

### Backup & restore

| Action | Where |
|--------|--------|
| Download full backup | Settings → Backup → download |
| Import backup | Settings → Backup → choose file |
| Local recovery snapshot | Settings → Backup → recovery list |

Import of large files streams in chunks. If a restore fails, your previous workspace stays intact.

---

## VAT (South Africa)

- Default rate **15%**
- Toggle VAT on/off in Settings
- Preference applies to new invoices, quotes, and PDF totals

---

## Tips for workshops

1. Use **Tickets** for in-progress repairs; invoice only when collecting payment
2. Save a backup before big clean-ups or bank imports
3. Prefer **PWA** on shared shop PCs so every machine opens the same URL
4. On Android, keep one JSON backup in Google Drive weekly

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Blank screen after update | Hard refresh (Ctrl+Shift+R) or clear site data once |
| Import seems stuck | Leave the tab open; large files stream slowly on phones |
| Windows SmartScreen warning | More info → Run anyway (unsigned beta) |
| APK install blocked | Allow unknown sources for your browser/files app |
| Lost data after reinstall | Restore from your JSON backup |

Support: **sainvoicepro@gmail.com**
