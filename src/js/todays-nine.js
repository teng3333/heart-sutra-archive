/**
 * 今日のAN三選
 * 公開中の曲から、UTC日付をシードに毎日3曲を選ぶ。
 * 同じ日は世界中どこで見ても同じ3曲。行き先は各曲のページ(t/<id>.html)。
 *
 * 以前はSUNOの84曲をこのファイルに手書きし、suno.com へ送り出していた
 * (2026-07-18取得のプレイリスト)。音源はすべてOGSで預かり、OGSで聴く作りに
 * 移ったので、APIから取るようにした(2026-09-20 高尾さん指示)。
 * 手書きの一覧を持たないので、新しく公開された曲もその日のうちに対象に入る。
 *
 * 一覧の取得とカードの組み立ては ogs-cards.js。先に読み込むこと。
 *
 * なお、いまの3曲はANが選んだものではない(日替わりの巡回)。
 * an_selections に繋ぐまでの暫定である点は変わらない。
 */
(function () {
  'use strict';

  if (!window.OGS || !window.OGS.draw) return;   // ogs-cards.js が無ければ何もしない
  var PICK = 3;                                  // 3列グリッドにちょうど1行で収まる

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
    /* 並びはAPIの返し順に任せない。idで揃えてから混ぜる。
       そうしないと、曲が1つ増えただけで今日の3曲が変わってしまう */
    var idx = items.map(function (t, i) { return i; })
      .sort(function (a, b) { return items[a].id - items[b].id; });
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = idx[i]; idx[i] = idx[j]; idx[j] = tmp;
    }
    return idx.slice(0, PICK).map(function (i) { return items[i]; });
  }

  window.OGS.start(function () {
    window.OGS.draw('nine', 'nine-grid', function (items) {
      return todaysPicks(items).map(function (t) {
        var shelf = [t.axis_label_ja, t.mode_label_ja].filter(Boolean).join(' \u00B7 ');
        return window.OGS.card(t, shelf || 'AN\u2019s Three', 'ans_three');
      });
    });
  });
})();
