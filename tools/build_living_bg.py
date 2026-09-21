#!/usr/bin/env python3
"""_proto_dynamic_bg.html から src/js/living-bg.js を生成する。

プロトタイプ(HUD付きの実験台)を唯一の正本とし、本番用モジュールは
毎回ここから機械生成する。手でモジュールを編集しないこと。

    python3 tools/build_living_bg.py

変換内容:
  1. canvas を自前生成する固定背景レイヤーに置換(最背面・イベント透過・opacity)
  2. HUD更新行(phaseName/phaseEn/evoLine/fps)を除去
  3. HUD配線とドラッグ操作を除去(背景はポインタを受けない)
  4. 調整用ハンドル window.__livingBG を公開
  5. 全体を IIFE で包む
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "_proto_dynamic_bg.html"
OUT = ROOT / "src/js/living-bg.js"
BG_OPACITY = "0.80"          # 背景の濃さ(高尾指示で 0.62→0.80 に明るく)

CANVAS_SETUP = """// 背景レイヤーとしてcanvasを自前生成(最背面・イベントは透過)
const cv = document.createElement('canvas');
cv.id = 'living-bg';
cv.setAttribute('aria-hidden', 'true');
Object.assign(cv.style, {{ position:'fixed', inset:'0', width:'100%', height:'100%',
  display:'block', zIndex:'0', pointerEvents:'none',
  opacity: window.OGS_ART_FULLSCREEN ? '1' : '{op}' }});
document.body.insertBefore(cv, document.body.firstChild);""".format(op=BG_OPACITY)

MOTION_CONTROL = """// ── §9.6 動きの停止ボタン + タブ非表示時の休止 ──
// アクセシビリティ(前庭障害・集中の妨げ)と省電力のため、いつでも止められる。
var __stopped = false, __hidden = false;
/* スマホでは既定で止める(2026-09-21)。
   iPhoneのSafariで、動かしていると画面が真っ白になって落ちる。
   粒を2度減らし、解像度の倍率を1に落とし、コマも間引いたが、まだ落ちた。
   手元のChromiumでは記憶の漏れが見つからない(JSの山は5〜9MBを往復するだけで増えない)。
   確かなのは高尾さんの実測「MOTIONを止めると落ちない」だけ。ならばそれに従う。
   止めても絵は1枚描かれる(下の draw(performance.now()))ので、背景は消えない。
   動かしたい人は札を押せばいつでも動く。一度選べば、その選択が優先される。 */
var __stopped = MOBILE, __chose = false;
/* スマホは常に静止画にする(2026-09-21 高尾さん判断)。
   端末に残した記録で、原因が確定した:
     s=132 / m=on / lost=0 / err="" / iOS 18.7 Safari 26.6.1
   JSの例外も出ず、絵の置き場も取り上げられず、終了の印すら残さずに
   2分12秒で終わっている。iOSがタブごと外から捨てている。
   漏れているのではなく、動かし続けること自体が重い。
   だから切り替えの印もスマホには出さない。
   押せてしまえば、そこから落ちる道が残ってしまう。
   パソコンでの選択は今まで通り引き継ぐ。 */
try {
  if (!MOBILE){
    var __pref = localStorage.getItem('ogs-motion-v2') || localStorage.getItem('ogs-motion');
    if (__pref){ __stopped = (__pref === 'off'); __chose = true; }
  }
} catch(e){}

/* 止まった状態で始めるときの下ごしらえ(2026-09-21)。
   この絵は1コマでは像にならない。1回だけ描いて止めると背景は真っ黒になる
   (実測: 濃さ0。動かすと0.5秒で完成し、以後は一定)。
   そこで、止める前に必要な分だけ先に回す。
   動きを望まない人(端末の設定・自分でOFFを選んだ人)には、
   画面に出さずその場で一息に描く。スマホの既定の停止では、rAFで滑らかに整えてから止める。 */
var __SETTLE_FRAMES = 120;
var __stillGen = 0;              // 古い描き上げを止める札

/* 隠しておいて、描き上がってから現す。
   描く回数は多いほど絵が育つ。40回では世界が薄く、120回で密になる
   (2026-09-21 実測。濃さ 138,603 → 143,801、見た目の差はそれ以上)。
   一息に描くと画面が固まるので、画布を透明にしたまま毎コマ描き、
   終わったら静かに浮かび上がらせる。動いて見えず、固まりもしない。
   門と文字はDOMなので最初から見えている。
   遅い端末で待たせないよう、回数か2秒か、早い方で切り上げる。 */
