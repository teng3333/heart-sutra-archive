"""
soul_up_an — X Auto-posting Bot
Powered by Gemini 2.5 Flash + tweepy
Schedule: 07:00 / 12:00 / 18:00 / 21:00 JST
Manual trigger: POST /post?secret=POST_SECRET
"""

import os
import random
import logging
import schedule
import time
import threading
import tweepy
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, request
from google import genai
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
SITE_URL = "https://teng3333.github.io/heart-sutra-archive/?locale=ja"

TRACKS = [
    {"genre": "INDIES",        "url": "https://suno.com/s/Wx7CnwCbekbEYNGr"},
    {"genre": "ENKA",          "url": "https://suno.com/s/enJa54lfA1apbDbO"},
    {"genre": "tango",         "url": "https://suno.com/s/5Sy85cO08UtHyEVC"},
    {"genre": "acoustic",      "url": "https://suno.com/s/RxVB7XfJIoxjGBae"},
    {"genre": "Blues",         "url": "https://suno.com/s/m5FIUyXT3HKfQBgD"},
    {"genre": "JAZZ",          "url": "https://suno.com/s/jHp51qiXA6Gyylq1"},
    {"genre": "funk",          "url": "https://suno.com/s/aeL9Kzw6rv2mN4Ey"},
    {"genre": "Bollywood",     "url": "https://suno.com/s/bjw8h0khtyiDCC9k"},
    {"genre": "iDOL",          "url": "https://suno.com/s/aRq2vh0JiqRjFHqw"},
    {"genre": "cyber punk",    "url": "https://suno.com/s/d5Wc2J4lCiKgQFuz"},
    {"genre": "simple",        "url": "https://suno.com/s/nfJC4YFxiPglZNyx"},
    {"genre": "anime song",    "url": "https://suno.com/s/FtiVGZ3CQI44IKVS"},
    {"genre": "punk",          "url": "https://suno.com/s/YfZvEC7fQ1o3bPhH"},
    {"genre": "ROCK",          "url": "https://suno.com/s/HL5LZyOYFD8DNJFR"},
    {"genre": "lo-fi",         "url": "https://suno.com/s/jQiBWO0Kk78oa6eg"},
    {"genre": "HIPHOP",        "url": "https://suno.com/s/OITaaoVjb5aP6dw6"},
    {"genre": "IDM",           "url": "https://suno.com/s/S5Q39LaxmMjmGFgy"},
    {"genre": "cyber punk II", "url": "https://suno.com/s/ypdCxaXjIgW6tXg6"},
    {"genre": "cyber punk III","url": "https://suno.com/s/EZPGaaLlKt628jf1"},
    {"genre": "hymn",          "url": "https://suno.com/s/ulaVVY0QHdCfH4BV"},
    {"genre": "gamelan",       "url": "https://suno.com/s/OH3OKfIBFD6RXqPT"},
    {"genre": "Halloween",     "url": "https://suno.com/s/6wQaeker0gtuW5cJ"},
    {"genre": "metal",         "url": "https://suno.com/s/DtT6pbAOrnyosgjt"},
]

CONTENT_MAX_CHARS = 215

RSS_FEEDS = [
    "https://www3.nhk.or.jp/rss/news/cat0.xml",
    "https://www3.nhk.or.jp/rss/news/cat1.xml",
    "https://www3.nhk.or.jp/rss/news/cat3.xml",
]

# ─── Global clients ───────────────────────────────────────────────────────────
_gemini = None
_twitter = None

# ─── Flask app ────────────────────────────────────────────────────────────────
flask_app = Flask(__name__)

@flask_app.route("/health")
def health():
    return jsonify({"status": "ok", "bot": "soul_up_an"})

@flask_app.route("/post", methods=["POST"])
def manual_post():
    """手動投稿トリガー: POST /post?secret=YOUR_SECRET"""
    secret = os.environ.get("POST_SECRET", "")
    if secret and request.args.get("secret") != secret:
        return jsonify({"error": "unauthorized"}), 401
    if _gemini is None or _twitter is None:
        return jsonify({"error": "clients not ready"}), 503
    threading.Thread(target=post_to_x, args=(_gemini, _twitter), daemon=True).start()
    return jsonify({"status": "triggered"})

