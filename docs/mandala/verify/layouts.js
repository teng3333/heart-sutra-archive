const fs=require('fs');const html=fs.readFileSync(__dirname+'/../mandala-prototype.html','utf8');const L=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>')).split('\n');
const a=L.findIndex(l=>l.startsWith('var TAU=')),b=L.findIndex(l=>l.startsWith('function build('));
const src=L.slice(a,b).join('\n');
for(const [AR,WN] of [[1,0],[16/9,2],[2.4,2]]){
 const f=new Function('AR','WN',src+';return makeFinal;')(AR,WN);
 let bad=0,maxS=0,maxC=0,minS=99,fam={},wingBad=0,over=0;
 for(let seed=0;seed<4000;seed++)for(let lv=0;lv<3;lv++)for(const free of [false,true]){
  const g=f(free?{free:true}:{sym:[5,6,7,8,9,10,12][seed%7]},seed,lv);const s=g.slots;
  maxS=Math.max(maxS,s.length);minS=Math.min(minS,s.length);const mc=Math.max(...s.map(q=>q.cls));maxC=Math.max(maxC,mc);
  if(s.length>12||mc>11||s.some(q=>!(q.r2>q.r1)||![q.cx,q.cy,q.r1,q.r2].every(isFinite)))bad++;
  const w=s.filter(q=>Math.abs(q.cx)>.5);if(w.length!==WN)wingBad++;
  fam[g.lay]=(fam[g.lay]||0)+1;}
 console.log('AR',AR.toFixed(2),'WN',WN,'| 枠の数',minS,'〜',maxS,'| 型番号の最大',maxC,'| 異常',bad,'| 両脇の数が違う',wingBad,'| 型',Object.keys(fam).length);
 if(WN){const g=f({sym:6},1,1);const w=g.slots.filter(q=>Math.abs(q.cx)>.5)[0];console.log('   両脇: 中心x',w.cx.toFixed(3),'半径',w.r2.toFixed(3),'| 画面の端',(AR/2).toFixed(3),'| 中央の曼荼羅(半径0.47)との重なり幅',(0.47-(Math.abs(w.cx)-w.r2)).toFixed(3));}
}