function __paintStill(){
  var t0 = performance.now(), n = 0, mine = ++__stillGen;
  // 画布には元から移り変わりの指定がある。隠すときは即座に(実測で1.9秒かかっていた)
  try { cv.style.transition = 'none'; cv.style.opacity = '0'; } catch(e){}
  (function step(ts){
    if (mine !== __stillGen) return;          // 新しい描き上げに追い越された
    /* 毎コマ言い直す。listen.html は音の強さで phase を動かし続けるので、
       一度だけ決めても次のコマで書き換えられる
       (2026-09-21 実測: 3.5 に決めたのに 8.19 = 種 で描かれ、
        濃さが 134,393 → 71,429 まで痩せていた) */
    auto = false; manualP = __stillPhase;
    __lastDraw = 0;
    draw(ts || performance.now());
    if (++n < __SETTLE_FRAMES && performance.now() - t0 < 2000) return requestAnimationFrame(step);
    try {
      if (!REDUCED) cv.style.transition = 'opacity .7s ease';
      cv.style.opacity = '';
    } catch(e){}
  })();
}

/* 止まった絵を描き直す(2026-09-21)。
   止めた絵は自分では描き直さないので、次の2つで画面から消えていた:

   ① 画面の寸法が変わったとき
      resize() は cv.width を書き換える。画布はそこで白紙に戻る。
      iPhoneはスクロールでアドレスバーが伸縮するたびにこれが起きるため、
      背景が途中で消えて、そのまま真っ暗になっていた(高尾さん報告)。
   ② 曲が変わったとき
      listen.html は曲ごとに地形・表情・空・中央の絵を入れ替えるが、
      描き直されないので前の曲の絵が残ったままだった(実測: 濃さが一切変わらない)。

   相は既定で 3.5(開花と飽和の間)に戻す。呼び手が指定すればその相で止める。曲ごとの相は 6.4(還元)から始まり、
   動く画面では時間とともに育つが、止まった絵では育たないため、
   そのまま描くとスカスカの一枚になってしまう。 */
var __restillT = 0, __stillPhase = 3.5;
function __restill(p){
  if (!__stopped && !REDUCED) return;         // 動いている画面は自分で描き直す
  /* 止める相を呼び手が指定できる。曲ごとに少しずらすため(2026-09-21)。
     指定が無ければ 3.5(開花と飽和の間)。 */
  if (isFinite(p)) __stillPhase = Math.max(2.6, Math.min(4.4, p));
  clearTimeout(__restillT);
  __restillT = setTimeout(__paintStill, 220);
}
addEventListener('resize', __restill);
addEventListener('orientationchange', __restill);
try {
  if (window.__livingBG){
    window.__livingBG.restill = __restill;
    /* この画面の絵が止まっているか。呼び手が「止まっているときだけ」の
       手当てをするために見る(listen.html の曲ごとの色合いなど) */
    Object.defineProperty(window.__livingBG, 'still', { get: function(){ return __stopped || REDUCED; } });
  }
} catch(e){}

function __settle(atOnce){
  var t0 = performance.now(), n = 0;
  if (atOnce){
    /* 素材が揃う前に描くと真っ黒になる(実測: 濃さ0)ので、読み込み後に描く */
    if (document.readyState === 'complete') setTimeout(__paintStill, 120);
    else addEventListener('load', function(){ setTimeout(__paintStill, 120); });
    return;
  }
  (function step(ts){
    __lastDraw = 0;                     // 間引きに邪魔させない
    draw(ts || performance.now());
    if (++n < __SETTLE_FRAMES) requestAnimationFrame(step);
  })();
}

function __resume(){
  if (__stopped || __hidden || REDUCED) return;
  requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange', function(){
  __hidden = document.hidden;          // 非表示タブでは描画を止める(電池・CPU)
  if (!__hidden) __resume();
});

