#!/bin/bash
# Prepare this machine to preview and render HyperFrames videos.
# Run from the repo root:  bash video/setup.sh
set -euo pipefail

cd "$(dirname "$0")"
HF_VERSION=0.8.143
GSAP_VERSION=3.14.2

command -v ffmpeg >/dev/null || { echo "ffmpeg is required (macOS: brew install ffmpeg)"; exit 1; }

# Fetch the CLI and the headless Chrome it renders with (idempotent).
npx -y "hyperframes@${HF_VERSION}" browser ensure

# Some networks (including Claude Code cloud sessions) block cdn.jsdelivr.net,
# so keep a local GSAP to copy into each project as vendor/gsap.min.js.
if [ ! -f vendor/gsap.min.js ]; then
  tmp=$(mktemp -d)
  (cd "$tmp" && npm pack "gsap@${GSAP_VERSION}" --silent >/dev/null && tar xzf "gsap-${GSAP_VERSION}.tgz")
  mkdir -p vendor
  cp "$tmp/package/dist/gsap.min.js" vendor/gsap.min.js
  rm -rf "$tmp"
fi

npx -y "hyperframes@${HF_VERSION}" doctor || true
echo "HyperFrames is ready."