@flask_app.route("/debug")
def debug_auth():
    """認証デバッグ: GET /debug?secret=YOUR_SECRET"""
    secret = os.environ.get("POST_SECRET", "")
    if secret and request.args.get("secret") != secret:
        return jsonify({"error": "unauthorized"}), 401

    result = {"checks": []}

    # 1. 環境変数の存在確認（値は隠す）
    for var in ["X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"]:
        val = os.environ.get(var, "")
        result["checks"].append({
            "var": var,
            "set": bool(val),
            "length": len(val),
            "preview": f"{val[:4]}...{val[-4:]}" if len(val) > 8 else "too_short"
        })

    # 2. get_me() テスト（Read権限）
    if _twitter:
        try:
            me = _twitter.get_me()
            if me.data:
                result["get_me"] = {"ok": True, "username": me.data.username, "id": me.data.id}
            else:
                result["get_me"] = {"ok": False, "error": "no data returned"}
        except Exception as e:
            result["get_me"] = {"ok": False, "error": str(e)}

    # 3. create_tweet テスト（Write権限 - 短いテスト投稿）
    if _twitter:
        try:
            import datetime as dt
            test_text = f"🔧 auth test {dt.datetime.now().strftime('%H:%M:%S')} #般若心経"
            resp = _twitter.create_tweet(text=test_text)
            tweet_id = resp.data["id"]
            result["create_tweet"] = {"ok": True, "tweet_id": tweet_id}
            # テスト投稿を削除
            try:
                _twitter.delete_tweet(tweet_id)
                result["delete_tweet"] = {"ok": True}
            except:
                result["delete_tweet"] = {"ok": False, "note": "tweet posted but not deleted"}
        except Exception as e:
            error_info = {"ok": False, "error": str(e)}
            if hasattr(e, "response") and e.response is not None:
                error_info["status"] = e.response.status_code
                error_info["body"] = e.response.text
            result["create_tweet"] = error_info

    return jsonify(result)

@flask_app.route("/test-content", methods=["POST"])
def test_content():
    """投稿内容のどの部分が403を起こすか特定"""
    secret = os.environ.get("POST_SECRET", "")
    if secret and request.args.get("secret") != secret:
        return jsonify({"error": "unauthorized"}), 401

    import datetime as dt
    now = dt.datetime.now().strftime("%H:%M:%S")
    results = []

    tests = [
        ("text_only", f"テスト投稿 {now} #般若心経 #空"),
        ("with_suno", f"テスト投稿 {now}\n🎵 https://suno.com/s/d5Wc2J4lCiKgQFuz"),
        ("with_site", f"テスト投稿 {now}\n🌐 https://teng3333.github.io/heart-sutra-archive/?locale=ja"),
        ("with_both", f"テスト投稿 {now}\n🎵 https://suno.com/s/d5Wc2J4lCiKgQFuz\n🌐 https://teng3333.github.io/heart-sutra-archive/?locale=ja"),
    ]

    for name, text in tests:
        try:
            resp = _twitter.create_tweet(text=text)
            tid = resp.data["id"]
            results.append({"test": name, "ok": True, "tweet_id": tid})
            try:
                _twitter.delete_tweet(tid)
            except:
                pass
        except Exception as e:
            error_info = {"test": name, "ok": False, "error": str(e)}
            if hasattr(e, "response") and e.response is not None:
                error_info["status"] = e.response.status_code
            results.append(error_info)
            break  # 失敗したらそこで止める

    return jsonify({"results": results})

# ─── Fetch News from RSS ──────────────────────────────────────────────────────
def fetch_news() -> str:
    random.shuffle(RSS_FEEDS)
    for feed_url in RSS_FEEDS:
        try:
            req = urllib.request.Request(
                feed_url,
                headers={"User-Agent": "soul_up_an_bot/1.0"}
            )
            with urllib.request.urlopen(req, timeout=10) as res:
                xml_data = res.read()
            root = ET.fromstring(xml_data)
            items = root.findall(".//item")
            if items:
                item = random.choice(items[:10])
                title = item.findtext("title", "").strip()
                desc = item.findtext("description", "").strip()
                news_text = title
                if desc and desc != title:
                    news_text += f"。{desc[:50]}"
                logger.info(f"Fetched news: {title}")
                return news_text
        except Exception as e:
            logger.warning(f"RSS fetch failed ({feed_url}): {e}")
    return None

# ─── Initialize Clients ───────────────────────────────────────────────────────
def init_clients():
    gemini = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

    twitter = tweepy.Client(
        consumer_key=os.environ["X_API_KEY"],
        consumer_secret=os.environ["X_API_KEY_SECRET"],
        access_token=os.environ["X_ACCESS_TOKEN"],
        access_token_secret=os.environ["X_ACCESS_TOKEN_SECRET"],
        wait_on_rate_limit=True,
    )

    # 起動時に認証テスト（Read権限で確認）
    try:
        me = twitter.get_me()
        if me.data:
            logger.info(f"Twitter auth OK: @{me.data.username} (id={me.data.id})")
        else:
            logger.warning("Twitter auth: get_me() returned no data")
    except Exception as e:
        logger.error(f"Twitter auth test FAILED: {e}")

    return gemini, twitter