(function buildMotionToggle(){
  if (MOBILE) return;            // スマホは常に静止。押せる道を作らない
  var css = document.createElement('style');
  css.textContent =
    '#motion-toggle{position:fixed;left:14px;bottom:56px;z-index:9997;display:flex;' +
    'align-items:center;gap:8px;padding:8px 12px;cursor:pointer;' +
    'background:rgba(6,9,16,.72);border:1px solid rgba(217,196,154,.16);' +
    'color:#8d826d;font:400 10px/1 ui-sans-serif,-apple-system,sans-serif;' +
    'letter-spacing:.18em;text-transform:uppercase;backdrop-filter:blur(4px);' +
    'transition:color .3s,border-color .3s}' +
    '#motion-toggle:hover{color:#d9c49a;border-color:rgba(217,196,154,.4)}' +
    '#motion-toggle:focus-visible{outline:1px solid #d9c49a;outline-offset:3px}' +
    '#motion-toggle .dot{width:6px;height:6px;border-radius:50%;background:#4a4438;flex:none}' +
    '#motion-toggle.on .dot{background:#6fa8d6;box-shadow:0 0 6px rgba(111,168,214,.7)}' +
    /* 狭い画面では文字を畳み、小さな四角の印にする(2026-09-20 高尾さん指摘)。
       右下に3つ並ぶ札が幅100pxほどあり、門の上に覆いかぶさっていた。
       印だけなら32pxで済み、覆う面が1/3以下になる。何の印かは aria-label に残す */
    '@media (max-width:700px){#motion-toggle{left:auto;right:10px;bottom:48px;' +
    'width:32px;height:32px;padding:0;gap:0;justify-content:center}' +
    '#motion-toggle .txt{display:none}' +
    '#motion-toggle .dot{width:8px;height:8px}}';
  document.head.appendChild(css);

  var b = document.createElement('button');
  b.id = 'motion-toggle'; b.type = 'button';
  b.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="txt"></span>';
  function sync(){
    var moving = !__stopped && !REDUCED;
    b.classList.toggle('on', moving);
    b.setAttribute('aria-pressed', moving ? 'true' : 'false');
    b.querySelector('.txt').textContent = moving ? 'Motion on' : 'Motion off';
    b.setAttribute('aria-label', moving ? '背景の動きを止める' : '背景の動きを再開する');
  }
  b.addEventListener('click', function(){
    __stopped = !__stopped;
    try { localStorage.setItem('ogs-motion-v2', __stopped ? 'off' : 'on'); } catch(e){}
    sync();
    if (!__stopped) __resume();
  });
  document.body.appendChild(b);
  sync();
})();

// ── §9.7 落ちる直前の記録(2026-09-21) ──
// iPhoneのSafariで画面が真っ白になる件。手元のChromiumでは再現できず、
// 記憶の漏れも3つ測って全部空振りした。推測での直しはもう重ねない。
// 4秒ごとに「いま何をしていたか」を端末に書き置き、次に開いたとき、
// 前の回が行儀よく終わっていなければ(exitが無ければ)それを落ちた記録として残す。
// 読むには住所の末尾に #diag を付けて開く。
(function crashLog(){
  var t0 = Date.now(), lost = 0, hides = 0, err = '';
  try {
    var prev = localStorage.getItem('ogs-last');
    if (prev && prev.indexOf('"exit"') < 0) localStorage.setItem('ogs-crash', prev);
  } catch(e){}
  function rec(exit){
    var o = { p: (location.pathname.split('/').pop() || 'index'),
              s: Math.round((Date.now() - t0)/1000),
              m: __stopped ? 'off' : 'on',
              lost: lost, hides: hides, err: err,
              w: innerWidth + 'x' + innerHeight, dpr: devicePixelRatio,
              ua: (navigator.userAgent.match(/OS [\d_]+|Version\/[\d.]+|Safari|CriOS/g) || []).join(' ') };
    if (exit) o.exit = exit;
    try { localStorage.setItem('ogs-last', JSON.stringify(o)); } catch(e){}
  }
  rec(); setInterval(function(){ rec(); }, 4000);
  addEventListener('pagehide', function(){ rec('hide'); });
  document.addEventListener('visibilitychange', function(){
    if (document.hidden){ hides++; rec('hide'); } else rec();
  });
  cv.addEventListener('contextlost', function(){ lost++; rec(); });
  addEventListener('error', function(e){ err = String(e.message || '').slice(0, 70); rec(); });
  addEventListener('unhandledrejection', function(e){ err = 'rej ' + String(e.reason).slice(0, 60); rec(); });

  if (location.hash === '#diag'){
    var box = document.createElement('pre');
    box.style.cssText = 'position:fixed;inset:auto 8px 8px 8px;z-index:9999;margin:0;padding:10px;' +
      'background:rgba(6,9,16,.94);border:1px solid rgba(217,196,154,.3);color:#d9c49a;' +
      'font:11px/1.6 ui-monospace,monospace;white-space:pre-wrap;word-break:break-all;max-height:60vh;overflow:auto';
    var g = function(k){ try { return localStorage.getItem(k) || '(なし)'; } catch(e){ return '(読めない)'; } };
    box.textContent = '落ちた回:\\n' + g('ogs-crash') + '\\n\\nいまの回:\\n' + g('ogs-last');
    document.body.appendChild(box);
    box.addEventListener('click', function(){ box.remove(); });
  }
})();

