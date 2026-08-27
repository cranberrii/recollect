# GitHub Actions authenticates to GCP via Workload Identity Federation

**Status:** accepted

The CI/CD pipeline (`.github/workflows/ci-cd.yml`) deploys to Cloud Run, which
requires GCP credentials. We chose **keyless Workload Identity Federation (WIF)**
over storing a service-account JSON key as a GitHub secret: GitHub's OIDC token is
exchanged for a short-lived GCP token at run time, so there is no long-lived
credential to leak, rotate, or clean up if the repo is compromised.

## Considered options

- **Service-account JSON key in a GitHub secret** — 5-minute setup, but a
  permanent GCP credential lives in GitHub indefinitely and must be rotated
  manually. Rejected: the blast radius of a leak is unbounded in time.
- **WIF (chosen)** — one-time ~15-minute setup (`deploy/setup-github-wif.sh`),
  no stored secret, access scoped by an attribute condition so *only* the
  `cranberrii/recollect` repo can impersonate the deployer SA.

## Consequences

- A dedicated `github-deployer` service account holds only `run.admin`,
  `artifactregistry.writer`, and `serviceAccountUser` (on the backend runtime SA
  and the default compute SA) — separate from the `recollect-backend` **runtime**
  SA the services actually run as.
- Setup is not fully reversible-free: the WIF pool + provider are one-time infra
  provisioned outside the app. `setup-github-wif.sh` is idempotent and captures it.
