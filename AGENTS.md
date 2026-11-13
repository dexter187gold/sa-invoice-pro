# Agent / ChatGPT commit rules — SA Invoice Pro

Follow these rules for **every** commit or GitHub file push. Skipping them causes smoke, APK, and Workers failures.

## Never
- Write file content as `PLACEHOLDER`, `PLACEHOLDER_REPLACE`, or empty stubs for real source files.
- Bump `package.json` version without updating **all** of: `version.json`, `README.md` title (`# SA Invoice Pro X.Y.Z`), and top of `CHANGELOG.md` (`## X.Y.Z`).
- Change payment validation messages without updating `tests/payments.test.js`.
- Push only a subset of a feature that leaves imports pointing at missing modules.

## Always before push
1. Run `node scripts/ci-guard.mjs` (version + exports + PLACEHOLDER scan).
2. Run `npm run test:unit` — must pass.
3. Prefer `npm install` then commit `package-lock.json` when dependencies change. Workflows fall back to `npm install` if lock is missing.
4. For multi-file features, push **all** related files in one commit (or sequential commits without broken intermediate main).

## CI workflows (must stay green)
| Workflow | Must not hard-fail when |
|----------|-------------------------|
| e2e-smoke | Build + unit tests gate; Playwright installs Chromium |
| deploy-workers | Cloudflare secrets missing → **warn + skip**, exit 0 |
| build-apk | Keystore secrets missing → **debug signing** |
| licence-security-tests | Only licence Python tests |

## How to tell ChatGPT in a future chat
Paste this:

> Before any git commit or GitHub push to sa-invoice-pro: read AGENTS.md; run `node scripts/ci-guard.mjs` and `npm run test:unit`; never push PLACEHOLDER file contents; keep package.json / version.json / README / CHANGELOG versions identical; harden workflows so missing secrets soft-skip instead of failing the job.