// ── ART鑑賞ページへの入口(鑑賞ページ自身には出さない) ──
(function buildArtLink(){
  if (window.OGS_ART_FULLSCREEN) return;
  var css = document.createElement('style');
  css.textContent =
    '#art-link{position:fixed;left:14px;bottom:98px;z-index:9997;display:flex;' +
    'align-items:center;gap:8px;padding:8px 12px;text-decoration:none;' +
    'background:rgba(6,9,16,.72);border:1px solid rgba(217,196,154,.16);' +
    'color:#8d826d;font:400 10px/1 ui-sans-serif,-apple-system,sans-serif;' +
    'letter-spacing:.18em;text-transform:uppercase;backdrop-filter:blur(4px);' +
    'transition:color .3s,border-color .3s}' +
    '#art-link:hover{color:#d9c49a;border-color:rgba(217,196,154,.4)}' +
    '#art-link:focus-visible{outline:1px solid #d9c49a;outline-offset:3px}' +
    '#art-link .dot{width:6px;height:6px;border-radius:50%;background:#b23a2e;' +
    'box-shadow:0 0 6px rgba(178,58,46,.55);flex:none}' +
    '@media (max-width:700px){#art-link{left:auto;right:10px;bottom:86px;' +
    'width:32px;height:32px;padding:0;gap:0;justify-content:center}' +
    '#art-link span:not(.dot){display:none}' +
    '#art-link .dot{width:8px;height:8px}}';
  document.head.appendChild(css);
  var a = document.createElement('a');
  a.id = 'art-link'; a.href = 'art.html';
  a.setAttribute('aria-label', '背景アートを全画面で見る');
  a.innerHTML = '<span class="dot" aria-hidden="true"></span><span>View art</span>';
  document.body.appendChild(a);
})();

"""

DEBUG_HANDLE = """// 調整・検証用ハンドル(本番でも無害)
window.__livingBG = {
  get phase(){ return auto ? (((performance.now()-t0)/1000 + tOffset)/CYCLE_SEC*8)%8 : manualP; },
  set phase(v){ auto = false; manualP = v; },
  resume(){ auto = true; },
  get theme(){ return THEMES[themeIdx].name; },
  setTheme(i){ themeIdx = i; },
  get gen(){ return genome.gen; },
  get maturity(){ return maturity(); },
  setWeather(w){ const tn=(performance.now()-t0)/1000;
    weather=w; wStart=tn-6; wEnd=tn+120; wNext=1e9;
    WP.forEach(p=>{ respawnP(p);
      if(w==='bubbles') p.ny=(1.15+Math.random()*0.3)*WFIELD;
      if(w==='stars'){p.nx=(Math.random()*2-1)*1.15*WFIELD;p.ny=(Math.random()*2-1)*1.15*WFIELD;
        p.tw=Math.random()*6.28;p.tws=0.6+Math.random()*2.2;p.spike=Math.random()<0.35;}
      if(w==='digital'){p.glyph=Math.random()<0.5?'0':'1';p.flip=Math.random()*9;p.trail=3+(Math.random()*5|0);} }); },
  setCelestial(k){ celestial.kind = k; celestialPrev = null; celFadeT0 = -1; },
  /* 生態系の動きと見た目。曲ごとに表情を変えるための窓口。
     spin:回る速さ tilt:傾きの揺れ幅 swellAmp:拡大収縮の幅
     swellRate:その速さ scale:アイコンの大きさ hue:色相のずれ(度)
     渡さなかった項目はそのまま。いずれも1が既定、hueだけ0が既定。 */
  setMotion(m){ for (const k in m) if (k in MOT && isFinite(m[k])) MOT[k] = m[k]; },
  get motion(){ return Object.assign({}, MOT); },
  swapCelestial(){ pickCelestial((performance.now()-t0)/1000); },   // フェード検証用
  get celFade(){ return celFadeT0 < 0 ? 1 :
    Math.min(1, ((performance.now()-t0)/1000 - celFadeT0) / CEL_FADE); },
  get celPair(){ return [celestialPrev && celestialPrev.kind, celestial.kind]; },
  rebuild(){ rebuild(); },
  /* 曲ごとの地形の偏りを渡して、球を組み立て直す(2026-09-16)。
     例: setBiomeBias({city:3, mech:1.4, crystal:1, forest:0.5, flower:0.4, leaf:0.4})
     null を渡すと、この端末の遺伝子の重みへ戻る。 */
  setBiomeBias(b){ setBiomeBias(b); },
  get biomeTypes(){ return BIOME_TYPES.slice(); },
  /* 球の中心に宿る絵を差し替える(2026-09-17)。曲ページから1曲を指定して
     聴くときだけ、ANの代わりにジャケットを置く。null を渡すとANへ戻る。
     後光・呼吸する光・胸のコアは、どちらでもそのまま残る。 */
  setCenterImage(u){ setCenterImage(u); },
  get centerImage(){ return CIMG.url; },
};

