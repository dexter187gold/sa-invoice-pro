# Batches G · H · I — shipped in one push

**Date:** 2026-11-18  
**Minimum:** 50 discrete updates per batch

## Batch G — Soft-delete completion + OPFS viewer (≥50)

1–10. Soft-delete job cards → recycle bin  
11–20. Soft-delete products/services → recycle bin  
21–30. Soft-delete expenses → recycle bin  
31–35. Toast: moved to recycle bin  
36–40. Confirm explains Settings → Backup restore  
41–50. OpfsAttachmentViewer (photos, data-URL, OPFS URLs, revoke, sizes)  
51–55. softBulk / mediaOpfs / ≥200KB OPFS attach / OPFS cleanup on remove  

## Batch H — deskPolish.js (55+ exports)

formatRands, formatPct, formatDateShort, formatDateTime, relativeAge, clamp, sumBy, groupBy, uniqueBy, sortByDateDesc, sortByNumberDesc, filterOpenInvoices, filterPaidInvoices, isOverdueInvoice, daysBetween, emptyToDash, truncate, titleCase, slugify, parseMoneyInput, safeJsonParse, copyText, downloadText, downloadJson, csvEscape, rowsToCsv, debounce, throttle, matchQuery, pageSlice, statusTone, invoiceDueLabel, clientDisplayName, phoneDigits, zaMobileToWa, emailLooksValid, vatDigitsOk, pick, omit, deepFreeze, idempotentId, assert, tryOr, tryOrAsync, listIds, indexById, mergePreferDefined, outstandingTotal, paidTotal, avgInvoice, topClientsBySpend, countByStatus, humanFileSize, isBrowserOnline, onOnlineChange, prefersReducedMotion, scrollToId, focusSelector — DESK_POLISH_COUNT = 55.

## Batch I — deskGuards.js (55+ exports)

Activity lock, auth fail throttle, redact email/phone, stripHtml, sanitizeFilename, URL safety, maskSecret, constantTimeEqual, rateLimitBucket, confirm guards, field validators (amount/VAT/phone), safe storage, local audit, quota detect, private mode guess, CSRF local, payload lock, maxList, loop guard, withTimeout, retry, feature flags, privacy mode, pollution guard, integrityStamp — DESK_GUARDS_COUNT = 55.
