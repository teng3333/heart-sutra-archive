/* 聴いた人の反応(2026-10-10 高尾さん)
 * 「この曲で、心はほどけましたか？」を一押しで返し、任意で一言と名前を添える。
 * 送り先は OGS の /api/reaction。IP は送らない(サーバーも持たない)。国の目安に時間帯と言語だけを送る。
 * 引用してよいかは本人の印で分ける。同じ曲には、この端末から一度だけ送れる。
 *
 * 使い方:
 *   var w = OGSReaction.mount(要素, { page: 'player' });  w.setTrack(173);   // 曲を決めて出す
 *   OGSReaction.mount(要素, { page: 'result', choices: [[173, '空にほどける — djhugu'], ...] });  // 選ばせる
 *
 * 広告や投稿のリンクに付けた utm_source / utm_campaign は、最初に開いた頁で覚えておき、
 * 同じタブの中で頁を移っても一緒に送る(どこから来た人の反応かを数えるため)。
 * この台本は defer を付けずに head で読む。プレイヤーは再生が始まると住所を書き換えるので、その前に覚える。
 */
(function () {
  'use strict';
  var API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:5001' : 'https://open-gate-sutra-production.up.railway.app';

  try {
    var q = new URLSearchParams(location.search), src = q.get('utm_source');
    if (src) {
      var camp = q.get('utm_campaign');
      sessionStorage.setItem('ogs_ref', (src + (camp ? ':' + camp : '')).slice(0, 120));
    }
  } catch (e) {}
  function ref() { try { return sessionStorage.getItem('ogs_ref') || null; } catch (e) { return null; } }
  function sent(id) { try { return localStorage.getItem('ogs_reacted_' + id) === '1'; } catch (e) { return false; } }
  function markSent(id) { try { localStorage.setItem('ogs_reacted_' + id, '1'); } catch (e) {} }

  var CSS = '' +
    '.ogs-react{margin:14px 0 0;pointer-events:auto;font-family:inherit}' +
    '.ogs-react-open{font:inherit;font-size:13px;letter-spacing:.04em;padding:8px 14px;cursor:pointer;' +
      'color:#f5ecd8;background:rgba(178,58,46,.88);border:1px solid #b23a2e;border-radius:2px}' +
    '.ogs-react-open small{margin-left:8px;opacity:.85;font-size:12px}' +
    '.ogs-react-open:hover,.ogs-react-open:focus-visible{background:#c4473a}' +
    '.ogs-react-open[disabled]{background:rgba(13,18,32,.7);border-color:rgba(217,196,154,.35);color:#e9dcba;cursor:default}' +
    '.ogs-react-panel{margin-top:10px;padding:14px 16px;max-width:30rem;max-height:52vh;overflow:auto;background:rgba(8,11,20,.94);' +
      'border:1px solid rgba(217,196,154,.28);color:#e9dcba;font-size:13px;line-height:1.7}' +
    '.ogs-react-panel[hidden]{display:none}' +
    '.ogs-react-panel .q{margin:0 0 10px;font-size:14px}' +
    '.ogs-react-panel .q span,.ogs-react-panel .j{display:block;font-size:12px;opacity:.8}' +
    '.ogs-react-panel select,.ogs-react-panel textarea,.ogs-react-panel input[type=text]{width:100%;box-sizing:border-box;' +
      'margin:0 0 8px;padding:7px 9px;font:inherit;font-size:13px;color:#e9dcba;background:#05070d;' +
      'border:1px solid rgba(217,196,154,.25);border-radius:2px}' +
    '.ogs-react-panel textarea{min-height:3.6em;resize:vertical}' +
    '.ogs-react-panel label{display:flex;gap:8px;align-items:flex-start;margin:0 0 10px;font-size:12px;opacity:.9}' +
    '.ogs-react-panel label input{margin-top:3px}' +
    '.ogs-react-feel{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 8px}' +
    '.ogs-react-feel button{font:inherit;font-size:13px;padding:8px 12px;cursor:pointer;color:#e9dcba;' +
      'background:rgba(13,18,32,.8);border:1px solid rgba(217,196,154,.35);border-radius:2px}' +
    '.ogs-react-feel button.main{background:#b23a2e;border-color:#b23a2e;color:#f5ecd8}' +
    '.ogs-react-feel button:hover,.ogs-react-feel button:focus-visible{border-color:#e9dcba}' +
    '.ogs-react-feel button[disabled]{opacity:.5;cursor:wait}' +
    '.ogs-react-panel .note{margin:6px 0 0;font-size:11px;opacity:.6}' +
    '.ogs-react-panel .msg{margin:8px 0 0;font-size:13px}' +
    '.ogs-react-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}';
  function style() {
    if (document.getElementById('ogs-react-style')) return;
    var s = document.createElement('style'); s.id = 'ogs-react-style'; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var ERR = {
    invalid_track: 'This track can’t take reactions. ／ この曲には送れません。',
    no_links: 'Links can’t be included. ／ リンクは入れられません。',
    comment_too_long: 'Please keep it under 600 characters. ／ 600文字までにしてください。'
  };

  function mount(box, opts) {
    opts = opts || {};
    style();
    var track = null;
    var root = el('div', 'ogs-react');
    var open = el('button', 'ogs-react-open');
    open.type = 'button';
    var panel = el('div', 'ogs-react-panel'); panel.hidden = true;
    var q = el('p', 'q', 'Did this music loosen your heart?');
    q.appendChild(el('span', null, 'この曲で、心はほどけましたか？'));
    panel.appendChild(q);
    var sel = null;
    if (opts.choices) {
      sel = el('select'); sel.setAttribute('aria-label', 'Track ／ 曲');
      var o0 = el('option', null, 'Choose a track ／ 曲を選ぶ'); o0.value = ''; sel.appendChild(o0);
      opts.choices.forEach(function (c) { var o = el('option', null, c[1]); o.value = String(c[0]); sel.appendChild(o); });
      sel.addEventListener('change', function () { setTrack(sel.value ? Number(sel.value) : null, true); });
      panel.appendChild(sel);
    }
    var ta = el('textarea'); ta.maxLength = 600;
    ta.placeholder = 'A word, if you like (optional) ／ ひとこと(任意)';
    var nm = el('input'); nm.type = 'text'; nm.maxLength = 60;
    nm.placeholder = 'Your name (optional) ／ お名前(任意)';
    var lab = el('label'); var cb = el('input'); cb.type = 'checkbox';
    lab.appendChild(cb);
    lab.appendChild(el('span', null, 'You may quote my words with this name on Open Gate Sutra and social media. ／ この名前と言葉を、OGSとSNSで紹介してよい。'));
    var hp = el('input', 'ogs-react-hp'); hp.type = 'text'; hp.name = 'website'; hp.tabIndex = -1;
    hp.autocomplete = 'off'; hp.setAttribute('aria-hidden', 'true');
    panel.appendChild(ta); panel.appendChild(nm); panel.appendChild(lab); panel.appendChild(hp);
    var feel = el('div', 'ogs-react-feel');
    var buttons = [['loosened', 'Yes, it loosened ／ ほどけた', true], ['a_little', 'A little ／ 少し'], ['not_really', 'Not really ／ あまり']]
      .map(function (f) {
        var b = el('button', f[2] ? 'main' : null, f[1]); b.type = 'button';
        b.addEventListener('click', function () { send(f[0]); });
        feel.appendChild(b); return b;
      });
    panel.appendChild(feel);
    var msg = el('p', 'msg'); msg.setAttribute('role', 'status');
    panel.appendChild(msg);
    panel.appendChild(el('p', 'note', 'No account needed. We don’t collect your IP address — only your time zone and language, to see roughly where listeners are. ／ アカウント不要。IPアドレスは集めません。どの辺りで聴かれているかを知るため、時間帯と言語の設定だけを送ります。'));
    root.appendChild(open); root.appendChild(panel);
    box.appendChild(root);
    open.addEventListener('click', function () { panel.hidden = !panel.hidden; });

    function refresh() {
      var done = track && sent(track);
      open.textContent = '';
      open.appendChild(document.createTextNode(done ? '♥ Thank you' : '♡ Did it loosen you?'));
      open.appendChild(el('small', null, done ? '届きました' : '心はほどけた？'));
      open.disabled = !!done && !opts.choices;
      buttons.forEach(function (b) { b.disabled = !track || !!done; });
      if (done) { msg.textContent = 'Thank you — it reached us. ／ ありがとうございます。届きました。'; }
      else if (msg.dataset.keep !== '1') { msg.textContent = ''; }
    }
    function setTrack(id, keepOpen) {
      track = id || null;
      if (!keepOpen) panel.hidden = true;
      msg.dataset.keep = '';
      refresh();
    }
    function send(feeling) {
      if (!track || sent(track)) return;
      buttons.forEach(function (b) { b.disabled = true; });
      msg.textContent = 'Sending… ／ 送っています…';
      var tz = null, lang = null;
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) {}
      try { lang = navigator.language || null; } catch (e) {}
      var body = { submission_id: track, feeling: feeling, comment: ta.value.trim() || null,
                   name: nm.value.trim() || null, quote_ok: cb.checked, tz: tz, lang: lang,
                   page: opts.page || null, ref: ref(), website: hp.value };
      fetch(API + '/api/reaction', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (x) {
          if (!x.ok) throw x.j || {};
          markSent(track); ta.value = ''; nm.value = ''; cb.checked = false;
          refresh();
          // プレイヤーでは、送り終えたら閉じる(携帯で下の操作ボタンに重ならないように)
          if (!opts.choices) setTimeout(function () { panel.hidden = true; }, 1600);
        })
        .catch(function (j) {
          msg.dataset.keep = '1';
          msg.textContent = (j && ERR[j.error]) || 'Couldn’t send. Please try again later. ／ 送れませんでした。時間をおいてもう一度どうぞ。';
          buttons.forEach(function (b) { b.disabled = false; });
        });
    }
    refresh();
    return { setTrack: setTrack, root: root };
  }

  window.OGSReaction = { mount: mount };
})();
