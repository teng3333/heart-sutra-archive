/**
 * ANの案内役 — 今の気分を聞いて、般若心経を1曲すすめる(試作 2026-10-04)
 *
 * 方針(高尾さんと決めたこと):
 *   - APIは使わない。曲の分析ですでに付いている棚(整える・ほどく・動く・ひらく)と瞑で選ぶ。費用0円
 *   - チャット欄に打つのではなく、ANが話しかけ、選択肢を押して答える(ノベルゲームの会話の見せ方)
 *   - 軽くする。最初は右下の小さな顔だけ。押されてから曲の一覧を読む
 *
 * 表情(FACES)は、今は同じ顔の絵1枚を使い、CSSの小さな動きで代わりにしている。
 * 表情違いの絵(背景透明・同じ構図)が届いたら、FACES の住所を差し替えるだけでよい。
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
    normal: 'assets/an/face-human.webp',
    blink:  'assets/an/face-human.webp',
    talk:   'assets/an/face-human.webp',
    smile:  'assets/an/face-human.webp',
    tsun:   'assets/an/face-human.webp',
    think:  'assets/an/face-human.webp'
  };
  var REAL_FACES = false;   // 表情違いの絵が揃ったら true(まばたき・口パクを絵で行う)

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
    '.ang-launch{position:fixed;right:16px;bottom:16px;z-index:9990;width:64px;height:64px;border-radius:50%;',
    ' padding:0;border:1px solid rgba(217,196,154,.45);background:#05070c;cursor:pointer;overflow:hidden;',
    ' box-shadow:0 6px 24px rgba(0,0,0,.6);animation:ang-breath 4.2s ease-in-out infinite}',
    '.ang-launch img{width:100%;height:100%;object-fit:cover;object-position:50% 26%;display:block}',
    '.ang-launch:focus-visible{outline:2px solid #9ec9dd;outline-offset:3px}',
    '.ang-hint{position:fixed;right:88px;bottom:30px;z-index:9990;max-width:200px;padding:8px 12px;',
    ' background:rgba(10,13,22,.92);border:1px solid rgba(217,196,154,.3);color:#e9dcba;font-size:13px;',
    ' line-height:1.5;border-radius:12px 12px 2px 12px;opacity:0;transform:translateY(6px);',
    ' transition:opacity .4s,transform .4s;pointer-events:none}',
    '.ang-hint.on{opacity:1;transform:none}',
    '.ang-stage{position:fixed;inset:auto 0 0 auto;z-index:9991;width:min(440px,100vw);height:min(640px,86vh);',
    ' pointer-events:none;opacity:0;transform:translateY(24px);transition:opacity .35s,transform .35s}',
    '.ang-stage.on{opacity:1;transform:none;pointer-events:auto}',
    '.ang-char{position:absolute;right:-10px;bottom:0;height:78%;aspect-ratio:528/880;',
    ' -webkit-mask-image:linear-gradient(to bottom,#000 70%,transparent 98%);mask-image:linear-gradient(to bottom,#000 70%,transparent 98%)}',
    '.ang-char img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform-origin:50% 90%;',
    ' transition:filter .3s,transform .3s}',
    '.ang-char .breath{position:absolute;inset:0;animation:ang-breath 4.2s ease-in-out infinite;transform-origin:50% 100%}',
    /* 仮の絵(黒い背景つき)のあいだだけ、縁を闇に溶かして四角を見せない。透過の絵が届けば外れる */
    '.ang-stage.ph .ang-char{-webkit-mask-image:radial-gradient(ellipse 52% 48% at 50% 38%,#000 55%,transparent 100%);',
    ' mask-image:radial-gradient(ellipse 52% 48% at 50% 38%,#000 55%,transparent 100%)}',
    /* 表情の代わり(絵1枚のあいだだけ使う) */
    '.ang-stage[data-face=smile] .ang-char img{filter:brightness(1.08) saturate(1.1)}',
    '.ang-stage[data-face=tsun] .ang-char img{transform:rotate(-2.5deg) translateX(-4px)}',
    '.ang-stage[data-face=think] .ang-char img{transform:rotate(2deg) translateY(2px);filter:brightness(.92)}',
    '.ang-stage.talking .ang-char img{animation:ang-talk .24s steps(2) infinite}',
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
    '@keyframes ang-talk{0%{translate:0 0}100%{translate:0 -1.5px}}',
    '@media (max-width:560px){.ang-stage{width:100vw;height:72vh}.ang-char{height:66%;right:-24px}}',
    '@media (prefers-reduced-motion:reduce){.ang-launch,.ang-char .breath{animation:none}',
    ' .ang-stage.talking .ang-char img{animation:none}}'
  ].join('\n');

  /* ── 組み立て ───────────────────────────────────────────── */
  var stage, charImg, textEl, choicesEl, launch, hint, tracks = null, last = null, cur = null;

  function build() {
    var st = el('style'); st.textContent = CSS; document.head.appendChild(st);

    launch = el('button', 'ang-launch');
    launch.type = 'button';
    launch.setAttribute('aria-label', 'ANに今の気分を話す');
    var li = el('img'); li.src = FACES.normal; li.alt = ''; li.loading = 'lazy';
    launch.appendChild(li);
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
    stage = el('div', 'ang-stage' + (REAL_FACES ? '' : ' ph'));
    stage.setAttribute('role', 'dialog');
    stage.setAttribute('aria-label', 'ANとの会話');
    var ch = el('div', 'ang-char'), br = el('div', 'breath');
    charImg = el('img'); charImg.alt = ''; charImg.src = FACES.normal;
    br.appendChild(charImg); ch.appendChild(br); stage.appendChild(ch);
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

  /* まばたき(表情違いの絵が揃ってから) */
  function blinkLoop() {
    setTimeout(function () {
      if (stage.classList.contains('on') && !stage.classList.contains('talking')) {
        var keep = charImg.src; charImg.src = FACES.blink;
        setTimeout(function () { charImg.src = keep; }, 130);
      }
      blinkLoop();
    }, 2500 + Math.random() * 3500);
  }

  /* 文字を1字ずつ出す。出しているあいだは口パク */
  var typing = 0;
  function say(text, face, choices, after, wait) {
    face = face || 'normal';
    stage.dataset.face = face;
    var base = FACES[face] || FACES.normal;
    charImg.src = base;
    choicesEl.innerHTML = '';
    textEl.textContent = '';
    var i = 0, my = ++typing;
    stage.classList.add('talking');
    var mouth = REAL_FACES ? setInterval(function () {
      charImg.src = (charImg.src.indexOf(FACES.talk) >= 0) ? base : FACES.talk;
    }, 120) : 0;
    function done() {
      clearInterval(mouth); charImg.src = base;
      stage.classList.remove('talking');
      (choices || []).forEach(function (c) { choicesEl.appendChild(c); });
      if (after) setTimeout(after, wait || 0);
    }
    if (reduce) { textEl.textContent = text; return done(); }
    (function step() {
      if (my !== typing) return clearInterval(mouth);
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
    stage.classList.add('on');
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

  function close() {
    stage.classList.remove('on');
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
    say(pick(PICK_LINE), 'smile', [card, play, again, shelf, restart]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
