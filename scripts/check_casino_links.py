#!/usr/bin/env python3
"""Daily evidence audit. Network checks are NOT casino reviews or payout tests."""
import datetime as dt
import json
import pathlib
import urllib.error
import urllib.request
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "casinos.json").read_text(encoding="utf-8"))
today = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
results = []
for casino in data.get("casinos", []):
    url = casino.get("affiliate_url", "")
    host = urlsplit(url).hostname or ""
    record = {"id": casino.get("id"), "name": casino.get("name"), "affiliate_host": host,
              "offer_verified_at": casino.get("offer_verified_at"),
              "status": "not_checked", "http_status": None,
              "note": "HTTP reachability does not verify bonus terms, licensing, payouts, or editorial claims."}
    if urlsplit(url).scheme != "https" or not host:
        record["status"] = "invalid_url"
    else:
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "RawEdgeEditorialAudit/1.0"}, method="HEAD")
            with urllib.request.urlopen(request, timeout=12) as response:
                record["http_status"] = response.status
                record["status"] = "reachable"
        except urllib.error.HTTPError as error:
            record["http_status"] = error.code
            record["status"] = "manual_review" if error.code in (403, 405, 429) else "http_error"
        except Exception as error:
            record["status"] = "manual_review"
            record["note"] = "Could not establish reachability; network restrictions or tracking redirects may be involved."
    results.append(record)
report = {"checked_at_utc": today, "scope": "Affiliate link availability only; NOT independently verified casino reviews", "casinos": results}
out = ROOT / "audit-report.json"
out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"Audited {len(results)} casino links. Report: {out.name}")
for r in results:
    print(f"{r['name']}: {r['status']} ({r['http_status']})")
