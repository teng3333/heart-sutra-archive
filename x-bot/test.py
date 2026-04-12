import os
from dotenv import load_dotenv
load_dotenv(dotenv_path=".env")

print("=== APIキー確認 ===")
keys = ["X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET", "GEMINI_API_KEY"]
for k in keys:
    v = os.getenv(k)
    if v:
        print(f"OK {k}: 設定済み ({v[:6]}...)")
    else:
        print(f"NG {k}: 未設定")

print("\n=== Gemini 接続テスト ===")
from google import genai
gemini_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
gemini_res = gemini_client.models.generate_content(model="gemini-2.5-flash", contents="色即是空を一言で")
print(f"OK Gemini: {gemini_res.text[:40]}")

print("\n=== Twitter 投稿テスト ===")
import tweepy
twitter_client = tweepy.Client(
    consumer_key=os.environ["X_API_KEY"],
    consumer_secret=os.environ["X_API_KEY_SECRET"],
    access_token=os.environ["X_ACCESS_TOKEN"],
    access_token_secret=os.environ["X_ACCESS_TOKEN_SECRET"]
)
twitter_res = twitter_client.create_tweet(text="【接続テスト】般若心経Bot 動作確認中 🙏 #般若心経")
print(f"OK Twitter: 投稿成功！ tweet_id={twitter_res.data['id']}")
