/**
 * 落ちる現象の記録(調査用・一時的)
 *
 * ページが生きている間、数秒ごとに「まだ居る」という印を localStorage に書く。
 * 正常に離脱したときは clean=true を立てる。次に開いたとき、前回の印が
 * clean=false のまま残っていたら = タブが破棄された(落ちた)と判断して1件記録する。
 *
 * 記録は端末内の localStorage だけに置き、どこにも送信しない。
 * 確認は ?diag=1 を付けて開くと画面下に一覧が出る。?diag=clear で消去。
 *
 * 原因が特定できたら、このファイルごと削除する。
 */
(function () {
  'use strict';

  var LIVE = 'ogs-diag-live';     // 現在のセッション
  var LOG  = 'ogs-diag-log';      // 落ちた記録(最大10件)
  var BEAT_MS = 3000;
  var MAX = 10;

  function read(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function pref(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  // ── 前回の離脱が正常でなければ「落ちた」として記録する ──
  var prev = read(LIVE, null);
  if (prev && !prev.clean) {
    var log = read(LOG, []);
    log.unshift({
      page: prev.page,
      survivedSec: Math.round(((prev.lastBeat || prev.t0) - prev.t0) / 1000),
      beats: prev.beats || 0,
      sound: prev.sound,
      motion: prev.motion,
      scrollY: prev.scrollY,
      hidCount: prev.hidCount || 0,      // 裏に回った回数
      // 死んだのが「使用中」か「裏に回っている間」かで原因が変わる。
      // 前面=描画/CPU負荷、裏=iOSが背面タブのメモリを回収した、と読み分ける
      diedHidden: !!prev.hidden,
      at: new Date(prev.lastBeat || prev.t0).toISOString().slice(0, 19).replace('T', ' ')
    });
    write(LOG, log.slice(0, MAX));
  }

  // ── 今回のセッションを開始 ──
  var now = Date.now();
  var live = {
    page: location.pathname.split('/').pop() || 'index.html',
    t0: now, lastBeat: now, beats: 0, clean: false,
    sound: pref('ogs-bgm') !== 'off',
    motion: pref('ogs-motion') !== 'off',
    scrollY: 0, hidCount: 0, hidden: false,
    dpr: window.devicePixelRatio || 1,
    screen: (screen.width || 0) + 'x' + (screen.height || 0)
  };
  write(LIVE, live);

  setInterval(function () {
    live.lastBeat = Date.now();
    live.beats++;
    live.scrollY = Math.round(window.scrollY || 0);
    live.sound = pref('ogs-bgm') !== 'off';
    live.motion = pref('ogs-motion') !== 'off';
    write(LIVE, live);
  }, BEAT_MS);

  document.addEventListener('visibilitychange', function () {
    live.hidden = document.hidden;
    if (document.hidden) live.hidCount++;
    write(LIVE, live);          // 裏に回った瞬間の状態を残す(この後死ぬことがある)
  });

  // 正常な離脱に印をつける(これが無いまま次回を迎えたら=落ちた)
  ['pagehide', 'beforeunload'].forEach(function (ev) {
    addEventListener(ev, function () { live.clean = true; write(LIVE, live); });
  });

  // ── ?diag=1 で結果を見る ──
  var q = location.search;
  if (q.indexOf('diag=clear') >= 0) {
    try { localStorage.removeItem(LOG); localStorage.removeItem(LIVE); } catch (e) {}
  }
  if (q.indexOf('diag=1') < 0) return;

  addEventListener('DOMContentLoaded', function () {
    var log = read(LOG, []);
    var box = document.createElement('div');
    box.setAttribute('style',
      'position:fixed;left:0;right:0;bottom:0;z-index:99999;max-height:62vh;overflow:auto;' +
      'background:rgba(6,9,16,.96);color:#d9c49a;font:12px/1.7 ui-monospace,monospace;' +
      'padding:14px 16px;border-top:1px solid rgba(217,196,154,.3)');
    var html = '<b>落ちた記録 ' + log.length + '件</b>' +
      ' — 端末: ' + live.screen + ' / DPR' + live.dpr +
      '<br>' + navigator.userAgent + '<br><br>';
    if (!log.length) {
      html += '記録なし。しばらく使ってから、落ちた後にもう一度この画面を開いてください。';
    } else {
      log.forEach(function (r, i) {
        html += (i + 1) + '. ' + r.page + ' / <b>' + r.survivedSec + '秒</b>もった' +
          ' / 音' + (r.sound ? 'ON' : 'OFF') +
          ' / 動き' + (r.motion ? 'ON' : 'OFF') +
          ' / <b>' + (r.diedHidden ? '裏で死亡' : '使用中に死亡') + '</b>' +
          ' / 裏に回った回数' + r.hidCount +
          ' / スクロール' + r.scrollY + 'px' +
          ' / ' + r.at + '<br>';
      });
    }
    html += '<br><a href="?diag=clear" style="color:#6fa8d6">記録を消す</a>';
    box.innerHTML = html;
    document.body.appendChild(box);
  });
})();
