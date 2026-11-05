"""Additional adversarial and tenant-isolation checks for the licensing simulator."""
import unittest
from datetime import datetime, timezone, timedelta

from tools.licensing_simulator.simulator import SimulatedLicenseEnvironment


class LicenseSimulatorSafetyTests(unittest.TestCase):
    def setUp(self):
        self.start = datetime(2026, 6, 15, 9, 30, tzinfo=timezone.utc)
        self.env = SimulatedLicenseEnvironment(self.start)
        self.env.register("tenant-a", "a@example.test")
        self.env.register("tenant-b", "b@example.test")

    def test_tenant_a_licence_does_not_grant_tenant_b_access(self):
        issued = self.env.issue("tenant-a", "shop", 30, "day")
        self.env.activate(issued["license_id"])
        self.assertTrue(self.env.can_access("tenant-a", "/accounting"))
        self.assertFalse(self.env.can_access("tenant-b", "/accounting"))
        self.assertEqual(self.env.access_mode("tenant-b"), "trial_full")

    def test_invoice_usage_isolated_by_tenant(self):
        self.env.record_invoice("tenant-a", "A-001", "issued")
        self.env.record_invoice("tenant-b", "B-001", "issued")
        self.env.record_invoice("tenant-a", "A-002", "draft")
        self.assertEqual(self.env.invoice_volume("tenant-a"), 1)
        self.assertEqual(self.env.invoice_volume("tenant-b"), 1)

    def test_activation_is_not_repeatable(self):
        issued = self.env.issue("tenant-a", "solo", 2, "day")
        self.env.activate(issued["license_id"])
        with self.assertRaisesRegex(ValueError, "already active"):
            self.env.activate(issued["license_id"])

    def test_expired_paid_licence_does_not_keep_paid_access(self):
        issued = self.env.issue("tenant-a", "shop", 1, "hour")
        self.env.activate(issued["license_id"])
        self.env.advance(hours=1)
        self.assertEqual(self.env.access_mode("tenant-a"), "trial_full")
        self.assertFalse(self.env.can_access("tenant-a", "/accounting"))

    def test_owner_extension_starts_from_future_expiry(self):
        issued = self.env.issue("tenant-a", "solo", 2, "day")
        active = self.env.activate(issued["license_id"])
        extended = self.env.extend(issued["license_id"], 3, "day")
        self.assertEqual(extended["expires_at"], active["expires_at"] + timedelta(days=3))
        self.assertEqual(extended["status"], "active")

    def test_owner_extension_of_expired_licence_starts_from_now(self):
        issued = self.env.issue("tenant-a", "solo", 1, "hour")
        self.env.activate(issued["license_id"])
        self.env.advance(hours=2)
        renewed = self.env.extend(issued["license_id"], 1, "day")
        self.assertEqual(renewed["expires_at"], self.env.now + timedelta(days=1))
        self.assertEqual(renewed["status"], "active")

    def test_duration_safety_limit_rejects_more_than_ten_years(self):
        with self.assertRaisesRegex(ValueError, "10-year"):
            self.env.issue("tenant-a", "solo", 11, "year")

    def test_clock_cannot_move_backwards(self):
        with self.assertRaisesRegex(ValueError, "cannot move backwards"):
            self.env.advance(hours=-1)

    def test_naive_clock_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "timezone-aware"):
            SimulatedLicenseEnvironment(datetime(2026, 6, 15, 9, 30))

    def test_reminders_are_independent_for_each_tenant(self):
        expiry_a = self.env.accounts["tenant-a"]["trial_expires_at"]
        self.env.now = expiry_a - timedelta(days=7)
        self.assertEqual(len(self.env.due_reminders("tenant-a")), 1)
        self.assertEqual(len(self.env.due_reminders("tenant-b")), 1)
        self.assertEqual(self.env.due_reminders("tenant-a"), [])
        self.assertEqual(self.env.due_reminders("tenant-b"), [])

    def test_offer_redemption_is_account_scoped(self):
        self.env.redeem_annual_offer("tenant-a", "solo")
        self.assertFalse(self.env.annual_quote("tenant-a", "solo")["offer_active"])
        self.assertTrue(self.env.annual_quote("tenant-b", "solo")["offer_active"])

    def test_unknown_tenant_cannot_query_trial_status(self):
        status, result = self.env.request("GET", "/sim/trial/status", {"user_id": "missing"})
        self.assertEqual(status, 404)
        self.assertIn("unknown field", result["error"])


if __name__ == "__main__":
    unittest.main()
