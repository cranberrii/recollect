#!/usr/bin/env bash
# deploy.sh — Build, push, and deploy Recollect to Cloud Run.
# Run from the repo root. Requires setup.sh to have been run once first.
#
# Required env vars:
#   SUPABASE_URL                 e.g. https://xxxxx.supabase.co
#   CORS_ORIGINS                 e.g. https://recollect-web-xxxx.run.app  (comma-sep ok)
#   NEXT_PUBLIC_SUPABASE_URL     same as SUPABASE_URL (baked into web bundle)
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   NEXT_PUBLIC_API_URL          backend Cloud Run URL
#
# Optional env vars:
#   IMAGE_TAG       image tag to build/deploy (default: git short SHA)
#   SKIP_BUILD      set to 1 to skip docker build/push (re-deploy existing tag)
#   SKIP_BACKEND    set to 1 to skip backend build & deploy
#   SKIP_FRONTEND   set to 1 to skip frontend build & deploy
set -euo pipefail

PROJECT_ID="recollect-prod-515"
REGION="asia-northeast1"
export REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/recollect"
export IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
SKIP_BUILD="${SKIP_BUILD:-0}"
SKIP_BACKEND="${SKIP_BACKEND:-0}"
SKIP_FRONTEND="${SKIP_FRONTEND:-0}"

# --- Validate required env vars ---
if [[ "${SKIP_BACKEND}" != "1" ]]; then
  : "${SUPABASE_URL:?ERROR: SUPABASE_URL is not set}"
  : "${CORS_ORIGINS:?ERROR: CORS_ORIGINS is not set}"
fi
if [[ "${SKIP_FRONTEND}" != "1" && "${SKIP_BUILD}" != "1" ]]; then
  : "${NEXT_PUBLIC_SUPABASE_URL:?ERROR: NEXT_PUBLIC_SUPABASE_URL is not set}"
  : "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set}"
  : "${NEXT_PUBLIC_API_URL:?ERROR: NEXT_PUBLIC_API_URL is not set}"
fi

echo "==> Deploying tag: ${IMAGE_TAG}"
echo "    Registry: ${REGISTRY}"

# ---------------------------------------------------------------------------
# 1. Build & push images
# ---------------------------------------------------------------------------
if [[ "${SKIP_BUILD}" != "1" ]]; then
  if [[ "${SKIP_BACKEND}" != "1" ]]; then
    echo ""
    echo "==> Building backend..."
    docker build \
      -t "${REGISTRY}/backend:${IMAGE_TAG}" \
      -t "${REGISTRY}/backend:latest" \
      -f backend/Dockerfile \
      backend/
    echo "==> Pushing backend image..."
    docker push "${REGISTRY}/backend:${IMAGE_TAG}"
    docker push "${REGISTRY}/backend:latest"
  fi

  if [[ "${SKIP_FRONTEND}" != "1" ]]; then
    echo ""
    echo "==> Building frontend (NEXT_PUBLIC_* baked in at build time)..."
    docker build \
      -t "${REGISTRY}/web:${IMAGE_TAG}" \
      -t "${REGISTRY}/web:latest" \
      --build-arg "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" \
      --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
      --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
      -f apps/web/Dockerfile \
      .
    echo "==> Pushing frontend image..."
    docker push "${REGISTRY}/web:${IMAGE_TAG}"
    docker push "${REGISTRY}/web:latest"
  fi
else
  echo "    SKIP_BUILD=1: skipping docker build/push"
fi

# ---------------------------------------------------------------------------
# 2. Deploy backend
# ---------------------------------------------------------------------------
if [[ "${SKIP_BACKEND}" != "1" ]]; then
  echo ""
  echo "==> Deploying backend to Cloud Run..."
  export SUPABASE_URL
  export CORS_ORIGINS
  export PROJECT_ID

  envsubst '${IMAGE_TAG} ${REGISTRY} ${SUPABASE_URL} ${CORS_ORIGINS} ${PROJECT_ID}' \
    < deploy/services/backend.yaml \
    | gcloud run services replace - --region="${REGION}"

  gcloud run services add-iam-policy-binding recollect-backend \
    --region="${REGION}" \
    --member="allUsers" \
    --role="roles/run.invoker"
fi

# ---------------------------------------------------------------------------
# 3. Deploy frontend
# ---------------------------------------------------------------------------
if [[ "${SKIP_FRONTEND}" != "1" ]]; then
  echo ""
  echo "==> Deploying frontend to Cloud Run..."
  envsubst '${IMAGE_TAG} ${REGISTRY}' \
    < deploy/services/web.yaml \
    | gcloud run services replace - --region="${REGION}"

  gcloud run services add-iam-policy-binding recollect-web \
    --region="${REGION}" \
    --member="allUsers" \
    --role="roles/run.invoker"
fi

# ---------------------------------------------------------------------------
# 4. Print service URLs
# ---------------------------------------------------------------------------
echo ""
echo "==> Done! Service URLs:"
if [[ "${SKIP_BACKEND}" != "1" ]]; then
  BACKEND_URL=$(gcloud run services describe recollect-backend \
    --region="${REGION}" --format="value(status.url)")
  echo "    Backend:  ${BACKEND_URL}"
fi
if [[ "${SKIP_FRONTEND}" != "1" ]]; then
  WEB_URL=$(gcloud run services describe recollect-web \
    --region="${REGION}" --format="value(status.url)")
  echo "    Frontend: ${WEB_URL}"
fi


# Service URLs:
# Backend:  https://recollect-backend-s3grdnnqeq-an.a.run.app
# Frontend: https://recollect-web-s3grdnnqeq-an.a.run.app
# If CORS needs updating, re-deploy the backend only:
#  CORS_ORIGINS='https://recollect-web-s3grdnnqeq-an.a.run.app' SKIP_BUILD=1 SKIP_FRONTEND=1 ./deploy/deploy.sh