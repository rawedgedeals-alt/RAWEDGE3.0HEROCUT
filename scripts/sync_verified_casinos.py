#!/usr/bin/env python3
"""Update only explicitly configured, verifiable casino offer fields.

No sources configured = no editorial changes. Never infer payouts or licensing.
"""
import json
import pathlib
import urllib.request
from datetime import datetime, timezone
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parents[1]
data_path = ROOT / "casinos.json"
source_path = ROOT / "data" / "verified-sources.json"
data = json.loads(data_path.read_text())
sources = json.loads(source_path.read_text())
allowed = {"offer_label", "category", "tags"}
updated = 0
for entry in sources.get("sources", []):
    cid = entry["casino_id"]
    url = entry["url"]
    parsed = urlparse(url)
    host = parsed.hostname or ""
    trusted = entry["allowed_hostname"].lower()
    if parsed.scheme != "https" or host != trusted:
        raise ValueError("Untrusted feed URL for " + cid)
    req = urllib.request.Request(url, headers={"User-Agent":"RawEdgeEditorialSync/1.0"})
    with urllib.request.urlopen(req, timeout=15) as response:
        if response.geturl() != url or response.status != 200:
            raise ValueError("Feed redirect or failure: " + cid)
        payload = response.read(65537)
    if len(payload) > 65536:
        raise ValueError("Feed too large: " + cid)
    feed = json.loads(payload)
    if feed.get("casino_id") != cid or feed.get("source") != trusted:
        raise ValueError("Feed identity mismatch: " + cid)
    verified_at = feed.get("verified_at")
    if not verified_at:
        raise ValueError("Feed missing verification timestamp: " + cid)
    dt = datetime.fromisoformat(verified_at.replace("Z","+00:00"))
    if dt.tzinfo is None or not 0 <= (datetime.now(timezone.utc)-dt).total_seconds() <= 86400 * 7:
        raise ValueError("Feed verification date stale or invalid: " + cid)
    record = next((c for c in data["casinos"] if c["id"] == cid), None)
    if record is None:
        raise ValueError("Unknown casino: " + cid)
    for field in allowed:
        if field in feed:
            value = feed[field]
            if field == "tags":
                if not isinstance(value, list) or not all(isinstance(x,str) and len(x)<60 for x in value[:8]):
                    raise ValueError("Invalid tags")
                value = value[:8]
            elif not isinstance(value,str) or len(value)>150:
                raise ValueError("Invalid field " + field)
            record[field] = value
    record["offer_verified_at"] = verified_at
    updated += 1

if updated:
    data_path.write_text(json.dumps(data, indent=2, ensure_ascii=False)+"\n")
print(f"Verified feeds processed: {updated}. No rankings, payout times, or licensing claims auto-generated.")
