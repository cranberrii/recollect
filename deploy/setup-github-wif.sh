#!/usr/bin/env bash
# setup-github-wif.sh — One-time setup so GitHub Actions can deploy to Cloud Run
# using keyless Workload Identity Federation (no service-account JSON key stored).
#
# Run this ONCE, after deploy/setup.sh. Safe to re-run (skips existing resources).
# At the end it prints the values to paste into the repo's GitHub Variables.
#
# See docs/adr/0001-github-actions-wif.md for why WIF over a stored key.
set -euo pipefail

PROJECT_ID="recollect-prod-515"
GITHUB_REPO="cranberrii/recollect"   # owner/repo allowed to impersonate the deployer
POOL="github-pool"
PROVIDER="github-provider"
DEPLOYER_SA="github-deployer"
DEPLOYER_SA_EMAIL="${DEPLOYER_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SA="recollect-backend@${PROJECT_ID}.iam.gserviceaccount.com"  # backend runs as this

gcloud config set project "${PROJECT_ID}"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')
DEFAULT_COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"  # web runs as this

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com

# ---------------------------------------------------------------------------
# 1. Deployer service account (the identity GitHub impersonates)
# ---------------------------------------------------------------------------
echo "==> Creating deployer service account: ${DEPLOYER_SA}..."
if ! gcloud iam service-accounts describe "${DEPLOYER_SA_EMAIL}" &>/dev/null; then
  gcloud iam service-accounts create "${DEPLOYER_SA}" \
    --display-name="GitHub Actions deployer (CI/CD)"
else
  echo "    already exists, skipping."
fi

echo "==> Granting deploy roles (least privilege)..."
# Deploy Cloud Run services + push images to Artifact Registry.
for role in roles/run.admin roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
    --role="${role}" --condition=None >/dev/null
done

# actAs the runtime SAs the services run under (backend + web's default compute SA).
for sa in "${RUNTIME_SA}" "${DEFAULT_COMPUTE_SA}"; do
  gcloud iam service-accounts add-iam-policy-binding "${sa}" \
    --member="serviceAccount:${DEPLOYER_SA_EMAIL}" \
    --role="roles/iam.serviceAccountUser" >/dev/null
done

# ---------------------------------------------------------------------------
# 2. Workload Identity pool + GitHub OIDC provider
# ---------------------------------------------------------------------------
echo "==> Creating Workload Identity pool: ${POOL}..."
if ! gcloud iam workload-identity-pools describe "${POOL}" \
     --location=global &>/dev/null; then
  gcloud iam workload-identity-pools create "${POOL}" \
    --location=global --display-name="GitHub Actions"
else
  echo "    already exists, skipping."
fi

echo "==> Creating OIDC provider: ${PROVIDER}..."
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER}" \
     --location=global --workload-identity-pool="${POOL}" &>/dev/null; then
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER}" \
    --location=global --workload-identity-pool="${POOL}" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository == '${GITHUB_REPO}'"
else
  echo "    already exists, skipping."
fi

# Only this repo may impersonate the deployer SA.
POOL_NAME=$(gcloud iam workload-identity-pools describe "${POOL}" \
  --location=global --format='value(name)')
gcloud iam service-accounts add-iam-policy-binding "${DEPLOYER_SA_EMAIL}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${GITHUB_REPO}" >/dev/null

PROVIDER_RESOURCE=$(gcloud iam workload-identity-pools providers describe "${PROVIDER}" \
  --location=global --workload-identity-pool="${POOL}" --format='value(name)')

# ---------------------------------------------------------------------------
# 3. Print the GitHub Variables to set
# ---------------------------------------------------------------------------
cat <<EOF

==> Done. Add these as GitHub Repository Variables
    (Settings -> Secrets and variables -> Actions -> Variables):

  GCP_WIF_PROVIDER = ${PROVIDER_RESOURCE}
  GCP_DEPLOYER_SA  = ${DEPLOYER_SA_EMAIL}

Also set these deploy-config Variables (non-secret; anon key & NEXT_PUBLIC_* are
client-exposed by design):

  SUPABASE_URL
  CORS_ORIGINS
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_API_URL

Real secrets (SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY) stay in Secret
Manager and are injected at runtime by the Cloud Run specs — CI never sees them.
EOF
