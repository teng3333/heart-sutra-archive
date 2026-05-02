#!/usr/bin/env python3
"""
SUNO プレイリストスクレイピングスクリプト
般若心経プレイリスト（https://suno.com/playlist/5ae1adc6-893c-4fce-bfec-a0114e0bd925）
から全曲情報を取得し、data/playlist.json に保存する。

GitHub Actions で週1回実行される。
"""

import json
import asyncio
import sys
import os
from datetime import datetime, timezone

PLAYLIST_URL = "https://suno.com/playlist/5ae1adc6-893c-4fce-bfec-a0114e0bd925"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "playlist.json")


async def fetch_playlist():
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print("playwright not installed. Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    songs = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        print(f"Navigating to {PLAYLIST_URL} ...")
        # networkidle ではなく domcontentloaded を使用（SUNOはSPAのため networkidle がタイムアウトしやすい）
        await page.goto(PLAYLIST_URL, wait_until="domcontentloaded", timeout=30000)

        # Reactアプリのレンダリングを待つ
        print("Waiting for React app to render...")
        try:
            await page.wait_for_selector('[role="row"]', timeout=30000)
        except Exception:
            print("Warning: Could not find song rows, trying anyway...")

        await page.wait_for_timeout(3000)

        # スクロールして全曲を読み込む
        prev_count = 0
        for i in range(15):
            count = await page.evaluate("""
                () => document.querySelectorAll('a[href*="/song/"]').length
            """)
            print(f"  Scroll {i+1}: found {count} song links")

            if count == prev_count and i > 3:
                print("  No new songs loaded, stopping scroll.")
                break
            prev_count = count

            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(2500)

        # 全曲情報を取得
        songs = await page.evaluate("""
            () => {
                const rows = Array.from(document.querySelectorAll('[role="row"]'));
                const results = [];
                const seen = new Set();
                
                rows.forEach(row => {
                    const titleLink = row.querySelector('a[href*="/song/"]');
                    if (!titleLink) return;
                    
                    const title = titleLink.textContent.trim();
                    const url = titleLink.href;
                    const songId = url.split('/song/')[1];
                    
                    if (!title || !url || seen.has(songId)) return;
                    seen.add(songId);
                    
                    const genreMatch = title.replace('般若心経', '').trim();
                    
                    results.push({
                        title: title,
                        genre: genreMatch || 'Unknown',
                        url: url,
                        song_id: songId
                    });
                });
                
                return results;
            }
        """)

        await browser.close()

    print(f"\nTotal songs fetched: {len(songs)}")

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    output = {
        "playlist_id": "5ae1adc6-893c-4fce-bfec-a0114e0bd925",
        "playlist_url": PLAYLIST_URL,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "total_songs": len(songs),
        "songs": songs
    }

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Saved to {OUTPUT_PATH}")

    for i, song in enumerate(songs, 1):
        print(f"  {i:2d}. {song['title']} — {song['url']}")

    return songs


if __name__ == "__main__":
    asyncio.run(fetch_playlist())
