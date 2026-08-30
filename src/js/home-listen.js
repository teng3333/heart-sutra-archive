/* HOME LISTEN gates — playlist URLs intentionally unset */
(function(){
  'use strict';

  var playlistStatus=document.getElementById('playlistStatus');
  var playlistStatusText=document.getElementById('playlistStatusText');
  var playlistStatusMeta=document.getElementById('playlistStatusMeta');
  var gateButtons=Array.prototype.slice.call(document.querySelectorAll('[data-playlist]'));
  var gateNames={sei:'STILL · 静 · FOCUS & RELAX',dou:'MOVE · 動 · ENERGY & INSPIRE'};

  function resetGateSelection(){
    gateButtons.forEach(function(button){button.setAttribute('aria-pressed','false');});
    playlistStatus.classList.remove('is-selected');
    playlistStatusText.textContent='Choose a gate. ／ 門を選ぶ。';
    playlistStatusMeta.textContent='Playlists in preparation';
  }

  gateButtons.forEach(function(button){
    button.addEventListener('click',function(){
      var key=button.dataset.playlist;
      gateButtons.forEach(function(item){item.setAttribute('aria-pressed',String(item===button));});
      playlistStatus.classList.add('is-selected');
      playlistStatusText.textContent='OGS · '+gateNames[key]+' — Playlist coming soon. ／ プレイリスト準備中です。';
      playlistStatusMeta.textContent='Coming soon · URL pending';
    });
  });

  resetGateSelection();
})();
