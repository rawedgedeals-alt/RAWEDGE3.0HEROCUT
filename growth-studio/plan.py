#!/usr/bin/env python3
"""Growth Studio: deterministic, no-cost, brand-safe 14s real-motion video briefs.

Four briefs per Central Time day: 8:00 AM and 7:30 PM for each brand.
This is PRE-PRODUCTION: it does not synthesize video or claim to publish.
No dependencies and no paid API calls.
"""
import argparse
import datetime as dt
import json
from pathlib import Path
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

CENTRAL=ZoneInfo("America/Chicago")
SLOTS={"morning":"08:00","evening":"19:30"}
BRANDS={
 "rawedge":{
   "site":"https://www.rawedgecasinoreviews.com",
   "style":"Photoreal cinematic live action. Elegant recurring brunette spokeswoman in a sophisticated red dress, naturally walking through an upscale modern casino, spontaneous eye contact, realistic speech and mouth movement, subtle gestures. Camera tracks her physically. No static or animated photographs, no slideshow, no CGI look, no slot win or jackpot promise. Premium dark navy and emerald highlights.",
   "topics":[
     ("Not all rankings are earned.","Advertising never buys RawEdge rankings. Check how we evaluate casino claims before you play.","how-we-rate.html"),
     ("Look closer at the fine print.","That bonus headline is only half the story. Learn what wagering requirements actually mean.","casino-bonus-terms.html"),
     ("Can you follow the evidence?","We separate documented research from claims that still need checking. See our Receipt Wall.","receipt-wall.html"),
     ("Know your options before playing.","Real-money casinos and sweepstakes are different models. Understand the distinction first.","real-money-casinos.html"),
     ("A huge bonus can hide a big catch.","Try our free bonus wagering calculator before accepting terms.","bonus-wagering-calculator.html"),
     ("Your state matters.","Casino availability and rules vary by jurisdiction. Check the basics, then confirm the current rules.","us-casinos.html"),
     ("You deserve more than a star rating.","See the questions we ask about terms, eligibility and cashouts.","guides.html"),
   ]},
 "whatif":{
   "site":"https://discoverwhatif.com",
   "style":"Photoreal cinematic live-action video in a contemporary creative studio. Presenter naturally moves, walks and talks while showing a real working laptop; physically changes angle and interacts with screen. Clear human movements and synchronized natural speech; not a still photo, slideshow, page pan or cartoon. Clean modern cyan, violet and emerald lighting. Show simple practical software in use, not invented functionality.",
   "topics":[
     ("What if your first website took three steps?","Enter your business name, what you do and how customers contact you. Preview a free website file.","website-starter.html"),
     ("How many subscriptions do you really use?","See your recurring software costs and identify overlap with our free stack planner.","software-stack-planner.html"),
     ("What would all those apps cost in a year?","Use WHATIF's software cost calculator before signing up for another subscription.","software-cost-calculator.html"),
     ("Shopify or Wix?","Different tools suit different businesses. Compare the tradeoffs in plain English.","shopify-vs-wix.html"),
     ("Zapier or Make?","Before you automate, compare the learning curve and use cases without the jargon.","zapier-vs-make.html"),
     ("Do you speak code? Neither do we.","WHATIF makes practical small-business tools easier to understand and use.","how-to-create-a-business-website.html"),
     ("Your tech stack can be simpler.","Start with the software you already pay for. Our free checklist helps prioritize.","small-business-software-stack-checklist.html"),
   ]}
}

def briefs(day:dt.date):
    ordinal=(day-dt.date(2026,1,1)).days
    for brand, settings in BRANDS.items():
        for shift, local_time in SLOTS.items():
            index=(ordinal*2 + (0 if shift=="morning" else 1) + (0 if brand=="rawedge" else 3))%len(settings["topics"])
            hook,message,path=settings["topics"][index]
            page=f'{settings["site"]}/{path}'
            tracking={channel:f'{page}?'+urlencode({"utm_source":channel,"utm_medium":"organic_social","utm_campaign":"growth_studio","utm_content":f'{day.isoformat()}_{shift}'}) for channel in ("instagram","facebook","threads","youtube")}
            prompt=(settings["style"]+" The presenter says: "+message+" Natural continuous movement and a fast scene change at 7 seconds. End with a moment facing camera. Exactly 14 seconds, 9:16 vertical, not a still or slideshow.")
            yield {
                "id":f"{day.isoformat()}-{brand}-{shift}",
                "date_central":day.isoformat(),"post_time_central":local_time,
                "timezone":"America/Chicago","brand":brand,"slot":shift,
                "duration_seconds":14,"aspect_ratio":"9:16","video_required":True,
                "image_only_or_slideshow_forbidden":True,
                "status":"brief_ready_video_not_generated",
                "hook":hook,"spoken_script":message,
                "video_prompt":prompt,"website_page":page,
                "tracked_links":tracking,
                "caption":f"{hook} {message} Learn more: {tracking['instagram']}",
                "rules":["Require a real 13-15 second moving MP4 with natural character motion.", "Preview and quality-check lip sync, anatomy, subtitles and brand accuracy before publication.", "Do not claim first-hand payout testing or features not documented.", "RawEdge: disclose AI use when required; adults only, legality varies and play responsibly.", "Never post without verified MP4 and an active authorized social connection."],
                "render_provider":"not_configured","publish_provider":"not_configured",
                "estimated_external_spend_usd":0
            }

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--date",help="Central Time YYYY-MM-DD; defaults to current date")
    parser.add_argument("--output",default="growth-studio/output",help="Directory for JSON briefs")
    args=parser.parse_args()
    day=dt.date.fromisoformat(args.date) if args.date else dt.datetime.now(CENTRAL).date()
    out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    produced=[]
    for brief in briefs(day):
        p=out/(brief["id"]+".json")
        p.write_text(json.dumps(brief,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
        produced.append(p.name)
    assert len(produced)==4
    print(json.dumps({"day":day.isoformat(),"count":4,"files":produced,"videos_generated":0,"posts_scheduled":0,"external_spend_usd":0},indent=2))

if __name__=="__main__": main()
