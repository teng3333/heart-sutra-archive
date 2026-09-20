/**
 * 今日のAN三選
 * OGSの公開API(/api/archive)から、UTC日付をシードに毎日3曲を選ぶ。
 * 同じ日は世界中どこで見ても同じ3曲。
 *
 * 以前はSUNOの84曲をこのファイルに手書きし、suno.com へ送り出していた
 * (2026-07-18取得のプレイリスト)。音源はすべてOGSで預かり、OGSで聴く作りに
 * 移ったので、APIから取って各曲のページ(t/<id>.html)へ送るようにした
 * (2026-09-20 高尾さん指示)。手書きの一覧を持たないので、新しく公開された曲も
 * その日のうちに三選の対象に入る。
 *
 * なお、いまの3曲はANが選んだものではない(日替わりの巡回)。
 * an_selections に繋ぐまでの暫定である点は変わらない。
 */
(function () {
  'use strict';

  var API = 'https://open-gate-sutra-production.up.railway.app/api/archive';
  var TIMEOUT_MS = 8000;
  var PICK = 3;                 // 3列グリッドにちょうど1行で収まる

  // 国コード → 旗。未知の国は旗を出さない(国名の推測はしない)
  function flag(code) {
    if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
    return code.toUpperCase().replace(/./g, function (c) {
      return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65);
    });
  }

  // 日付シード付き乱数(mulberry32)。同じ日 = 同じ列
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function todaysPicks(items) {
    var now = new Date();
    var seed = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
    var rand = mulberry32(seed);
    /* 並びはAPIの返し順に依存させない。idで揃えてから混ぜる。
       そうしないと、曲が1つ増えただけで今日の3曲が変わってしまう */
    var idx = items.map(function (t, i) { return i; })
      .sort(function (a, b) { return items[a].id - items[b].id; });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
    }
    return idx.slice(0, PICK).map(function (i) { return items[i]; });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function card(t) {
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

    var shelf = [t.axis_label_ja, t.mode_label_ja].filter(Boolean).join(' · ');
    body.appendChild(el('span', 'win', shelf || 'AN’s Three'));

    /* 曲のページへ。同じ家の中なので、新しい窓では開かない */
    var main = el('a', 'work-main');
    main.href = 't/' + t.id + '.html';
    main.setAttribute('data-ogs-event', 'listen_open');
    main.setAttribute('data-ogs-placement', 'ans_three');
    var title = el('span', 'title');
    title.appendChild(el('span', 'play', '▶'));
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

    /* 尺はAPIが返さないので出さない。かわりにジャンルを置く。
       出どころの「SUNO」も、いまはOGSで聴くので出さない */
    var meta = el('span', 'meta');
    [t.genre, t.subgenre].filter(Boolean).slice(0, 2).forEach(function (x) {
      meta.appendChild(el('span', null, x));
    });
    if (meta.children.length) body.appendChild(meta);

    return c;
  }

  function render() {
    var sec = document.getElementById('nine');
    var grid = document.getElementById('nine-grid');
    if (!grid) return;

    var done = false;
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

    // 出せないときは枠ごと消す(死んだ枠を見せない。latest.js と同じ作法)
    var hide = function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (sec) sec.hidden = true;
    };

    if (!('fetch' in window)) { hide(); return; }

    fetch(API, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) {
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      })
      .then(function (d) {
        var items = ((d && d.items) || []).filter(function (t) {
          return t && t.id && t.title && t.artist_name;
        });
        if (!items.length) { hide(); return; }
        done = true;
        clearTimeout(timer);
        todaysPicks(items).forEach(function (t) { grid.appendChild(card(t)); });
        if (!grid.children.length) { done = false; hide(); return; }
        if (sec) sec.hidden = false;
      })
      .catch(hide);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
