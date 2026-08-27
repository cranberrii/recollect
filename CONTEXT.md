# Recollect

An AI-powered bookmark manager (Next.js web + FastAPI backend + Chrome extension)
deployed to Google Cloud Run. This glossary pins down terms that are easy to
confuse across the codebase and its deployment.

## Language

### Deployment

**Deployer SA**:
The service account `github-deployer` that GitHub Actions impersonates (keylessly,
via Workload Identity Federation) to build images and deploy Cloud Run services.
It holds deploy permissions only — never runs application code.
_Avoid_: CI service account, backend SA.

**Runtime SA**:
The service account a Cloud Run service *runs as* while serving requests — the
backend runs as `recollect-backend` (which can read Secret Manager); the web
service runs as the project's default compute SA. Distinct from the Deployer SA.
_Avoid_: backend SA (ambiguous), app service account.
