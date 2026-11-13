const fs=require('fs');const MODE=process.argv[2]||'demo';
const el=()=>new Proxy({style:{},children:[{},{},{},{},{},{},{}],files:null,clientWidth:360,classList:{on:false,toggle(c,v){this.on=v}},addEventListener(ev,fn){(this['__'+ev]=this['__'+ev]||[]).push(fn)},setAttribute(){},getContext(){return c2d}},{get(t,k){return k in t?t[k]:undefined},set(t,k,v){t[k]=v;return true}});
let nan=0;const cap={};const chk=(n,a)=>{cap[n]=Array.from(a);for(const v of a)if(!(v===v)||!isFinite(v)){nan++;}};
const glp=new Proxy({},{get(t,k){if(k==='getProgramParameter')return()=>true;if(k==='getUniformLocation')return(p,n)=>n;if(k==='getAttribLocation')return()=>0;
if(typeof k==='string'&&k.startsWith('uniform'))return(n,...a)=>chk(n,a.length===1&&a[0].length?a[0]:a);return typeof k==='string'&&k===k.toUpperCase()?1:()=>({})}});
const els={};global.document={getElementById:id=>els[id]||(els[id]=el()),addEventListener(){}};
let cb=null,t=0;global.requestAnimationFrame=f=>{cb=f};global.performance={now:()=>t};global.setTimeout=f=>f();
let gd=0;const c2d=new Proxy({},{get(t,k){if(k==='getImageData')return(a,b,w,hh)=>{const d=new Uint8ClampedArray(w*hh*4);for(let i=0;i<d.length;i+=4){d[i]=200;d[i+1]=150;d[i+2]=90;d[i+3]=(i/4%7===0)?255:0;}return{data:d}};
 if(k==='fill')return()=>{gd++};if(k==='createRadialGradient'||k==='createLinearGradient')return()=>({addColorStop(){}});return typeof t[k]!=='undefined'?t[k]:()=>{}},set(t,k,v){t[k]=v;return true}});
const mkc=()=>({width:0,height:0,style:{},getContext:(n)=>n==='2d'?c2d:glp,toDataURL:()=>'data:x',addEventListener(){},setAttribute(){},clientWidth:360,children:[{},{},{},{},{},{},{},{},{}]});
els.gx=mkc();els.gl=mkc();document.createElement=()=>mkc();
/* 合成曲: 120拍/分(1小節2秒)。2秒から始まり、8秒ごとに和音が変わり、34/66/98秒で曲調が大きく変わる */
const SR=22050,DURS=160,N=SR*DURS,x=new Float32Array(N);
const loud=s=>(s>=34&&s<66)||(s>=98&&s<146);let seed=7;const rn=()=>{seed=(seed*16807)%2147483647;return seed/2147483647-.5};
const INS=!!process.env.INS;/* INS=1: 50秒の所に2小節(4秒)余分な節を挟んだ曲 */
for(let i=0;i<N;i++){const s0=i/SR;if(s0<2||s0>154)continue;const s=(INS&&s0>=50)?s0-4:s0;const L=loud(s),ph=Math.floor((s-2)/8),bt=(s-2)%0.5,bi=Math.floor((s-2)/0.5)%4;
 let v=Math.sin(2*Math.PI*55*bt*(1+2*Math.exp(-bt*30)))*Math.exp(-bt*14)*(bi===0?0.9:0.55)*(L?1:0.6);
 const f0=[220,262,196,247,233,294][ph%6];v+=Math.sin(2*Math.PI*f0*s)*(L?0.28:0.12)+Math.sin(2*Math.PI*f0*1.5*s)*(L?0.15:0.05);
 if(L){const h=(s-2)%0.25;v+=rn()*Math.exp(-h*40)*0.5;}
 x[i]=v*Math.min(1,(154-s0)/8);}
const abuf={sampleRate:SR,duration:DURS,numberOfChannels:1,length:N,getChannelData:()=>x};
const node=()=>({connect(){},disconnect(){},start(){},stop(){},frequency:{value:0},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){},value:0},frequencyBinCount:512,getByteFrequencyData(a){a.fill(40)}});
class AC{constructor(){this.state='running';this.sampleRate=SR;this.destination={}}get currentTime(){return t/1000}createAnalyser(){return node()}createBufferSource(){return node()}createOscillator(){return node()}createGain(){return node()}resume(){}decodeAudioData(a,ok){ok(abuf)}}
global.window={devicePixelRatio:2,addEventListener(){},matchMedia:()=>({matches:false}),AudioContext:AC};
global.FileReader=class{readAsArrayBuffer(){this.result={};this.onload()}};
global.__cuts=[];global.__timer=0;global.__bars=0;
const html=fs.readFileSync(__dirname+'/../mandala-prototype.html','utf8');let js=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));
const r=(a,b)=>{if(js.split(a).length!==2)throw new Error('hook '+a);js=js.replace(a,b)};
r('function onCut(c){starN++;','function onCut(c){starN++;global.__cuts.push([c.t,c.w,c.up,curTime()]);');
r('if(due(nextD,true)){starN++;var cur','if(due(nextD,true)){starN++;global.__timer++;var cur');
r('function onBar(){','function onBar(){global.__bars++;');
r('try{pre=preAnalyse(b);}catch(e){pre=null;}','try{pre=preAnalyse(b);}catch(e){pre=null;console.log("PRE ERROR",e);}global.__pre=pre;');
r('function progToTime(v){','global.__P=function(){return [P1,P2,P3,P4,PW,P6,P7,P8,PC].map(function(v){return pre.t0+v*(pre.t1-pre.t0);});};function progToTime(v){');
new Function(js)();
const step=()=>{t+=16.7;const f=cb;cb=null;f(t);};
const names=['Z','C','Rr','Pr','An','M1','M2','M3','Av','A','H','Ca','Cb','Bg'];
let seen=[],ev=[],last={},prev=null,log=[];
const frames=MODE==='demo'?60*112:60*165;
if(MODE==='track'){step();els.au.files=[{name:'test.wav'}];els.au.__change.forEach(f=>f.call(els.au));
 const p=global.__pre;console.log('下読み:',els.an.textContent);console.log('拍の間隔',p.Tb.toFixed(3),'秒 / 本編',p.t0.toFixed(1),'〜',p.t1.toFixed(1));
 console.log('区切り(秒:大きさ):',p.cuts.map(c=>c.t.toFixed(2)+':'+c.w.toFixed(2)+(c.up?'↑':'↓')).join(' '));}
