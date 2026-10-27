#!/usr/bin/env python3
"""Validate RawEdge editorial data without inventing or publishing offers."""
import datetime as dt
import json
import pathlib
import sys
from urllib.parse import urlsplit

root = pathlib.Path(__file__).resolve().parents[1]
data = json.loads((root / "casinos.json").read_text(encoding="utf-8"))
errors = []
warnings = []
if data.get("schema_version") != 2:
    errors.append("Unsupported schema_version")
items = data.get("casinos")
if not isinstance(items, list) or not items:
    errors.append("casinos must be a nonempty array")
    items = []
seen_ids = set()
seen_positions = set()
today = dt.date.today()
for item in items:
    ident = item.get("id")
    listing_order = item.get("listing_order")
    if not isinstance(ident, str) or not ident or ident in seen_ids:
        errors.append("Missing or duplicate casino id")
    seen_ids.add(ident)
    if not isinstance(listing_order, int) or listing_order < 1 or listing_order in seen_positions:
        errors.append(f"{ident}: invalid or duplicate research-list order")
    seen_positions.add(listing_order)
    if item.get("review_status") != "not_scored":
        warnings.append(f"{ident}: review status requires completed editorial evidence review")
    if not isinstance(item.get("name"), str) or not item["name"].strip():
        errors.append(f"{ident}: missing name")
    if not isinstance(item.get("tags"), list) or not all(isinstance(t, str) for t in item["tags"]):
        errors.append(f"{ident}: tags must be strings")
    url = urlsplit(item.get("affiliate_url", ""))
    if url.scheme != "https" or not url.netloc or url.username or url.password:
        errors.append(f"{ident}: affiliate_url must be a valid HTTPS URL")
    verified = item.get("offer_verified_at")
    if verified:
        try:
            age = (today - dt.date.fromisoformat(verified)).days
            if age < 0:
                errors.append(f"{ident}: future verification date")
            elif age > 7:
                warnings.append(f"{ident}: offer last verified {age} days ago; review required")
        except (TypeError, ValueError):
            errors.append(f"{ident}: invalid verification date")
    else:
        warnings.append(f"{ident}: no verified offer; do not advertise bonus amounts")
for line in warnings:
    print("REVIEW:", line)
for line in errors:
    print("ERROR:", line, file=sys.stderr)
print(f"Checked {len(items)} casinos; {len(warnings)} review flags; {len(errors)} errors")
sys.exit(1 if errors else 0)
