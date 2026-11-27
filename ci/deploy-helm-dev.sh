#!/usr/bin/env bash
# =============================================================================
#  deploy-helm-dev.sh — deploy the grievance frontend to oan_dev (k3s) via Helm.
#  Runs on the oan-ci-deploy Jenkins agent (VPN; has kubectl + helm + kubeconfig).
#
#  Required env (injected by Jenkins):
#    KUBECONFIG        path to the oan-dev kubeconfig (Secret file credential)
#    IMAGE_REPOSITORY  full ECR URI of the frontend image (without tag)
#    IMMUTABLE_TAG     image tag for this build, e.g. 0.0.1-develop.42
#    HELM_RELEASE      Helm release name, default: grievance-ui
#    HELM_NAMESPACE    Kubernetes namespace,  default: grievance
# =============================================================================
set -euo pipefail

: "${KUBECONFIG:?KUBECONFIG must be set}"
: "${IMAGE_REPOSITORY:?IMAGE_REPOSITORY must be set}"
: "${IMMUTABLE_TAG:?IMMUTABLE_TAG must be set}"

HELM_RELEASE="${HELM_RELEASE:-grievance-ui}"
HELM_NAMESPACE="${HELM_NAMESPACE:-grievance}"
# The archive "Package chart" built for this build (unstashed into built-chart/), versioned like the image.
# DEPLOY_ENV picks the values: dev (develop) or staging (the staging branch, a promoted chart).
DEPLOY_ENV="${DEPLOY_ENV:-dev}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CHART_TGZ="${ROOT}/built-chart/oan-grievance-ui-${IMMUTABLE_TAG}.tgz"
test -f "${CHART_TGZ}" || { echo "${CHART_TGZ} is missing: run package_chart.py package first" >&2; exit 1; }
VALUES_FILE="${ROOT}/helm/environments/${DEPLOY_ENV}/oan-grievance-ui.yaml"

echo "=== Deploying ${HELM_RELEASE} to namespace ${HELM_NAMESPACE} ==="
echo "    image: ${IMAGE_REPOSITORY}:${IMMUTABLE_TAG}"

echo "=== Pre-flight: render the chart and validate it against the API server ==="
helm template "${HELM_RELEASE}" "${CHART_TGZ}" \
  --namespace "${HELM_NAMESPACE}" \
  --values "${VALUES_FILE}" \
  --set ui.image.repository="${IMAGE_REPOSITORY}" \
  --set ui.image.tag="${IMMUTABLE_TAG}" \
  | kubectl apply --dry-run=server --namespace "${HELM_NAMESPACE}" -f -

helm upgrade "${HELM_RELEASE}" "${CHART_TGZ}" \
  --install \
  --namespace "${HELM_NAMESPACE}" \
  --values "${VALUES_FILE}" \
  --set ui.image.repository="${IMAGE_REPOSITORY}" \
  --set ui.image.tag="${IMMUTABLE_TAG}" \
  --wait \
  --timeout 5m

echo "=== Helm deploy finished ==="
kubectl rollout status deployment \
  -l "app.kubernetes.io/instance=${HELM_RELEASE}" \
  -n "${HELM_NAMESPACE}" \
  --timeout=3m || true
