"""公開中の曲ごとに、静的なページを t/<id>.html として書き出す。

なぜ必要か:
  SNSの巡回プログラムは、ページを読み込むだけでJavaScriptを動かさない。
  track.html は中身をJavaScriptで埋めるので、どの曲を貼っても同じ共有カードになる。
  曲名もジャケットも出ない。共有できることがこのページの目的なので、それでは意味がない。

  ここで作るページは、中身を最初から書き込んである。
  だから共有カードに曲名とジャケットが出るし、JavaScriptが動かない環境でも読める。

  曲評を書き直したら、作り直すこと。living-bg と同じ、生成物である。

    python3 tools/build_track_pages.py
    python3 tools/build_track_pages.py --base https://teng3333.github.io/heart-sutra-archive
"""
import argparse
import html
import json
import os
import re
import shutil
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "t"
API = "https://open-gate-sutra-production.up.railway.app"
SITE = "https://teng3333.github.io/heart-sutra-archive"

SHELF_COLOR = {"focus": "#5b8fb9", "relax": "#9ec9dd",
               "energy": "#c1483a", "inspire": "#dd8a5c"}

# 雛形は str.format で組み立てるので、波括弧を含む script は外に置く。
# 雛形の中に直接書くと、JavaScriptの { } を書式指定と読み違えて落ちる。
SCRIPT = """<script>
/* コピーの釦だけは、押されたときに動くものが要る。
   本文はJavaScriptが無くても読めるままにしてある */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-share-text]');
  if (!b) return;
  navigator.clipboard.writeText(b.getAttribute('data-share-text')).then(function () {
    var o = b.textContent;
    b.textContent = 'コピーしました ✓';
    setTimeout(function () { b.textContent = o; }, 1800);
  }).catch(function () { b.textContent = 'コピーできませんでした'; });
});
</script>"""


def get(path):
    with urllib.request.urlopen(API + path, timeout=20) as r:
        return json.load(r)


def e(x):
    return html.escape(str(x or ""), quote=True)


def host(u):
    m = re.match(r"https?://([^/]+)", u or "")
    return m.group(1).replace("www.", "") if m else ""


def share_text(t, url):
    """SNSへ渡す文。track.html 側の buildShare() と同じ形を保つこと。

    一言と曲名と住所だけで、曲評は入れない(2026-09-20 高尾さん指示)。
    はじめは曲評を45字で切って添えていたが、切り詰めた曲評は曲評の断片でしかない。
    読ませたいなら、リンクを開いて全部読んでもらえばよい。
    """
    head = (t.get("tagline") + "\n\n") if t.get("tagline") else ""
    return "%s%s ／ %s\n%s\n\n#般若心経 #HeartSutra #OpenGateSutra" % (
        head, t.get("title") or "", t.get("artist_name") or "unknown", url)


