#!/usr/bin/env bash
# setup.sh — One-time GCP project bootstrap for Recollect.
# Run this once before your first deploy. Safe to re-run (skips existing resources).
set -euo pipefail

PROJECT_ID="recollect-prod-515"
REGION="asia-northeast1"
REGISTRY="${REGION}-docker.pkg.dev"
BACKEND_SA="recollect-backend"
BACKEND_SA_EMAIL="${BACKEND_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "==> Configuring project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

# ---------------------------------------------------------------------------
# 1. Enable required APIs
# ---------------------------------------------------------------------------
echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com

# ---------------------------------------------------------------------------
# 2. Artifact Registry repo
# ---------------------------------------------------------------------------
echo "==> Creating Artifact Registry repo..."
if ! gcloud artifacts repositories describe recollect \
     --location="${REGION}" &>/dev/null; then
  gcloud artifacts repositories create recollect \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Recollect container images"
else
  echo "    repo 'recollect' already exists, skipping."
fi

echo "==> Configuring Docker auth for ${REGISTRY}..."
gcloud auth configure-docker "${REGISTRY}" --quiet

# ---------------------------------------------------------------------------
# 3. Service account for backend (needs Secret Manager access)
# ---------------------------------------------------------------------------
echo "==> Creating service account: ${BACKEND_SA}..."
if ! gcloud iam service-accounts describe "${BACKEND_SA_EMAIL}" &>/dev/null; then
  gcloud iam service-accounts create "${BACKEND_SA}" \
    --display-name="Recollect Backend (Cloud Run)"
else
  echo "    service account already exists, skipping."
fi

echo "==> Granting secretmanager.secretAccessor to backend SA..."
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${BACKEND_SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None

# ---------------------------------------------------------------------------
# 4. Secret Manager secrets
# ---------------------------------------------------------------------------
echo "==> Creating secrets in Secret Manager..."

create_secret() {
  local name="$1"
  if ! gcloud secrets describe "${name}" &>/dev/null; then
    echo ""
    read -rsp "    Enter value for ${name}: " secret_value
    echo ""
    printf '%s' "${secret_value}" | gcloud secrets create "${name}" --data-file=-
  else
    echo "    secret '${name}' already exists, skipping."
    echo "    To update: printf 'new-value' | gcloud secrets versions add ${name} --data-file=-"
  fi
}

create_secret "SUPABASE_SERVICE_ROLE_KEY"
create_secret "OPENROUTER_API_KEY"

# ---------------------------------------------------------------------------
echo ""
echo "==> Setup complete."
echo ""
echo "Next steps:"
echo "  1. Export required env vars and run: ./deploy/deploy.sh"
echo "     Required vars:"
echo "       SUPABASE_URL              e.g. https://xxxxx.supabase.co"
echo "       CORS_ORIGINS              e.g. [\"https://recollect-web-xxxx.run.app\"]"
echo "       NEXT_PUBLIC_SUPABASE_URL  same as SUPABASE_URL"
echo "       NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "       NEXT_PUBLIC_API_URL       backend Cloud Run URL (deploy backend first)"
