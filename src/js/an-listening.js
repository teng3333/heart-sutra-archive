(function () {
  'use strict';

  const AUDIO_BASE = 'assets/audio/';
  const experiences = {
    still: {
      title: '静かに沈む門',
      line: '急いで整えなくても大丈夫です。音の隙間に、今あるものをそのまま置いていきましょう。',
      meta: '静かなアンビエントを中心に約18分 · 7曲',
      tracks: [
        ['般若心経 Ambient jazz.mp3', '般若心経 — Ambient Jazz'],
        ['般若心経 jazz lo-fi.mp3', '般若心経 — Jazz Lo-fi'],
        ['般若心経 Ambient Jazz Mix.mp3', '般若心経 — Ambient Jazz Mix'],
        ['般若心経 AmbientⅡ.mp3', '般若心経 — Ambient II'],
        ['般若心経 Ambient Free JAZZ.mp3', '般若心経 — Ambient Free Jazz'],
        ['般若心経 Ambient Free JAZZ 2.mp3', '般若心経 — Ambient Free Jazz II'],
        ['般若心経 Ambient Free JAZZ 3.mp3', '般若心経 — Ambient Free Jazz III']
      ]
    },
    drift: {
      title: '漂う門',
      line: '手を止めなくて大丈夫です。一定の流れだけ、そっと隣に置いておきます。',
      meta: '穏やかなリズムを中心に約19分 · 8曲',
      tracks: [
        ['般若心経 Ambient Free JAZZ.mp3', '般若心経 — Ambient Free Jazz'],
        ['般若心経 Ambient Free JAZZ 2.mp3', '般若心経 — Ambient Free Jazz II'],
        ['般若心経 Ambient Free JAZZ 3.mp3', '般若心経 — Ambient Free Jazz III'],
        ['般若心経 Ambient Free JAZZ 4.mp3', '般若心経 — Ambient Free Jazz IV'],
        ['般若心経 JAZZ waltz.mp3', '般若心経 — Jazz Waltz'],
        ['般若心経 jazz waltz 2.mp3', '般若心経 — Jazz Waltz II'],
        ['般若心経 odd time signature.mp3', '般若心経 — Odd Time Signature'],
        ['般若心経 Ambient jazz.mp3', '般若心経 — Ambient Jazz']
      ]
    },
    shift: {
      title: '景色を変える門',
      line: '大きく変える必要はありません。輪郭のある音をひとつ、今の空気に通してみましょう。',
      meta: '表情のあるビートを中心に約19分 · 9曲',
      tracks: [
        ['般若心経 Ambient EDM.mp3', '般若心経 — Ambient EDM'],
        ['般若心経 FREE JAZZ.mp3', '般若心経 — Free Jazz'],
        ['般若心経 POP JAZZ.mp3', '般若心経 — Pop Jazz'],
        ['般若心経 acid jazz (1).mp3', '般若心経 — Acid Jazz I'],
        ['般若心経 acid jazz.mp3', '般若心経 — Acid Jazz II'],
        ['般若心経Cloud Rap.mp3', '般若心経 — Cloud Rap'],
        ['般若心経 odd time signature.mp3', '般若心経 — Odd Time Signature'],
        ['般若心経 Ambient Jazz Mix.mp3', '般若心経 — Ambient Jazz Mix'],
        ['般若心経 AmbientⅡ.mp3', '般若心経 — Ambient II']
      ]
    }
  };

  const choiceStep = document.getElementById('choiceStep');
  const confirmStep = document.getElementById('confirmStep');
  const playerStep = document.getElementById('playerStep');
  const anLine = document.getElementById('anLine');
  const selectionTitle = document.getElementById('selectionTitle');
  const selectionMeta = document.getElementById('selectionMeta');
  const startListening = document.getElementById('startListening');
  const backToChoices = document.getElementById('backToChoices');
  const chooseAgain = document.getElementById('chooseAgain');
  const playerGateTitle = document.getElementById('playerGateTitle');
  const trackTitle = document.getElementById('trackTitle');
  const trackCount = document.getElementById('trackCount');
  const playPause = document.getElementById('playPause');
  const nextTrack = document.getElementById('nextTrack');
  const volume = document.getElementById('volume');
  const progressBar = document.getElementById('progressBar');
  const currentTime = document.getElementById('currentTime');
  const duration = document.getElementById('duration');
  const playerStatus = document.getElementById('playerStatus');
  const audio = document.getElementById('guidedAudio');

  let selectedKey = null;
  let trackIndex = 0;
  let consecutiveErrors = 0;
  let errorTimer = null;

  function showStep(step) {
    choiceStep.hidden = step !== 'choice';
    confirmStep.hidden = step !== 'confirm';
    playerStep.hidden = step !== 'player';
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    return minutes + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
  }

  function stopAudio() {
    window.clearTimeout(errorTimer);
    errorTimer = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    trackIndex = 0;
    consecutiveErrors = 0;
    progressBar.style.width = '0%';
    currentTime.textContent = '0:00';
    duration.textContent = '0:00';
  }

  function chooseGate(key) {
    selectedKey = key;
    const selected = experiences[key];
    anLine.textContent = selected.line;
    selectionTitle.textContent = selected.title;
    selectionMeta.textContent = selected.meta;
    showStep('confirm');
    startListening.focus();
  }

  function loadTrack(shouldPlay) {
    const selected = experiences[selectedKey];
    const track = selected.tracks[trackIndex];
    audio.src = AUDIO_BASE + encodeURIComponent(track[0]);
    trackTitle.textContent = track[1];
    trackCount.textContent = (trackIndex + 1) + ' / ' + selected.tracks.length + ' · ' + selected.title;
    progressBar.style.width = '0%';
    currentTime.textContent = '0:00';
    duration.textContent = '0:00';
    playerStatus.textContent = shouldPlay ? '読み込んでいます…' : '一時停止中';

    if (shouldPlay) {
      audio.play().then(function () {
        consecutiveErrors = 0;
        playerStatus.textContent = '再生中';
      }).catch(function () {
        playerStatus.textContent = '再生を始められませんでした。「再生」を押してください。';
        playPause.textContent = '再生';
      });
    }
  }

  function startExperience() {
    window.clearTimeout(errorTimer);
    errorTimer = null;
    trackIndex = 0;
    consecutiveErrors = 0;
    playerGateTitle.textContent = experiences[selectedKey].title;
    showStep('player');
    loadTrack(true);
    playPause.textContent = '一時停止';
    playPause.focus();
  }

  function advanceTrack() {
    if (!selectedKey) return;
    window.clearTimeout(errorTimer);
    errorTimer = null;
    const queueLength = experiences[selectedKey].tracks.length;
    trackIndex = (trackIndex + 1) % queueLength;
    loadTrack(true);
  }

  document.querySelectorAll('[data-gate]').forEach(function (button) {
    button.addEventListener('click', function () {
      chooseGate(button.dataset.gate);
    });
  });

  backToChoices.addEventListener('click', function () {
    selectedKey = null;
    showStep('choice');
    document.querySelector('[data-gate]').focus();
  });

  startListening.addEventListener('click', startExperience);

  chooseAgain.addEventListener('click', function () {
    stopAudio();
    selectedKey = null;
    showStep('choice');
    document.querySelector('[data-gate]').focus();
  });

  playPause.addEventListener('click', function () {
    if (audio.paused) {
      audio.play().then(function () {
        playerStatus.textContent = '再生中';
      }).catch(function () {
        playerStatus.textContent = '再生を始められませんでした。もう一度お試しください。';
      });
    } else {
      audio.pause();
    }
  });

  nextTrack.addEventListener('click', advanceTrack);
  volume.addEventListener('input', function () { audio.volume = Number(volume.value); });

  audio.addEventListener('play', function () {
    playPause.textContent = '一時停止';
    playerStatus.textContent = '再生中';
  });
  audio.addEventListener('pause', function () {
    if (audio.currentTime > 0 && !audio.ended) {
      playPause.textContent = '再生';
      playerStatus.textContent = '一時停止中';
    }
  });
  audio.addEventListener('loadedmetadata', function () {
    duration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener('timeupdate', function () {
    currentTime.textContent = formatTime(audio.currentTime);
    const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    progressBar.style.width = percent + '%';
  });
  audio.addEventListener('ended', advanceTrack);
  audio.addEventListener('error', function () {
    if (!selectedKey || !audio.getAttribute('src')) return;
    consecutiveErrors += 1;
    if (consecutiveErrors < experiences[selectedKey].tracks.length) {
      playerStatus.textContent = 'この曲を読み込めなかったため、次の曲へ進みます。';
      errorTimer = window.setTimeout(advanceTrack, 800);
    } else {
      playerStatus.textContent = '音源を読み込めませんでした。通信状況を確認して、選び直してください。';
      playPause.textContent = '再生';
    }
  });

  audio.volume = Number(volume.value);
})();