def page(t, base, tmpl):
    """雛形の track.html を骨にして、中身を埋めた1枚を作る。
       見た目の定義を二重に持たないよう、CSSは雛形からそのまま使う。"""
    who = t.get("artist_name") or "unknown"
    title = t.get("title") or ""
    desc_parts = [x for x in (t.get("genre"), " / ".join(t.get("languages") or []),
                              t.get("mode_label_ja")) if x]
    desc = "%s by %s — %s" % (title, who, " · ".join(desc_parts))
    if t.get("an_comment"):
        desc = t["an_comment"][:110]
    if t.get("tagline"):
        # SNSのカードでは、説明の先頭に曲の一言を出す
        desc = "%s — %s" % (t["tagline"], (t.get("an_comment") or desc)[:90])
    img = t.get("artwork_url") or (base + "/assets/og-card.jpg")
    card = "summary" if t.get("artwork_url") else "summary_large_image"
    url = "%s/t/%s.html" % (base, t["id"])
    col = SHELF_COLOR.get(t.get("mode"), "#d9c49a")

    shelf = " · ".join(x for x in (t.get("axis_label_ja"), t.get("mode_label_ja")) if x)
    meta = "  ·  ".join(x for x in (t.get("genre"), t.get("subgenre"),
                                    " / ".join(t.get("languages") or [])) if x)

    body = []
    body.append('<div class="head">')
    if t.get("artwork_url"):
        body.append('<div class="art on"><img id="artImg" src="%s" alt="%s のジャケット"></div>'
                    % (e(t["artwork_url"]), e(title)))
    else:
        body.append('<div class="art" id="art"></div>')
    body.append('<div class="head-text">')
    body.append('<p class="shelf"><span class="ja">%s</span> · %s</p>'
                % (e(shelf), e(t.get("mode_label_en"))))
    body.append('<h1>%s</h1>' % e(title))
    if t.get("tagline"):
        body.append('<p class="tagline">%s</p>' % e(t["tagline"]))
    by = 'by <a href="../archive.html?artist=%s">%s</a>' % (
        e(urllib.parse.quote(who)), e(who))
    if t.get("country"):
        by += "  " + e(t["country"])
    body.append('<p class="by">%s</p>' % by)
    body.append('<p class="meta">%s</p>' % e(meta))
    body.append('</div></div>')

    body.append('<div class="play">')
    # 聴くときは、聞き流し画面でビジュアルと一緒に。再生器を曲ごとに持たない
    body.append('<a class="btn main" href="../listen.html?track=%d">▶ 聴く ／ Play</a>' % t["id"])
    body.append('<a class="btn" href="../listen.html?gate=%s">この棚を流す ／ Play the shelf</a>'
                % e(t.get("axis") or "sei"))
    body.append('</div>')

    if t.get("an_comment") or t.get("good_points"):
        body.append('<section class="an">')
        body.append('<div class="an-head"><img src="../assets/an/face-human.webp" alt="" '
                    'width="34" height="34"><b>AN\'s review ／ ANの曲評</b></div>')
        if t.get("an_comment"):
            body.append('<p>%s</p>' % e(t["an_comment"]))
            if t.get("tagline"):
                # 曲評は結びの一文を含めずに保存している。選ばれた一言を結びとして足す
                body.append('<p class="an-end">この曲は、%s。</p>' % e(t["tagline"]))
        if t.get("good_points"):
            body.append('<p class="good">%s</p>' % e(t["good_points"]))
        body.append('</section>')

    if (t.get("lyrics") or "").strip():
        head = "Lyrics ／ 詞" + (" · " + e(t["lyrics_lang"]) if t.get("lyrics_lang") else "")
        body.append('<details class="lyr"><summary>%s</summary>'
                    '<div class="lyr-body">%s</div></details>' % (head, e(t["lyrics"].strip())))

    body.append('<div class="foot">')
    if t.get("artist_link"):
        body.append('<a class="btn" href="%s" target="_blank" rel="noopener noreferrer">'
                    '作者の場所へ ／ %s</a>' % (e(t["artist_link"]), e(host(t["artist_link"]))))
    if t.get("source_url"):
        body.append('<a class="btn" href="%s" target="_blank" rel="noopener noreferrer">'
                    '出どころ ／ %s</a>' % (e(t["source_url"]), e(host(t["source_url"]))))
    # 曲を渡せるようにする(2026-09-20 高尾さん指示)。
    # Xは文字しか受け取れないので、押した先の投稿欄に文が入った状態で開く
    text = share_text(t, url)
    tw = "https://twitter.com/intent/tweet?text=" + urllib.parse.quote(text)
    body.append('<a class="btn" href="%s" target="_blank" rel="noopener noreferrer">'
                '𝕏 ポストする</a>' % e(tw))
    # 改行をそのまま属性に置くと生成物が読みにくい。&#10; にして1行に収める
    body.append('<button class="btn" type="button" data-share-text="%s">文章をコピー</button>'
                % e(text).replace("\n", "&#10;"))
    body.append('<span class="grow"></span>')
    body.append('<span class="share">このページの住所が、あなたの曲の住所です。<b>%s</b></span>' % e(url))
    body.append('</div>')

    css = tmpl["css"].replace("--c:var(--washi);", "--c:%s;" % col)
    return """<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — {who} ｜ Open Gate Sutra</title>
<link rel="canonical" href="{url}">
<link rel="icon" href="../favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="../assets/icons/favicon-32x32.png">
<link rel="apple-touch-icon" href="../assets/icons/apple-touch-icon.png">
<link rel="manifest" href="../manifest.json">
<meta name="description" content="{desc}">
<meta property="og:type" content="music.song">
<meta property="og:site_name" content="Open Gate Sutra">
<meta property="og:title" content="{title} — {who}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{img}">
<meta name="twitter:card" content="{card}">
<meta name="twitter:title" content="{title} — {who}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{img}">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Shippori+Mincho:wght@400;500;600&display=swap" rel="stylesheet">
<script src="../src/js/consent.js" defer></script>
<style>
{css}
</style>
</head>
<body>
<header>
  <a class="brand" href="../">
    <span class="logo" aria-hidden="true"><span>開</span><span>羯</span><span>諦</span><span>経</span></span>
    <span><h2>Open Gate Sutra<small>ひらかれた般若心経の家</small></h2></span>
  </a>
  <a class="back" href="../archive.html">← Archive</a>
</header>
<main>
<article>
{body}
</article>
</main>
{script}
</body>
</html>
""".format(title=e(title), who=e(who), desc=e(desc), url=e(url), img=e(img),
           card=card, css=css, script=SCRIPT, body="\n      ".join(body))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=SITE, help="公開時の住所")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = (ROOT / "track.html").read_text(encoding="utf-8")
    m = re.search(r"<style>\n(.*?)\n</style>", src, re.S)
    if not m:
        print("track.html からCSSを取り出せません"); return 1
    tmpl = {"css": m.group(1)}

    """ここから下は、30分ごとに無人で走る(.github/workflows/build-track-pages.yml)。
    この処理は「一覧に無いページは消してよい」と信じて削除するので、
    一覧が不完全なまま進むと、公開中の曲ページを巻き添えで消してしまう。
    実際、2026-09-19 の試行で 1曲ずつ取り直す途中に読み取りが時間切れになった。
    そのとき削除まで進んでいれば、取れなかったぶんのページが消えていた。

    そこで、消す前に三つの関門を置く。
      ① 一覧が空なら何もしない  … 「公開0曲」は現実には起こらない。APIの不調と見なす
      ② 半分以上減っていたら消さない … 本当に減らしたなら運営が知っている。
                                     知らないうちの半減は異常なので、人の目を通す
      ③ 1曲でも取得に失敗したら消さない … 不完全な一覧を「全部」として扱わない
    いずれも「書くことはする、消すことだけ見送る」。次の回に全部取れれば正しく消える。
    """
    items = {}
    try:
        for axis in ("sei", "do"):
            for t in get("/api/shelf/" + axis).get("items", []):
                items[t["id"]] = t
    except Exception as exc:                      # 棚が読めなければ、この回は何もしない
        print("棚を読めませんでした(%s: %s)。この回は何もしません" % (type(exc).__name__, exc))
        return 1

    print("公開中の曲: %d曲" % len(items))
    if args.dry_run:
        print("※書き出しません")
        return 0

    # ── 関門① 一覧が空
    if not items:
        print("★公開中の曲が0曲と返りました。ありえない答えなので、この回は何もしません")
        return 1

    OUT.mkdir(exist_ok=True)
    before = {f.name for f in OUT.glob("*.html")}

    # ── 関門② 前回より半分以上減った
    if before and len(items) * 2 < len(before):
        print("★曲数が %d枚 → %d曲 へ半分以下に減りました。取り違えの疑いがあるので、"
              "この回は何もしません。意図した削除なら、手で実行してください"
              % (len(before), len(items)))
        return 1

    keep, failed = set(), []
    for tid in sorted(items):
        # 棚の一覧には曲評が付かないので、1曲ずつ取り直す
        try:
            t = get("/api/track/%d" % tid)
        except Exception as exc:                  # 1曲の失敗で全体を止めない。書ける分は書く
            failed.append(tid)
            print("  id=%s を取れませんでした(%s)" % (tid, type(exc).__name__))
            continue
        (OUT / ("%d.html" % tid)).write_text(page(t, args.base, tmpl), encoding="utf-8")
        keep.add("%d.html" % tid)

    # ── 関門③ 1曲でも取れなかった
    if failed:
        print("★%d曲を取れなかったので、この回は削除を見送ります(書き出し %d枚)。"
              "取れなかった曲: %s" % (len(failed), len(keep),
                                      "、".join(str(x) for x in failed[:10])))
        return 1

    # 取り下げられた曲のページは残さない
    removed = 0
    for f in OUT.glob("*.html"):
        if f.name not in keep:
            f.unlink(); removed += 1
    print("書き出し: %d枚 / 削除: %d枚 → %s" % (len(keep), removed, OUT))
    return 0


if __name__ == "__main__":
    import urllib.parse
    sys.exit(main())
