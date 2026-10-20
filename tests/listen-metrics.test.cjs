const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { create, attribution } = require('../src/js/listen-metrics.js');
function store() {
  const data = new Map();
  return { getItem: k => data.get(k) || null, setItem: (k,v) => data.set(k,v), removeItem: k => data.delete(k), data };
}
function fixture(opts = {}) {
  const audio = Object.assign(new EventTarget(), { currentTime: 0, paused: true, seeking: false, muted: false, volume: 1, playbackRate: 1, readyState: 4 });
  let wall = opts.wall || 0, granted = opts.granted !== false, suspended = false;
  const storage = opts.storage || store(), events = [];
  const tracker = create(audio, {
    storage, attribution: opts.ref || attribution('?utm_source=x_ads&utm_campaign=ogs_final12_x_b_invite&utm_content=copy_b_art_b'),
    consent: () => granted, suspended: () => suspended,
    now: () => 1700000000000 + wall * 1000, clock: () => wall,
    emit: (name, params) => { events.push({ name, params }); return opts.accept !== false; }
  });
  const fire = name => audio.dispatchEvent(new Event(name));
  const tick = (seconds = 1, media = seconds * audio.playbackRate) => { wall += seconds; audio.currentTime += media; fire('timeupdate'); };
  const play = () => { audio.paused = false; fire('playing'); };
  const pause = () => { audio.paused = true; fire('pause'); };
  const advance = seconds => { for (let i = 0; i < seconds; i++) tick(); };
  tracker.select(173);
  return { audio, tracker, storage, events, fire, tick, play, pause, advance,
    count: name => events.filter(e => e.name === name).length,
    consent: value => { granted = value; tracker.ready(); },
    suspend: value => { suspended = value; },
    idle: seconds => { wall += seconds; } };
}
test('actual advancement, not play click, reaches 1/30/120 seconds once', () => {
  const f = fixture(); f.fire('play'); f.advance(35);
  assert.equal(f.count('ogs_play_start'), 0);
  f.play(); f.advance(29); assert.equal(f.count('ogs_listen_30s'), 0);
  f.advance(1); assert.equal(f.count('ogs_listen_30s'), 1);
  f.advance(100); assert.equal(f.count('ogs_listen_30s'), 1); assert.equal(f.count('ogs_listen_120s'), 1);
});
test('pause and buffer time do not contribute', () => {
  const f = fixture(); f.play(); f.advance(10); f.pause(); f.advance(50);
  f.play(); f.advance(10); f.fire('waiting'); f.advance(50);
  f.play(); f.advance(9); assert.equal(f.count('ogs_listen_30s'), 0);
  f.advance(1); assert.equal(f.count('ogs_listen_30s'), 1);
});
test('seeking and unannounced media jumps do not count', () => {
  const f = fixture(); f.play(); f.advance(5);
  f.audio.seeking = true; f.audio.currentTime = 150; f.fire('seeking'); f.tick(1,200);
  f.audio.seeking = false; f.fire('seeked'); f.tick(1,200);
  f.advance(24); assert.equal(f.count('ogs_listen_30s'), 0);
  f.advance(1); assert.equal(f.count('ogs_listen_30s'), 1);
});
test('muted playback, volume zero, unlock and video export excluded', () => {
  const f = fixture(); f.play(); f.advance(10);
  f.audio.muted = true; f.fire('volumechange'); f.advance(40);
  f.audio.muted = false; f.audio.volume = 0; f.fire('volumechange'); f.advance(40);
  f.audio.volume = 1; f.fire('volumechange'); f.suspend(true); f.advance(40);
  f.suspend(false); f.tracker.exportMode(true); f.advance(40); f.tracker.exportMode(false);
  f.advance(19); assert.equal(f.count('ogs_listen_30s'), 0);
  f.advance(1); assert.equal(f.count('ogs_listen_30s'), 1);
});
test('30 seconds at 2x still needs 30 seconds of wall time', () => {
  const f = fixture(); f.audio.playbackRate = 2; f.play(); f.advance(15);
  assert.equal(f.count('ogs_listen_30s'), 0); f.advance(15); assert.equal(f.count('ogs_listen_30s'), 1);
});
test('two tracks are separate, session result remains one', () => {
  const f = fixture(); f.play(); f.advance(30);
  f.tracker.select(174); f.audio.currentTime = 0; f.play(); f.advance(30);
  assert.equal(f.count('ogs_track_30s'), 2); assert.equal(f.count('ogs_listen_30s'), 1);
  assert.deepEqual(f.events.filter(e => e.name === 'ogs_track_30s').map(e => e.params.track_id), [173,174]);
});
test('reload with stripped UTM inherits source and deduplicates within the tab', () => {
  const f = fixture(); f.play(); f.advance(30);
  const second = fixture({ storage: f.storage, ref: attribution(''), wall: 30 }); second.play(); second.advance(10);
  assert.equal(second.count('ogs_listen_30s'), 0); assert.equal(second.count('ogs_listen_landing'), 0);
  second.tracker.feedback('sent',173);
  assert.equal(second.events[0].params.ogs_campaign, 'ogs_final12_x_b_invite');
});
test('new campaign resets attribution and counts independently', () => {
  const f = fixture(); f.play(); f.advance(30);
  const r = fixture({ storage: f.storage, ref: attribution('?utm_source=reddit_ads&utm_campaign=final12_d2_traffic') });
  r.play(); r.advance(30); assert.equal(r.count('ogs_listen_30s'), 1);
  assert.equal(r.events[0].params.ogs_source, 'reddit_ads');
});
test('30-minute inactivity creates new visit, not a unique person', () => {
  const f = fixture(); f.play(); f.advance(30); f.pause(); f.idle(1801); f.play(); f.advance(30);
  assert.equal(f.count('ogs_listen_landing'), 2); assert.equal(f.count('ogs_listen_30s'), 2);
});
test('no pre-consent events, storage or retrospective listening', () => {
  const f = fixture({ granted: false }); f.play(); f.advance(120);
  assert.equal(f.events.length, 0); assert.equal(f.storage.data.size, 0);
  f.consent(true); f.advance(29); assert.equal(f.count('ogs_listen_30s'), 0);
  f.advance(1); assert.equal(f.count('ogs_listen_30s'), 1);
  f.consent(false); const n = f.events.length; f.advance(120);
  assert.equal(f.events.length,n); assert.equal(f.storage.data.size, 0);
});
test('manual versus automatic is tied to actual first playback', () => {
  const f = fixture(); f.tracker.intent(); f.play(); f.advance(1);
  assert.equal(f.events.find(e => e.name === 'ogs_play_start').params.start_mode, 'manual');
  f.tracker.select(174); f.play(); f.advance(1);
  assert.equal(f.events.filter(e => e.name === 'ogs_play_start')[1].params.start_mode, 'automatic');
  f.tracker.queueManual(); f.tracker.select(175); f.play(); f.advance(1);
  assert.equal(f.events.filter(e => e.name === 'ogs_play_start')[2].params.start_mode, 'manual');
});
test('blocked and failed playback are not successful starts; feedback dedupes', () => {
  const f = fixture(); f.tracker.blocked('NotAllowedError'); f.audio.error = {code:2}; f.fire('error');
  assert.equal(f.count('ogs_listen_start'),0); assert.equal(f.count('ogs_autoplay_blocked'),1); assert.equal(f.count('ogs_play_error'),1);
  f.tracker.feedback('open',173); assert.equal(f.count('ogs_feedback_sent'),0);
  f.tracker.feedback('sent',173); f.tracker.feedback('sent',173); assert.equal(f.count('ogs_feedback_sent'),1);
});
test('failed enqueue is not marked delivered or deduped', () => {
  const f = fixture({ accept:false }); f.play(); f.advance(31);
  const stored = JSON.parse(f.storage.getItem('ogs_listening_v1'));
  assert.deepEqual(stored.events, {});
});
test('landing and starts retry after analytics library becomes ready', () => {
  const options = {accept:false}; const f = fixture(options); f.play(); f.advance(2);
  assert.deepEqual(JSON.parse(f.storage.getItem('ogs_listening_v1')).events,{});
  options.accept = true; f.tracker.ready(); f.advance(1);
  const events = JSON.parse(f.storage.getItem('ogs_listening_v1')).events;
  assert.equal(events['ogs_listen_landing:session'],true);
  assert.equal(events['ogs_listen_start:session'],true);
});
test('QA diagnostics are limited to QA campaign and cleared on withdrawal', () => {
  const f = fixture({ref:attribution('?utm_source=x_ads&utm_campaign=ogs_qa_listen_v2')});
  const attrs = new Map();f.audio.setAttribute=(k,v)=>attrs.set(k,v);f.audio.removeAttribute=k=>attrs.delete(k);
  f.play();f.advance(30);assert.equal(attrs.get('data-ogs-qa-seconds'),'30');
  f.consent(false);assert.equal(attrs.size,0);
  const g=fixture();g.audio.setAttribute=(k,v)=>attrs.set(k,v);g.play();g.advance(30);assert.equal(attrs.size,0);
});
test('UTM filters reject free text, addresses and unsupported sources', () => {
  const p = attribution('?utm_source=alice@example.com&utm_campaign=alice@example.com&utm_content=secret');
  assert.deepEqual(p, {ogs_source:'unattributed',ogs_medium:'unspecified',ogs_campaign:'unattributed',ogs_content:'unspecified'});
});
test('paid medium is preserved for X and Reddit attribution', () => {
  assert.equal(attribution('?utm_source=x_ads&utm_medium=paid_social&utm_campaign=ogs_final12_x_b_invite').ogs_medium, 'paid_social');
  assert.equal(attribution('?utm_source=reddit_ads&utm_medium=paid&utm_campaign=final12_d2_traffic').ogs_medium, 'paid');
  assert.equal(attribution('?utm_source=reddit_ads&utm_campaign=final12_d2_traffic').ogs_medium, 'unspecified');
});
test('consent gate forwards only whitelisted non-personal dimensions', () => {
  const calls = []; let granted = true;
  const sandbox = { window: { gtag: (...args) => calls.push(args) }, localStorage: { getItem: () => granted ? 'granted' : 'denied' },
    document: {readyState:'loading',addEventListener(){}}, URLSearchParams, Number };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/js/consent.js'),'utf8'), sandbox);
  sandbox.window.ogsTrack('ogs_feedback_sent', { track_id:173, ogs_source:'x_ads', ogs_campaign:'ogs_final12_x_b_invite', comment:'private', name:'private', url:'private', error_code:'arbitrary' });
  assert.deepEqual(Object.keys(calls[0][2]).sort(), ['ogs_campaign','ogs_source','track_id']);
  granted = false; assert.equal(sandbox.window.ogsTrack('ogs_feedback_sent',{}),false); assert.equal(calls.length,1);
  granted = true; sandbox.window.__gaReady = false;
  assert.equal(sandbox.window.ogsTrack('ogs_listen_landing',{}),false); assert.equal(calls.length,1);
  sandbox.window.__gaReady = true;
  assert.equal(sandbox.window.ogsTrack('ogs_listen_landing',{}),true); assert.equal(calls.length,2);
});
test('initial UTM survives URL rewriting without copying unrelated query fields', () => {
  const root = { location: { origin:'https://example.com',pathname:'/listen.html',search:'?utm_source=x_ads&utm_campaign=ogs_final12_x_b_invite&email=private' } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/js/listen-metrics.js'),'utf8'), {window:root, URLSearchParams, URL});
  root.location.search = '?track=173';
  assert.match(root.OGSListening.pageLocation(),/utm_source=x_ads/);
  assert.doesNotMatch(root.OGSListening.pageLocation(),/private|email/);
});
test('storage unavailable does not break playback analytics or consent gating', () => {
  const broken = {getItem(){throw Error('disabled');},setItem(){throw Error('disabled');},removeItem(){throw Error('disabled');}};
  const f = fixture({storage:broken}); f.play(); f.advance(30); assert.equal(f.count('ogs_listen_30s'),1);
  f.consent(false); f.advance(30); assert.equal(f.count('ogs_listen_30s'),1);
});
test('sleep gaps and stalled media clock do not count as listening', () => {
  const f = fixture(); f.play(); f.advance(10); f.tick(200,200); f.tick(20,0);
  f.advance(19); assert.equal(f.count('ogs_listen_30s'),0);
  f.advance(1); assert.equal(f.count('ogs_listen_30s'),1);
});
test('all player inline JavaScript parses after integration', () => {
  const html = fs.readFileSync(path.join(__dirname,'../listen.html'),'utf8');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/src=|application\/ld\+json/.test(m[1])) new vm.Script(m[2]);
  }
  assert.ok(html.indexOf('listen-metrics.js') < html.indexOf('consent.js'));
});
