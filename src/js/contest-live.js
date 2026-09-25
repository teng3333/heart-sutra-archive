/**
 * コンテストの「いま」— 応募数・締切までの残り・応募作品の展示室(2026-09-25)
 *
 * 期間中に見せるのは熱だけで、順位や点数は出さない(高尾さん決定 2026-09-25)。
 *   点数を出すと、最後に人が選ぶときにその数字へ引っぱられ、
 *   後から応募する人は「もう勝てない」と感じ、3作品まで出せるので試し打ちもできてしまう。
 *
 * 使い回し:
 *   回ごとの設定は contests/<slug>.json に置く。頁には
 *     <section id="contest-live" data-contest="2026-09" hidden>…</section>
 *   を置き、この台本を読むだけ。次の回は JSON を1つ足して data-contest を変える。
 *
 * 応募作品の数え方:
 *   /api/archive(公開中の曲)のうち、submitted_at が open_at〜close_at に入るもの。
 *   投稿から公開までは自動処理で数分〜数時間かかるので、数えられるのは「公開済みの応募作」。
 *   頁の文言もそのとおりに書いてある。exclude_ids に入れた曲は数えない(失格・主催者の曲など)。
 *
 * 投稿データは textContent でしか書かない(innerHTML 禁止。ECOSYSTEM_HANDOFF §10-4)。
 */
(function () {
  'use strict';

  var API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5001'
    : 'https://open-gate-sutra-production.up.railway.app';
  // /api/archive は遅い(実測 12.7〜25.6秒)。ogs-cards.js と同じく30秒まで待つ
  var TIMEOUT_MS = 30000;

  var sec = document.getElementById('contest-live');
  if (!sec || !('fetch' in window)) return;
  var slug = sec.getAttribute('data-contest');
  if (!/^[0-9A-Za-z_-]+$/.test(slug || '')) return;

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function timed(url) {
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
    return fetch(url, ctrl ? { signal: ctrl.signal } : undefined).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    });
  }

  /* ── 締切までの残り ── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function tick(cfg) {
    var close = Date.parse(cfg.close_at);
    var open = Date.parse(cfg.open_at);
    var box = $('cl-clock');
    var label = $('cl-clock-label');
    if (!box || isNaN(close)) return;

    function draw() {
      var now = Date.now();
      if (now < open) {
        label.textContent = 'Opens soon ／ 受付開始前';
        box.textContent = '';
        return true;
      }
      var left = close - now;
      if (left <= 0) {
        label.textContent = 'Entries closed ／ 受付は終了しました';
        box.textContent = 'Judging ／ 審査中';
        sec.classList.add('closed');
        return false;
      }
      var s = Math.floor(left / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor(s % 86400 / 3600);
      var m = Math.floor(s % 3600 / 60);
      label.textContent = 'Until entries close ／ 締切まで';
      box.textContent = d + 'd ' + pad(h) + ':' + pad(m) + ':' + pad(s % 60);
      box.setAttribute('aria-label', '締切まで ' + d + '日 ' + h + '時間 ' + m + '分');
      return true;
    }
    if (draw()) {
      var t = setInterval(function () { if (!draw()) clearInterval(t); }, 1000);
    }
  }

  /* ── 展示室の1枚。順位を匂わせないよう、札も点数も付けない ── */
  function card(t) {
    var a = el('a', 'cl-card');
    a.href = 't/' + t.id + '.html';
    a.setAttribute('data-ogs-event', 'listen_open');
    a.setAttribute('data-ogs-placement', 'contest_entries');

    var cover = el('span', 'cl-cover');
    if (t.artwork_url) {
      var img = document.createElement('img');
      img.src = t.artwork_url;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      cover.appendChild(img);
    } else {
      cover.classList.add('empty');
      cover.appendChild(el('span', null, '開'));
    }
    a.appendChild(cover);
    a.appendChild(el('span', 'cl-title', t.title));
    a.appendChild(el('span', 'cl-artist', 'by ' + t.artist_name));
    return a;
  }

  function entriesOf(items, cfg) {
    var open = Date.parse(cfg.open_at);
    var close = Date.parse(cfg.close_at);
    var skip = {};
    (cfg.exclude_ids || []).forEach(function (id) { skip[id] = true; });
    return items.filter(function (t) {
      if (!t || !t.id || !t.title || !t.artist_name || skip[t.id]) return false;
      var at = Date.parse(t.submitted_at);
      return !isNaN(at) && at >= open && at <= close;
    });
  }

  timed('contests/' + slug + '.json').then(function (cfg) {
    sec.hidden = false;
    tick(cfg);
    return timed(API_BASE + '/api/archive').then(function (d) {
      var list = entriesOf((d && d.items) || [], cfg);
      $('cl-count').textContent = String(list.length);
      var grid = $('cl-grid');
      // 新しい順(APIの並びのまま)。並び順に意味を持たせないことは頁に書いてある
      list.forEach(function (t) { grid.appendChild(card(t)); });
      $('cl-empty').hidden = list.length > 0;
    });
  }).catch(function () {
    // 設定が読めなければ枠ごと隠す。一覧だけ読めなければ、数と展示室だけ隠す
    if (sec.hidden) return;
    var c = $('cl-count-box');
    if (c) c.hidden = true;
    var g = $('cl-gallery');
    if (g) g.hidden = true;
  });
})();
