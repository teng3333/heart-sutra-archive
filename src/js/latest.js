/**
 * 新着 — 堂に入ったばかりの3曲
 * 公開された順に新しい3曲を出す。行き先は各曲のページ(t/<id>.html)。
 *
 * 以前は GET /api/latest を読み、投稿に添えられた出どころのURL(suno.com)へ
 * 送り出していた。音源はすべてOGSで預かり、OGSで聴く作りに移ったので、
 * 曲のページへ送るようにした(2026-09-20 高尾さん指示)。
 *
 * /api/latest ではなく /api/archive を読むのには理由がある。
 * /api/latest は「床を通った投稿」を返すので、まだ曲評が付かず公開に
 * 至っていないものが混ざる(2026-09-20 時点で #117・#118)。そこへ
 * リンクすると t/<id>.html が無く、404になる。
 * /api/archive は公開済みだけを返すので、リンクが必ず生きる。
 *
 * 一覧の取得とカードの組み立ては ogs-cards.js。先に読み込むこと。
 * APIが落ちている / 0件のときは枠ごと隠す(死んだ枠を見せない)。
 */
(function () {
  'use strict';

  if (!window.OGS || !window.OGS.draw) return;   // ogs-cards.js が無ければ何もしない
  var PICK = 3;

  window.OGS.start(function () {
    window.OGS.draw('latest', 'latest-grid', function (items) {
      /* 公開された順(新しい順)。submitted_at はISO文字列なので、
         そのまま比べれば時刻順に並ぶ */
      return items.slice()
        .sort(function (a, b) {
          return String(b.submitted_at || '').localeCompare(String(a.submitted_at || ''));
        })
        .slice(0, PICK)
        .map(function (t) { return window.OGS.card(t, 'New \u65B0\u7740', 'latest'); });
    });
  });
})();
