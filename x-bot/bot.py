"""
soul_up_an — X Auto-posting Bot
Powered by Gemini 2.0 Flash + tweepy
Schedule: 07:00 / 12:00 / 18:00 / 21:00 JST
"""

import os
import random
import logging
import schedule
import time
import tweepy
import urllib.request
import xml.etree.ElementTree as ET
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
    {"genre": "INDIES",       "url": "https://suno.com/s/Wx7CnwCbekbEYNGr"},
    {"genre": "ENKA",         "url": "https://suno.com/s/enJa54lfA1apbDbO"},
    {"genre": "tango",        "url": "https://suno.com/s/5Sy85cO08UtHyEVC"},
    {"genre": "acoustic",     "url": "https://suno.com/s/RxVB7XfJIoxjGBae"},
    {"genre": "Blues",        "url": "https://suno.com/s/m5FIUyXT3HKfQBgD"},
    {"genre": "JAZZ",         "url": "https://suno.com/s/jHp51qiXA6Gyylq1"},
    {"genre": "funk",         "url": "https://suno.com/s/aeL9Kzw6rv2mN4Ey"},
    {"genre": "Bollywood",    "url": "https://suno.com/s/bjw8h0khtyiDCC9k"},
    {"genre": "iDOL",         "url": "https://suno.com/s/aRq2vh0JiqRjFHqw"},
    {"genre": "cyber punk",   "url": "https://suno.com/s/d5Wc2J4lCiKgQFuz"},
    {"genre": "simple",       "url": "https://suno.com/s/nfJC4YFxiPglZNyx"},
    {"genre": "anime song",   "url": "https://suno.com/s/FtiVGZ3CQI44IKVS"},
    {"genre": "punk",         "url": "https://suno.com/s/YfZvEC7fQ1o3bPhH"},
    {"genre": "ROCK",         "url": "https://suno.com/s/HL5LZyOYFD8DNJFR"},
    {"genre": "lo-fi",        "url": "https://suno.com/s/jQiBWO0Kk78oa6eg"},
    {"genre": "HIPHOP",       "url": "https://suno.com/s/OITaaoVjb5aP6dw6"},
    {"genre": "IDM",          "url": "https://suno.com/s/S5Q39LaxmMjmGFgy"},
    {"genre": "cyber punk II","url": "https://suno.com/s/ypdCxaXjIgW6tXg6"},
    {"genre": "cyber punk III","url": "https://suno.com/s/EZPGaaLlKt628jf1"},
    {"genre": "hymn",         "url": "https://suno.com/s/ulaVVY0QHdCfH4BV"},
    {"genre": "gamelan",      "url": "https://suno.com/s/OH3OKfIBFD6RXqPT"},
    {"genre": "Halloween",    "url": "https://suno.com/s/6wQaeker0gtuW5cJ"},
    {"genre": "metal",        "url": "https://suno.com/s/DtT6pbAOrnyosgjt"},
]

# ─── Twitter 文字数カウント ───────────────────────────────────────────────────
# Twitter の仕様: URL は長さに関わらず 23 文字換算
# 本文 + "\n\n🎵 " (4) + "\n🌐 " (3) + URL×2(各23) = 本文 + 53 ≤ 280
# → 本文の上限 = 227 文字（余裕を持って 215 文字に設定）
CONTENT_MAX_CHARS = 215

# NHK RSSフィード（無料・登録不要）
RSS_FEEDS = [
    "https://www3.nhk.or.jp/rss/news/cat0.xml",   # NHK 主要ニュース
    "https://www3.nhk.or.jp/rss/news/cat1.xml",   # NHK 社会
    "https://www3.nhk.or.jp/rss/news/cat3.xml",   # NHK 経済
]

# ─── Fetch News from RSS ──────────────────────────────────────────────────────
def fetch_news() -> str:
    """RSSからニュースを1件取得して返す。失敗したらNoneを返す。"""
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
                item = random.choice(items[:10])  # 最新10件からランダム
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
    return gemini, twitter

# ─── Generate Post Content ────────────────────────────────────────────────────
def generate_content(gemini: genai.Client, track: dict) -> str:
    today = datetime.now().strftime("%Y年%m月%d日")

    # RSSからニュースを取得
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
        # 超過した場合は安全にトリム
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
        logger.info(f"Posted successfully. tweet_id={tweet_id}")
        logger.info(f"--- Preview ---\n{content}\n---------------")

    except tweepy.TweepyException as e:
        logger.error(f"Twitter API error: {e}")
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
    logger.info("========================================")
    logger.info("  soul_up_an Bot starting...")
    logger.info(f"  TZ: {os.environ.get('TZ', 'not set (UTC assumed)')}")
    logger.info("========================================")

    gemini, twitter = init_clients()
    setup_schedule(gemini, twitter)

    logger.info("Bot is running. Waiting for scheduled posts...")
    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    main()
