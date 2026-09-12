CI/CD + secrets pack for SA Invoice Pro
========================================

HOW TO UPLOAD TO GITHUB
-----------------------
1. Extract this zip on your PC.
2. Open your GitHub repo.
3. Click "Add file" → "Upload files".
4. Drag ALL extracted items into the browser:
     - .github/          (folder – contains workflows)
     - server_secrets.py
     - .gitignore
     - .env.example
     - docs/             (optional)
5. Commit changes.

Or: extract into your local clone of the repo (merge into the root),
    then commit and push.

AFTER UPLOAD
------------
1. GitHub → Settings → Secrets and variables → Actions
   Add:
     RENDER_API_KEY
     RENDER_LICENSE_SERVICE_ID
     RENDER_UPDATES_SERVICE_ID

2. Actions tab → enable workflows if asked.

3. Actions → "Deploy Render" → Run workflow (test).

IMPORTANT
---------
- Do NOT put API keys inside these files.
- Put keys only in GitHub Secrets and Render Environment.
- Rotate any key you ever pasted in chat.
