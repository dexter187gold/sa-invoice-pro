import unittest
from datetime import datetime, timedelta, timezone

from tools.licensing_simulator.simulator import (
    SimulatedLicenseEnvironment, add_duration, TRIAL_DAYS, OFFER_DAYS,
)


class LicenseSimulatorTests(unittest.TestCase):
    def setUp(self):
        self.env = SimulatedLicenseEnvironment(datetime(2026, 1, 31, 12, 0, tzinfo=timezone.utc))
        self.env.register("acct-a", "a@example.test")

    def test_price_points_reflect_exact_25_percent_reduction(self):
        from tools.licensing_simulator.simulator import PLANS
        self.assertEqual([PLANS[p]['monthly_zar'] for p in ('solo', 'shop', 'multi', 'enterprise')], [187, 374, 749, 1499])

    def test_trial_is_14_days_and_offer_is_7_days(self):
        account = self.env.accounts["acct-a"]
        self.assertEqual((account["trial_expires_at"] - account["trial_starts_at"]).days, TRIAL_DAYS)
        self.assertEqual((account["offer_expires_at"] - account["registered_at"]).days, OFFER_DAYS)

    def test_trial_reminders_only_fire_once_at_7_5_3_1_days(self):
        expiry = self.env.accounts["acct-a"]["trial_expires_at"]
        for days in (7, 5, 3, 1):
            self.env.now = expiry - timedelta(days=days)
            due = self.env.due_reminders("acct-a")
            self.assertEqual([x["days_remaining"] for x in due], [days])
            self.assertEqual(self.env.due_reminders("acct-a"), [])

    def test_trial_expires_then_24_hour_transition_then_limited(self):
        expiry = self.env.accounts["acct-a"]["trial_expires_at"]
        self.env.now = expiry
        self.assertEqual(self.env.trial_state("acct-a")["status"], "transition")
        self.assertEqual(self.env.access_mode("acct-a"), "transition_read_only")
        self.assertTrue(self.env.can_access("acct-a", "/export"))
        self.assertFalse(self.env.can_access("acct-a", "/invoices"))
        self.assertFalse(self.env.can_mutate("acct-a", "/dashboard"))
        self.env.now = expiry + timedelta(hours=24)
        self.assertEqual(self.env.trial_state("acct-a")["status"], "limited")
        self.assertEqual(self.env.access_mode("acct-a"), "limited_read_only")
        self.assertTrue(self.env.can_access("acct-a", "/settings"))
        self.assertFalse(self.env.can_access("acct-a", "/tickets"))
        self.assertFalse(self.env.can_mutate("acct-a", "/settings"))

    def test_trial_access_is_softened_without_paid_modules(self):
        for path in ("/dashboard", "/clients", "/invoices", "/quotes", "/tickets",
                     "/products", "/settings", "/support", "/license"):
            self.assertTrue(self.env.can_access("acct-a", path), path)
        for path in ("/accounting", "/payroll", "/branches", "/webhooks"):
            self.assertFalse(self.env.can_access("acct-a", path), path)

    def test_issue_duration_begins_on_activation_not_issue(self):
        issued = self.env.issue("acct-a", "solo", 3, "hour")
        self.env.advance(hours=2)
        active = self.env.activate(issued["license_id"])
        self.assertEqual(active["expires_at"] - active["activated_at"], timedelta(hours=3))
        self.assertEqual(active["issued_at"], issued["issued_at"])

    def test_owner_can_set_hours_days_and_months(self):
        issued = self.env.issue("acct-a", "shop", 1, "day")
        self.env.activate(issued["license_id"])
        updated = self.env.set_duration(issued["license_id"], 6, "hour")
        self.assertEqual(updated["expires_at"] - updated["activated_at"], timedelta(hours=6))
        updated = self.env.set_duration(issued["license_id"], 2, "month")
        self.assertEqual(updated["expires_at"], add_duration(updated["activated_at"], 2, "month"))
        expired = self.env.set_duration(issued["license_id"], 1, "hour")
        self.env.advance(hours=2)
        self.assertFalse(self.env.can_access("acct-a", "/accounting"))
        self.assertEqual(expired["status"], "active")

    def test_calendar_month_clamps_month_end(self):
        result = add_duration(datetime(2026, 1, 31, 12, tzinfo=timezone.utc), 1, "month")
        self.assertEqual(result, datetime(2026, 2, 28, 12, tzinfo=timezone.utc))

    def test_seat_limits_are_not_weakened(self):
        with self.assertRaises(ValueError):
            self.env.issue("acct-a", "solo", 1, "day", seats=2)
        with self.assertRaises(ValueError):
            self.env.issue("acct-a", "shop", 1, "day", seats=6)

    def test_seven_day_annual_offer_equals_two_months_saving(self):
        quote = self.env.annual_quote("acct-a", "shop")
        self.assertEqual(quote["annual_standard_zar"], 374 * 12)
        self.assertEqual(quote["annual_offer_zar"], 374 * 10)
        self.assertEqual(quote["saving_zar"], 374 * 2)
        self.env.advance(days=7)
        self.assertFalse(self.env.annual_quote("acct-a", "shop")["offer_active"])

    def test_offer_cannot_be_redeemed_twice(self):
        self.env.redeem_annual_offer("acct-a", "solo")
        with self.assertRaises(ValueError):
            self.env.redeem_annual_offer("acct-a", "solo")

    def test_invoice_volume_counts_issued_only(self):
        self.env.record_invoice("acct-a", "D1", "draft")
        self.env.record_invoice("acct-a", "I1", "issued")
        self.env.record_invoice("acct-a", "I2", "cancelled")
        self.assertEqual(self.env.invoice_volume("acct-a"), 1)

    def test_simulated_api_rejects_invalid_duration_and_production_routes(self):
        status, result = self.env.request("POST", "/sim/owner/issue", {
            "user_id": "acct-a", "plan": "solo", "duration_value": 1, "duration_unit": "fortnight"
        })
        self.assertEqual(status, 400)
        self.assertIn("duration unit", result["error"])
        status, result = self.env.request("GET", "/api/billing/checkout", {})
        self.assertEqual(status, 404)
        self.assertEqual(result["error"], "simulated route not found")


if __name__ == "__main__":
    unittest.main()
