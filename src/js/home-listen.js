/* HOME LISTEN gates — 押された門から聞き流し画面へ渡す。
   gate= は listen.html 側の受け口。旧称 dou も受けるようにしてある。 */
(function(){
  'use strict';

  var playlistStatus=document.getElementById('playlistStatus');
  var playlistStatusText=document.getElementById('playlistStatusText');
  var playlistStatusMeta=document.getElementById('playlistStatusMeta');
  var gateButtons=Array.prototype.slice.call(document.querySelectorAll('[data-playlist]'));
  var gateNames={sei:'STILL · 静 · FOCUS & RELAX',dou:'MOVE · 動 · ENERGY & INSPIRE'};
  var API='https://open-gate-sutra-production.up.railway.app/api/shelf/';

  function resetGateSelection(){
    gateButtons.forEach(function(button){button.setAttribute('aria-pressed','false');});
    playlistStatus.classList.remove('is-selected');
    playlistStatusText.textContent='Choose a gate. ／ 門を選ぶ。';
    playlistStatusMeta.textContent='';
  }

  /* 棚に何曲あるかを先に出す。門を押す前に、鳴るのか鳴らないのかが分かる */
  function showCounts(){
    ['sei','do'].forEach(function(axis){
      fetch(API+axis).then(function(r){return r.json();}).then(function(d){
        var key = axis==='do' ? 'dou' : 'sei';
        var btn = document.querySelector('[data-playlist="'+key+'"]');
        if(!btn || !d.count) return;
        btn.setAttribute('data-count', d.count);
      }).catch(function(){});
    });
  }

  gateButtons.forEach(function(button){
    button.addEventListener('click',function(){
      var key=button.dataset.playlist;
      var axis=key==='dou'?'do':key;
      gateButtons.forEach(function(item){item.setAttribute('aria-pressed',String(item===button));});
      playlistStatus.classList.add('is-selected');
      playlistStatusText.textContent='OGS · '+gateNames[key]+' — 開きます。';
      var n=button.getAttribute('data-count');
      playlistStatusMeta.textContent = n ? n+' tracks' : '';
      /* 押した操作をそのまま再生の起点にするため、間を置かずに渡す。
         遅らせると自動再生の制限に触れて、向こうで止まる */
      location.href='listen.html?gate='+axis;
    });
  });

  resetGateSelection();
  showCounts();
})();
