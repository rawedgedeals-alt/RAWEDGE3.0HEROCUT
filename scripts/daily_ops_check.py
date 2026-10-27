#!/usr/bin/env python3
"""Public site health and campaign expiry audit. No private customer/payment data."""
from __future__ import annotations
import datetime as dt
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlparse,unquote
from urllib.request import Request,urlopen

ROOT=Path(__file__).resolve().parents[1]
TODAY=dt.datetime.now(dt.timezone.utc).date()
SITES=["https://www.rawedgecasinoreviews.com/","https://www.rawedgecasinoreviews.com/sitemap.xml","https://discoverwhatif.com/","https://discoverwhatif.com/sitemap.xml"]
errors=[]; warnings=[]; healthy=[]
def log(level,subject,message):
    row=f"{subject}: {message}"
    (errors if level=="ERROR" else warnings if level=="WARN" else healthy).append(row)
    print(f"{level}: {row}")
def day(obj,field,slug):
    try:return dt.date.fromisoformat(obj[field])
    except (KeyError,TypeError,ValueError):
        log("ERROR",slug,f"Invalid or missing {field} YYYY-MM-DD")
        return None
def artwork(file_name,slug,field):
    if not isinstance(file_name,str) or not file_name:
        log("ERROR",slug,f"Missing {field}");return
    u=urlparse(file_name)
    clean=unquote(u.path).lstrip("/")
    p=(ROOT/clean).resolve()
    if u.scheme or u.netloc or ROOT not in p.parents or p.suffix.lower() not in (".png",".jpg",".jpeg",".webp") or not p.is_file():
        log("ERROR",slug,f"Unsafe, missing or unsupported local image: {field}")
def check_campaigns():
    try:data=json.loads((ROOT/"showcase-sponsors.json").read_text(encoding="utf-8"))
    except (ValueError,OSError) as exc:
        log("ERROR","sponsors",f"Invalid config: {exc}");return
    if not isinstance(data,dict):
        log("ERROR","sponsors","Expected campaign object");return
    active=0
    for slug,s in data.items():
        if not isinstance(slug,str) or not re.fullmatch(r"[a-z0-9-]{4,90}",slug) or not isinstance(s,dict):
            log("ERROR","sponsors","Invalid campaign entry");continue
        if s.get("active") is not True:continue
        active+=1
        if s.get("compliance_approved") is not True:
            log("ERROR",slug,"Active campaign lacks compliance approval")
        start=day(s,"start",slug);end=day(s,"end",slug)
        if start and end:
            if end<start:log("ERROR",slug,"End date is earlier than start date")
            if end<TODAY:log("ERROR",slug,f"Active campaign expired on {end}; disable or renew")
            elif (end-TODAY).days<=14:log("WARN",slug,f"Renewal follow-up: {end} ({(end-TODAY).days} days remaining)")
            else:log("OK",slug,f"Campaign scheduled through {end}")
        destination=urlparse(str(s.get("destination") or ""))
        if destination.scheme!="https" or not destination.netloc or destination.username or destination.password:
            log("ERROR",slug,"Approved advertising link must be HTTPS")
        if not isinstance(s.get("headline"),str) or not s["headline"].strip():
            log("ERROR",slug,"Missing ad headline")
        artwork(s.get("creative"),slug,"creative")
        if s.get("background_skin"):artwork(s.get("background_skin"),slug,"background_skin")
        if not (ROOT/(slug+".html")).is_file():
            log("ERROR",slug,"Casino profile HTML missing")
    if not active:log("OK","sponsors","No paid campaigns are active")
def check_receipt_wall():
    """Prevent publishing unverifiable test badges or fake payout measurements."""
    try:
        data=json.loads((ROOT/"receipt-wall.json").read_text(encoding="utf-8"))
        records=data["records"]
        if not isinstance(records,list):raise ValueError("Expected array")
    except (ValueError,TypeError,KeyError,OSError) as exc:
        log("ERROR","receipt wall",f"Invalid structured evidence ledger: {exc}")
        return
    seen=set()
    for row in records:
        if not isinstance(row,dict):
            log("ERROR","receipt wall","Record must be an object")
            continue
        slug=row.get("id")
        if not isinstance(slug,str) or not re.fullmatch(r"[a-z0-9-]+",slug):
            log("ERROR","receipt wall","Record missing safe ID")
            continue
        if slug in seen:log("ERROR",slug,"Duplicate record ID")
        seen.add(slug)
        profile=row.get("profile")
        if profile !=slug+".html" or not (ROOT/profile).is_file():
            log("ERROR",slug,"Record must link to its matching published casino profile HTML")
        if row.get("withdrawal_tested") is True and not row.get("withdrawal_evidence_url"):
            log("ERROR",slug,"Never claim a withdrawal test without a documented evidence reference")
        if row.get("deposit_tested") is True and not row.get("deposit_evidence_url"):
            log("ERROR",slug,"Never claim a deposit test without a documented evidence reference")
        speed=row.get("median_withdrawal_minutes")
        if speed is not None:
            if type(speed) not in (int,float) or speed < 0 or speed > 1000000:
                log("ERROR",slug,"Invalid payout minutes")
            if row.get("withdrawal_tested") is not True or not row.get("withdrawal_evidence_url"):
                log("ERROR",slug,"Payout timing requires completed, documented withdrawal evidence")
            if type(row.get("withdrawal_sample_count")) is not int or row["withdrawal_sample_count"]<3:
                log("ERROR",slug,"Median payout speed requires at least three documented withdrawal measurements")
    log("OK","receipt wall",f"Checked {len(records)} transparent research records")

def check_sites():
    for url in SITES:
        try:
            req=Request(url,headers={"User-Agent":"RawEdge-Site-Monitor/1.0"})
            with urlopen(req,timeout=18) as resp:
                if resp.status==200 and resp.read(128):
                    log("OK",url,"HTTP 200 and nonempty response")
                else:log("ERROR",url,f"Unexpected HTTP {resp.status} or empty response")
        except Exception as exc:
            log("ERROR",url,f"Site check failed ({type(exc).__name__}); verify manually for bot protection/outage")
def summarize():
    lines=[f"# RawEdge daily website and campaign audit — {TODAY}",f"**{len(healthy)} passed · {len(warnings)} warnings · {len(errors)} errors**",""]
    for title,items in [("Errors",errors),("Renewals and warnings",warnings),("Passed",healthy)]:
        lines.extend(["## "+title]+["- "+x for x in items] if items else ["## "+title,"- None"])
    lines.extend(["","Only public URLs and campaign configuration checked. Private contacts, contracts, payments and invoices are not accessed.","No ad is activated, renewed, billed, or emailed by this workflow."])
    content="\n".join(lines)+"\n"
    dest=os.environ.get("GITHUB_STEP_SUMMARY")
    if dest:
        with open(dest,"a",encoding="utf-8") as f:f.write(content)
    else:print(content)
if __name__=="__main__":
    check_campaigns()
    check_receipt_wall()
    check_sites()
    summarize()
    sys.exit(1 if errors else 0)
