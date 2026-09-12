# Secrets and CI/CD (short)

## Render Environment (each service)
- SA_OWNER_TOKEN = long random secret
- SA_REQUIRE_SECRETS = 1

## GitHub Secrets (Settings → Actions)
- RENDER_API_KEY
- RENDER_LICENSE_SERVICE_ID
- RENDER_UPDATES_SERVICE_ID

## Workflows
- ci.yml – syntax checks on push
- release.yml – ZIP on tag v*
- deploy-render.yml – redeploy Render via API
