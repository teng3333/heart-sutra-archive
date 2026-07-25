/* OGS — 訪問ごとにランダムなBGM(般若心経リミックス)
 *
 * 方針:
 *  ・訪問のたびに1曲をランダムに選ぶ(毎回ちがう出会い)
 *  ・ブラウザは音つきの自動再生を禁じているため、最初の操作(クリック/スクロール/
 *    キー/タッチ)を合図に、静かにフェードインで鳴らし始める
 *  ・いつでも止められる小さなトグルを常設し、選択は記憶する
 *    (一度OFFにした人には二度と鳴らさない)
 *  ・曲が終わったら別の曲へ(同じ曲の繰り返しを避ける)
 *  ・1曲だけを読み込む(preload=none → 再生直前に取得)。全曲は落とさない
 */
(function () {
  'use strict';

  var TRACKS = [
    '般若心経 Ambient EDM.mp3',
    '般若心経 Ambient Jazz Mix.mp3',
    '般若心経 Ambient jazz.mp3',
    '般若心経 AmbientⅡ.mp3',
    '般若心経 FREE JAZZ.mp3',
    '般若心経 POP JAZZ.mp3',
    '般若心経 acid jazz.mp3',
    '般若心経 acid jazz (1).mp3',
    '般若心経 jazz lo-fi.mp3',
    '般若心経 odd time signature.mp3',
    '般若心経Cloud Rap.mp3'
  ];
  var DIR = 'assets/audio/';
  var KEY = 'ogs-bgm';          // 'on' | 'off'
  var TARGET_VOL = 0.32;        // 背景音として控えめに
  var FADE_MS = 2600;

  var audio = null, fadeTimer = null, started = false, current = -1;

  function label(file) {                        // 表示用(拡張子と重複表記を外す)
    return file.replace(/\.mp3$/, '').replace(/\s*\(\d+\)$/, '');
  }
  function pickTrack() {
    var i;
    do { i = Math.floor(Math.random() * TRACKS.length); }
    while (TRACKS.length > 1 && i === current);
    current = i;
    return TRACKS[i];
  }
  function getPref() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setPref(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }

  function fadeTo(target, done) {
    clearInterval(fadeTimer);
    var step = 40, from = audio.volume, n = Math.max(1, Math.round(FADE_MS / step)), k = 0;
    fadeTimer = setInterval(function () {
      k++;
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * (k / n)));
      if (k >= n) { clearInterval(fadeTimer); if (done) done(); }
    }, step);
  }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = 'none';
    audio.volume = 0;
    audio.addEventListener('ended', function () {   // 終わったら別の曲へ
      audio.src = DIR + encodeURIComponent(pickTrack());
      audio.play().then(function () { fadeTo(TARGET_VOL); }).catch(function () {});
      updateUI();
    });
    return audio;
  }

  function play() {
    ensureAudio();
    if (!audio.src) audio.src = DIR + encodeURIComponent(pickTrack());
    return audio.play().then(function () {
      started = true; setPref('on'); fadeTo(TARGET_VOL); updateUI();
    }).catch(function () { updateUI(); });   // 拒否されたら操作待ちのまま
  }

  function stop() {
    if (!audio) { setPref('off'); updateUI(); return; }
    fadeTo(0, function () { audio.pause(); });
    started = false; setPref('off'); updateUI();
  }

  /* ── 常設トグル(小さく、邪魔をしない) ── */
  var btn, lab;
  function buildUI() {
    var css = document.createElement('style');
    css.textContent =
      '#bgm-toggle{position:fixed;left:14px;bottom:14px;z-index:9997;display:flex;' +
      'align-items:center;gap:8px;padding:8px 12px;cursor:pointer;' +
      'background:rgba(6,9,16,.72);border:1px solid rgba(217,196,154,.16);' +
      'color:#8d826d;font:400 10px/1 ui-sans-serif,-apple-system,sans-serif;' +
      'letter-spacing:.18em;text-transform:uppercase;backdrop-filter:blur(4px);' +
      'transition:color .3s,border-color .3s}' +
      '#bgm-toggle:hover{color:#d9c49a;border-color:rgba(217,196,154,.4)}' +
      '#bgm-toggle:focus-visible{outline:1px solid #d9c49a;outline-offset:3px}' +
      '#bgm-toggle .dot{width:6px;height:6px;border-radius:50%;background:#4a4438;flex:none}' +
      '#bgm-toggle.on .dot{background:#b23a2e;box-shadow:0 0 6px rgba(178,58,46,.8)}' +
      '#bgm-toggle .now{max-width:15em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
      'text-transform:none;letter-spacing:.04em;color:#5c5442}' +
      '@media (max-width:700px){#bgm-toggle .now{display:none}}';
    document.head.appendChild(css);

    btn = document.createElement('button');
    btn.id = 'bgm-toggle';
    btn.type = 'button';
    btn.innerHTML = '<span class="dot" aria-hidden="true"></span>' +
                    '<span class="txt">Sound</span><span class="now"></span>';
    lab = btn.querySelector('.now');
    btn.addEventListener('click', function () {
      if (started) stop(); else play();
    });
    document.body.appendChild(btn);
    updateUI();
  }
  function updateUI() {
    if (!btn) return;
    btn.classList.toggle('on', started);
    btn.setAttribute('aria-pressed', started ? 'true' : 'false');
    btn.querySelector('.txt').textContent = started ? 'Sound on' : 'Sound off';
    btn.setAttribute('aria-label', started ? 'BGMを止める' : 'BGMを鳴らす');
    lab.textContent = (started && current >= 0) ? '— ' + label(TRACKS[current]) : '';
  }

  /* ── 最初の操作を合図に鳴らし始める(OFFを選んだ人には鳴らさない) ── */
  function armAutoStart() {
    if (getPref() === 'off') return;
    var events = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'];
    var fire = function () {
      events.forEach(function (e) { removeEventListener(e, fire); });
      if (getPref() !== 'off' && !started) play();
    };
    events.forEach(function (e) {
      addEventListener(e, fire, { once: true, passive: true });
    });
  }

  function init() {
    buildUI();
    // 以前OFFを選んだ人には鳴らさない(自動再生も操作待ちもしない)
    if (getPref() === 'off') return;
    play().then(armAutoStart);   // 自動再生を試し、拒否されたら操作待ちへ
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