"""


def build() -> int:
    html = SRC.read_text(encoding="utf-8")
    m = re.search(r"<script>([\s\S]*)</script>", html)
    if not m:
        print("ERROR: <script> が見つかりません", file=sys.stderr)
        return 1
    lines = m.group(1).split("\n")

    # 1. canvas 取得 → 自前生成
    for i, l in enumerate(lines):
        if "const cv = document.getElementById('cv');" in l:
            lines[i] = CANVAS_SETUP
            break
    else:
        print("ERROR: canvas取得行が見つかりません", file=sys.stderr)
        return 1

    # 2. HUD更新行を除去(テンプレート文字列の継続行も飛ばす)
    out, skip = [], False
    for l in lines:
        if any(k in l for k in ("phaseName.textContent", "evoLine.textContent",
                                "phaseEn.textContent")):
            skip = True
            continue
        if skip:
            st = l.strip()
            if st.startswith(("+", "'", "`")) or st == "":
                if st == "":
                    skip = False
                continue
            skip = False
        if any(k in l for k in ("const wLabel = ", "const cLabel = ", "const rLabel = ")):
            continue
        out.append(l)
    txt = "\n".join(out)

    # 3. 「操作」セクション(HUD配線・ドラッグ)を除去し、起動処理だけ残す
    i = txt.index("/* ── 操作 ── */")
    j = txt.index("if (REDUCED){", i)
    txt = txt[:i] + txt[j:]

    # 4. fps表示(HUD)を無効化 + 調整ハンドルを起動前に差し込む
    txt = txt.replace(
        "  if (now - fpsT > 1000){ fps.textContent = frames + 'fps'; frames = 0; fpsT = now; }",
        "  if (now - fpsT > 1000){ frames = 0; fpsT = now; }")
    txt = txt.replace("if (REDUCED){", DEBUG_HANDLE + MOTION_CONTROL + "if (REDUCED){", 1)
    # 描画ループを停止フラグで守る(停止中・非表示中は次フレームを予約しない)
    txt = txt.replace("  if (!REDUCED) requestAnimationFrame(draw);",
                      "  if (!REDUCED && !__stopped && !__hidden) requestAnimationFrame(draw);")
    # 起動時に停止が記憶されていれば1フレームだけ描いて止める
    # 中央の絵(ジャケット)は後から届く。止まった絵にも映るよう描き直しを頼む
    txt = txt.replace("    CIMG.can = can;",
                      "    CIMG.can = can;\n"
                      "    if (typeof __restill === 'function') __restill();")

    txt = txt.replace("else requestAnimationFrame(draw);",
                      "else if (__stopped) __settle(__chose);\nelse requestAnimationFrame(draw);")
    # 端末が動きを抑えている人も、1コマでは真っ黒になっていた。同じ下ごしらえを通す。
    # スマホも同じ道へ入れる(2026-09-21 高尾さん判断で、常時静止に決めた)。
    # 止める位置も決める。時計任せだと「種」や「還元」のスカスカな相で止まり、
    # 同じ静止画でも豊かさが倍以上ぶれていた(濃さ 74,061 〜 152,483 を実測)。
    # 相は8つ(種・発芽・流動・開花・飽和・崩壊・還元・再生)で、
    # 見え方の係数KFは vis・glow・conn・river がどれも 3〜4 で頂点に来る。
    # その間の 3.5 に固定する。動きを抑えている人向けに元から使っていた値と同じ。
    txt = txt.replace("if (REDUCED){ auto = false; manualP = 3.5; draw(performance.now()); }",
                      "if (REDUCED || MOBILE){ auto = false; manualP = 3.5; __settle(true); }")

    header = (
        "/* HSE/AN 生きた背景アート — OGSホーム用モジュール\n"
        "   ⚠ 自動生成ファイル。編集は _proto_dynamic_bg.html 側で行い、\n"
        "      python3 tools/build_living_bg.py で再生成すること。\n"
        "   使い方: <script src=\"src/js/living-bg.js\" defer></script> */\n"
    )
    OUT.write_text(header + "(function(){\n" + txt + "\n})();\n", encoding="utf-8")
    print(f"生成: {OUT.relative_to(ROOT)} ({OUT.read_text(encoding='utf-8').count(chr(10))} lines)")
    return 0


if __name__ == "__main__":
    raise SystemExit(build())
