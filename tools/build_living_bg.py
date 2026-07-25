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
BG_OPACITY = "0.62"          # 本文可読性を優先した背景の濃さ

CANVAS_SETUP = """// 背景レイヤーとしてcanvasを自前生成(最背面・イベントは透過)
const cv = document.createElement('canvas');
cv.id = 'living-bg';
cv.setAttribute('aria-hidden', 'true');
Object.assign(cv.style, {{ position:'fixed', inset:'0', width:'100%', height:'100%',
  display:'block', zIndex:'0', pointerEvents:'none', opacity:'{op}' }});
document.body.insertBefore(cv, document.body.firstChild);""".format(op=BG_OPACITY)

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
      if(w==='bubbles') p.ny=1.15+Math.random()*0.3;
      if(w==='stars'){p.nx=(Math.random()*2-1)*1.15;p.ny=(Math.random()*2-1)*1.15;
        p.tw=Math.random()*6.28;p.tws=0.6+Math.random()*2.2;p.spike=Math.random()<0.35;}
      if(w==='digital'){p.glyph=Math.random()<0.5?'0':'1';p.flip=Math.random()*9;p.trail=3+(Math.random()*5|0);} }); },
  setCelestial(k){ celestial.kind = k; celestialPrev = null; celFadeT0 = -1; },
  swapCelestial(){ pickCelestial((performance.now()-t0)/1000); },   // フェード検証用
  get celFade(){ return celFadeT0 < 0 ? 1 :
    Math.min(1, ((performance.now()-t0)/1000 - celFadeT0) / CEL_FADE); },
  get celPair(){ return [celestialPrev && celestialPrev.kind, celestial.kind]; },
  rebuild(){ rebuild(); },
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
    txt = txt.replace("if (REDUCED){", DEBUG_HANDLE + "if (REDUCED){", 1)

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
