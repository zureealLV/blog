#!/usr/bin/env python3
"""Download 365 cover images from picsum.photos."""
import os, urllib.request, concurrent.futures
from datetime import datetime, timedelta

IMG_DIR = r"D:\blog\Firefly_zureeallv\src\content\posts\images"
START = datetime(2026, 6, 26)

def download_one(i):
    d = START + timedelta(days=i)
    fn = f"hermes-{d.strftime('%Y%m%d')}.jpg"
    fp = os.path.join(IMG_DIR, fn)
    if os.path.exists(fp) and os.path.getsize(fp) > 10000:
        return "SKIP"
    try:
        req = urllib.request.Request(f"https://picsum.photos/1920/1080?random={i}", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        with open(fp, "wb") as f:
            f.write(data)
        return f"OK {fn}"
    except Exception as e:
        return f"FAIL {fn}: {e}"

os.makedirs(IMG_DIR, exist_ok=True)
ok = fail = skip = 0
with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
    for r in pool.map(download_one, range(365)):
        if r.startswith("OK"): ok += 1
        elif r.startswith("SKIP"): skip += 1
        else: fail += 1
        if (ok+fail+skip) % 100 == 0: print(f"  {ok+fail+skip}/365")
print(f"Done: {ok} ok, {skip} skip, {fail} fail")
