"""Isolated, deterministic SA Invoice Pro licensing simulator.

This module never contacts production APIs, gateways, or licence storage. It is a
safe policy harness for testing trial, offer, duration, access and usage scenarios.
"""
from __future__ import annotations

import calendar
import copy
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

TRIAL_DAYS = 14
OFFER_DAYS = 7
TRANSITION_HOURS = 24
REMINDER_DAYS = (7, 5, 3, 1)

PLANS = {
    "solo": {"name": "Solo", "monthly_zar": 189, "seats": 1, "branches": 1},
    "shop": {"name": "Shop", "monthly_zar": 379, "seats": 5, "branches": 1},
    "multi": {"name": "Multi-Branch", "monthly_zar": 749, "seats": 25, "branches": 25},
    "enterprise": {"name": "Enterprise", "monthly_zar": 1499, "seats": None, "branches": None},
}

TRIAL_PATHS = {
    "/dashboard", "/clients", "/invoices", "/quotes", "/tickets", "/products",
    "/settings", "/license", "/support", "/about",
}
LIMITED_PATHS = {"/dashboard", "/settings", "/license", "/support", "/about", "/export"}
PLAN_PATHS = {
    "solo": TRIAL_PATHS | {"/documents", "/portal", "/inbox"},
    "shop": TRIAL_PATHS | {
        "/documents", "/portal", "/inbox", "/expenses", "/petty-cash",
        "/accounting", "/reports", "/employees", "/payroll", "/recurring",
        "/bank", "/team", "/wa-templates", "/sms", "/wa-chase",
    },
    "multi": TRIAL_PATHS | {
        "/documents", "/portal", "/inbox", "/expenses", "/petty-cash",
        "/accounting", "/reports", "/employees", "/payroll", "/recurring",
        "/bank", "/team", "/wa-templates", "/sms", "/wa-chase",
        "/branches", "/webhooks", "/portal-admin",
    },
    "enterprise": set(),
}
PLAN_PATHS["enterprise"] = set(PLAN_PATHS["multi"])


def _utc(value: datetime | None) -> datetime:
    value = value or datetime.now(timezone.utc)
    if value.tzinfo is None:
        raise ValueError("timestamps must be timezone-aware")
    return value.astimezone(timezone.utc)


def add_duration(start: datetime, value: int, unit: str) -> datetime:
    """Calendar-aware duration arithmetic; months/years do not mean 30/365 days."""
    start = _utc(start)
    value = int(value)
    unit = str(unit).strip().lower()
    if value < 1:
        raise ValueError("duration value must be at least 1")
    if unit == "hour":
        return start + timedelta(hours=value)
    if unit == "day":
        return start + timedelta(days=value)
    if unit in ("month", "year"):
        months = value * (12 if unit == "year" else 1)
        month_index = start.year * 12 + (start.month - 1) + months
        year, month_zero = divmod(month_index, 12)
        month = month_zero + 1
        day = min(start.day, calendar.monthrange(year, month)[1])
        return start.replace(year=year, month=month, day=day)
    raise ValueError("duration unit must be hour, day, month or year")


def _validate_duration(now: datetime, value: int, unit: str):
    expiry = add_duration(now, value, unit)
    if expiry - now > timedelta(days=3650):
        raise ValueError("duration exceeds the 10-year safety limit")
    return expiry


