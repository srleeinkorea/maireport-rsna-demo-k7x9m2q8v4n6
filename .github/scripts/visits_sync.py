"""GoatCounter 방문 기록을 이어받아 visits-data 브랜치의 hits.csv에 붙인다.

GoatCounter 내보내기는 한 시간에 한 번만 허용되므로 GitHub Actions가 매시간 한 번 실행한다.
지난번에 받은 마지막 기록 번호(state.json)부터 이어서 받는다.
사용법: python visits_sync.py <데이터 폴더>
"""
import csv, gzip, io, json, os, sys, time, urllib.error, urllib.request
from datetime import datetime, timezone

SITE = os.environ.get("GOATCOUNTER_SITE", "maireport-demo")
TOKEN = os.environ.get("GOATCOUNTER_TOKEN", "").strip()
API = f"https://{SITE}.goatcounter.com/api/v0"
OUT_COLS = ["Date", "Path", "Title", "Event", "Session", "Browser", "System",
            "Referrer", "Referrer scheme", "Screen size", "Location"]


def call(path, method="GET", body=None, raw=False):
    req = urllib.request.Request(API + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json",
                                          "User-Agent": "maireport-visits-sync/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
    except urllib.error.HTTPError as e:
        print(f"GoatCounter {method} {path} → {e.code}: {e.read()[:300].decode('utf-8', 'replace')}")
        raise
    return data if raw else json.loads(data)


def main(folder):
    if not TOKEN:
        print("GOATCOUNTER_TOKEN 비밀값이 없습니다. 저장소 Settings → Secrets에 넣어 주세요.")
        return 1
    state_path = os.path.join(folder, "state.json")
    hits_path = os.path.join(folder, "hits.csv")
    state = json.load(open(state_path, encoding="utf-8")) if os.path.exists(state_path) else {}
    last = int(state.get("last_hit_id") or 0)

    try:
        ex = call("/export", "POST", {"format": "csv", "start_from_hit_id": last})  # last보다 큰 번호만 받음
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print("GoatCounter 내보내기 한도(시간당 1회)에 걸려 이번 차례는 건너뜁니다.")
            return 0
        raise
    for _ in range(100):
        if ex.get("finished_at") or ex.get("error"):
            break
        time.sleep(3)
        ex = call(f"/export/{ex['id']}")
    if ex.get("error"):
        raise SystemExit("내보내기 실패: " + ex["error"])
    if not ex.get("finished_at"):
        raise SystemExit("내보내기가 끝나지 않았습니다.")

    rows = []
    if ex.get("num_rows"):
        data = call(f"/export/{ex['id']}/download", raw=True)
        if data[:2] == b"\x1f\x8b":
            data = gzip.decompress(data)
        reader = csv.reader(io.StringIO(data.decode("utf-8")))
        head = next(reader)
        head[0] = head[0].lstrip("0123456789")  # 첫 칸은 형식 번호가 붙어 옴(예: 2Path)
        ix = {h.strip(): i for i, h in enumerate(head)}
        for r in reader:
            if not r:
                continue
            bot = r[ix["Bot"]] if "Bot" in ix else "0"
            if bot not in ("", "0", "false"):
                continue
            rows.append([r[ix[c]] if c in ix else "" for c in OUT_COLS])

    if rows:
        new_file = not os.path.exists(hits_path)
        with open(hits_path, "a", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            if new_file:
                w.writerow(OUT_COLS)
            w.writerows(rows)
    if ex.get("last_hit_id"):
        state["last_hit_id"] = ex["last_hit_id"]
    if rows or not os.path.exists(state_path):
        state["updated_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        state["site"] = SITE
        json.dump(state, open(state_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"새 기록 {len(rows)}건 (마지막 번호 {state.get('last_hit_id')})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
