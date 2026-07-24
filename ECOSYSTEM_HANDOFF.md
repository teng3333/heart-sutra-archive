# 般若心経生態系 × Open Gate Sutra — 引き継ぎ資料(バイブコーディング用)

> **この文書の使い方**:他のIDE・AIエージェント(Cursor / Windsurf / 素のClaude等)で作業を始めるとき、最初にこのファイルを読ませる。
> ここには「思想 → 生態系の全体像 → 3リポジトリの実体 → 運用手順 → 作業ルール → 現在地と残タスク → 既知の罠」の順で、
> 実機を検分して確認済みの事実だけを書いている(2026-07-20時点)。
> **秘密情報(APIキー・DB接続文字列)はこの文書に無い**。各リポジトリの `.env` と Railway の Variables にのみ存在する。

---

## 1. ビジョン(なぜ作っているか)

- **HSEPJ(般若心経エンタメプロジェクト)**:般若心経(262文字)を現代の音楽・AI・コミュニティで「作り直し続ける」文化運動。
  核の主張は「**リミックスは伝統の破壊ではなく、伝統そのもの**」(サンスクリット→漢訳→読誦…と1,300年続いた再創造の鎖の続き)。
- **開羯諦経(かいぎゃていきょう)**:紋章であり生きた経典の名。開=Open / 羯諦=Gate / 経=Sutra。
  「捏造ではなく継続」— この説明は about.html に日英で明文化済み。
- **受想行シキ理論**:プロジェクトの思想的枠組み。データフロー設計にも対応させている
  (例:Neon=色〈その瞬間の粒〉、Obsidianノート群=識〈積もって書き換わる認識〉)。
- **AN(阿吽)**:生態系の顔となるAIキャラクター。ツンデレ辛口の批評家。Gemini駆動。
  「AN選 = 一人の偏屈な耳の正直な偏愛(openly subjective)」であり、客観ランキングではない。
- **門の哲学**:門は選別ではなく渡るためのもの。投稿は永久に堂に入り、降格なし。
  機械の床は形式・規約のみを見て、音楽の良し悪しは判定しない。

## 2. 生態系マップ(コンポーネントと現在の接続)

```
[ユーザー/世界]
    │ 投稿(30秒・アカウント不要)
    ▼
┌─ OGS フロント(GitHub Pages) ─┐      ┌─ OGS バックエンド(Railway) ─┐
│ heart-sutra-archive リポ        │ API  │ open-gate-sutra リポ           │
│ index/submit/kit/about/…       ├─────▶│ Flask app.py                    │
└────────────────────────────────┘      │  ├ 機械の床(日次 05:00 JST)    │
                                        │  ├ ANの耳(週次 日曜 06:00 JST) │──▶ Gemini
                                        │  ├ Discordフォーラム自動スレ     │──▶ Discord(OGSサーバー)
                                        │  └ アラート(障害→Discord)      │
                                        └──────────┬─────────────────────┘
                                                   │ Neon PostgreSQL(共有DB)
                                                   │  submissions / an_reviews /
                                                   │  an_selections / an_memory ←★ANの経験台帳
                                                   ▼
┌─ 魂アゲアゲbot(Railway) ──────┐   読む(an_shared_memory.py)
│ Discord-an-bot リポ             │◀──────┘
│ 魂アゲアゲSU部サーバーのAN正本   │   ※OGSでのAN選経験を会話で想起できる(Phase 2稼働中)
│ cogs: chat/daily_summary/x_post…│──▶ X(時事AN投稿)
└─────────────────────────────────┘
                                                   │
                     ローカルMac(launchd 23:00)     ▼
                  ~/.an_sync/ogs_obsidian_mirror.py ──▶ Obsidian「HSEPJ/AN経験ログ」(人間が読む脳)
```

- **記憶の一本化(実装済み)**:OGSのAN選 → `an_memory`(Neon)に書く(Phase 1)→ 魂アゲアゲANが読んで想起(Phase 2)→ Obsidianへ日次ミラー。
- **未統合(意図的に保留)**:ANの「人格定義」はまだ分散(chat.js / an_palate.md / an_persona.py / botのDB人格)。統一は高尾判断で後回し(2026-07-20)。

## 3. リポジトリ(3つ)— どこに何があるか

