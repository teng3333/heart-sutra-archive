/* 投稿フォーム — 音源を置いたら、読めるものは読んで埋める。
   MP3のID3タグには曲名・作者名・ジャケットが入っていることが多い。
   ブラウザの中だけで読めるので、サーバーへ送る前に埋められる。
   投稿者の手入力を限りなくゼロに近づけるのが狙い。
   読み取った欄には印を出す。勝手に決められた感じを残さないため。 */
(function () {
  'use strict';

  var MAX_AUDIO = 25 * 1024 * 1024;
  var MAX_ART = 2 * 1024 * 1024;
  var MAX_SEC = 8 * 60;

  var form = document.getElementById('submit-form');
  if (!form) return;
  var audioInput = document.getElementById('audioInput');
  var artInput = document.getElementById('artInput');
  var drop = document.getElementById('drop');
  var face = document.getElementById('dropFace');
  var got = document.getElementById('dropGot');
  var elName = document.getElementById('dropName');
  var elMeta = document.getElementById('dropMeta');
  var elArt = document.getElementById('dropArt');
  var elErr = document.getElementById('dropErr');
  var clearBtn = document.getElementById('dropClear');
  var fTitle = form.querySelector('[name="title"]');
  var fArtist = form.querySelector('[name="artist_name"]');
  var hintTitle = document.getElementById('hintTitle');
  var hintArtist = document.getElementById('hintArtist');
  var lyrics = document.getElementById('lyricsInput');
  var lyricsCount = document.getElementById('lyricsCount');

  var artAuto = document.getElementById('artAuto');
  var artAutoImg = document.getElementById('artAutoImg');
  var artAutoHead = document.getElementById('artAutoHead');
  var artAutoSub = document.getElementById('artAutoSub');
  var artErr = document.getElementById('artErr');
  var xInput = document.getElementById('xInput');

  var pickedArt = null;           // 音源から取り出したジャケット
  var bigArtSize = 0;             // 音源の画像が2MBを超えていて使えなかったときの大きさ

  function say(msg){
    elErr.textContent = msg || '';
    elErr.hidden = !msg;
  }
  function mb(n){ return (n / 1024 / 1024).toFixed(1) + 'MB'; }
  function mmss(s){
    s = Math.round(s);
    return Math.floor(s / 60) + '分' + String(s % 60).padStart(2, '0') + '秒';
  }

  /* ── ID3v2 を読む ──
     頭に "ID3"、続いてバージョン、フラグ、そして7ビットずつに散らした長さが来る。
     その中に TIT2(曲名) TPE1(作者) APIC(画像) が並ぶ。 */
  function syncsafe(b, o){
    return (b[o] << 21) | (b[o+1] << 14) | (b[o+2] << 7) | b[o+3];
  }
  function decodeText(bytes){
    if (!bytes.length) return '';
    var enc = bytes[0], body = bytes.subarray(1);
    try {
      if (enc === 1 || enc === 2) return new TextDecoder('utf-16').decode(body).replace(/\0+$/, '');
      if (enc === 3) return new TextDecoder('utf-8').decode(body).replace(/\0+$/, '');
      return new TextDecoder('shift_jis').decode(body).replace(/\0+$/, '');
    } catch (e) {
      return new TextDecoder('utf-8').decode(body).replace(/\0+$/, '');
    }
  }
  function readTags(buf){
    var b = new Uint8Array(buf), out = {};
    if (!(b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33)) return out;  // "ID3"
    var major = b[3];
    var size = syncsafe(b, 6);
    var i = 10, end = Math.min(10 + size, b.length);
    while (i + 10 <= end){
      var id = String.fromCharCode(b[i], b[i+1], b[i+2], b[i+3]);
      if (id === '\0\0\0\0') break;
      var fs = major === 3
        ? ((b[i+4] << 24) | (b[i+5] << 16) | (b[i+6] << 8) | b[i+7]) >>> 0
        : syncsafe(b, i + 4);
      // 読んだ範囲に収まらない画像は、使えない大きさ。大きさだけ控えて、そう知らせる
      if (id === 'APIC' && fs > 0 && i + 10 + fs > end){ out.artSize = fs; break; }
      if (fs <= 0 || i + 10 + fs > end) break;
      var body = b.subarray(i + 10, i + 10 + fs);
      if (id === 'TIT2') out.title = decodeText(body);
      else if (id === 'TPE1') out.artist = decodeText(body);
      else if (id === 'APIC' && !out.art){
        var enc = body[0], j = 1;
        while (j < body.length && body[j] !== 0) j++;
        var mime = String.fromCharCode.apply(null, body.subarray(1, j)) || 'image/jpeg';
        j += 2;                                     // 画像の種類を飛ばす
        if (enc === 1 || enc === 2){
          while (j + 1 < body.length && !(body[j] === 0 && body[j+1] === 0)) j += 2;
          j += 2;
        } else {
          while (j < body.length && body[j] !== 0) j++;
          j += 1;
        }
        var data = body.subarray(j);
        if (data.length > 64) out.art = new Blob([data], { type: mime });
      }
      i += 10 + fs;
    }
    return out;
  }

  function duration(file){
    return new Promise(function(res){
      var a = document.createElement('audio');
      var u = URL.createObjectURL(file);
      a.preload = 'metadata';
      a.onloadedmetadata = function(){ URL.revokeObjectURL(u); res(a.duration || 0); };
      a.onerror = function(){ URL.revokeObjectURL(u); res(0); };
      a.src = u;
    });
  }

  function fill(input, value, hint){
    if (!value || input.value.trim()) return;         // 手で入れたものは上書きしない
    input.value = value;
    if (hint) hint.hidden = false;
  }

  /* 選び直し用。keepMsg を立てると、直前に出した理由を残したまま枠だけ戻す。
     これを消してしまうと、弾いた理由が誰にも伝わらない */
  /* ジャケット欄に、いま何が使われるかを出す。
     自分で選んだ画像があればそれが最優先なので、この枠は引っ込める */
  function showArtAuto(){
    if (!artAuto) return;
    if (artInput && artInput.files && artInput.files.length){ artAuto.hidden = true; return; }
    if (pickedArt){
      artAutoImg.src = elArt.src;
      artAutoImg.hidden = false;
      artAutoHead.textContent = 'mp3の画像を使います';
      artAutoSub.textContent = '別の画像にするなら、下で選んでください';
      artAuto.hidden = false;
    } else if (bigArtSize){
      artAutoImg.hidden = true;
      artAutoHead.textContent = 'mp3の画像は使えません（' + mb(bigArtSize) + '）';
      artAutoSub.textContent = '2MBを超えています。使うなら2MB以下の画像を下で選んでください';
      artAuto.hidden = false;
    } else {
      artAuto.hidden = true;
    }
  }

  function reset(keepMsg){
    audioInput.value = '';
    pickedArt = null;
    bigArtSize = 0;
    showArtAuto();
    got.hidden = true; face.hidden = false;
    elArt.hidden = true; elArt.removeAttribute('src');
    if (!keepMsg) say('');
  }

  async function take(file){
    say('');
    if (!file) return;
    if (!/\.mp3$/i.test(file.name)){
      say('mp3 のファイルを選んでください。'); reset(true); return;
    }
    if (file.size > MAX_AUDIO){
      say('大きすぎます（' + mb(file.size) + '）。25MB までにしてください。'); reset(true); return;
    }
    var sec = await duration(file);
    if (sec && sec > MAX_SEC){
      say('長すぎます（' + mmss(sec) + '）。8分までにしてください。'); reset(true); return;
    }

    var tags = {};
    /* 2MBまでの画像が丸ごと入る範囲を読む。以前は1MBで切っていて、
       1〜2MBの画像は読み取れず、大きすぎる画像があることにも気づけなかった */
    try { tags = readTags(await file.slice(0, MAX_ART + 1024 * 1024).arrayBuffer()); } catch (e) {}

    elName.textContent = file.name;
    elMeta.textContent = mb(file.size) + (sec ? ' · ' + mmss(sec) : '');
    face.hidden = true; got.hidden = false;

    fill(fTitle, tags.title || file.name.replace(/\.mp3$/i, ''), tags.title ? hintTitle : null);
    fill(fArtist, tags.artist, hintArtist);

    if (tags.art && tags.art.size <= MAX_ART){
      pickedArt = tags.art;
      elArt.src = URL.createObjectURL(tags.art);
      elArt.hidden = false;
    } else if (tags.art || tags.artSize){
      bigArtSize = tags.art ? tags.art.size : tags.artSize;
    }
    showArtAuto();
  }

  audioInput.addEventListener('change', function(){ take(audioInput.files[0]); });
  clearBtn.addEventListener('click', function(e){ e.preventDefault(); reset(false); fTitle.focus(); });

  ['dragenter', 'dragover'].forEach(function(n){
    drop.addEventListener(n, function(e){ e.preventDefault(); drop.classList.add('over'); });
  });
  ['dragleave', 'drop'].forEach(function(n){
    drop.addEventListener(n, function(e){ e.preventDefault(); drop.classList.remove('over'); });
  });
  drop.addEventListener('drop', function(e){
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    try {
      var dt = new DataTransfer();
      dt.items.add(f);
      audioInput.files = dt.files;     // 送信時にこの欄から拾えるようにする
    } catch (err) {}
    take(f);
  });

  /* 自分で選んだ画像は、送る前に大きさを確かめる。
     以前は確かめずに送っていて、サーバーに断られるたびに中身の無い投稿が残った(2026-09-24)。
     選んだ画像があれば送信時にそちらが優先される(submit.html)。
     選び直しで空にしたときは、音源の画像に戻る */
  if (artInput) artInput.addEventListener('change', function(){
    artErr.hidden = true;
    var f = artInput.files[0];
    if (f && f.size > MAX_ART){
      artErr.textContent = 'この画像は ' + mb(f.size) + ' あります。2MBまでの画像を選んでください。';
      artErr.hidden = false;
      artInput.value = '';
    }
    showArtAuto();
  });

  /* XのID。@ の有無やURLの形で書かれても、@ID の形に揃える(サーバーの normalize_x_handle と同じ規則) */
  var X_RESERVED = ['home', 'i', 'intent', 'search', 'explore', 'settings', 'messages',
                    'notifications', 'share', 'hashtag', 'login', 'signup', 'tos', 'privacy'];
  function xHandle(v){
    v = (v || '').trim();
    var m = v.match(/^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/([^\/?#]+)/i);
    if (m){
      v = m[1];
      if (X_RESERVED.indexOf(v.toLowerCase()) >= 0) return null;
    }
    v = v.replace(/^@+/, '');
    return /^[A-Za-z0-9_]{1,15}$/.test(v) ? v : null;
  }
  if (xInput){
    var checkX = function(){
      var raw = xInput.value.trim();
      if (!raw){ xInput.setCustomValidity(''); return; }
      var h = xHandle(raw);
      xInput.setCustomValidity(h ? '' : 'XのIDは英数字と _ の15文字までです（例: @an_hsepj）');
      if (h) xInput.value = '@' + h;
    };
    xInput.addEventListener('change', checkX);
    xInput.addEventListener('input', function(){ xInput.setCustomValidity(''); });
  }

  if (lyrics) lyrics.addEventListener('input', function(){
    lyricsCount.textContent = lyrics.value.length;
  });

  /* 音源から取り出したジャケットを、送信するデータへ差し込む窓口 */
  window.OGS_pickedArtwork = function(){ return pickedArt; };
})();
