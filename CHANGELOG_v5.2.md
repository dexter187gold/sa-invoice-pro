# SA Invoice Pro · v5.2.0 Pro Studio Q2

**Codename:** Pro Studio Q2  
**Channel lock:** browser + APK + saip-sync 5.2.0

## APK CI fix (critical)
- Root cause: fragile `signingConfigs` injection into `android/app/build.gradle` broke the `android {}` DSL → `compileSdkVersion is not specified`
- Fix: never inject full signingConfigs block; only add `signingConfig signingConfigs.debug` inside `release {}`
- Explicit compileSdk 34 / minSdk 24 / targetSdk 34 via variables.gradle + safe inject if missing
- MainActivity package derived from path; always valid Java
- Keystore written to `android/app/`; optional debug fallback retained
- Assemble release → fallback debug with error summary in logs

## 10 Quarters (~500 improvements)
Q1 CI & mobile · Q2 Document suite · Q3 Forms & layout · Q4 Exports & PDF · Q5 OAuth & security · Q6 Admin & WA · Q7 UI polish · Q8 Data & sync · Q9 SA compliance · Q10 Positioning — full detail in repo history and prior CHANGELOG_v5.1.

## Deploy
1. saip-sync 5.2.0 (Render auto)
2. Confirm GET /api/config/app → app_version 5.2.0
3. This web + APK 5.2.0
4. Admin: set Google Client ID