### 3-1. フロントエンド:`heart-sutra-archive`
| 項目 | 値 |
|---|---|
| ローカル正本 | `/Users/takaotoshiyuki/heart-sutra-archive` ※Desktopに同名の古いクローンあり(罠。§10) |
| remote | https://github.com/teng3333/heart-sutra-archive.git |
| 公開 | GitHub Pages: https://teng3333.github.io/heart-sutra-archive/ (mainブランチ) |
| 現在ブランチ | `ogs-frontend`(**PR #1 OPEN**: 新ホーム/フォーム/キット等。マージ=新サイト公開) |
| 構成 | 静的HTML+vanilla JS。ビルド工程なし |

ページ:`index.html`(新ホーム・今日の九曲・目のグロー)/ `submit.html`(投稿フォーム+背景ヴェール)/ `kit.html`(262文字キット・CC0・AN設定画配布)/ `about.html`(1,300年の鎖・捏造ではなく継続)/ `terms.html`・`privacy.html`(**DRAFT空欄あり**:問い合わせ先・準拠法=高尾記入待ち)/ `archive.html`(原初の23曲)/ `an-mikuji.html`(AN神籤)。
`src/js/consent.js`=cookie同意(同意までGA4を読み込まない)。`src/js/todays-nine.js`=今日の九曲。`assets/og-card.jpg`=OGカード(1200×630)。

### 3-2. バックエンド:`open-gate-sutra`
| 項目 | 値 |
|---|---|
| ローカル | `/Users/takaotoshiyuki/クロードコワーク１/open-gate-sutra`(濁点は結合文字、数字は全角「１」。パスはコピーして使用) |
| remote | https://github.com/teng3333/open-gate-sutra.git(main直push運用) |
| 本番 | Railway: https://open-gate-sutra-production.up.railway.app (push→自動デプロイ) |
| DB | Neon PostgreSQL(接続文字列は `.env` の `DATABASE_URL`) |
| Python | `.venv/bin/python`(3.9系)。`requirements.txt` 管理。起動=`Procfile`: `gunicorn app:app --workers 1`(**1固定必須**・§10) |

主要ファイル:
- `app.py` — Flask本体。公開API 3つ:`POST /api/submit`(レート制限 6/時・20/日、規約同意`agreed`必須、任意mp3添付≦25MB・実体検証あり)/ `GET /api/status/<id>` / `GET /health`(DB込み死活・Railwayヘルスチェック先)。CORSは自オリジン限定(`ALLOWED_ORIGINS`で拡張)。APSchedulerで床・耳を同居起動(初期化失敗は非致命化+Discord通知)。
- `floor_batch.py` — 機械の床(日次05:00 JST)。ドメイン許可→到達確認→尺→重複の形式チェックのみ。結果をDiscordダイジェスト送信。
- `an_ear_batch.py` — ANの耳(週次日曜06:00 JST)。Gemini(`gemini-2.5-flash`)で聴取→多数決→shortlist→AN選。`an_reviews`/`an_selections`に記録し、`an_memory`へ経験を書く。
- `an_memory.py` — ANの経験台帳の書き込みモジュール(Phase 1)。
- `discord_forum.py` — 堂入り曲ごとにDiscordフォーラムへスレッド自動作成。
- `alerts.py` — 障害通知(500/スケジューラ失敗→Discord webhook。同一シグネチャ10分抑制)。
- `migrate.py` + `migrations/001〜006.sql` — マイグレーション(実行: `.venv/bin/python migrate.py`)。
- `scripts/moderate.py` — モデレーション(`list` / `hide <id> [理由]` / `unhide <id>`)。
- `config/floor.yaml`・`config/an_ear.yaml` — 閾値・曜日等はコード変更なしで調整可。
- `CLAUDE.md` — **作業ルール8箇条(§8)。他IDEでも必ず読ませること**。

### 3-3. 魂アゲアゲbot:`Discord-an-bot`
| 項目 | 値 |
|---|---|
| ローカル | `/Users/takaotoshiyuki/Desktop/chatbot` |
| remote | https://github.com/teng3333/Discord-an-bot.git(main直push→Railway自動デプロイ) |
| 役割 | 魂アゲアゲSU部(Discord)のAN正本。discord.py+Gemini |

構成:`bot.py` / `cogs/`(chat・daily_summary〈毎日0:00 JSTに前日要約を「1日のまとめ」へ投稿〉・daily_quote・x_post〈X時事AN〉・admin等)/ `an_shared_memory.py`(**Phase 2**:`OGS_DATABASE_URL`があればNeonの`an_memory`を読み、ANのシステムプロンプトに経験を注入。無ければ完全に不活性=安全設計)。

### 3-4. ローカル同期(リポ外・Mac常駐)
- `~/.an_sync/ogs_obsidian_mirror.py` + `run_ogs_mirror.sh` — Neon `an_memory` → Obsidian `My Brain/My Brain/HSEPJ/AN経験ログ/` へ月次ノート全再生成(冪等・変化時のみ書込)。
- launchd `com.an.ogs-mirror`(`~/Library/LaunchAgents/com.an.ogs-mirror.plist`)— **毎日23:00+ログイン時**。フルディスクアクセス(/bin/bash)許可済みで稼働確認済み。
- `~/.an_sync/obsidian_sync.py` — 既存のDiscord「1日のまとめ」→Obsidian同期(別系統)。

## 4. データベース実スキーマ(Neon・実DBから抽出)

- `submissions`(84行=種火84曲):id, url, canonical_url, platform, title, artist_name, country, artist_link, audio_ref, status('pending'→床で確定), reject_reason, submitted_at, floor_checked_at, duration_sec, floor_notes, genre, genre_source('user'|'ai'), discord_thread_id, **agreed_at**(規約同意記録), **hidden**(モデレーション非表示。公開表示は必ず `hidden=FALSE` で絞ること)
- `an_reviews`(114行):submission_id, model, run_no, is_final, result(jsonb), resonance, reviewed_at
- `an_selections`(5行=AN選):submission_id, title_name, an_comment, selected_at, confirmed_by_owner
- `an_memory`(5行=ANの経験台帳):source('ogs'|'soul_up'|'x'|…), kind('an_selection'等), summary(ANの一人称), ref, created_at

## 5. 環境変数(名前と用途のみ。値は .env / Railway Variables)

**OGSバックエンド**:`DATABASE_URL`(Neon)/ `GEMINI_API_KEY`(ANの耳)/ `YOUTUBE_API_KEY`(床の動画確認)/ `DISCORD_WEBHOOK_URL`(床ダイジェスト+障害通知の既定)/ 任意: `ADMIN_ALERT_WEBHOOK_URL`(障害専用ch)・`ALLOWED_ORIGINS`・`AUDIO_DIR`(Railway Volume: /data/audio)・`ENABLE_FLOOR_SCHEDULER=0`(ローカル開発)・`ALERT_THROTTLE_SEC`
**bot**:`DISCORD_TOKEN` / `GEMINI_API_KEY` / `X_API_KEY`ほかX系4つ / **`OGS_DATABASE_URL`**(Phase 2の鍵。OGSと同じNeonを指す。Railwayに設定済み)

## 6. 運用手順(コピペ用)

```bash
# バックエンドをローカル起動(本番同条件はGEMINI_API_KEYも)
cd "/Users/takaotoshiyuki/クロードコワーク１/open-gate-sutra" && ENABLE_FLOOR_SCHEDULER=0 PORT=5001 .venv/bin/python app.py
# マイグレーション適用(mainにSQL追加後)
.venv/bin/python migrate.py
# モデレーション
.venv/bin/python scripts/moderate.py list
.venv/bin/python scripts/moderate.py hide 123 "理由"
# 本番死活
curl -s https://open-gate-sutra-production.up.railway.app/health
# Obsidianミラー手動実行
/Users/takaotoshiyuki/.an_sync/run_ogs_mirror.sh
```

デプロイ=各リポで `git push origin main`(フロントのみ現在は `ogs-frontend` ブランチ→PR #1)。
フロント検証はローカルサーバー(port 8787等)+スマホ幅375pxで実表示確認が習慣。

## 7. 完了済みの主要マイルストーン(日付つき)

- 種火84曲投入・機械の床稼働(日次) / ANの耳 週次稼働(初のAN選5曲・2026-07-19)
- Discordフォーラム自動スレッド(全堂入り曲) / AN神籤 / 今日の九曲
- **記憶の橋**:an_memory(Phase 1)→ botの想起(Phase 2)→ Obsidianミラー(2026-07-20)
- **公開前ハードニング(2026-07-20 監査)**:レート制限 / CORS限定 / 同意サーバー強制 / mp3実体検証 / workers 1固定 / hidden列+moderate.py / 3層エラー監視(500通知・スケジューラ非致命化・/health)/ cookie同意バナー(GDPR)/ About・Terms・Privacy / OGP全6ページ / 画像最適化(13.4MB→3.1MB)

## 8. 作業ルール(必須)— 正本は open-gate-sutra/CLAUDE.md

1. 完了条件を先に1行で定義 2. 複数解釈を勝手に選ばない(候補列挙+推奨) 3. ついで改善禁止(提案に留める)
4. 「動いた」でなく「検証した」を証拠つきで報告 5. 同じエラーの修正は2回まで(3回目は方針転換)
6. 完了前に初見レビュー(壊れうる隣接機能+反論と回答) 7. 確信度と進捗を正直に(高/中/低)
8. 非公式API・ToS未確認の回避策を自己判断で実装しない

## 9. 現在地と残タスク

**公開の判断**:PR #1(新サイト)はマージすれば公開。監査ブロッカーはCAPTCHA以外解消済み。
- 🔴 CAPTCHA(Cloudflare Turnstile)— 高尾のCloudflareキー取得待ち。現状の防御はレート制限のみ(メモリ保持・再起動でリセット)
- 📝 terms/privacy の空欄(問い合わせ先・準拠法・運営者名)— 高尾記入待ち(ページ内DRAFT注記あり)
- 🟡 重複リポジトリ整理(Desktop/heart-sutra-archive ほか)/ 独自ドメイン(opengatesutra.com 空き確認)
- 保留(高尾判断):ANの人格一本化 / 記憶の双方向化(会話・X→an_memory)/ 観自在のOGS観測 / Discord 2サーバー分裂の解消
- 承認済みIA(2026-07-18):アーカイブは archive.html へ移設 / 日本語は /ja/ 方式 / hall個別ページは作らない
- Discord設計(承認済み):フォーラム1本・全投稿スレッド・AN降臨はAN選のみ・AN応答は段階制

## 10. 既知の罠(必読・実際に事故ったもの)

1. **重複クローン(2026-07-24解消済み)**:かつて `~/Desktop/heart-sutra-archive` と `~/クロードコワーク1/hsa-preview` に旧世代コピーがあり、画像の取り違えが2回発生した。両方とも `~/旧作業場アーカイブ/` へ移動済み(削除はしていない。中身はそこのREADME参照。7月試作の未コミット作業23件を含むため**アーカイブも削除禁止**)。正本は `~/heart-sutra-archive` のみ。ファイルを置く/読むときは必ず正本パスを確認。
2. **Procfileの `--workers 1` を変えない**:スケジューラがWebプロセス同居のため、複数ワーカー=床・耳の二重実行(Discord二重投稿・Gemini二重課金)。
3. **APSchedulerの `next_run_time` は `start()` 後にしか存在しない**:起動前参照で本番全断の実績あり(修正済み・alerts.pyで非致命化済み)。
4. **公開表示は `hidden=FALSE` で絞る**:今後 /hall 等を作るとき必須。投稿データの表示は textContent でエスケープ(innerHTML禁止)。
5. **OG画像は絶対URLハードコード**:独自ドメイン移行時に全ページの `og:url`/`og:image` を一括更新すること。
6. **ローカル検証の罠**:port 5001に古いプロセスが残ると新コードが起動せず「修正が効かない」ように見える(`lsof -ti :5001 | xargs kill -9`)。ブラウザ検証はキャッシュが強固なのでプレビューサーバー再起動が確実。
7. **iCloud(Obsidian)へのバックグラウンド書込はフルディスクアクセス必須**:/bin/bash に許可済み。新しい実行経路を作る場合は同じ壁に当たる。
8. **拡張子と実体の不一致に注意**:.jpg中身PNGで13MB配信していた前科。画像追加時は `file` で実体確認+`sips`で圧縮。
9. **レート制限はメモリ保持**:再起動でリセットされる簡易版。恒久対策はCAPTCHA導入(残タスク)。
10. **床は形式しか見ない**:規約違反コンテンツは通過しうる。武器は `moderate.py`(隠す)と通報。

---

## 11. Codexでの作業開始手順

### 11-1. Codexプロジェクト

以下の3リポジトリは、それぞれ独立したCodexプロジェクトとして登録する。

| 役割 | 正本パス |
|---|---|
| OGSフロント | `/Users/takaotoshiyuki/heart-sutra-archive` |
| OGSバックエンド | `/Users/takaotoshiyuki/クロードコワーク１/open-gate-sutra` |
| 魂アゲアゲbot | `/Users/takaotoshiyuki/Desktop/chatbot` |

バックエンドのディレクトリ名は、濁点が結合文字で、数字が全角の`１`になっている。パスは手入力せず、本表からコピーすること。

### 11-2. Codexへの必須指示

Codexは`CLAUDE.md`を標準の作業指示ファイルとして自動認識しない。各リポジトリのルートに`AGENTS.md`を置き、次を指示する。

1. 作業前に、この`ECOSYSTEM_HANDOFF.md`を最後まで読む。
2. OGSバックエンドの`CLAUDE.md`にある8箇条を、3リポジトリ共通の作業ルールとして守る。
3. 未コミットの既存変更を、依頼なしに削除・上書き・整形しない。
4. 秘密値を出力、ログ表示、コミットしない。
5. 変更前に正本パス、現在ブランチ、`git status`を確認する。
6. デプロイ、マイグレーション、外部投稿、秘密値変更は、実行前に対象と影響を明示する。
7. 完了報告には、変更ファイル、検証コマンド、結果、未検証事項を含める。

---

## 12. 引き継ぎ文書の正本

この文書の正本は次とする。

- 正本リポジトリ: `open-gate-sutra`
- 正本ファイル: `/Users/takaotoshiyuki/クロードコワーク１/open-gate-sutra/ECOSYSTEM_HANDOFF.md`
- 更新責任者: 高尾
- 最終確認日: `2026-07-24`

同内容の`ECOSYSTEM_HANDOFF.md`を3リポジトリでGit管理する。`open-gate-sutra`版だけを正本とし、`heart-sutra-archive`版と`Discord-an-bot`版はCodexが各リポジトリ内で参照するためのミラーとする。複製側を直接更新せず、正本を先に更新し、同じ変更単位で2つのミラーへ同期する。

この文書にはAPIキー、トークン、Webhook URL、DB接続文字列、JWT秘密値を記載しない。秘密値の所在だけを記載する。

---

## 13. 2026-07-24・引き継ぎ文書コミット直前の基準Git状態【全ハッシュ実機検証済み】

### 13-1. heart-sutra-archive

- ブランチ: `ogs-frontend`
- HEAD: `a60088012ad7389c007599f5acf91a5cd34923be`
- upstreamとの差: ahead 0 / behind 0
- PR #1: OPEN / MERGEABLE
- 未コミット変更:
  - `src/js/chat.js`(追跡済み・変更あり)
    - 英語環境向けの固定オープニング追加
    - 状態: `[高尾記入: 継続してコミット / 破棄 / 内容を再検討]`
  - `ECOSYSTEM_HANDOFF.md` / `AGENTS.md`(Git未追跡・引き継ぎ用ローカル文書)

### 13-2. open-gate-sutra

- ブランチ: `main`
- HEAD: `484767ecd327e63bc9195e0d8e0a8118060af313`
- upstreamとの差: ahead 0 / behind 0
- 未コミット変更: `ECOSYSTEM_HANDOFF.md` / `AGENTS.md` のみGit未追跡(引き継ぎ用ローカル文書)
- 本番`/health`: 2026-07-24確認時にHTTP 200、`{"ok":true}`

### 13-3. Discord-an-bot

- ブランチ: `main`
- HEAD: `533653ae230f46dff374f67c3f844c3cff6b86c6`
- upstreamとの差: ahead 0 / behind 0
- 追跡済み・変更あり: `web_api.py` / `web_db.py` / `.DS_Store`
- **Git未追跡(2026-07-24 `git status`実測・全14件)**:
  `ECOSYSTEM_HANDOFF.md` / `AGENTS.md` / `x-bot/` / `fix_persona.py` / `obsidian_sync.py` / `run_sync.sh` /
  `setup_obsidian_sync.sh` / `com.an.obsidian-sync.plist` / `test_cost_defense.py` /
  `test_pdf_gemini.py` / `dummy.pdf` / `docs/` /
  `AN神籤_WebAPI実装指示書_ClaudeCode用.md` / `AN神籤_統合要件定義書_v4.md`
- `web_api.py`と`web_db.py`では、AN神籤Web APIのコスト防衛、日次利用制限、危機メッセージ対応、Discordアラート等を実装中。
- 実装状態: `[高尾記入: 設計中 / 実装中 / テスト中 / 本番投入待ち / 本番稼働中]`
  【参考・検証済 2026-07-24: 本番URLの`/api/me`が401 JSONを返す=**web_api.pyは本番で応答中**。ただしローカル未コミット分が本番に反映済みかは未確認】
- 次の作業: `[高尾記入]`
- 未追跡ファイルが複数存在するため、一括追加・一括削除は禁止する。各ファイルの用途を確認して個別に扱う。

作業開始時は必ず次を実行し、この記録との差分を確認する。

~~~bash
git status --short --branch
git log -1 --date=iso --format='%H%n%ad%n%s'
git rev-list --left-right --count HEAD...@{upstream}
~~~

---

## 14. 追加の実装経路

### 14-1. フロントのANチャット

- 実装: `heart-sutra-archive/src/js/chat.js`
- 接続先: Cloudflare Worker
- 現在のWorker URL: `https://heart-sutra-chat.taka2800.workers.dev`
- Workerソースの正本: **このMac上に存在しない**【検証済 2026-07-24: `wrangler.toml`が全域に無く、`heart-sutra-chat`への言及は`chat.js`のみ。正本はCloudflareダッシュボード上で直接編集されたものと推定】→ 復元・移設するにはダッシュボードからコードを回収してリポジトリ化することを推奨
- Cloudflareアカウント所有者: `[高尾記入]`(サブドメイン`taka2800`から高尾のアカウントと推定・要確認)
- デプロイ方法: `[高尾記入]`(推定: Cloudflareダッシュボード直編集)
- ログ確認方法: `[高尾記入]`
- 障害時の停止方法: `[高尾記入]`

### 14-2. AN神籤Web API

- フロント: `heart-sutra-archive/an-mikuji.html`
- API実装: `Discord-an-bot/web_api.py`(410行・ルートは `/api/register` `/api/login` `/api/me` `/api/chat` `/api/save_memory` の5つ)
- DB処理: `Discord-an-bot/web_db.py`(250行)
- 公開API: `https://discord-an-bot-production.up.railway.app`
- 認証: JWT
- DB: `NEON_DATABASE_URL`で指定するPostgreSQL
- Discord Bot本体とは別プロセスとして動作する(`Procfile`実測: `worker: python3 bot.py` と `web: python web_api.py` の2プロセス定義)
- 本番サービス名: `[高尾記入]`
- Railwayの起動コマンド: `[高尾記入]`(Procfile上は `web: python web_api.py`)
- ヘルスチェックURL: **存在しない**【検証済: `web_api.py`に`/health`ルートが無い。監視するなら追加実装が必要】
- 本番投入状態: **稼働中**【検証済 2026-07-24: `/api/me` → HTTP 401 `{"error":"認証が必要です"}` = Flask応答あり。ルート`/`は404(未定義ルートのため正常)】

### 14-3. AN時事エージェント・X関連

次の実装が`Discord-an-bot`内に存在する。

- `cogs/x_post.py`(529行・git追跡済み)
- `cogs/x_post_analytics.py`(341行・git追跡済み)
- `an_jiji_agent/`(**git追跡済み**。READMEによれば: 毎日7時・21時JSTにNHKニュースRSS取得→GeminiがAN口調で投稿文生成→リスクフィルタ→X自動投稿・履歴はNEONに記録。`config.py`最終更新2026-07-10)
- `x-bot/`(**git未追跡**・最終更新2026-06-09。`bot.py`/`Procfile`/`AN.png`を含む独立構成)

各実装の現在の役割を確定する。

| 実装 | 本番稼働 | Railwayサービス | 起動コマンド | 正本か旧版か |
|---|---|---|---|---|
| `cogs/x_post.py` | `[高尾記入]` | `[高尾記入]` | bot内Cog | git追跡済み |
| `an_jiji_agent/` | `[高尾記入]` | `[高尾記入]` | `[高尾記入]`(Procfileあり) | git追跡済み・更新2026-07-10 |
| `x-bot/` | `[高尾記入]` | `[高尾記入]` | `[高尾記入]`(Procfileあり) | **git未追跡**・更新2026-06-09(日付上は最も古い=旧版の可能性) |

旧版と判断したコードも、確認なしに削除しない。

---

## 15. Railwayサービス台帳

| 機能 | Gitリポジトリ | Railwayプロジェクト／サービス | ブランチ | 起動コマンド | 公開URL | Volume |
|---|---|---|---|---|---|---|
| OGS API・床・ANの耳 | `open-gate-sutra` | `[高尾記入]` | `main` | `gunicorn app:app --workers 1` | `https://open-gate-sutra-production.up.railway.app` | `[高尾記入: /data/audio等]` |
| Discord AN bot | `Discord-an-bot` | `[高尾記入]` | `main` | `python3 bot.py`(Procfile: worker) | なし | `[高尾記入]` |
| AN神籤Web API | `Discord-an-bot` | `[高尾記入]` | `main` | `python web_api.py`(Procfile: web) | `https://discord-an-bot-production.up.railway.app` | `[高尾記入]` |
| X投稿 | `[高尾記入]` | `[高尾記入]` | `[高尾記入]` | `[高尾記入]` | `[高尾記入]` | なし |

Railwayのサービスを作り直す場合、公開URLが変わる可能性がある。URL変更時はフロントのハードコード、CORS、OGP、監視先を同時に確認する。

---

## 16. 環境変数台帳

値は記載しない。必須・任意・設定場所だけを管理する。

### 16-1. OGSバックエンド

| 変数 | 必須 | 用途 | 設定場所 |
|---|---|---|---|
| `DATABASE_URL` | 必須 | Neon PostgreSQL | `.env` / Railway |
| `GEMINI_API_KEY` | ANの耳に必須 | Gemini | `.env` / Railway |
| `YOUTUBE_API_KEY` | 推奨 | YouTube形式確認 | `.env` / Railway |
| `DISCORD_WEBHOOK_URL` | 推奨 | 床ダイジェスト・障害通知 | `.env` / Railway |
| `DISCORD_FORUM_WEBHOOK_URL` | フォーラム連携に必須 | 堂入りスレッド作成 | `.env` / Railway |
| `ADMIN_ALERT_WEBHOOK_URL` | 任意 | 管理者向け障害通知 | `.env` / Railway |
| `ALLOWED_ORIGINS` | 任意 | CORS追加 | Railway |
| `AUDIO_DIR` | 本番音源保存時に必須 | 音源Volume | Railway |
| `ENABLE_FLOOR_SCHEDULER` | 任意 | ローカルでバッチ停止 | ローカル |
| `ALERT_THROTTLE_SEC` | 任意 | アラート抑制秒数 | Railway |
| `AN_PALATE_PATH` | 任意 | AN嗜好ファイル差し替え | ローカル/Railway |

### 16-2. Discord AN bot・AN神籤Web API

| 変数 | 必須 | 用途 | 設定場所 |
|---|---|---|---|
| `DISCORD_TOKEN` | bot必須 | Discord Bot認証 | `.env` / Railway |
| `GEMINI_API_KEY` | 必須 | AN対話 | `.env` / Railway |
| `ADMIN_USER_ID` | 管理機能に必須 | 管理者判定 | `.env` / Railway |
| `AN_DB_PATH` | SQLite永続化時に必須 | SQLite保存先 | Railway |
| `OGS_DATABASE_URL` | 共有記憶に必須 | OGSの`an_memory`参照 | Railway |
| `NEON_DATABASE_URL` | Web API・X分析に必須 | Webユーザー・分析DB | Railway |
| `JWT_SECRET` | Web API本番で必須 | JWT署名 | Railway |
| `DISCORD_WEBHOOK_URL` | 任意 | Web API障害・コスト通知 | Railway |
| `X_API_KEY` | X投稿時に必須 | X API | Railway |
| `X_API_KEY_SECRET` | X投稿時に必須 | X API | Railway |
| `X_ACCESS_TOKEN` | X投稿時に必須 | X API | Railway |
| `X_ACCESS_TOKEN_SECRET` | X投稿時に必須 | X API | Railway |
| `X_BEARER_TOKEN` | 機能により必須 | X API読取 | Railway |
| `POST_SECRET` | 手動投稿APIに必須 | 投稿エンドポイント保護 | Railway |
| `AN_METRICS_WEBHOOK_URL` | 任意 | 観自在向け指標通知 | Railway |

`JWT_SECRET`は本番でデフォルト値を使用しない。
【検証済 2026-07-24: botリポジトリ直下の既存`.env.example`は`DISCORD_TOKEN`と`GEMINI_API_KEY`の2変数のみで、この台帳に対して大幅に古い。**上表を反映した`.env.example`への更新が未実施タスク**】

---

## 17. 標準検証とデプロイ判定

### 17-1. フロント

変更後に最低限確認する。

- ローカルHTTPサーバーから表示する。
- 幅375pxとデスクトップ幅で確認する。
- トップ、投稿、キット、About、Terms、Privacy、AN神籤を開く。
- ブラウザコンソールに重大エラーがないことを確認する。
- 投稿APIの接続先がローカル/本番で正しく切り替わることを確認する。
- Cookie同意前にGA4が読み込まれないことを確認する。
- 画像追加時は`file`で実体、`sips`等で容量を確認する。

### 17-2. OGSバックエンド

~~~bash
cd "/Users/takaotoshiyuki/クロードコワーク１/open-gate-sutra"
ENABLE_FLOOR_SCHEDULER=0 PORT=5001 .venv/bin/python app.py
curl -s http://127.0.0.1:5001/health
curl -s https://open-gate-sutra-production.up.railway.app/health
~~~

期待結果:

- ローカルと本番の`/health`がHTTP 200を返す。
- ローカル検証時に床・ANの耳が実行されない。
- 投稿テストを行う場合、テストデータであることを識別できるようにする(タイトルに「削除予定」等)。
- 本番DBへのマイグレーション前に、対象SQLとバックアップ状況を確認する。

### 17-3. Discord AN bot

標準テストコマンド: `[高尾記入]`

最低限確認する項目:

- Discordへ正常ログインする。
- 通常会話と管理者判定が動作する。
- `OGS_DATABASE_URL`未設定時もbotが起動する(an_shared_memory.pyは未設定時に完全不活性の設計)。
- X投稿テストでは`DRY_RUN`または相当の安全機構を使う。
- AN神籤Web APIの認証、日次制限、DB保存を確認する。
  【注: `/health`ルートは現状未実装のため、疎通確認は `/api/me`(→401が正常)で代用する】
- 外部投稿、Discord通知、本番DB書込を伴うテストは事前に対象を明示する。

---

## 18. バックアップ・復旧・ロールバック

### 18-1. Neon

- バックアップ方式: `[高尾記入]`
- 保持期間: `[高尾記入]`
- 最終リストア試験日: `[高尾記入]`
- 管理画面の所有者: `[高尾記入]`
- マイグレーション失敗時の復旧方法: `[高尾記入]`

破壊的SQL、列削除、型変更、データ一括更新は、バックアップ確認なしに実行しない。

### 18-2. Railway

- 直前の正常デプロイへ戻す方法: `[高尾記入]`(RailwayのDeployments画面からRollback可能なはずだが未検証)
- Railway管理者: `[高尾記入]`
- 障害通知先Discordチャンネル: `[高尾記入]`
- APIキー漏洩時のローテーション手順: `[高尾記入]`

ロールバック後は、`/health`だけでなく、投稿、DB接続、スケジューラ、Discord通知を確認する。

### 18-3. ローカル同期

- launchdラベル: `com.an.ogs-mirror`
- 実行時刻: 毎日23:00 JST+ログイン時
- スクリプト: `/Users/takaotoshiyuki/.an_sync/run_ogs_mirror.sh`
- ログ: `/Users/takaotoshiyuki/.an_sync/ogs_mirror.log`
- 2026-07-24確認時の最終終了コード: `0`
- 前提: `/bin/bash`にフルディスクアクセス許可済み(iCloud上のObsidianへ書くため。§10-7)

Mac故障時に再構築できるよう、スクリプト、plist、Obsidian保存先、必要環境変数の復元方法を別途バックアップする。

---

## 19. 未決定事項と責任者

| 項目 | 現在の状態 | 決定者 | 期限 |
|---|---|---|---|
| 引き継ぎ文書の正本 | `open-gate-sutra`に確定(2026-07-24) | 高尾 | 完了 |
| PR #1のマージ | OPEN・MERGEABLE | 高尾 | `[高尾記入]` |
| Cloudflare Turnstile | キー取得待ち | 高尾 | `[高尾記入]` |
| Terms/Privacy確定 | 運営者名等が未記入 | 高尾 | 公開前 |
| bot Web API変更 | 未コミット | 高尾 | `[高尾記入]` |
| Workerソースのリポジトリ化 | 正本がCloudflare上のみ(§14-1) | 高尾 | `[高尾記入]` |
| bot `.env.example` 更新 | 2変数のみで台帳と乖離(§16-2) | 高尾 | `[高尾記入]` |
| AN人格の一本化 | 保留 | 高尾 | 未定 |
| Discord 2サーバー統合 | 保留 | 高尾 | 未定 |
| 独自ドメイン | 未決定 | 高尾 | 未定 |

---

## 20. Codexへの作業依頼時に添える情報

依頼時は次の形式を使う。

- 対象リポジトリ:
- 目的:
- 完了条件:
- 変更してよい範囲:
- 変更してはいけない範囲:
- 本番デプロイの可否:
- DB変更の可否:
- 外部投稿・通知の可否:
- 確認してほしいテスト:
- 関連する未コミット変更:
- 判断が必要になった場合の扱い:

「直して」「いい感じにして」だけでは本番変更を許可したことにならない。対象、完了条件、デプロイ可否が不明な場合、Codexは実装前に確認する。

---

## 21. 検証記録(2026-07-24・引き継ぎ文書コミット前の実機検分)

**検証済み(コマンド実行で確認した事実)**:
- 3リポジトリのHEADハッシュ・ブランチ・ahead/behind 0(§13の値と完全一致)
- open-gate-sutra 本番 `/health` → HTTP 200 `{"ok":true}`
- AN神籤Web API 本番 `/api/me` → HTTP 401 JSON応答(=web_api.py稼働中)
- `web_api.py`にルートは5つのみ・`/health`なし
- botのProcfile = `worker: python3 bot.py` + `web: python web_api.py` の2プロセス定義
- `an_jiji_agent/`はgit追跡済み・`x-bot/`はgit未追跡
- 引き継ぎ文書コミット前のDiscord-an-bot未追跡ファイルは全14件(§13-3に列挙)
- bot直下`.env.example`は2変数のみ(台帳§16-2と乖離)
- Cloudflare Workerのソース(`wrangler.toml`等)はこのMacに存在しない
- launchd `com.an.ogs-mirror` 最終終了コード0

**未検証・不明(高尾または管理画面でしか確認できない)**:
- Railwayのプロジェクト名・サービス名・Volume構成・起動コマンド設定(§15)
- ローカル未コミットの`web_api.py`/`web_db.py`が本番反映済みか
- Neonのバックアップ方式・保持期間(§18-1)
- Cloudflareアカウント・Workerのデプロイ/ログ/停止手順(§14-1)
- X関連3実装のどれが本番稼働か(§14-3)

---
*生成: 2026-07-20 / §11-21追加+検証注記・正本確定・Git管理開始: 2026-07-24。実機検分に基づく。次の大きな一手はPR #1マージ(公開)か、CAPTCHA導入。*
