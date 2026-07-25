/**
 * Cookie同意 + GA4の遅延読み込み(2026-07-20 監査対応・GDPR)
 *
 * 方針:同意するまで GA4(gtag.js)を一切読み込まない=cookieを設定しない。
 *   - 「同意する」→ GA4読み込み + 選択を記憶(以後バナー非表示)
 *   - 「同意しない」→ 何も読み込まない + 選択を記憶
 *   - 未選択 → 画面下部にバナー表示
 * 必須cookieは無い(認証等でcookieを使っていない)ため、拒否=cookieゼロ。
 */
(function () {
  'use strict';

  var GA_ID = 'G-1MKC72RRJP';
  var KEY = 'ogs-cookie-consent'; // 'granted' | 'denied'

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function saveChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function loadGA() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
  }

  function showBanner() {
    if (document.getElementById('cookie-consent')) return;

    var css = document.createElement('style');
    css.textContent =
      '#cookie-consent{position:fixed;left:0;right:0;bottom:0;z-index:9998;' +
      'background:rgba(13,18,32,.96);border-top:1px solid rgba(217,196,154,.16);' +
      'padding:16px 20px;display:flex;gap:16px 24px;align-items:center;' +
      'justify-content:center;flex-wrap:wrap;' +
      "font-family:ui-sans-serif,-apple-system,'Helvetica Neue',sans-serif;" +
      'color:#8d826d;font-size:12px;line-height:1.8;letter-spacing:.02em}' +
      '#cookie-consent p{max-width:52em;margin:0}' +
      '#cookie-consent b{color:#d9c49a;font-weight:400}' +
      '#cookie-consent .cc-btns{display:flex;gap:10px;flex:none}' +
      '#cookie-consent button{font:inherit;letter-spacing:.16em;text-transform:uppercase;' +
      'font-size:10px;padding:9px 16px;cursor:pointer;border:1px solid rgba(217,196,154,.16);' +
      'background:none;color:#d9c49a}' +
      '#cookie-consent button.cc-accept{background:#b23a2e;color:#e9dcba;border-color:#b23a2e}' +
      '#cookie-consent button:hover{border-color:#d9c49a}' +
      '#cookie-consent button:focus-visible{outline:2px solid #d9c49a;outline-offset:2px}';
    document.head.appendChild(css);

    var bar = document.createElement('div');
    bar.id = 'cookie-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML =
      '<p><b>We use analytics cookies</b> (Google Analytics) to understand how the ' +
      'site is used. No account, no ads, no tracking across other sites. ' +
      'You can decline and still use everything. ' +
      '<a href="privacy.html" style="color:#6fa8d6">Privacy</a><br>' +
      'サイト改善のためGoogle Analyticsのcookieを使います。拒否しても全機能そのまま使えます。' +
      '<a href="privacy.html" style="color:#6fa8d6">プライバシー</a></p>' +
      '<span class="cc-btns">' +
      '<button type="button" class="cc-decline">Decline 拒否</button>' +
      '<button type="button" class="cc-accept">Accept 同意</button>' +
      '</span>';
    document.body.appendChild(bar);

    function close() { bar.parentNode && bar.parentNode.removeChild(bar); }
    bar.querySelector('.cc-accept').addEventListener('click', function () {
      saveChoice('granted'); close(); loadGA();
    });
    bar.querySelector('.cc-decline').addEventListener('click', function () {
      saveChoice('denied'); close();
    });
  }

  var choice = getChoice();
  if (choice === 'granted') {
    loadGA();
  } else if (choice !== 'denied') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
