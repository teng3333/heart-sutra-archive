/**
 * ホームの曲カード共通部 — 一覧の取得と、カードの組み立て
 *
 * 「今日のAN三選」「新着」「門の曲数」が、どれも同じ一覧(/api/archive)を使う。
 * 245KBあるうえ、このAPIはキャッシュの指定を返さないので、それぞれが取りに
 * 行くと、そのぶん待たされる(実測 1回 約3秒)。ここで1回にまとめる。
 *
 * この台本は、使う側より先に読み込むこと(index.html の並び順)。
 * 読み込まれていない場合に備えて、使う側には逃げ道を用意してある。
 */
(function () {
  'use strict';

  var API = 'https://open-gate-sutra-production.up.railway.app/api/archive';
  var TIMEOUT_MS = 8000;
  var cached = null;

  /* 一覧を一度だけ取りに行く。二度目からは、同じ約束を返す */
  function archive() {
    if (!cached) {
      var ctrl = ('AbortController' in window) ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);
      cached = fetch(API, ctrl ? { signal: ctrl.signal } : undefined)
        .then(function (r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        })
        .then(function (d) {
          return ((d && d.items) || []).filter(function (t) {
            return t && t.id && t.title && t.artist_name;
          });
        });
    }
    return cached;
  }

  // 国コード → 旗。未知の国は旗を出さない(国名の推測はしない)
  function flag(code) {
    if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
    return code.toUpperCase().replace(/./g, function (c) {
      return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65);
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  /* カードの形は二つの節で揃える。並んで出るので、片方だけ形が違うと目につく。
     行き先は曲のページ。同じ家の中なので、新しい窓では開かない */
  function card(t, badge, placement) {
    var c = el('div', 'work');

    if (t.artwork_url) {
      var cover = el('span', 'cover');
      var img = document.createElement('img');
      img.src = t.artwork_url;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      cover.appendChild(img);
      c.appendChild(cover);
    }

    var body = el('div', 'body');
    c.appendChild(body);

    body.appendChild(el('span', 'win', badge));

    var main = el('a', 'work-main');
    main.href = 't/' + t.id + '.html';
    main.setAttribute('data-ogs-event', 'listen_open');
    main.setAttribute('data-ogs-placement', placement);
    var title = el('span', 'title');
    title.appendChild(el('span', 'play', '\u25B6'));
    title.appendChild(document.createTextNode(t.title));
    main.appendChild(title);
    body.appendChild(main);

    // 作者。artist_link があれば功徳ループとして外へ繋ぐ
    var artist = el('span', 'artist');
    artist.appendChild(document.createTextNode('by '));
    if (t.artist_link) {
      var a = el('a', null, t.artist_name);
      a.href = t.artist_link;
      a.target = '_blank';
      a.rel = 'noopener nofollow ugc';
      artist.appendChild(a);
    } else {
      artist.appendChild(el('span', null, t.artist_name));
    }
    var f = flag(t.country);
    if (f) {
      artist.appendChild(document.createTextNode(' '));
      artist.appendChild(el('span', 'flag', f));
    }
    body.appendChild(artist);

    /* 尺はAPIが返さないので出さない。かわりにジャンルを置く */
    var meta = el('span', 'meta');
    [t.genre, t.subgenre].filter(Boolean).slice(0, 2).forEach(function (x) {
      meta.appendChild(el('span', null, x));
    });
    if (meta.children.length) body.appendChild(meta);

    return c;
  }

  /* 描けたら枠を出す。描けなければ枠ごと消す(死んだ枠を見せない) */
  function draw(secId, gridId, pick) {
    var sec = document.getElementById(secId);
    var grid = document.getElementById(gridId);
    if (!grid) return;
    if (!('fetch' in window)) { if (sec) sec.hidden = true; return; }

    archive().then(function (items) {
      if (!items.length) throw new Error('empty');
      pick(items).forEach(function (c) { grid.appendChild(c); });
      if (!grid.children.length) throw new Error('nothing drawn');
      if (sec) sec.hidden = false;
    }).catch(function () {
      grid.innerHTML = '';
      if (sec) sec.hidden = true;
    });
  }

  function start(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  window.OGS = window.OGS || {};
  window.OGS.archive = archive;
  window.OGS.card = card;
  window.OGS.draw = draw;
  window.OGS.start = start;
})();
