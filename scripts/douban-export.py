#!/usr/bin/env python3
"""Your Douban movie/TV shelves as a CSV the app's "Import CSV…" reads.

Douban has no export or API; the public shelf pages
`movie.douban.com/people/<id>/collect|do|wish` are what's left. Columns follow
the app's generic CSV schema: title, year, imdb, type, status, rating, review, date.

    python3 scripts/douban-export.py <id> -o ~/Downloads/douban.csv [--imdb]
    # after scripts/match-csv.test.js, IMDb ids for just the misses:
    python3 scripts/douban-export.py <id> -o ~/Downloads/douban.csv \
        --from ~/Downloads/douban.csv --imdb-for ~/Downloads/douban-matched.unmatched.csv

Stdlib only.
"""

import argparse
import csv
import html
import json
import pathlib
import re
import socket
import sys
import time
import urllib.error
import urllib.request

SHELVES = {"collect": "watched", "do": "watching", "wish": "want to watch"}
PER_PAGE = 15
# `tmdb` is empty from Douban; fill it by hand to pin a row the matcher can't find.
COLUMNS = ["title", "year", "imdb", "tmdb", "type", "status", "rating", "review", "date", "douban"]
BROWSER = {
    # Douban answers requests without these with a bare 403.
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

ITEM = re.compile(r'<div class="item comment-item"(.*?)</ul>', re.S)
SUBJECT = re.compile(r"movie\.douban\.com/subject/(\d+)")
TITLE = re.compile(r'<li class="title">\s*<a[^>]*>(.*?)</a>', re.S)
INTRO = re.compile(r'<li class="intro">(.*?)</li>', re.S)
RATING = re.compile(r'class="rating(\d)-t"')
DATE = re.compile(r'<span class="date">(.*?)</span>', re.S)
COMMENT = re.compile(r'<span class="comment">(.*?)</span>', re.S)
TOTAL = re.compile(r'class="subject-num">\s*[\d\-]+\s*(?:&nbsp;|\s)*/(?:&nbsp;|\s)*(\d+)')
YEAR = re.compile(r"\b(18|19|20)\d\d\b")
IMDB = re.compile(r"IMDb:</span>\s*(tt\d+)")
# A season in the title, or an episode count in the intro, means a series.
SERIES = re.compile(r"第[一二三四五六七八九十\d]+季|Season \d+|\d+集|集数")


class LoginRequired(Exception):
    pass


def text(raw):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw))).strip()


