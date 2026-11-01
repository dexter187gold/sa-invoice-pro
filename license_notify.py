"""Deliver issued licence keys by email (SMTP) and SMS after PayFast/Paystack confirms payment.

Env (Render saip-license):
  SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM
  SMTP_BCC / LICENSE_BCC — default sainvoicepro@gmail.com (owner evidence copy)
  SMS_WEBHOOK_URL  — POST JSON {to, body}
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
"""
from __future__ import annotations

import json
import os
import smtplib
import ssl
import urllib.request
from email.message import EmailMessage
from typing import Any


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name) or default).strip()


def _normalize_za_phone(phone: str) -> str:
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if not digits:
        return ""
    if digits.startswith("0") and len(digits) >= 9:
        digits = "27" + digits[1:]
    if not digits.startswith("27") and len(digits) == 9:
        digits = "27" + digits
    return digits


def send_email_license(to_email: str, key: str, plan: str, seats: int) -> dict[str, Any]:
    host = _env("SMTP_HOST")
    user = _env("SMTP_USER")
    password = _env("SMTP_PASS")
    from_addr = _env("SMTP_FROM") or user or "sainvoicepro@gmail.com"
    port = int(_env("SMTP_PORT") or "587")
    if not host or not to_email:
        return {"ok": False, "channel": "email", "error": "SMTP not configured or missing recipient"}

    body = (
        "SA Invoice Pro — your licence key\n\n"
        f"Payment confirmed for plan: {plan} ({seats} seat(s)).\n\n"
        f"Activation key:\n{key}\n\n"
        "Open SA Invoice Pro → License → enter this key → Activate.\n"
        "Keep this email private. Support: sainvoicepro@gmail.com\n"
    )
    msg = EmailMessage()
    msg["Subject"] = "SA Invoice Pro — your activation key"
    msg["From"] = from_addr
    msg["To"] = to_email
    bcc = _env("SMTP_BCC") or _env("LICENSE_BCC") or "sainvoicepro@gmail.com"
    if bcc and bcc.lower() != to_email.lower():
        msg["Bcc"] = bcc
    msg.set_content(body)

    try:
        if port == 465:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, timeout=25, context=ctx) as smtp:
                if user:
                    smtp.login(user, password)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=25) as smtp:
                smtp.ehlo()
                try:
                    smtp.starttls(context=ssl.create_default_context())
                    smtp.ehlo()
                except Exception:
                    pass
                if user:
                    smtp.login(user, password)
                smtp.send_message(msg)
        return {"ok": True, "channel": "email", "to": to_email, "bcc": bcc}
    except Exception as exc:
        return {"ok": False, "channel": "email", "error": type(exc).__name__}


def send_sms_license(phone: str, key: str, plan: str) -> dict[str, Any]:
    to = _normalize_za_phone(phone)
    if not to:
        return {"ok": False, "channel": "sms", "error": "no phone"}
    text = f"SA Invoice Pro: payment OK ({plan}). Activation key: {key}. Enter it under License in the app."

    webhook = _env("SMS_WEBHOOK_URL")
    if webhook:
        try:
            data = json.dumps({"to": to, "body": text, "from": "SAInvoicePro"}).encode("utf-8")
            req = urllib.request.Request(
                webhook, data=data,
                headers={"Content-Type": "application/json", "User-Agent": "SAIP-License/1"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                resp.read()
            return {"ok": True, "channel": "sms", "to": to, "via": "webhook"}
        except Exception as exc:
            return {"ok": False, "channel": "sms", "error": "webhook:" + type(exc).__name__}

    sid = _env("TWILIO_ACCOUNT_SID")
    token = _env("TWILIO_AUTH_TOKEN")
    frm = _env("TWILIO_FROM")
    if sid and token and frm:
        try:
            import base64
            from urllib.parse import urlencode
            auth = base64.b64encode(f"{sid}:{token}".encode()).decode()
            payload = urlencode({"To": "+" + to if not to.startswith("+") else to, "From": frm, "Body": text}).encode()
            req = urllib.request.Request(
                f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
                data=payload,
                headers={"Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=20) as resp:
                resp.read()
            return {"ok": True, "channel": "sms", "to": to, "via": "twilio"}
        except Exception as exc:
            return {"ok": False, "channel": "sms", "error": "twilio:" + type(exc).__name__}

    return {"ok": False, "channel": "sms", "error": "SMS not configured"}


def deliver_license_key(*, email: str, phone: str, key: str, plan: str, seats: int) -> dict[str, Any]:
    results = []
    if email:
        results.append(send_email_license(email, key, plan, seats))
    if phone:
        results.append(send_sms_license(phone, key, plan))
    if not results:
        results.append({"ok": False, "error": "no delivery channel"})
    return {"ok": any(r.get("ok") for r in results), "results": results, "key_tail": (key or "")[-6:]}