class SimulatedLicenseEnvironment:
    """In-memory, deterministic simulator with a controllable UTC clock."""

    def __init__(self, start_at: datetime | None = None):
        self.now = _utc(start_at)
        self.accounts: dict[str, dict[str, Any]] = {}
        self.licenses: dict[str, dict[str, Any]] = {}
        self.events: list[dict[str, Any]] = []
        self.invoice_usage: list[dict[str, Any]] = []
        self._reminders_sent: set[tuple[str, int]] = set()

    def _event(self, kind: str, **details):
        self.events.append({"at": self.now.isoformat(), "kind": kind, **details})

    def register(self, user_id: str, email: str) -> dict:
        user_id = str(user_id).strip()
        email = str(email).strip().lower()
        if not user_id or "@" not in email:
            raise ValueError("valid user_id and email are required")
        if user_id in self.accounts:
            raise ValueError("account already exists")
        account = {
            "user_id": user_id,
            "email": email,
            "registered_at": self.now,
            "trial_starts_at": self.now,
            "trial_expires_at": self.now + timedelta(days=TRIAL_DAYS),
            "offer_expires_at": self.now + timedelta(days=OFFER_DAYS),
            "offer_redeemed_at": None,
            "trial_reminders_sent": [],
        }
        self.accounts[user_id] = account
        self._event("account_registered", user_id=user_id)
        return copy.deepcopy(account)

    def issue(self, user_id: str, plan: str, duration_value: int, duration_unit: str,
              seats: int | None = None, note: str = "") -> dict:
        if user_id not in self.accounts:
            raise KeyError("account not found")
        plan = str(plan).lower()
        if plan not in PLANS:
            raise ValueError("unknown plan")
        duration_value = int(duration_value)
        _validate_duration(self.now, duration_value, duration_unit)
        max_seats = PLANS[plan]["seats"]
        chosen_seats = int(seats if seats is not None else (max_seats or 1))
        if chosen_seats < 1 or (max_seats is not None and chosen_seats > max_seats):
            raise ValueError("seat count exceeds the selected plan")
        license_id = "SIM-" + uuid.uuid4().hex[:12].upper()
        record = {
            "license_id": license_id,
            "user_id": user_id,
            "plan": plan,
            "status": "issued",
            "duration_value": duration_value,
            "duration_unit": str(duration_unit).lower(),
            "seats": chosen_seats,
            "issued_at": self.now,
            "activated_at": None,
            "expires_at": None,
            "note": str(note)[:500],
            "environment": "SIMULATION",
        }
        self.licenses[license_id] = record
        self._event("license_issued", license_id=license_id, user_id=user_id, plan=plan)
        return copy.deepcopy(record)

    def activate(self, license_id: str, payment_reference: str = "SIMULATED-OWNER-ISSUE") -> dict:
        record = self.licenses.get(license_id)
        if not record:
            raise KeyError("licence not found")
        if record["status"] == "active":
            raise ValueError("licence is already active")
        record["activated_at"] = self.now
        record["expires_at"] = _validate_duration(
            self.now, record["duration_value"], record["duration_unit"]
        )
        record["status"] = "active"
        record["payment_reference"] = str(payment_reference)
        record["payment_environment"] = "SIMULATION"
        self._event("license_activated", license_id=license_id, expires_at=record["expires_at"].isoformat())
        return copy.deepcopy(record)

    def set_duration(self, license_id: str, value: int, unit: str) -> dict:
        record = self.licenses.get(license_id)
        if not record:
            raise KeyError("licence not found")
        _validate_duration(self.now, value, unit)
        record["duration_value"] = int(value)
        record["duration_unit"] = str(unit).lower()
        if record["activated_at"]:
            record["expires_at"] = _validate_duration(record["activated_at"], value, unit)
            record["status"] = "active" if record["expires_at"] > self.now else "expired"
        self._event("license_duration_changed", license_id=license_id,
                    value=int(value), unit=str(unit).lower())
        return copy.deepcopy(record)

    def extend(self, license_id: str, value: int, unit: str) -> dict:
        record = self.licenses.get(license_id)
        if not record:
            raise KeyError("licence not found")
        base = record["expires_at"] if record.get("expires_at") and record["expires_at"] > self.now else self.now
        record["expires_at"] = _validate_duration(base, value, unit)
        record["status"] = "active"
        self._event("license_extended", license_id=license_id, expires_at=record["expires_at"].isoformat())
        return copy.deepcopy(record)

    def advance(self, *, hours: int = 0, days: int = 0, months: int = 0):
        if min(hours, days, months) < 0:
            raise ValueError("clock cannot move backwards")
        if months:
            self.now = add_duration(self.now, months, "month")
        self.now += timedelta(hours=hours, days=days)
        self._event("clock_advanced")
        return self.now

    def trial_state(self, user_id: str) -> dict:
        account = self.accounts[user_id]
        expiry = account["trial_expires_at"]
        transition_end = expiry + timedelta(hours=TRANSITION_HOURS)
        if self.now < expiry:
            status = "trial"
        elif self.now < transition_end:
            status = "transition"
        else:
            status = "limited"
        return {
            "status": status,
            "trial_expires_at": expiry,
            "offer_expires_at": account["offer_expires_at"],
            "trial_days_remaining": max(0, (expiry - self.now).total_seconds() / 86400),
            "transition_ends_at": transition_end,
        }

    def can_access(self, user_id: str, path: str) -> bool:
        active = [
            item for item in self.licenses.values()
            if item["user_id"] == user_id and item["status"] == "active"
            and item.get("expires_at") and item["expires_at"] > self.now
        ]
        if active:
            active.sort(key=lambda x: x["activated_at"], reverse=True)
            return path in PLAN_PATHS[active[0]["plan"]]
        state = self.trial_state(user_id)["status"]
        if state == "trial":
            return path in TRIAL_PATHS
        return path in LIMITED_PATHS

    def due_reminders(self, user_id: str) -> list[dict]:
        account = self.accounts[user_id]
        due = []
        for days in REMINDER_DAYS:
            reminder_at = account["trial_expires_at"] - timedelta(days=days)
            marker = (user_id, days)
            if reminder_at <= self.now < account["trial_expires_at"] and marker not in self._reminders_sent:
                self._reminders_sent.add(marker)
                account["trial_reminders_sent"].append(days)
                due.append({"user_id": user_id, "days_remaining": days, "due_at": reminder_at})
                self._event("trial_reminder", user_id=user_id, days_remaining=days)
        return due

    def annual_quote(self, user_id: str, plan: str) -> dict:
        if plan not in PLANS:
            raise ValueError("unknown plan")
        monthly = PLANS[plan]["monthly_zar"]
        account = self.accounts[user_id]
        offer_active = self.now < account["offer_expires_at"] and account["offer_redeemed_at"] is None
        if plan == "enterprise":
            return {"plan": plan, "custom_quote_required": True, "starting_monthly_zar": monthly}
        regular = monthly * 12
        promotional = monthly * 10
        return {
            "plan": plan,
            "currency": "ZAR",
            "monthly_zar": monthly,
            "annual_standard_zar": regular,
            "annual_offer_zar": promotional if offer_active else None,
            "offer_active": offer_active,
            "offer_expires_at": account["offer_expires_at"],
            "saving_zar": monthly * 2 if offer_active else 0,
        }

    def redeem_annual_offer(self, user_id: str, plan: str) -> dict:
        quote = self.annual_quote(user_id, plan)
        if not quote.get("offer_active") or plan == "enterprise":
            raise ValueError("introductory offer is unavailable")
        self.accounts[user_id]["offer_redeemed_at"] = self.now
        self._event("annual_offer_redeemed", user_id=user_id, plan=plan)
        return quote

    def record_invoice(self, user_id: str, invoice_id: str, status: str = "issued"):
        if status not in {"draft", "issued", "cancelled", "void"}:
            raise ValueError("invalid invoice status")
        self.invoice_usage.append({
            "user_id": user_id, "invoice_id": str(invoice_id),
            "status": status, "at": self.now,
        })

    def invoice_volume(self, user_id: str, year: int | None = None, month: int | None = None) -> int:
        year = year or self.now.year
        month = month or self.now.month
        return sum(
            1 for row in self.invoice_usage
            if row["user_id"] == user_id and row["status"] == "issued"
            and row["at"].year == year and row["at"].month == month
        )

    def request(self, method: str, path: str, payload: dict | None = None) -> tuple[int, dict]:
        """Small simulated API surface for repeatable request/response tests."""
        data = payload or {}
        try:
            if method == "POST" and path == "/sim/register":
                return 201, self.register(data["user_id"], data["email"])
            if method == "POST" and path == "/sim/owner/issue":
                return 201, self.issue(data["user_id"], data["plan"], data["duration_value"],
                                       data["duration_unit"], data.get("seats"), data.get("note", ""))
            if method == "POST" and path == "/sim/owner/activate":
                return 200, self.activate(data["license_id"], data.get("payment_reference", "SIMULATED"))
            if method == "POST" and path == "/sim/owner/duration":
                return 200, self.set_duration(data["license_id"], data["duration_value"], data["duration_unit"])
            if method == "POST" and path == "/sim/clock/advance":
                now = self.advance(hours=int(data.get("hours", 0)), days=int(data.get("days", 0)),
                                   months=int(data.get("months", 0)))
                return 200, {"now": now.isoformat()}
            if method == "GET" and path == "/sim/trial/status":
                return 200, self.trial_state(data["user_id"])
            if method == "GET" and path == "/sim/billing/quote":
                return 200, self.annual_quote(data["user_id"], data["plan"])
            if method == "GET" and path == "/sim/trial/reminders":
                return 200, {"reminders": self.due_reminders(data["user_id"])}
            if method == "GET" and path == "/sim/usage/invoices":
                return 200, {"issued_invoices_this_month": self.invoice_volume(data["user_id"])}
            return 404, {"ok": False, "error": "simulated route not found"}
        except KeyError as exc:
            return 404, {"ok": False, "error": f"missing or unknown field: {exc}"}
        except (TypeError, ValueError) as exc:
            return 400, {"ok": False, "error": str(exc)}