def fetch(url, cookie, delay, attempts=4):
    request = urllib.request.Request(url, headers=dict(BROWSER))
    if cookie:
        request.add_header("Cookie", cookie)
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(request, timeout=45) as answer:
                if "sec.douban.com" in answer.geturl():
                    raise LoginRequired(
                        "Douban sent a security check instead of the page — "
                        "log in in a browser and pass its cookie with --cookie-file"
                    )
                return answer.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as problem:
            # 403 is also Douban's rate limit, so back off before believing it.
            if problem.code not in (403, 429, 500, 502, 503) or attempt == attempts:
                raise
            wait = delay * 4 * attempt
            print(f"  {problem.code}, waiting {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
        except (urllib.error.URLError, socket.timeout, TimeoutError) as problem:
            if attempt == attempts:
                raise
            wait = delay * 4 * attempt
            print(f"  {problem}, waiting {wait:.0f}s", file=sys.stderr)
            time.sleep(wait)
    raise RuntimeError("unreachable")


def entry_from(chunk, shelf):
    found = SUBJECT.search(chunk)
    title = TITLE.search(chunk)
    if not found or not title:
        return None
    intro = text(INTRO.search(chunk).group(1)) if INTRO.search(chunk) else ""
    name = text(title.group(1))
    stars = RATING.search(chunk)
    when = DATE.search(chunk)
    comment = COMMENT.search(chunk)
    year = YEAR.search(intro)
    return {
        "id": found.group(1),
        "title": name,
        "year": year.group(0) if year else "",
        "imdb": "",
        "type": "tv" if SERIES.search(name) or SERIES.search(intro) else "",
        "status": SHELVES[shelf],
        "rating": stars.group(1) if stars else "",
        "review": text(comment.group(1)) if comment else "",
        "date": text(when.group(1)) if when else "",
        "douban": f"https://movie.douban.com/subject/{found.group(1)}/",
    }


def read_shelf(person, shelf, cookie, delay):
    rows, seen, claimed, start = [], set(), None, 0
    while True:
        url = (
            f"https://movie.douban.com/people/{person}/{shelf}"
            f"?start={start}&sort=time&rating=all&filter=all&mode=grid"
        )
        page = fetch(url, cookie, delay)
        if claimed is None:
            total = TOTAL.search(page)
            claimed = int(total.group(1)) if total else 0
            if not claimed:
                return [], 0
        fresh = 0
        for chunk in ITEM.findall(page):
            row = entry_from(chunk, shelf)
            if row and row["id"] not in seen:
                seen.add(row["id"])
                rows.append(row)
                fresh += 1
        print(f"  {shelf}: {len(rows)}/{claimed}", file=sys.stderr)
        start += PER_PAGE
        if not fresh or start >= claimed:
            return rows, claimed
        time.sleep(delay)


def add_imdb(rows, cookie, delay, cache_path):
    """One subject page per title; cached so an interrupted run resumes."""
    cache = json.loads(cache_path.read_text("utf-8")) if cache_path.exists() else {}
    wanted = [r for r in rows if r["id"] not in cache]
    for at, row in enumerate(wanted, 1):
        try:
            page = fetch(f"https://movie.douban.com/subject/{row['id']}/", cookie, delay)
            found = IMDB.search(page)
            cache[row["id"]] = found.group(1) if found else ""
        except LoginRequired as problem:
            print(f"  {problem}", file=sys.stderr)
            break
        except Exception as problem:  # noqa: BLE001 — a lost id is not a lost title
            print(f"  {row['title'][:24]}: {problem}", file=sys.stderr)
        if at % 10 == 0 or at == len(wanted):
            cache_path.write_text(json.dumps(cache), "utf-8")
            print(f"  imdb: {at}/{len(wanted)}", file=sys.stderr)
        time.sleep(delay)
    for row in rows:
        row["imdb"] = cache.get(row["id"], "") or row.get("imdb", "")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("person", help="profile id or url: douban.com/people/<this>/")
    parser.add_argument("-o", "--out", default="douban.csv")
    parser.add_argument("--shelf", action="append", choices=list(SHELVES))
    parser.add_argument("--cookie-file", help="Douban cookie header, for a private profile")
    parser.add_argument("--delay", type=float, default=1.5, help="seconds between pages")
    parser.add_argument(
        "--from", dest="source", metavar="CSV",
        help="reuse this earlier export instead of reading the shelves again",
    )
    parser.add_argument(
        "--imdb-for", metavar="CSV",
        help="only look up IMDb ids for the rows in this CSV (e.g. the match "
             "script's .unmatched.csv) and add them to <out>",
    )
    parser.add_argument(
        "--imdb", action="store_true",
        help="also fetch each title's page for its IMDb id (better matching; "
             "one request per title, cached in <out>.imdb.json)",
    )
    args = parser.parse_args()

    person = re.sub(r".*people/", "", args.person).split("/")[0].split("?")[0]
    cookie = pathlib.Path(args.cookie_file).read_text("utf-8").strip() if args.cookie_file else None

    rows = []
    if args.source:
        with open(pathlib.Path(args.source).expanduser(), encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
        for row in rows:
            found = SUBJECT.search(row.get("douban", ""))
            row["id"] = found.group(1) if found else ""
    for shelf in [] if args.source else (args.shelf or list(SHELVES)):
        try:
            found, claimed = read_shelf(person, shelf, cookie, args.delay)
        except urllib.error.HTTPError as problem:
            hint = " — private profile? try --cookie-file" if problem.code == 403 else ""
            print(f"{shelf}: HTTP {problem.code}{hint}", file=sys.stderr)
            return 1
        if claimed > len(found):
            print(f"  {shelf}: {claimed - len(found)} no longer listed", file=sys.stderr)
        rows.extend(found)
        time.sleep(args.delay)

    if not rows:
        print("nothing found — is the profile public, and the id right?", file=sys.stderr)
        return 1
    if args.imdb or args.imdb_for:
        wanted = rows
        if args.imdb_for:
            with open(pathlib.Path(args.imdb_for).expanduser(), encoding="utf-8-sig") as f:
                ids = {SUBJECT.search(r.get("douban", "")) for r in csv.DictReader(f)}
            ids = {m.group(1) for m in ids if m}
            wanted = [r for r in rows if r["id"] in ids]
            print(f"  imdb: {len(wanted)} rows to look up", file=sys.stderr)
        add_imdb(wanted, cookie, max(args.delay, 2.0),
                 pathlib.Path(f"{pathlib.Path(args.out).expanduser()}.imdb.json"))

    out = pathlib.Path(args.out).expanduser()
    with out.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    rated = sum(1 for r in rows if r["rating"])
    series = sum(1 for r in rows if r["type"] == "tv")
    print(f"{len(rows)} titles ({series} series), {rated} rated → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
