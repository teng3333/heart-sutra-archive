/**
 * ANの案内役 — 今の気分を聞いて、般若心経を1曲すすめる(試作 2026-10-04)
 *
 * 方針(高尾さんと決めたこと):
 *   - APIは使わない。曲の分析ですでに付いている棚(整える・ほどく・動く・ひらく)と瞑で選ぶ。費用0円
 *   - チャット欄に打つのではなく、ANが話しかけ、選択肢を押して答える(ノベルゲームの会話の見せ方)
 *   - 軽くする。最初は右下の小さな顔だけ。押されてから曲の一覧を読む
 *
 * 表情(FACES)は、背景透明・同じ構図の絵5枚(480×480)を差し替えて見せる(2026-10-04 高尾さん作)。
 * 口パクとまばたきは、口だけ・目だけの部品(MOUTH・EYES)を重ねて動かす。
 * まばたき・口パクは、通常・笑顔・ツンの顔で行う(考えるはポーズが違うので行わない)。
 *
 * 使い方: <script src="src/js/an-guide.js" defer></script> を置くだけ。
 */
(function () {
  'use strict';

  var API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5001/api/archive'
    : 'https://open-gate-sutra-production.up.railway.app/api/archive';

  /* 表情。絵が届いたら差し替える(同じ大きさ・同じ位置で描かれていること) */
  var FACES = {
    normal: 'assets/an/guide/an-normal.webp',
    smile:  'assets/an/guide/an-smile.webp',
    tsun:   'assets/an/guide/an-tsun.webp',
    think:  'assets/an/guide/an-think.webp'
  };
  /* 口パクは顔を丸ごと替えず、口だけの小さな部品(約2KB)を通常の顔の上に重ね、濃さを上下させて動かす。
     別々に描いた絵を丸ごと替えると、髪や飾りまでちらつくため。位置は通常の顔(480×480)に対する割合 */
  var MOUTH = { src: 'assets/an/guide/an-mouth.webp', left: 47.5, top: 56.042, width: 20.208 };
  /* まばたきも同じ方式。目を閉じた両目だけの部品(約3KB)を一瞬だけ濃くする */
  var EYES  = { src: 'assets/an/guide/an-eyes.webp', left: 49.583, top: 39.167, width: 26.875 };
  /* 部品を重ねてよい顔と、その顔での部品のずれ(480×480での画素)。考えるはポーズが違うので重ねない */
  var PART_FACES = {
    normal: { eyes: [0, 0],  mouth: [0, 0] },
    smile:  { eyes: [-2, 0], mouth: [-2, 0] },
    tsun:   { eyes: [1, 1],  mouth: [1, -2] }
  };
  var REAL_FACES = true;    // false にすると、通常の顔1枚+CSSの動きで代わりにする

  /* ── せりふと流れ ─────────────────────────────────────────────
     line は候補の配列。毎回ランダムに1つ選ぶ(同じ言い回しが続かないように)。
     face はそのせりふを言うときの表情。 */
  var MOODS = [
    { key: 'tired',  label: '疲れた',
      line: ['……でしょうね。顔に書いてある。', '無理してたのね。ちょっと止まりなさい。'],
      face: 'think', ask: '休みたい？それとも、少しだけ元気がほしい？',
      next: [{ label: 'とにかく休みたい', mode: 'relax' }, { label: '少し元気がほしい', mode: 'inspire' }] },
    { key: 'sleep',  label: '眠れない',
      line: ['……夜は、考えごとが大きくなるものよ。', '眠れない夜に、正しい過ごし方なんてないわ。'],
      face: 'normal', ask: 'どうしたい？',
      next: [{ label: '静かに眠りたい', mei: true }, { label: '何も考えたくない', mode: 'relax' }] },
    { key: 'focus',  label: '集中したい',
      line: ['ふぅん、やる気はあるのね。', '……邪魔はしないわ。'],
      face: 'normal', ask: '静かに沈む？勢いで片付ける？',
      next: [{ label: '静かに集中', mode: 'focus' }, { label: '勢いで片付けたい', mode: 'energy' }] },
    { key: 'fire',   label: '気合いを入れたい',
      line: ['……暑苦しいわね。嫌いじゃないけど。', 'いいわ。火を点けてあげる。'],
      face: 'smile', ask: '燃えたい？前を向きたい？',
      next: [{ label: '燃えたい', mode: 'energy' }, { label: '前を向きたい', mode: 'inspire' }] },
    { key: 'moya',   label: 'モヤモヤする',
      line: ['……その正体、本当にあるのかしら。', '絡まってるのね。無理にほどかなくていい。'],
      face: 'think', ask: 'ほどきたい？それとも、ひらきたい？',
      next: [{ label: 'ほどきたい', mode: 'relax' }, { label: 'ひらきたい', mode: 'inspire' }] },
    { key: 'any',    label: 'なんとなく',
      line: ['……なんとなく、ね。それも一つの答えよ。', '理由なんて要らないわ。'],
      face: 'tsun', ask: null, next: [{ label: '', any: true }] }
  ];
  var GREET = {
    morning: ['……おはよう。早いのね。', '朝ね。今日はどんな顔をしてるの？'],
    day:     ['……来たのね。', 'あら。今日はどうしたの。'],
    night:   ['……こんな時間に、どうしたの。', '夜ね。少しだけ付き合ってあげる。'],
    again:   ['……また来たのね。前は「%s」だったけど。', 'ふぅん、また来たの。前は「%s」って言ってたわね。']
  };
  var PICK_LINE = ['これ。黙って聴きなさい。', '……これがいいと思う。たぶんね。', 'はい。終わるころには、少し違う顔になってるはず。'];
  var AGAIN_LINE = ['……欲張りね。じゃあ、これ。', 'ふぅん、違ったのね。これはどう？'];
  var BYE_LINE = ['……そう。またね。', '勝手にすれば。……また来なさい。'];

  var MODE_JA = { focus: '整える', relax: 'ほどく', energy: '動く', inspire: 'ひらく' };

  /* ── 小道具 ─────────────────────────────────────────────── */
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  var store = {
    get: function (k) { try { return localStorage.getItem('ogs-an-guide-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('ogs-an-guide-' + k, v); } catch (e) {} }
  };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 見た目 ─────────────────────────────────────────────── */
  var CSS = [
    /* 右下の「Privacy · Analytics」(下から12〜39px)の上に置く */
    '.ang-launch{position:fixed;right:16px;bottom:60px;z-index:9990;width:64px;height:64px;border-radius:50%;',
    ' padding:0;border:0;background:none;cursor:pointer;animation:ang-breath 4.2s ease-in-out infinite}',
    '.ang-face{display:block;width:100%;height:100%;border-radius:50%;overflow:hidden;background:#05070c;',
    ' border:1px solid rgba(217,196,154,.45);box-shadow:0 6px 24px rgba(0,0,0,.6)}',
    /* 何をしてくれるボタンか、絵だけでは分からないので、丸の下端に小さく札を添える */
    '.ang-tag{position:absolute;left:50%;bottom:-8px;transform:translateX(-50%);padding:2px 6px;border-radius:999px;',
    ' background:#b23a2e;color:#f5ecd8;font:600 8px/1.3 system-ui,sans-serif;letter-spacing:.08em;white-space:nowrap;',
    ' box-shadow:0 2px 8px rgba(0,0,0,.5);pointer-events:none}',
    /* 小さな丸でも顔が分かるよう、胸像の絵の顔のあたりを拡大して見せる */
    '.ang-face img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.5);transform-origin:66% 44%}',
    '.ang-launch:focus-visible{outline:2px solid #9ec9dd;outline-offset:3px}',
    '.ang-hint{position:fixed;right:88px;bottom:70px;z-index:9990;max-width:200px;padding:8px 12px;',
    ' background:rgba(10,13,22,.92);border:1px solid rgba(217,196,154,.3);color:#e9dcba;font-size:13px;',
    ' line-height:1.5;border-radius:12px 12px 2px 12px;opacity:0;transform:translateY(6px);',
    ' transition:opacity .4s,transform .4s;pointer-events:none}',
    '.ang-hint.on{opacity:1;transform:none}',
    '.ang-stage{position:fixed;inset:auto 0 0 auto;z-index:9991;width:min(440px,100vw);height:min(640px,86vh);',
    ' pointer-events:none;opacity:0;transform:translateY(24px);transition:opacity .35s,transform .35s}',
    '.ang-stage.on{opacity:1;transform:none;pointer-events:auto}',
    '.ang-char{position:absolute;right:-30px;top:0;height:min(56%,380px);aspect-ratio:1/1;',
    ' -webkit-mask-image:linear-gradient(to bottom,#000 70%,transparent 98%);mask-image:linear-gradient(to bottom,#000 70%,transparent 98%)}',
    '.ang-char img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform-origin:50% 90%;',
    ' transition:filter .3s,transform .3s,opacity .4s ease;opacity:0}',
    '.ang-char img.ang-mouth,.ang-char img.ang-eyes{inset:auto;height:auto;z-index:3;opacity:0;transition:opacity .12s}',
    '.ang-stage.blinking .ang-char img.ang-eyes{animation:ang-blink .2s ease-in-out}',
    '.ang-stage.mouthing .ang-char img.ang-mouth{animation:ang-mouth .16s ease-in-out infinite alternate}',
    /* 表情の切り替えは、新しい顔を上に重ねて溶かし入れ、前の顔は少し遅れて消す(途中で透けないように) */
    '.ang-char img.on{opacity:1;z-index:2}',
    '.ang-char img.prev{z-index:1;transition:opacity .3s ease .2s}',
    /* まばたき・口パクは一瞬で切り替える */
    '.ang-stage.snap .ang-char img{transition:none}',
    '.ang-char .breath{position:absolute;inset:0;animation:ang-breath 4.2s ease-in-out infinite;transform-origin:50% 100%}',
    /* 仮の絵(黒い背景つき)のあいだだけ、縁を闇に溶かして四角を見せない。透過の絵が届けば外れる */
    '.ang-stage.ph .ang-char{-webkit-mask-image:radial-gradient(ellipse 52% 48% at 50% 38%,#000 55%,transparent 100%);',
    ' mask-image:radial-gradient(ellipse 52% 48% at 50% 38%,#000 55%,transparent 100%)}',
    /* 表情の代わり(絵1枚のあいだだけ使う) */
    '.ang-stage.ph[data-face=smile] .ang-char img{filter:brightness(1.08) saturate(1.1)}',
    '.ang-stage.ph[data-face=tsun] .ang-char img{transform:rotate(-2.5deg) translateX(-4px)}',
    '.ang-stage.ph[data-face=think] .ang-char img{transform:rotate(2deg) translateY(2px);filter:brightness(.92)}',
    /* 話すときの小さな揺れは、口パクできないとき(仮の絵・考える顔)だけ。口パクと重なるとがたつく */
    '.ang-stage.ph.talking .ang-char img,.ang-stage.talking[data-face=think] .ang-char img{animation:ang-talk .24s steps(2) infinite}',
    '.ang-box{position:absolute;left:12px;right:12px;bottom:12px;padding:16px 16px 14px;border-radius:14px;',
    ' background:rgba(8,11,19,.9);border:1px solid rgba(217,196,154,.32);color:#e9dcba;',
    ' backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 10px 40px rgba(0,0,0,.6)}',
    '.ang-name{position:absolute;top:-12px;left:14px;padding:2px 12px;font-size:12px;letter-spacing:.2em;',
    ' background:#b23a2e;color:#f5ecd8;border-radius:3px}',
    '.ang-text{min-height:3.4em;font-size:15px;line-height:1.75;white-space:pre-wrap;font-family:"Shippori Mincho",serif}',
    '.ang-choices{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}',
    '.ang-choices button,.ang-choices a{font:inherit;font-size:13px;padding:8px 12px;border-radius:999px;cursor:pointer;',
    ' color:#e9dcba;background:rgba(255,255,255,.04);border:1px solid rgba(217,196,154,.35);text-decoration:none}',
    '.ang-choices button:hover,.ang-choices a:hover,.ang-choices :focus-visible{background:rgba(217,196,154,.14);outline:none}',
    '.ang-choices .main{background:#b23a2e;border-color:#b23a2e;color:#f5ecd8}',
    '.ang-close{position:absolute;top:8px;right:8px;width:32px;height:32px;border-radius:50%;border:0;cursor:pointer;',
    ' background:rgba(0,0,0,.35);color:#e9dcba;font-size:18px;line-height:32px}',
    '.ang-choices .ang-card{flex-basis:100%}',
    '.ang-card{display:flex;gap:12px;align-items:center;margin-top:10px;padding:8px;border-radius:10px;background:rgba(255,255,255,.04)}',
    '.ang-card img{width:64px;height:64px;object-fit:cover;object-position:50% 30%;border-radius:6px;flex:none}',
    '.ang-card b{display:block;font-weight:500;font-size:14px}',
    '.ang-card small{display:block;opacity:.7;font-size:12px;margin-top:2px}',
    '.ang-card i{display:block;font-style:normal;font-size:12px;opacity:.85;margin-top:4px}',
    '@keyframes ang-breath{0%,100%{transform:scale(1)}50%{transform:scale(1.015)}}',
    '@keyframes ang-mouth{0%{opacity:0}100%{opacity:1}}',
    '@keyframes ang-blink{0%{opacity:0}30%,60%{opacity:1}100%{opacity:0}}',
    '@keyframes ang-talk{0%{translate:0 0}100%{translate:0 -1.5px}}',
    '@media (max-width:560px){.ang-stage{width:100vw;height:86vh}.ang-char{height:min(44%,84vw);right:-20px}}',
    /* 同意の案内(下から12〜68px)が出ている間は、その上まで持ち上げる。幅の狭いタブレットでは案内と横に重なるため */
    'html.ogs-consent-open .ang-launch{bottom:96px}html.ogs-consent-open .ang-hint{bottom:106px}',
    /* 会話の画面も、同意の案内に選択肢が隠れないよう上へずらす */
    'html.ogs-consent-open .ang-stage{bottom:76px;height:min(640px,calc(86vh - 76px))}',
    /* スマホ(620px以下)では右端に絵・音のボタンが並ぶので、左下の「Privacy」(下から8〜32px)の上に置く。
       同意の案内が出ている間は、その上まで持ち上げる(consent.js がほかのボタンを持ち上げるのと同じ) */
    '@media (max-width:620px){.ang-launch{left:12px;right:auto;bottom:48px}',
    ' .ang-hint{left:88px;right:auto;bottom:58px;border-radius:12px 12px 12px 2px}',
    ' html.ogs-consent-open .ang-launch{bottom:84px}html.ogs-consent-open .ang-hint{bottom:94px}',
    ' html.ogs-consent-open .ang-stage{bottom:66px;height:calc(86vh - 66px)}}',
    /* スマホで開いている間だけ、後ろを暗くしてページの文字が透けないようにする */
    '.ang-dim{display:none}',
    '@media (max-width:620px){.ang-dim{display:block;position:fixed;inset:0;z-index:9990;background:rgba(3,5,10,.62);',
    ' opacity:0;pointer-events:none;transition:opacity .35s}.ang-dim.on{opacity:1;pointer-events:auto}}',
    '@media (prefers-reduced-motion:reduce){.ang-launch,.ang-char .breath{animation:none}',
    ' .ang-stage.talking .ang-char img{animation:none}}'
  ].join('\n');

  /* ── 組み立て ───────────────────────────────────────────── */
  var stage, dim, faceImgs = {}, shown = '', fadeUntil = 0, textEl, choicesEl, launch, hint, tracks = null, last = null, cur = null;

  function build() {
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);

    launch = el('button', 'ang-launch');
    launch.type = 'button';
    launch.setAttribute('aria-label', 'ANに今の気分を話す');
    var face = el('span', 'ang-face');
    var li = el('img'); li.src = FACES.normal; li.alt = ''; li.loading = 'lazy';
    face.appendChild(li); launch.appendChild(face);
    launch.appendChild(el('span', 'ang-tag', 'RECOMMEND'));
    launch.addEventListener('click', open);
    document.body.appendChild(launch);

    hint = el('div', 'ang-hint', '……今の気分、聞いてあげてもいいけど？');
    document.body.appendChild(hint);
    /* 1日に1回だけ、そっと声をかける。しつこくしない */
    var today = new Date().toDateString();
    if (store.get('hinted') !== today) {
      setTimeout(function () { hint.classList.add('on'); store.set('hinted', today); }, 2500);
      setTimeout(function () { hint.classList.remove('on'); }, 9000);
    }
  }

  function buildStage() {
    dim = el('div', 'ang-dim');
    dim.addEventListener('click', close);   // 暗いところを押すと閉じる
    document.body.appendChild(dim);
    stage = el('div', 'ang-stage' + (REAL_FACES ? '' : ' ph'));
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-label', 'ANとの会話');
    var ch = el('div', 'ang-char'), br = el('div', 'breath');
    /* 表情の絵は重ねて置き、見せる1枚だけ切り替える(src を替えると毎回読み直しになり、ちらつく) */
    (REAL_FACES ? Object.keys(FACES) : ['normal']).forEach(function (k) {
      var im = el('img'); im.alt = ''; im.src = FACES[k];
      faceImgs[k] = im; br.appendChild(im);
    });
    showFace('normal');
    if (REAL_FACES) {
      [['mouth', MOUTH], ['eyes', EYES]].forEach(function (p) {
        var im = el('img', 'ang-' + p[0]); im.alt = ''; im.src = p[1].src;
        im.style.width = p[1].width + '%';
        partImgs[p[0]] = im; br.appendChild(im);
      });
      placeParts('normal');
    }
    ch.appendChild(br); stage.appendChild(ch);
    var box = el('div', 'ang-box');
    box.appendChild(el('span', 'ang-name', 'AN'));
    textEl = el('p', 'ang-text'); textEl.setAttribute('aria-live', 'polite');
    choicesEl = el('div', 'ang-choices');
    box.appendChild(textEl); box.appendChild(choicesEl);
    var x = el('button', 'ang-close', '×'); x.type = 'button'; x.setAttribute('aria-label', '閉じる');
    x.addEventListener('click', function () { say(pick(BYE_LINE), 'tsun', [], close, 900); });
    stage.appendChild(box); stage.appendChild(x);
    document.body.appendChild(stage);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stage.classList.contains('on')) close(); });
    if (REAL_FACES) blinkLoop();
  }

  /* fade: 表情が変わるとき true(ゆっくり重ねる)。まばたき・口パクは false(一瞬) */
  var FADE_MS = 500;
  /* 目・口の部品を、その顔の目・口の位置に置く */
  var partImgs = {};
  function placeParts(face) {
    var off = PART_FACES[face];
    if (!off) return;
    [['mouth', MOUTH], ['eyes', EYES]].forEach(function (p) {
      var im = partImgs[p[0]], d = off[p[0]];
      if (!im) return;
      im.style.left = (p[1].left + d[0] / 4.8) + '%';
      im.style.top = (p[1].top + d[1] / 4.8) + '%';
    });
  }

  function showFace(k, fade) {
    if (!faceImgs[k]) k = 'normal';
    if (k === shown) return;
    fade = fade && !reduce;
    stage.classList.toggle('snap', !fade);
    var before = shown;
    shown = k;
    if (fade) fadeUntil = Date.now() + FADE_MS;
    Object.keys(faceImgs).forEach(function (n) {
      faceImgs[n].classList.toggle('on', n === k);
      faceImgs[n].classList.toggle('prev', fade && n === before);
    });
  }

  /* まばたき(表情違いの絵が揃ってから) */
  function blinkLoop() {
    setTimeout(function () {
      if (stage.classList.contains('on') && !stage.classList.contains('talking') && PART_FACES[stage.dataset.face] && Date.now() > fadeUntil) {
        stage.classList.add('blinking');
        setTimeout(function () { stage.classList.remove('blinking'); }, 220);
      }
      blinkLoop();
    }, 3000 + Math.random() * 1000);   // 3〜4秒おき(人のまばたきに近い間隔)
  }

  /* 文字を1字ずつ出す。出しているあいだは口パク */
  var typing = 0;
  function say(text, face, choices, after, wait) {
    face = face || 'normal';
    stage.dataset.face = face;
    /* 今と違う表情になるときだけ、ゆっくり変える */
    var changed = REAL_FACES && shown !== face;
    showFace(face, changed);
    choicesEl.innerHTML = '';
    textEl.textContent = '';
    var i = 0, my = ++typing;
    stage.classList.add('talking');
    stage.classList.remove('mouthing', 'blinking');
    /* 部品を重ねられる顔(通常・笑顔・ツン)のとき口を動かす。表情が溶け終わってから(溶けている途中の顔に口だけ浮かないように) */
    placeParts(face);
    var mouthStart = (REAL_FACES && PART_FACES[face]) ? setTimeout(function () {
      if (my === typing && stage.classList.contains('talking')) stage.classList.add('mouthing');
    }, changed ? FADE_MS : 0) : 0;
    function done() {
      clearTimeout(mouthStart); stage.classList.remove('mouthing'); showFace(face);
      stage.classList.remove('talking');
      (choices || []).forEach(function (c) { choicesEl.appendChild(c); });
      if (after) setTimeout(after, wait || 0);
    }
    if (reduce) { textEl.textContent = text; return done(); }
    (function step() {
      if (my !== typing) return clearTimeout(mouthStart);
      textEl.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(step, /[、。…？！]/.test(text[i - 1]) ? 140 : 38);
      else done();
    })();
    /* 押せば最後まで飛ばせる */
    textEl.onclick = function () { if (my === typing && i < text.length) { i = text.length - 1; } };
  }

  function btn(label, fn, cls) {
    var b = el('button', cls || '', label); b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  /* ── 流れ ───────────────────────────────────────────────── */
  function open() {
    if (!stage) buildStage();
    hint.classList.remove('on');
    launch.style.display = 'none';
    stage.classList.add('on'); dim.classList.add('on');
    loadTracks();   // 押されてから読む(ホームを重くしない)
    var prev = store.get('mood'), h = new Date().getHours();
    var prevLabel = null;
    MOODS.forEach(function (m) { if (m.key === prev) prevLabel = m.label; });
    var g = prevLabel ? pick(GREET.again).replace('%s', prevLabel)
          : pick(h >= 5 && h < 10 ? GREET.morning : (h >= 22 || h < 5) ? GREET.night : GREET.day);
    say(g + '\n今、どんな感じ？', prevLabel ? 'smile' : 'normal', MOODS.map(function (m) {
      return btn(m.label, function () { chooseMood(m); });
    }));
  }

  /* 話し終えたあと、せりふを出し直さずに表情だけ変える */
  function settle(face) {
    stage.dataset.face = face;
    placeParts(face);
    showFace(face, true);
  }

  function close() {
    stage.classList.remove('on', 'mouthing'); dim.classList.remove('on');
    launch.style.display = '';
    typing++;
  }

  function chooseMood(m) {
    store.set('mood', m.key);
    if (!m.ask) return recommend(m.next[0], pick(m.line), m.face);
    say(pick(m.line) + '\n' + m.ask, m.face, m.next.map(function (n) {
      return btn(n.label, function () { recommend(n); });
    }));
  }

  function loadTracks() {
    if (tracks) return tracks;
    tracks = fetch(API).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { return (d.items || []).filter(function (t) { return t.audio_url && t.title; }); })
      .catch(function () { tracks = null; return []; });
    return tracks;
  }

  function poolFor(want, list) {
    if (want.any) return list;
    if (want.mei) {
      var mei = list.filter(function (t) { return t.mei === true; });
      return mei.length ? mei : list.filter(function (t) { return t.mode === 'relax'; });
    }
    return list.filter(function (t) { return t.mode === want.mode; });
  }

  function recommend(want, lead, face) {
    var thinking = '……ちょっと待って。';
    say(lead ? lead + '\n' + thinking : thinking, 'think', []);
    Promise.resolve(loadTracks()).then(function (list) {
      var pool = poolFor(want, list).filter(function (t) { return !last || t.id !== last.id; });
      if (!pool.length) {
        return say('……ごめん、今は棚に手が届かないみたい。少ししてから、また来て。', 'tsun',
          [btn('閉じる', close)]);
      }
      cur = pick(pool); last = cur;
      showTrack(want, cur, lead ? null : undefined);
    });
  }

  function gateFor(want, t) {
    if (want.mei) return 'mei';
    if (want.any) return 'all';
    return t.axis === 'do' ? 'do' : 'sei';
  }

  function showTrack(want, t) {
    var card = el('div', 'ang-card');
    var img = el('img'); img.alt = ''; img.loading = 'lazy';
    img.src = t.artwork_url || FACES.normal;
    card.appendChild(img);
    var info = el('div');
    info.appendChild(el('b', null, t.title));
    info.appendChild(el('small', null, 'by ' + (t.artist_name || '') + (MODE_JA[t.mode] ? '  ·  ' + MODE_JA[t.mode] : '')));
    if (t.tagline) info.appendChild(el('i', null, 'この曲は、' + t.tagline + '。'));
    card.appendChild(info);

    var gate = gateFor(want, t);
    var play = el('a', 'main', '▶ 聴く');
    play.href = 'listen.html?track=' + t.id + '&gate=' + gate;
    var again = btn('ほかのを', function () {
      say(pick(AGAIN_LINE), 'tsun', [], function () { recommend(want); }, 500);
    });
    var shelf = el('a', '', want.mei ? '瞑の棚を流す' : want.any ? 'ぜんぶ流す' : 'この棚を流す');
    shelf.href = 'listen.html?gate=' + gate;
    var restart = btn('気分を選び直す', open);
    /* 笑顔で差し出したあと、少し経ったら通常の顔に戻す(ずっと笑顔のままだと不自然) */
    say(pick(PICK_LINE), 'smile', [card, play, again, shelf, restart], function () {
      if (typing === tk && stage.classList.contains('on')) settle('normal');
    }, 3000);
    var tk = typing;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
