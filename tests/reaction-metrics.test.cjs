const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function fixture(reply) {
  const nodes = [], data = new Map(), metrics = [], requests = [];
  function element(tag) {
    const e = { tag,children:[],dataset:{},value:'',listeners:{},hidden:false,
      appendChild(c){this.children.push(c);return c;},setAttribute(){},
      addEventListener(k,fn){this.listeners[k]=fn;},click(){return this.listeners.click?.();} };
    nodes.push(e);return e;
  }
  const document = {getElementById(){return null;},createElement:element,createTextNode:text=>({textContent:text}),head:element('head')};
  const storage = {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  const window = {OGSListening:{player:{feedback:(kind,id)=>metrics.push({kind,id})}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/js/reaction.js'),'utf8'), {
    window,document,location:{hostname:'localhost',search:''},localStorage:storage,sessionStorage:storage,
    URLSearchParams,Intl,navigator:{language:'en'},setTimeout(){},
    fetch:(url,opts)=>{requests.push({url,body:JSON.parse(opts.body)});return reply();}
  });
  const widget = window.OGSReaction.mount(element('box'),{page:'player'});widget.setTrack(173);
  return {nodes,data,metrics,requests,widget,send:()=>nodes.find(e=>e.tag==='button'&&String(e.textContent).startsWith('Yes,')).click()};
}
const settle = () => new Promise(resolve=>setImmediate(resolve));
test('feedback counts only confirmed API success, not opening the form',async()=>{
  const f=fixture(()=>Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true})}));
  f.nodes.find(e=>e.tag==='button'&&e.className==='ogs-react-open').click();
  assert.deepEqual(f.metrics,[{kind:'open',id:173}]);
  f.send();await settle();assert.deepEqual(f.metrics[1],{kind:'sent',id:173});
  assert.equal(f.data.get('ogs_reacted_173'),'1');
  f.send();await settle();assert.equal(f.requests.length,1);
});
test('HTTP or JSON failure never counts as successful feedback',async()=>{
  for(const response of [{ok:false,json:()=>Promise.resolve({error:'invalid_track'})},{ok:true,json:()=>Promise.resolve({ok:false})}]){
    const f=fixture(()=>Promise.resolve(response));f.send();await settle();
    assert.equal(f.metrics.length,0);assert.equal(f.data.has('ogs_reacted_173'),false);
  }
});
test('network failure never counts as feedback',async()=>{
  const f=fixture(()=>Promise.reject(Error('offline')));f.send();await settle();assert.equal(f.metrics.length,0);
});
test('track change during submission does not attribute feedback to next track',async()=>{
  let resolve;const f=fixture(()=>new Promise(r=>{resolve=r;}));f.send();f.widget.setTrack(174);
  resolve({ok:true,json:()=>Promise.resolve({ok:true})});await settle();
  assert.deepEqual(f.metrics,[{kind:'sent',id:173}]);
  assert.equal(f.data.has('ogs_reacted_174'),false);
});
test('honeypot response is not sent to analytics and no personal fields enter metrics',async()=>{
  const f=fixture(()=>Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true})}));
  f.nodes.find(e=>e.name==='website').value='bot';f.send();await settle();assert.equal(f.metrics.length,0);
  const g=fixture(()=>Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true})}));
  g.nodes.find(e=>e.tag==='textarea').value='TEST_COMMENT';
  g.nodes.find(e=>e.tag==='input'&&e.maxLength===60).value='TEST_NAME';
  g.send();await settle();assert.deepEqual(g.metrics,[{kind:'sent',id:173}]);
});