let shotDone=false;
for(let i=0;i<frames;i++){step();const pr=els.po.textContent,ch=(els.msg.textContent||'').split(' ・ ')[2];if(seen[seen.length-1]!==ch)seen.push(ch);
 const st={'大波':cap.Bw&&cap.Bw[1]>0.5,'曼荼羅が消えた':cap.Md&&cap.Md[0]<0.01,'クレジット':!!(els.credit&&els.credit.classList.on===true),'字':gd>(last.gd||0)};
 for(const k in st){if(st[k]&&!last[k])ev.push(k+'@'+pr);last[k]=st[k];}last.gd=gd;
 const cur={};names.forEach(n=>cur[n]=cap[n]?cap[n].slice():[]);
 if(prev){const d={};names.forEach(n=>{let m=0;for(let q=0;q<cur[n].length;q++){if((n==='Ca'||n==='Cb')&&!(prev.A[Math.floor(q/3)]>0.03))continue;/* 見えていない曼荼羅の色は数えない */const dd=Math.abs(cur[n][q]-(prev[n][q]||0));if(dd>m)m=dd;}d[n]=m;});log.push({ch,d});}
 prev=cur;
 if(MODE==='demo'&&!shotDone&&ch==='曼荼羅'&&log.filter(l=>l.ch==='曼荼羅').length===60){shotDone=true;(els.sh.__click||[]).forEach(f=>f.call(els.sv));console.log('保存ボタン後 Rr[0..2]:',cap.Rr.slice(0,3).map(v=>v.toFixed(3)).join(','),'Z:',cap.Z[0].toFixed(3));}}
console.log('NaN/inf:',nan,'| 章:',seen.join(' → '));console.log('出来事:',ev.join('  '));
/* 「秩序へ」→「曼荼羅」の境目: 1コマあたりの変化量を、前後で比べる */
const bi=log.findIndex(l=>l.ch==='曼荼羅');
if(bi>0){const mx=(a,b,n)=>Math.max(...log.slice(a,b).map(l=>l.d[n]));
 console.log('境目のコマ番号',bi,'  [直前60コマの最大 | 境目の1コマ | 直後60コマの最大 | 直後60コマの最小]');
 names.forEach(n=>console.log(' ',n.padEnd(3),mx(bi-60,bi,n).toExponential(2),'|',log[bi].d[n].toExponential(2),'|',mx(bi+1,bi+61,n).toExponential(2),'|',Math.min(...log.slice(bi+1,bi+61).map(l=>l.d[n])).toExponential(2)));
 const m=log.filter(l=>l.ch==='曼荼羅');console.log('曼荼羅の章',m.length,'コマ: 流れ(Z)が止まったコマ',m.filter(l=>l.d.Z===0).length,'/ 輪の回転(Rr)が止まったコマ',m.filter(l=>l.d.Rr===0).length);}
if(MODE==='track'){const c=global.__cuts;console.log('実行された場面転換',c.length,'回 / 時計まかせの転換',global.__timer,'回 / 小節の頭での形の変化',global.__bars,'回');
 console.log('転換の時刻と、いちばん近い4小節の頭(2+8k秒)からのずれ:',c.map(q=>q[3].toFixed(2)+'('+(((q[0]-2+4)%8)-4).toFixed(2)+')').join(' '));}
{const ca=[];let pv=null;/* 色: 「秩序へ」〜「曼荼羅」の間の、1コマあたり最大の色変化 */}

{const o=log.filter(l=>l.ch==='秩序へ'),m=n=>Math.max(...o.map(l=>l.d[n]));const tot=n=>o.reduce((q,l)=>q+l.d[n],0);console.log('色の変化(秩序へ',o.length,'コマ): 1コマ最大 Ca',m('Ca').toExponential(2),'Bg',m('Bg').toExponential(2),'| 最大の変化が全体に占める割合(小さいほど滑らか)',(m('Ca')/tot('Ca')).toFixed(4));
const f=log.filter(l=>l.ch==='曼荼羅');console.log('色の変化(曼荼羅): 1コマ最大 Ca',Math.max(...f.map(l=>l.d.Ca)).toExponential(2));}

if(MODE==='track'){const P=global.__P(),nm=['一点→誕生','誕生→生成','生成→秩序へ','秩序へ→曼荼羅','大波','字','曼荼羅が消える','字が砕ける','クレジット'];const pc=global.__pre;console.log('節の頭(秒):',pc.cuts.map(c=>c.t.toFixed(1)).join(' '));console.log('章の変わり目と、いちばん近い節の頭からのずれ(秒):');P.slice(0,5).forEach((t,i)=>{let d=99;pc.cuts.forEach(c=>{if(Math.abs(c.t-t)<Math.abs(d))d=t-c.t});console.log('  ',nm[i].padEnd(8),t.toFixed(2),'秒  ずれ',d.toFixed(2));});}
