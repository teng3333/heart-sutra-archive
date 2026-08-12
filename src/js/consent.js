/**
 * Optional analytics consent + privacy settings.
 * GA4 is never requested before consent. Declining or withdrawing consent
 * disables GA for the current page and removes GA cookies visible to this site.
 */
(function () {
  'use strict';

  var GA_ID = 'G-1MKC72RRJP';
  var KEY = 'ogs-cookie-consent'; // 'granted' | 'denied'
  var initialEventSent = false;

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function saveChoice(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  function dispatchChoice(value) {
    try {
      window.dispatchEvent(new CustomEvent('ogs:consentchange', {
        detail: { analytics: value }
      }));
    } catch (e) {}
  }

  function clearAnalyticsCookies() {
    var names = document.cookie.split(';').map(function (part) {
      return part.split('=')[0].trim();
    }).filter(function (name) {
      return /^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name);
    });
    var host = location.hostname;
    names.forEach(function (name) {
      var expiry = name + '=; Max-Age=0; path=/; SameSite=Lax';
      document.cookie = expiry;
      if (host) {
        document.cookie = expiry + '; domain=' + host;
        document.cookie = expiry + '; domain=.' + host;
      }
    });
  }

  function track(name, params) {
    if (getChoice() !== 'granted' || typeof window.gtag !== 'function') return false;
    var safe = {};
    if (params && typeof params.placement === 'string') {
      safe.placement = params.placement.slice(0, 40);
    }
    window.gtag('event', name, safe);
    return true;
  }
  window.ogsTrack = track;

  function trackInitialPage() {
    if (initialEventSent) return;
    initialEventSent = true;
    var path = location.pathname.replace(/\/+$/, '');
    if (!path || /\/heart-sutra-archive$/.test(path) || /\/index\.html$/.test(path)) {
      track('home_view', { placement: 'page' });
    }
  }

  function loadGA() {
    window['ga-disable-' + GA_ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, {
      anonymize_ip: true,
      transport_type: 'beacon',
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    if (!window.__gaLoaded) {
      window.__gaLoaded = true;
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
      document.head.appendChild(script);
    }
    trackInitialPage();
  }

  function disableGA() {
    window['ga-disable-' + GA_ID] = true;
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }
    clearAnalyticsCookies();
  }

  function injectStyles() {
    if (document.getElementById('ogs-consent-style')) return;
    var css = document.createElement('style');
    css.id = 'ogs-consent-style';
    css.textContent =
      '#cookie-consent{position:fixed;left:50%;bottom:12px;z-index:10000;' +
      'transform:translateX(-50%);width:min(720px,calc(100% - 24px));' +
      'background:rgba(13,18,32,.97);border:1px solid rgba(217,196,154,.24);' +
      'box-shadow:0 8px 34px rgba(0,0,0,.48);backdrop-filter:blur(8px);' +
      'padding:10px 12px;display:grid;grid-template-columns:minmax(0,1fr) auto;' +
      'gap:10px 14px;align-items:center;font-family:ui-sans-serif,-apple-system,' +
      "'Helvetica Neue',sans-serif;color:#8d826d;font-size:11px;line-height:1.45;" +
      'letter-spacing:.02em}' +
      '#cookie-consent p{margin:0;min-width:0}' +
      '#cookie-consent b{color:#d9c49a;font-weight:500}' +
      '#cookie-consent a{color:#6fa8d6}' +
      '#cookie-consent .cc-ja{white-space:nowrap}' +
      '#cookie-consent .cc-btns{display:flex;gap:7px;flex:none}' +
      '#cookie-consent button,#privacy-settings{font:400 9px/1 ui-sans-serif,' +
      "-apple-system,'Helvetica Neue',sans-serif;letter-spacing:.14em;text-transform:uppercase;" +
      'cursor:pointer;border:1px solid rgba(217,196,154,.24);background:rgba(6,9,16,.82);' +
      'color:#d9c49a}' +
      '#cookie-consent button{min-height:34px;padding:8px 11px}' +
      '#cookie-consent button.cc-accept{background:#b23a2e;color:#e9dcba;border-color:#b23a2e}' +
      '#cookie-consent button:hover,#privacy-settings:hover{border-color:#d9c49a}' +
      '#cookie-consent button:focus-visible,#privacy-settings:focus-visible{' +
      'outline:2px solid #d9c49a;outline-offset:2px}' +
      '#privacy-settings{position:fixed;right:12px;bottom:12px;z-index:9996;' +
      'padding:8px 10px;color:#8d826d;backdrop-filter:blur(4px)}' +
      'html.ogs-consent-open #privacy-settings{display:none}' +
      'html.ogs-consent-open .sticky-gate{bottom:84px!important}' +
      '@media(max-width:620px){#cookie-consent{bottom:8px;width:calc(100% - 16px);' +
      'padding:8px 9px;gap:7px 9px;font-size:10px}' +
      '#cookie-consent .cc-ja{display:none}#cookie-consent button{min-height:32px;padding:7px 9px}' +
      '#privacy-settings{left:8px;right:auto;bottom:8px;padding:7px 8px;font-size:8px}' +
      'html.ogs-consent-open #bgm-toggle{bottom:82px!important}' +
      'html.ogs-consent-open #motion-toggle{bottom:118px!important}' +
      'html.ogs-consent-open #art-link{bottom:154px!important}' +
      'html.ogs-consent-open .sticky-gate{bottom:82px!important}}';
    document.head.appendChild(css);
  }

  function updateSettingsLabel() {
    var button = document.getElementById('privacy-settings');
    if (!button) return;
    var on = getChoice() === 'granted';
    button.textContent = 'Privacy · Analytics ' + (on ? 'on' : 'off');
    button.setAttribute('aria-label', 'Privacy settings. Analytics is ' + (on ? 'on' : 'off'));
  }

  function closePanel(returnFocus) {
    var panel = document.getElementById('cookie-consent');
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    document.documentElement.classList.remove('ogs-consent-open');
    updateSettingsLabel();
    if (returnFocus) {
      var settings = document.getElementById('privacy-settings');
      if (settings) settings.focus();
    }
  }

  function choose(value) {
    saveChoice(value);
    if (value === 'granted') loadGA(); else disableGA();
    dispatchChoice(value);
    closePanel(false);
  }

  function showPanel(fromSettings) {
    if (document.getElementById('cookie-consent')) return;
    var choice = getChoice();
    var panel = document.createElement('div');
    panel.id = 'cookie-consent';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Analytics privacy settings');
    panel.innerHTML =
      '<p><b>Optional analytics' + (fromSettings && choice ?
        ' — currently ' + (choice === 'granted' ? 'on' : 'off') : '') +
      '</b> · Helps improve OGS. No ads or cross-site tracking. ' +
      '<span class="cc-ja">任意のアクセス解析です。</span> ' +
      '<a href="privacy.html">Privacy</a></p>' +
      '<span class="cc-btns">' +
      '<button type="button" class="cc-decline">Off 拒否</button>' +
      '<button type="button" class="cc-accept">On 同意</button>' +
      '</span>';
    document.body.appendChild(panel);
    document.documentElement.classList.add('ogs-consent-open');
    panel.querySelector('.cc-accept').addEventListener('click', function () { choose('granted'); });
    panel.querySelector('.cc-decline').addEventListener('click', function () { choose('denied'); });
    panel.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && fromSettings) closePanel(true);
    });
    if (fromSettings) {
      panel.querySelector(choice === 'granted' ? '.cc-decline' : '.cc-accept').focus();
    }
  }

  function buildSettingsButton() {
    if (document.getElementById('privacy-settings')) return;
    var button = document.createElement('button');
    button.id = 'privacy-settings';
    button.type = 'button';
    button.addEventListener('click', function () { showPanel(true); });
    document.body.appendChild(button);
    updateSettingsLabel();
  }

  function installTracking() {
    document.addEventListener('click', function (event) {
      var target = event.target.closest ? event.target.closest('[data-ogs-event]') : null;
      if (!target) return;
      track(target.getAttribute('data-ogs-event'), {
        placement: target.getAttribute('data-ogs-placement') || 'unknown'
      });
    });
  }

  function init() {
    injectStyles();
    buildSettingsButton();
    installTracking();
    var choice = getChoice();
    if (choice === 'granted') loadGA();
    else {
      disableGA();
      if (choice !== 'denied') showPanel(false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
