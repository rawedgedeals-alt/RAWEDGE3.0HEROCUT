#!/usr/bin/env python3
"""Build a dated editorial review queue from actual recorded evidence.

No review is marked verified by inference, link reachability, or publication date.
"""
import datetime as dt
import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[1]
casinos = json.loads((root / "casinos.json").read_text(encoding="utf-8"))["casinos"]
evidence_path = root / "review-evidence.json"
evidence = json.loads(evidence_path.read_text(encoding="utf-8")) if evidence_path.exists() else {}
today = dt.datetime.now(dt.timezone.utc).date()
queue = []
for casino in casinos:
    item = evidence.get(casino["id"], {})
    required = ["official_website", "terms_source", "licensing_source", "payment_source"]
    missing = [field for field in required if not item.get(field, {}).get("url") or not item.get(field, {}).get("checked_at")]
    payout = item.get("payout_test", {})
    if not (payout.get("withdrawal_requested_at") and payout.get("funds_received_at") and payout.get("evidence_reference")):
        missing.append("documented payout test")
    checked = item.get("editorial_reviewed_at")
    stale = True
    if checked:
        try:
            age = (today - dt.date.fromisoformat(checked)).days
            stale = age < 0 or age > 30
        except ValueError:
            pass
    queue.append({
        "id": casino["id"], "name": casino["name"],
        "review_status": "needs_review" if missing or stale else "evidence_recorded",
        "missing_evidence": missing,
        "editorial_reviewed_at": checked,
        "offer_verified_at": casino.get("offer_verified_at"),
        "note": "Evidence recorded is not a guarantee of correctness; human editorial validation required."
    })
report = {"generated_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
          "scope": "Editorial review queue, not completed casino testing", "casinos": queue}
(root / "review-queue.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print(f"Review queue generated: {len(queue)} casinos; {sum(x['review_status']=='needs_review' for x in queue)} need review")
for x in queue:
    print(x["name"], "—", ", ".join(x["missing_evidence"]) or "Check evidence freshness")
