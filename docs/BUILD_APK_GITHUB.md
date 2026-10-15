# Build full signed APK with GitHub Actions

This is the **recommended** way to get a real Lab APK with:

- Storage permissions + runtime prompts
- `@capacitor/share` + `@capacitor/filesystem`
- Proper WebView shell (not only web-asset injection)

You install the APK on your phone; you do **not** build on the phone.

---

## 1. One-time: keystore as GitHub secrets

On a PC (or any machine with `keytool`):

### Option A — use existing lab keystore

```bash
base64 -w0 saip-lab.keystore > keystore.b64
# macOS: base64 -i saip-lab.keystore -o keystore.b64
```

### Option B — create a new keystore

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore saip-lab.keystore \
  -alias saip-lab \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass 'YOUR_STORE_PASSWORD' \
  -keypass 'YOUR_KEY_PASSWORD' \
  -dname "CN=SA Invoice Pro Lab, OU=Lab, O=SA Invoice Pro, L=Johannesburg, ST=GP, C=ZA"

base64 -w0 saip-lab.keystore > keystore.b64
```

### Add secrets on GitHub

1. Open **https://github.com/dexter187gold/sa-invoice-pro**
2. **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|-------------|--------|
| `ANDROID_KEYSTORE_BASE64` | Full contents of `keystore.b64` (one long line) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | e.g. `saip-lab` |
| `ANDROID_KEY_PASSWORD` | Key password (often same as store) |

**Lab defaults used in earlier builds:**

- Alias: `saip-lab`
- Store / key password: `SaipLab2026!`

---

## 2. Workflow file

Path: `.github/workflows/build-apk.yml`

Runs on:

- Push to `main` (src / public / package changes), or
- **Actions → Build signed APK → Run workflow**

---

## 3. Run a build

1. GitHub → **Actions**
2. **Build signed APK** → **Run workflow** → branch `main`
3. Wait for green check (5–15 minutes)

Or:

```bash
git commit --allow-empty -m "ci: trigger APK build"
git push origin main
```

---

## 4. Download APK on your phone

1. `https://github.com/dexter187gold/sa-invoice-pro/actions`
2. Open latest green **Build signed APK** run
3. **Artifacts** → **SA-Invoice-Pro-Lab-APK**
4. Download → unzip → install `.apk`

---

## 5. Install

1. Allow install from browser/Files
2. Uninstall old Lab app if update is blocked
3. Install → allow storage/notifications
4. Test PDF Share / Download / Print

---

## Phone vs Git

| Phone | GitHub |
|-------|--------|
| Download + install APK | Push code, run Actions |
| Use the app | Store keystore secrets |

You never run Gradle on the phone.
