#!/usr/bin/env python3
"""Collect daily source snapshots from explicitly approved official public URLs.

Snapshots detect changes; they do not certify accuracy or constitute real-money testing.
No scraping of affiliate redirects, logins, or gambling transactions.
"""
import datetime as dt
import hashlib
import json
import pathlib
import urllib.error
import urllib.request
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
config_path = ROOT / "official-sources.json"
config = json.loads(config_path.read_text(encoding="utf-8"))
out_dir = ROOT / "source-snapshots"
out_dir.mkdir(exist_ok=True)
results = []
now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
for item in config.get("sources", []):
    url = item["url"]
    host = urlsplit(url).hostname
    if urlsplit(url).scheme != "https" or not host:
        results.append({"casino_id": item.get("casino_id"), "status": "invalid_source_url"})
        continue
    key = item["casino_id"] + "-" + item["source_type"]
    target = out_dir / (key + ".json")
    previous = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
    record = {"casino_id": item["casino_id"], "source_type": item["source_type"],
              "source_url": url, "checked_at_utc": now, "status": "unavailable"}
    try:
        request = urllib.request.Request(url, headers={"User-Agent": "RawEdgeEditorialSourceMonitor/1.0", "Accept": "text/html,text/plain"})
        with urllib.request.urlopen(request, timeout=15) as response:
            if response.geturl().split("/")[2].lower() != host.lower():
                # Redirects may be legitimate but require editorial review.
                record["redirected_to"] = response.geturl()
            mime = response.headers.get_content_type()
            if mime not in ("text/html", "text/plain"):
                record["status"] = "unsupported_content_type"
            else:
                body = response.read(1024 * 1024)
                digest = hashlib.sha256(body).hexdigest()
                record["sha256"] = digest
                record["status"] = "changed" if previous.get("sha256") and previous["sha256"] != digest else ("unchanged" if previous.get("sha256") else "baseline")
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        record["status"] = "manual_review"
        record["error_type"] = type(exc).__name__
    target.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    results.append(record)
report = {"generated_at_utc": now, "notice": "Source changes require editorial verification. No bonus, license, payout or ranking claims are automatically approved.", "sources": results}
(ROOT / "source-change-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"Checked {len(results)} approved sources; {sum(x['status']=='changed' for x in results)} changed")
