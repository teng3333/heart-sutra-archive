/**
 * 新着 — 堂に入ったばかりの投稿(3件)
 * バックエンドの GET /api/latest を読んで描く。ホームで唯一APIを叩く箇所。
 * カバー画像は持たない(他人の投稿の画像を勝手に取りに行かない・軽い)。
 * APIが落ちている / 0件のときは枠ごと隠す(死んだ枠を見せない)。
 */
(function () {
  'use strict';

  var API = 'https://open-gate-sutra-production.up.railway.app/api/latest?limit=3';
  var TIMEOUT_MS = 8000;

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

  function card(item) {
    var c = el('div', 'work');
    var body = el('div', 'body');
    c.appendChild(body);

    body.appendChild(el('span', 'win', 'New 新着'));

    // 曲へ。href はサーバーが返した投稿URLをそのまま使う
    var main = el('a', 'work-main');
    main.href = item.url;
    main.target = '_blank';
    main.rel = 'noopener nofollow ugc';
    var title = el('span', 'title');
    title.appendChild(el('span', 'play', '▶'));
    title.appendChild(document.createTextNode(item.title));
    main.appendChild(title);
    body.appendChild(main);

    // 作者。artist_link があれば功徳ループとしてリンクにする
    var artist = el('span', 'artist');
    artist.appendChild(document.createTextNode('by '));
    if (item.artist_link) {
      var a = el('a', null, item.artist_name);
      a.href = item.artist_link;
      a.target = '_blank';
      a.rel = 'noopener nofollow ugc';
      artist.appendChild(a);
    } else {
      artist.appendChild(el('span', null, item.artist_name));
    }
    var f = flag(item.country);
    if (f) {
      artist.appendChild(document.createTextNode(' '));
      artist.appendChild(el('span', 'flag', f));
    }
    body.appendChild(artist);

    return c;
  }

  function render() {
    var sec = document.getElementById('latest');
    var grid = document.getElementById('latest-grid');
    if (!sec || !grid) return;

    var done = false;
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

    var hide = function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      sec.hidden = true;                 // 出せないときは枠ごと消す
    };

    if (!('fetch' in window)) { hide(); return; }

    fetch(API, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (d) {
        var items = (d && d.items) || [];
        if (!items.length) { hide(); return; }
        done = true;
        clearTimeout(timer);
        items.forEach(function (it) {
          if (it && it.url && it.title && it.artist_name) grid.appendChild(card(it));
        });
        if (!grid.children.length) { done = false; hide(); return; }
        sec.hidden = false;
      })
      .catch(hide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