# ─── Generate Post Content ────────────────────────────────────────────────────
def generate_content(gemini: genai.Client, track: dict) -> str:
    today = datetime.now().strftime("%Y年%m月%d日")

    news = fetch_news()
    if news:
        news_instruction = f"【今日の実際のニュース】{news}"
        news_prompt = "上記の実際のニュースを取り上げる"
    else:
        news_instruction = ""
        news_prompt = "今日の気になるニュースや社会の出来事を1つ取り上げる（具体的なトピックで）"

    prompt = f"""あなたはXの投稿Bot「AN（アン）」です。以下の設定で投稿文を1つ生成してください。

【キャラクター: AN】
- ツンデレで率直、でも最後は必ず寄り添う
- 般若心経の教え（色即是空・無常・五蘊・空）を自然に織り交ぜる
- 上から目線だけど根は温かい、少し皮肉屋

【今日の日付】{today}
{news_instruction}

【投稿の構成（この順番で）】
1. {news_prompt}
2. 般若心経の教えの切り口で1〜2文で解釈する
3. 「ふっ」と気が楽になる短い一言で締める（例：「…ま、そういうことよ。」「執着、手放してみ？」）
4. 「今の気分に #{track['genre']} はどう？」で終わる

【厳守ルール】
- 本文は必ず {CONTENT_MAX_CHARS} 文字以内（URLは別途付加するので含めない）
- ハッシュタグは末尾に #般若心経 #空 の2つのみ
- 「AN：」などの前置き不要、本文だけ出力
- URLは絶対に含めない

本文のみを出力してください。"""

    try:
        response = gemini.models.generate_content(model="gemini-2.5-flash", contents=prompt)
        content = response.text.strip()
        if len(content) > CONTENT_MAX_CHARS:
            content = content[:CONTENT_MAX_CHARS - 3] + "..."
            logger.warning(f"Content trimmed to {CONTENT_MAX_CHARS} chars.")
        return content
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise

# ─── Post to X ────────────────────────────────────────────────────────────────
def post_to_x(gemini: genai.Client, twitter: tweepy.Client) -> None:
    track = random.choice(TRACKS)
    logger.info(f"Generating post... (track: {track['genre']})")

    try:
        content = generate_content(gemini, track)
        full_post = f"{content}\n\n🎵 {track['url']}\n🌐 {SITE_URL}"

        response = twitter.create_tweet(text=full_post)
        tweet_id = response.data["id"]
        logger.info(f"Posted successfully! tweet_id={tweet_id}")
        logger.info(f"--- Preview ---\n{content}\n---------------")

    except tweepy.TweepyException as e:
        logger.error(f"Twitter API error: {e}")
        # 詳細エラー情報
        if hasattr(e, "response") and e.response is not None:
            logger.error(f"  HTTP status : {e.response.status_code}")
            logger.error(f"  Response    : {e.response.text}")
        if hasattr(e, "api_codes") and e.api_codes:
            logger.error(f"  Error codes : {e.api_codes}")
        if hasattr(e, "api_messages") and e.api_messages:
            logger.error(f"  Error msgs  : {e.api_messages}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

# ─── Schedule Setup ───────────────────────────────────────────────────────────
def setup_schedule(gemini: genai.Client, twitter: tweepy.Client) -> None:
    times = ["07:00", "12:00", "18:00", "21:00"]
    for t in times:
        schedule.every().day.at(t).do(post_to_x, gemini=gemini, twitter=twitter)
        logger.info(f"Scheduled: {t} JST")

# ─── Main ─────────────────────────────────────────────────────────────────────
def main() -> None:
    global _gemini, _twitter

    logger.info("========================================")
    logger.info("  soul_up_an Bot starting...")
    logger.info(f"  TZ: {os.environ.get('TZ', 'not set (UTC assumed)')}")
    logger.info("========================================")

    _gemini, _twitter = init_clients()
    setup_schedule(_gemini, _twitter)

    # Flaskを別スレッドで起動
    port = int(os.environ.get("PORT", 8080))
    flask_thread = threading.Thread(
        target=lambda: flask_app.run(host="0.0.0.0", port=port, use_reloader=False),
        daemon=True,
    )
    flask_thread.start()
    logger.info(f"Web server started on port {port}")
    logger.info("Bot is running. Waiting for scheduled posts...")

    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
