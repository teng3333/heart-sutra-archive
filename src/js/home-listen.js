/* HOME LISTEN gates — 押された門から聞き流し画面へ渡す。

   ホームの門は「選ぶか、任せるか」の2つにしてある(2026-09-19 高尾さん指示)。
     流(flow) … そのまま全曲を混ぜて流し始める
     棚(shelf) … 聞き流しページの門の画面へ渡し、そこで静・動などを選んでもらう
   以前はホームに静・動を直接置いていたが、それでは棚やジャンルが増えたときに
   ホームの一等地が破綻する。中身の分類は聞き流しページ側に集約した。

   gate= は listen.html 側の受け口。旧称 dou も受けるようにしてある。 */
(function(){
  'use strict';

  var playlistStatus=document.getElementById('playlistStatus');
  var playlistStatusText=document.getElementById('playlistStatusText');
  var playlistStatusMeta=document.getElementById('playlistStatusMeta');
  var gateButtons=Array.prototype.slice.call(document.querySelectorAll('[data-playlist]'));
  var gateNames={flow:'FLOW · 流 · 全曲を混ぜて',shelf:'SHELVES · 棚 · 静と動から選ぶ',
                 sei:'STILL · 静 · FOCUS & RELAX',dou:'MOVE · 動 · ENERGY & INSPIRE',
                 all:'ALL · 全 · EVERY SHELF'};
  /* 押した門の行き先。流はそのまま鳴り始め、棚は選ぶ画面へ渡す */
  var gateHref={flow:'listen.html?gate=all',shelf:'listen.html',
                sei:'listen.html?gate=sei',dou:'listen.html?gate=do',
                all:'listen.html?gate=all'};
  var API='https://open-gate-sutra-production.up.railway.app/api/shelf/';

  function resetGateSelection(){
    gateButtons.forEach(function(button){button.setAttribute('aria-pressed','false');});
    playlistStatus.classList.remove('is-selected');
    playlistStatusText.textContent='Choose a gate. ／ 門を選ぶ。';
    playlistStatusMeta.textContent='';
  }

  /* 何曲あるかを先に出す。門を押す前に、鳴るのか鳴らないのかが分かる。
     流も棚も、行き着く先は全公開曲なので、同じ数(全曲数)を出す。
     棚ごとの内訳は、聞き流しページの門の画面で見せる */
  function showCounts(){
    fetch(API.replace('/api/shelf/','/api/archive')).then(function(r){return r.json();})
      .then(function(d){
        if(!d.count) return;
        ['flow','shelf'].forEach(function(key){
          var btn = document.querySelector('[data-playlist="'+key+'"]');
          if(btn) btn.setAttribute('data-count', d.count);
        });
      }).catch(function(){});

    /* 静・動の門がまだ置かれている場合にも数を出す(過去の配置との互換)。
       数えるのは主たる棚の曲だけ。棚のAPIは副次の棚でも曲を拾うため、
       そのまま数えると静と動の合計が全曲数を上回り、実際に流れる数と食い違う */
    ['sei','do'].forEach(function(axis){
      var key = axis==='do' ? 'dou' : 'sei';
      var btn = document.querySelector('[data-playlist="'+key+'"]');
      if(!btn) return;
      fetch(API+axis).then(function(r){return r.json();}).then(function(d){
        var n = (d.items||[]).filter(function(t){return t.axis===axis;}).length;
        if(n) btn.setAttribute('data-count', n);
      }).catch(function(){});
    });
  }

  gateButtons.forEach(function(button){
    button.addEventListener('click',function(){
      var key=button.dataset.playlist;
      gateButtons.forEach(function(item){item.setAttribute('aria-pressed',String(item===button));});
      playlistStatus.classList.add('is-selected');
      playlistStatusText.textContent='OGS · '+(gateNames[key]||key)+
        (key==='shelf' ? ' — 選びます。' : ' — 開きます。');
      var n=button.getAttribute('data-count');
      playlistStatusMeta.textContent = n ? n+' tracks' : '';
      /* 押した操作をそのまま再生の起点にするため、間を置かずに渡す。
         遅らせると自動再生の制限に触れて、向こうで止まる */
      location.href = gateHref[key] || ('listen.html?gate='+key);
    });
  });

  resetGateSelection();
  showCounts();
})();
