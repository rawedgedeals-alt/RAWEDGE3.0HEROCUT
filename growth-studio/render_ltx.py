#!/usr/bin/env python3
"""Optional paid LTX v2 renderer. Dry-run by default; never auto-publishes.

A real moving MP4 is required. Running this without --execute incurs no charges.
Even with --execute, an explicit price cap and API key are required.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

API="https://api.ltx.io/v2"
COST_PER_SECOND=0.09  # LTX-2.5 Fast 720p, checked 2026-10-31
DURATION=14
ESTIMATED_COST=round(COST_PER_SECOND*DURATION,2)

def request_json(url,method="GET",payload=None,key=None):
    data=json.dumps(payload).encode("utf-8") if payload is not None else None
    headers={"Accept":"application/json","Authorization":"Bearer "+key}
    if data is not None: headers["Content-Type"]="application/json"
    try:
        with urlopen(Request(url,data=data,headers=headers,method=method),timeout=50) as response:
            return json.loads(response.read())
    except HTTPError as exc:
        raise RuntimeError(f"LTX returned HTTP {exc.code}; consult provider dashboard. No automatic retry.") from exc

def safe_https(url):
    parsed=urlparse(url or "")
    return parsed.scheme=="https" and bool(parsed.netloc) and not parsed.username and not parsed.password

def download_video(url,output):
    if not safe_https(url):raise RuntimeError("Invalid video output URL")
    # Provider output links expire; persist the MP4 immediately.
    req=Request(url,headers={"User-Agent":"RawEdge-GrowthStudio/1"})
    with urlopen(req,timeout=120) as response:
        content_type=response.headers.get("Content-Type","").lower()
        if "text/html" in content_type:raise RuntimeError("Provider response was HTML instead of MP4")
        total=0
        with output.open("wb") as handle:
            while True:
                chunk=response.read(1024*1024)
                if not chunk:break
                total+=len(chunk)
                if total>250*1024*1024:raise RuntimeError("Video exceeds 250 MB limit")
                handle.write(chunk)
    if total<1024 or b"ftyp" not in output.read_bytes()[:40]:
        output.unlink(missing_ok=True)
        raise RuntimeError("Output does not appear to be an MP4")
    return total

def main():
    p=argparse.ArgumentParser()
    p.add_argument("brief",type=Path,help="JSON file from plan.py")
    p.add_argument("--image-uri",default="",help="Approved first-frame image, HTTPS; mandatory for RawEdge spokeswoman")
    p.add_argument("--output",type=Path,default=Path("rendered-reel.mp4"))
    p.add_argument("--execute",action="store_true",help="Actually submit a billable LTX API job")
    p.add_argument("--per-render-cap-usd",type=float,default=0.0,help="Explicit per-render maximum, default zero")
    p.add_argument("--resume",action="store_true",help="Poll existing job instead of submitting (avoids duplicate charge)")
    p.add_argument("--max-poll-seconds",type=int,default=240)
    a=p.parse_args()
    brief=json.loads(a.brief.read_text(encoding="utf-8"))
    if brief.get("duration_seconds")!=14 or brief.get("video_required") is not True:
        p.error("Only approved 14-second real-motion video briefs are accepted")
    if brief.get("brand") not in ("rawedge","whatif"): p.error("Unknown brand")
    if a.image_uri and not safe_https(a.image_uri):p.error("image-uri must be HTTPS")
    if brief["brand"]=="rawedge" and not a.image_uri:
        p.error("RawEdge requires an approved first-frame URL to preserve the spokeswoman's appearance")
    operation="image-to-video" if a.image_uri else "text-to-video"
    payload={"model":"ltx-2-5-fast","prompt":brief["video_prompt"],"duration":DURATION,"resolution":"720x1280","fps":24,"generate_audio":True}
    if a.image_uri:payload["image_uri"]=a.image_uri
    print(json.dumps({"job":brief["id"],"mode":"billable" if a.execute else "dry_run",
          "endpoint":operation,"estimated_provider_charge_usd":ESTIMATED_COST,
          "maximum_allowed_this_run_usd":a.per_render_cap_usd,
          "post_to_social":False},indent=2))
    if not a.execute:
        print("DRY RUN: no API call, video render or social post.")
        return
    if a.per_render_cap_usd+1e-7<ESTIMATED_COST:
        p.error(f"Budget blocked: this run costs ~${ESTIMATED_COST:.2f}, cap ${a.per_render_cap_usd:.2f}")
    api_key=os.environ.get("LTX_API_KEY","")
    if not api_key:p.error("LTX_API_KEY must be configured as a protected secret; do not paste into repository")
    a.output.parent.mkdir(parents=True,exist_ok=True)
    state=a.output.with_suffix(".ltx-job.json")
    if a.resume:
        if not state.exists():p.error("No existing state to resume")
        saved=json.loads(state.read_text())
        if saved.get("brief_id")!=brief["id"] or saved.get("endpoint")!=operation:
            p.error("Resume state does not match requested brief")
        job_id=saved["job_id"]
    else:
        if state.exists():
            p.error("An earlier job exists for this reel. Use --resume; never pay twice by accident")
        result=request_json(f"{API}/{operation}",method="POST",payload=payload,key=api_key)
        job_id=result.get("id")
        if not isinstance(job_id,str) or not job_id:p.error("Provider did not return a job ID")
        state.write_text(json.dumps({"brief_id":brief["id"],"endpoint":operation,"job_id":job_id,
                                     "estimated_charge_usd":ESTIMATED_COST},indent=2)+"\n")
        print("Billable job submitted. State saved so this reel is not submitted twice.")
    deadline=time.monotonic()+max(5,min(a.max_poll_seconds,900))
    while time.monotonic()<deadline:
        result=request_json(f"{API}/{operation}/{job_id}",key=api_key)
        status=result.get("status") or result.get("state")
        if status=="completed":
            video_url=(result.get("result") or {}).get("video_url")
            if not video_url:raise RuntimeError("Completed render has no video URL")
            length=download_video(video_url,a.output)
            print(json.dumps({"status":"video_saved_needs_quality_review","file":str(a.output),"bytes":length,
                              "cost_estimate_usd":ESTIMATED_COST,"scheduled_or_published":False}))
            return
        if status=="failed":raise RuntimeError("LTX rendering failed; see provider dashboard. Do not resubmit automatically.")
        if status not in ("pending","processing","queued","running"):
            raise RuntimeError(f"Unknown render status {status!r}; job state retained for recovery.")
        time.sleep(6)
    raise RuntimeError("Render still processing. Use --resume to retrieve it without a second billable submission.")

if __name__=="__main__":
    try:main()
    except (OSError,URLError,RuntimeError) as exc:
        print("ERROR:",exc,file=sys.stderr)
        raise SystemExit(1)
