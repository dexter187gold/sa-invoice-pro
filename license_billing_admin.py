"""Read-only developer billing and activation ledger.

The ledger reads the existing Git-backed licence state. It never edits or
reconciles payment records; provider callbacks remain the source of truth.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from flask import Response, make_response, redirect, render_template_string, request


def _text(value):
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return str(value)
    return str(value)


def _rows(db):
    rows = []
    seen = set()
    for section in ("transactions", "pending_payments", "payments", "payment_history", "billing_history"):
        records = db.get(section) or {}
        if isinstance(records, dict):
            iterator = records.items()
        elif isinstance(records, list):
            iterator = enumerate(records)
        else:
            continue
        for record_id, rec in iterator:
            if not isinstance(rec, dict):
                continue
            tx = rec.get("transaction") if isinstance(rec.get("transaction"), dict) else {}
            raw_ref = rec.get("reference") or rec.get("ref") or tx.get("reference")
            ref = _text(raw_ref or record_id)
            identity = ("reference", _text(raw_ref)) if raw_ref else (section, _text(record_id))
            if identity in seen:
                continue
            seen.add(identity)
            amount = rec.get("amount") or rec.get("total") or rec.get("amountZar") or tx.get("amount") or tx.get("total")
            if amount is None and rec.get("amount_cents") is not None:
                try:
                    amount = float(rec["amount_cents"]) / 100
                except (TypeError, ValueError):
                    amount = rec.get("amount_cents")
            status = _text(rec.get("status") or tx.get("status") or "recorded").lower()
            rows.append({
                "date": _text(rec.get("paidAt") or rec.get("createdAt") or rec.get("created_at") or rec.get("date") or rec.get("at") or tx.get("paidAt") or tx.get("createdAt")),
                "reference": ref,
                "email": _text(rec.get("email") or rec.get("customerEmail") or tx.get("email")),
                "plan": _text(rec.get("plan") or rec.get("planName") or tx.get("planName") or tx.get("plan")),
                "amount": _text(amount if amount is not None else ""),
                "currency": _text(rec.get("currency") or tx.get("currency") or "ZAR"),
                "status": status,
                "source": section.replace("_", " "),
                "payment_id": _text(rec.get("paymentId") or rec.get("id") or record_id),
                "delivery": _text((rec.get("delivery") or {}).get("status") if isinstance(rec.get("delivery"), dict) else ""),
            })
    rows.sort(key=lambda row: row["date"], reverse=True)
    return rows


def register_billing_admin(app, load_fn):
    @app.get("/admin/billing")
    def developer_billing_ledger():
        from license_server import owner_cookie_authenticated
        if not owner_cookie_authenticated():
            return redirect("/login")
        try:
            db = load_fn() or {}
            rows = _rows(db if isinstance(db, dict) else {})
            error = ""
        except Exception as exc:
            rows = []
            error = "Ledger could not be loaded (" + type(exc).__name__ + "). Existing records were not changed."
        paid = sum(1 for row in rows if row["status"] in ("paid", "success", "successful", "complete", "completed"))
        pending = sum(1 for row in rows if row["status"] in ("pending", "processing", "initiated"))
        failed = sum(1 for row in rows if row["status"] in ("failed", "cancelled", "canceled", "refunded", "reversed"))
        template = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07110f"><title>SA Invoice Pro · Billing ledger</title>
<style>
:root{color-scheme:dark;--bg:#07110f;--panel:#10231d;--line:#244437;--text:#e8f5ee;--muted:#9bb7aa;--mint:#6ee7b7;--green:#34d399}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 15% 0%,#123c2d 0,transparent 35%),var(--bg);color:var(--text);font:14px/1.5 Inter,system-ui,sans-serif}
.wrap{max-width:1200px;margin:auto;padding:22px}.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}.brand{font-weight:850;letter-spacing:.02em}.muted{color:var(--muted)}a{color:var(--mint);text-decoration:none}.btn{display:inline-block;padding:9px 13px;border-radius:10px;border:1px solid #327454;background:#153b2b;color:#e8f5ee;font-weight:700}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}.card{background:linear-gradient(145deg,#142b24,#0c1f18);border:1px solid var(--line);border-radius:15px;padding:15px}.card b{display:block;font-size:24px;color:var(--mint)}.tablewrap{overflow:auto;border:1px solid var(--line);border-radius:12px}table{width:100%;border-collapse:collapse;min-width:850px}th,td{text-align:left;padding:11px 9px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:10px;text-transform:uppercase;color:var(--muted);letter-spacing:.08em;background:#081a14}input{background:#071b16;color:var(--text);border:1px solid var(--line);border-radius:9px;padding:10px;width:min(100%,360px)}.status{display:inline-block;border-radius:99px;padding:3px 8px;background:#263c34;font-size:11px}.status.paid,.status.success,.status.completed{background:#064e3b;color:#a7f3d0}.status.failed,.status.refunded,.status.reversed{background:#552633;color:#ffe4e6}.empty{padding:24px;text-align:center;color:var(--muted)}@media(max-width:650px){.wrap{padding:13px}.cards{grid-template-columns:repeat(2,1fr)}}
</style></head><body><main class="wrap"><header class="top"><div><div class="brand">SA INVOICE PRO · DEVELOPER OPERATIONS</div><h1 style="margin:4px 0">Billing & activation ledger</h1><div class="muted">Read-only view of payment records currently stored by the licence service.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="/">← Developer control centre</a><a class="btn" href="/admin">Payment settings</a><a class="btn" href="/logout">Sign out</a></div></header>
{% if error %}<div class="card">{{ error }}</div>{% endif %}
<section class="cards"><div class="card"><span class="muted">Records shown</span><b>{{ rows|length }}</b></div><div class="card"><span class="muted">Paid / successful</span><b>{{ paid }}</b></div><div class="card"><span class="muted">Pending</span><b>{{ pending }}</b></div><div class="card"><span class="muted">Failed / reversed</span><b>{{ failed }}</b></div></section>
<section class="card"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div><strong>Payment history</strong><p class="muted" style="margin:4px 0">No payment records are created or changed by viewing this page.</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="search" type="search" placeholder="Search email, reference, plan or status" oninput="filterRows()"><a class="btn" href="/admin/billing/export.csv">Export CSV</a></div></div>
<div class="tablewrap" style="margin-top:14px"><table><thead><tr><th>Date</th><th>Reference</th><th>Customer</th><th>Plan</th><th>Amount</th><th>Status</th><th>Source</th></tr></thead><tbody id="ledger">{% for row in rows %}<tr><td>{{ row.date or "—" }}</td><td>{{ row.reference or "—" }}</td><td>{{ row.email or "—" }}</td><td>{{ row.plan or "—" }}</td><td>{{ row.currency }} {{ row.amount }}</td><td><span class="status {{ row.status }}">{{ row.status or "recorded" }}</span></td><td>{{ row.source }}</td></tr>{% else %}<tr><td colspan="7" class="empty">No payment records were found in the current Git-backed licence data. This does not mean there were no historical payments; the older billing implementation or data source may need to be restored.</td></tr>{% endfor %}</tbody></table></div></section>
<p class="muted" style="font-size:11px">Developer-only · read-only ledger · transaction verification remains server-side.</p></main><script>function filterRows(){const q=(document.getElementById('search').value||'').toLowerCase();document.querySelectorAll('#ledger tr').forEach(r=>r.hidden=!r.innerText.toLowerCase().includes(q))}</script></body></html>"""
        response = make_response(render_template_string(template, rows=rows, paid=paid, pending=pending, failed=failed, error=error))
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/admin/billing/export.csv")
    def developer_billing_export():
        from license_server import owner_cookie_authenticated
        if not owner_cookie_authenticated():
            return redirect("/login")
        try:
            db = load_fn() or {}
            rows = _rows(db if isinstance(db, dict) else {})
        except Exception:
            rows = []
        stream = io.StringIO()
        writer = csv.writer(stream)
        writer.writerow(["date", "reference", "email", "plan", "amount", "currency", "status", "source", "payment_id"])
        for row in rows:
            values = [row[k] for k in ("date", "reference", "email", "plan", "amount", "currency", "status", "source", "payment_id")]
            writer.writerow([("'" + str(value)) if str(value).startswith(("=", "+", "-", "@", "\\t", "\\r")) else value for value in values])
        return Response(stream.getvalue(), mimetype="text/csv", headers={"Content-Disposition": "attachment; filename=saip-billing-ledger.csv", "Cache-Control": "no-store"})

    print("[billing-ledger] developer-only read-only /admin/billing and CSV export registered")
