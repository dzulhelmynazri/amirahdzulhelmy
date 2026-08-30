#!/usr/bin/env bash
# Deploy production from local, WITHOUT pushing to git.
#
# Why not plain `vercel deploy --prod`? Remote builds lose the eve agent
# services: turbo's cache skips `next build`, so withEve never writes the
# `services` section into the build output config, and every `/eve/agents/*`
# route 404s. Building locally always produces the full config; we prune the
# stale services (agents that are no longer mounted in next.config.ts), then
# ship the prebuilt output as-is.
#
# Usage: ./scripts/deploy-prod.sh
set -euo pipefail
cd "$(dirname "$0")/.."

MOUNTED="eve-flight-guardian eve-disruption-guard eve-travel-sentinel"

vercel pull --yes --environment=production

# TURBO_FORCE so `next build` really runs and withEve regenerates services.
TURBO_FORCE=true vercel build --prod --yes

# Prune services for agents that are no longer mounted. Old entries survive
# in .vercel/output/config.json across builds and would ship four unused
# 25 MB functions.
python3 - "$MOUNTED" <<'EOF'
import json, shutil, os, sys
mounted = set(sys.argv[1].split())

p = ".vercel/output/config.json"
c = json.load(open(p))
stale = {s["name"] for s in c.get("services", []) if s["name"].startswith("eve-") and s["name"] not in mounted}
c["services"] = [s for s in c["services"] if s["name"] not in stale]
c["routes"] = [
    r for r in c["routes"]
    if not (isinstance(r.get("destination"), dict) and r["destination"].get("service") in stale)
]
json.dump(c, open(p, "w"), indent=2)

b = json.load(open(".vercel/output/builds.json"))
b["builds"] = [x for x in b["builds"] if not any(s in x.get("src", "") for s in stale)]
json.dump(b, open(".vercel/output/builds.json", "w"), indent=2)

for name in stale:
    d = f".vercel/output/services/{name}"
    if os.path.isdir(d):
        shutil.rmtree(d)
print(f"pruned: {sorted(stale) or 'nothing'}")
print(f"services shipped: {[s['name'] for s in c['services']]}")
EOF

vercel deploy --prebuilt --prod --yes

echo
echo "smoke test:"
for a in flight-guardian disruption-guard travel-sentinel; do
  printf "  %s: " "$a"
  curl -s -o /dev/null -w "%{http_code} %{content_type}\n" -X POST \
    "https://atlas-amirahdzulhelmy.vercel.app/eve/agents/$a/eve/v1/session" \
    -H "content-type: application/json" -d "{}"
done
echo "  (401 application/json = routed correctly, auth-gated. 404 text/html = broken.)"
