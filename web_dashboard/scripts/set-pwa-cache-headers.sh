#!/usr/bin/env bash
# Keep the service worker, HTML shell, and manifest uncached so phones pick up deploys.
set -euo pipefail

if [ "${#}" -lt 1 ]; then
  echo "Usage: $0 <s3-bucket>" >&2
  exit 1
fi

BUCKET="$1"

set_headers() {
  local key="$1"
  local content_type="$2"
  if aws s3 ls "s3://${BUCKET}/${key}" >/dev/null 2>&1; then
    aws s3 cp "s3://${BUCKET}/${key}" "s3://${BUCKET}/${key}" \
      --metadata-directive REPLACE \
      --cache-control "public, max-age=0, must-revalidate" \
      --content-type "${content_type}"
  fi
}

set_headers "index.html" "text/html"
set_headers "sw.js" "application/javascript"
set_headers "manifest.webmanifest" "application/manifest+json"

aws s3 ls "s3://${BUCKET}/" | awk '{print $4}' | grep -E '^workbox-.+\.js$' | while read -r key; do
  set_headers "${key}" "application/javascript"
done
