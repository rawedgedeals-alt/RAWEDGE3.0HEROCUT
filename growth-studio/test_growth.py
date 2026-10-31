#!/usr/bin/env python3
"""Safety checks for daily Growth Studio briefs and zero-charge rendering default."""
import datetime as dt
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
plan_path=ROOT/"growth-studio"/"plan.py"
spec=importlib.util.spec_from_file_location("growthstudio_plan",plan_path)
plan=importlib.util.module_from_spec(spec)
spec.loader.exec_module(plan)

class GrowthStudioTests(unittest.TestCase):
    def test_two_brand_twice_daily(self):
        rows=list(plan.briefs(dt.date(2026,11,1)))
        self.assertEqual(len(rows),4)
        self.assertEqual(len({r["id"] for r in rows}),4)
        self.assertEqual({(r["brand"],r["slot"]) for r in rows},{
            ("rawedge","morning"),("rawedge","evening"),("whatif","morning"),("whatif","evening")})
        for row in rows:
            self.assertEqual(row["duration_seconds"],14)
            self.assertTrue(row["video_required"])
            self.assertTrue(row["image_only_or_slideshow_forbidden"])
            self.assertIn("not_generated",row["status"])
            self.assertEqual(row["estimated_external_spend_usd"],0)
            self.assertIn("utm_campaign=growth_studio",row["tracked_links"]["facebook"])
            self.assertIn("https://",row["website_page"])
    def test_briefs_rotate_and_use_distinct_day(self):
        day_one={r["id"]:r["website_page"] for r in plan.briefs(dt.date(2026,11,1))}
        day_two={r["id"]:r["website_page"] for r in plan.briefs(dt.date(2026,11,2))}
        self.assertFalse(set(day_one).intersection(day_two))
        self.assertNotEqual(list(day_one.values()),list(day_two.values()))
    def test_renderer_dry_run_never_calls_paid_api(self):
        row=next(r for r in plan.briefs(dt.date(2026,11,1)) if r["brand"]=="whatif")
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/"brief.json"
            source.write_text(json.dumps(row),encoding="utf-8")
            out=subprocess.run([sys.executable,str(ROOT/"growth-studio"/"render_ltx.py"),str(source)],
                               capture_output=True,text=True,timeout=12)
            self.assertEqual(out.returncode,0,out.stderr)
            self.assertIn("DRY RUN",out.stdout)
    def test_paid_renderer_fails_closed_with_zero_spend_cap(self):
        row=next(r for r in plan.briefs(dt.date(2026,11,1)) if r["brand"]=="whatif")
        with tempfile.TemporaryDirectory() as directory:
            source=Path(directory)/"brief.json"
            source.write_text(json.dumps(row),encoding="utf-8")
            out=subprocess.run([sys.executable,str(ROOT/"growth-studio"/"render_ltx.py"),str(source),"--execute"],
                               capture_output=True,text=True,timeout=12)
            self.assertNotEqual(out.returncode,0)
            self.assertIn("Budget blocked",out.stderr)

if __name__=="__main__":unittest.main()
