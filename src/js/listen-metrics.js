/* Consent-gated playback diagnostics. No names, comments, URLs or user IDs. */
(function (root) {
  'use strict';
  function attribution(search) {
    var q = new URLSearchParams(search || '');
    var source = q.get('utm_source') || '', campaign = q.get('utm_campaign') || '';
    var content = q.get('utm_content') || '';
    return {
      ogs_source: /^(x_ads|reddit_ads)$/.test(source) ? source : 'unattributed',
      ogs_campaign: /^(ogs_[a-z0-9_-]+|final12_[a-z0-9_-]+)$/.test(campaign) && campaign.length <= 80 ? campaign : 'unattributed',
      ogs_content: /^copy_[ab]_art_[ab]$/.test(content) ? content : 'unspecified'
    };
  }
  var initial = attribution(root.location && root.location.search);
  var KEY = 'ogs_listening_v1', TTL = 30 * 60 * 1000;
  function create(audio, options) {
    var o = options || {}, state = null, track = null, active = false;
    var lastTime = 0, lastWall = 0, manual = false, queuedManual = false, exportMode = false;
    var now = o.now || function () { return Date.now(); };
    var clock = o.clock || function () { return performance.now() / 1000; };
    var consent = o.consent || function () {
      try { return root.localStorage.getItem('ogs-cookie-consent') === 'granted'; } catch (e) { return false; }
    };
    // Do not touch analytics storage before consent, even in private browsing.
    function storage() { return o.storage || root.sessionStorage; }
    var emit = o.emit || function (name, params) { return !!(root.ogsTrack && root.ogsTrack(name, params)); };
    var ref = o.attribution || initial;
    function allowed() { return consent() && !exportMode && !(o.suspended && o.suspended()); }
    function save() { try { storage().setItem(KEY, JSON.stringify(state)); } catch (e) {} }
    function session() {
      if (!consent()) return null;
      if (!state) { try { state = JSON.parse(storage().getItem(KEY)); } catch (e) {} }
      var tagged = ref.ogs_source !== 'unattributed';
      if (!state || state.version !== 1 || !state.tracks || !state.events ||
          !Number.isFinite(state.last) || now() - state.last >= TTL || now() < state.last ||
          (tagged && JSON.stringify(state.ref) !== JSON.stringify(ref))) {
        state = { version: 1, ref: ref, last: now(), tracks: {}, events: {} };
      }
      state.last = now();
      return state;
    }
    function event(name, id, extra, dedupe) {
      var s = session(); if (!s) return;
      var key = name + ':' + (dedupe === 'track' ? id : 'session');
      if (s.events[key]) return;
      var params = Object.assign({}, s.ref, { placement: 'player', metric_version: 'v1' }, extra || {});
      if (id) params.track_id = id;
      // Enqueue is not proof of GA receipt: verify Realtime before ad release.
      if (emit(name, params)) { s.events[key] = true; save(); }
    }
    function landing() { event('ogs_listen_landing'); }
    function baseline() { lastTime = Number(audio.currentTime) || 0; lastWall = clock(); }
    function record() {
      var current = Number(audio.currentTime) || 0, wall = clock();
      var delta = current - lastTime, elapsed = wall - lastWall;
      var rate = Number(audio.playbackRate) || 1;
      if (track && active && allowed() && !audio.seeking && !audio.muted && audio.volume > 0 &&
          audio.readyState >= 2 && elapsed > 0 && elapsed <= 10 && delta > 0 &&
          delta <= elapsed * rate + 0.25) {
        var s = session();
        landing();
        var t = s.tracks[track] || (s.tracks[track] = { seconds: 0 });
        if (!t.mode) t.mode = manual ? 'manual' : 'automatic';
        t.seconds += Math.min(elapsed, delta / rate);
        var meta = { start_mode: t.mode, gate: o.gate ? o.gate() : 'other' };
        if (t.seconds >= 1) {
          event('ogs_play_start', track, meta, 'track');
          event('ogs_listen_start', track, meta);
        }
        [30, 120].forEach(function (threshold) {
          if (t.seconds + 0.001 < threshold) return;
          event('ogs_track_' + threshold + 's', track, meta, 'track');
          event('ogs_listen_' + threshold + 's', track, meta);
        });
        save();
      }
      lastTime = current; lastWall = wall;
    }
    function halt() { record(); active = false; baseline(); }
    function resume() { active = true; baseline(); }
    audio.addEventListener('playing', resume);
    audio.addEventListener('timeupdate', record);
    ['pause', 'waiting', 'stalled', 'ended', 'emptied'].forEach(function (name) { audio.addEventListener(name, halt); });
    audio.addEventListener('seeking', function () { active = false; baseline(); });
    audio.addEventListener('seeked', function () { active = !audio.paused; baseline(); });
    ['volumechange', 'ratechange'].forEach(function (name) { audio.addEventListener(name, baseline); });
    audio.addEventListener('error', function () {
      halt();
      if (track && allowed()) event('ogs_play_error', track, { error_code: String(audio.error && audio.error.code || 0) }, 'track');
    });
    function choiceChanged() {
      active = false; baseline();
      if (!consent()) {
        state = null;
        try { storage().removeItem(KEY); } catch (e) {}
      } else { landing(); active = !audio.paused && audio.readyState >= 2; }
    }
    if (root.addEventListener) {
      root.addEventListener('ogs:consentchange', choiceChanged);
      root.addEventListener('pagehide', halt);
    }
    landing();
    return {
      select: function (id) {
        halt(); track = Number.isSafeInteger(Number(id)) && Number(id) > 0 ? Number(id) : null;
        manual = queuedManual; queuedManual = false; baseline();
      },
      intent: function () { manual = true; },
      queueManual: function () { queuedManual = true; },
      exportMode: function (value) { halt(); exportMode = !!value; active = !audio.paused; baseline(); },
      blocked: function (name) {
        if (name === 'NotAllowedError' && allowed()) event('ogs_autoplay_blocked', track, {}, 'track');
      },
      feedback: function (kind, id) {
        if ((kind === 'open' || kind === 'sent') && Number.isSafeInteger(Number(id)) && Number(id) > 0) {
          event('ogs_feedback_' + kind, Number(id), {}, 'track');
          if (kind === 'sent') event('ogs_feedback_visit', Number(id));
        }
      },
      ready: choiceChanged
    };
  }
  function pageLocation() {
    // Capture before stampURL strips UTM; never forward arbitrary query strings.
    var u = new URL(root.location.origin + root.location.pathname);
    if (initial.ogs_source !== 'unattributed') {
      u.searchParams.set('utm_source', initial.ogs_source);
      u.searchParams.set('utm_medium', initial.ogs_source === 'x_ads' ? 'paid_social' : 'paid');
      if (initial.ogs_campaign !== 'unattributed') u.searchParams.set('utm_campaign', initial.ogs_campaign);
      if (initial.ogs_content !== 'unspecified') u.searchParams.set('utm_content', initial.ogs_content);
    }
    return u.href;
  }
  var api = { create: create, attribution: attribution, pageLocation: pageLocation };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OGSListening = api;
})(typeof window === 'undefined' ? {} : window);
