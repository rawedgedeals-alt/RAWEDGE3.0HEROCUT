#!/usr/bin/env python3
"""Read-only production availability and editorial freshness audit."""
import json
import sys
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlparse

base = "https://www.rawedgecasinoreviews.com"
errors = []
warnings = []
responses = {}
for path in ("/", "/casinos.html", "/casinos.json", "/app.js", "/style.css"):
    try:
        request = urllib.request.Request(base + path, headers={"User-Agent": "RawEdgeHealthAudit/1.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            if response.status != 200:
                raise ValueError("HTTP " + str(response.status))
            responses[path] = response.read()
        print("OK", path)
    except Exception as exc:
        errors.append(path + ": " + str(exc))

if "/" in responses:
    home = responses["/"].decode("utf-8")
    for ref in ("casinos.json", "app.js", "casinos.html"):
        if ref not in home:
            errors.append("Homepage missing " + ref)

if "/casinos.json" in responses:
    try:
        data = json.loads(responses["/casinos.json"])
        casinos = data.get("casinos", [])
        if not casinos:
            errors.append("Casino data is empty")
        ids = set()
        ranks = set()
        for casino in casinos:
            name = casino.get("name", "unknown")
            cid = casino.get("id")
            rank = casino.get("rank")
            if not cid or cid in ids:
                errors.append(name + ": missing or duplicate ID")
            ids.add(cid)
            if not isinstance(rank, int) or rank in ranks:
                errors.append(name + ": invalid or duplicate rank")
            ranks.add(rank)
            if urlparse(casino.get("affiliate_url", "")).scheme != "https":
                errors.append(name + ": affiliate URL is not HTTPS")
            if not casino.get("offer_verified_at"):
                warnings.append(name + ": offer verification date missing")
        reviewed = data.get("last_reviewed")
        if not reviewed:
            warnings.append("Dataset last_reviewed date missing")
        else:
            date = datetime.fromisoformat(reviewed.replace("Z", "+00:00"))
            if date.tzinfo is None:
                date = date.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - date).days > 7:
                warnings.append("Editorial review is more than seven days old")
    except Exception as exc:
        errors.append("Casino JSON validation failed: " + str(exc))

for warning in warnings:
    print("EDITORIAL WARNING:", warning)
for error in errors:
    print("HEALTH ERROR:", error)
if errors:
    sys.exit(1)
print("Health audit passed; editorial warnings require manual verification.")
