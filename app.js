(function(){
const E=window.SudokuEngine,$=s=>document.querySelector(s);
const NM={easy:'Easy',medium:'Medium',hard:'Hard',expert:'Expert'};
const LS={
  get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch{return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
};
let G=null,sel=-1,pencil=false,timer=null,hist=[];
let muted=LS.get('sdk_mute',false),cloud=null,pushT=null;
const BOX=i=>((i/27|0)*3)+((i%9)/3|0);
const peers=(a,b)=>a!==b&&((a/9|0)===(b/9|0)||a%9===b%9||BOX(a)===BOX(b));
const fmt=s=>String(s/60|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};

/* ---------- sound ---------- */
let ac=null;
function beep(f,d,type,v,delay){
  if(muted)return;
  try{
    ac=ac||new(window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended')ac.resume();
    const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+(delay||0);
    o.type=type||'sine';o.frequency.value=f;g.gain.setValueAtTime(v||.12,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
    o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d);
  }catch(e){}
}

/* ---------- sound toggle ---------- */
function applyTheme(){$('#mute').textContent=muted?'Sound off':'Sound on'}
$('#mute').onclick=()=>{muted=!muted;LS.set('sdk_mute',muted);applyTheme();beep(600,.06)};
applyTheme();

/* ---------- board ---------- */
const board=$('#board');
for(let i=0;i<81;i++){
  const c=document.createElement('div');
  c.className='cell';c.dataset.i=i;c.setAttribute('role','gridcell');c.tabIndex=-1;
  const col=i%9,row=i/9|0;
  if(col%3===2&&col<8)c.classList.add('cr');
  if(row%3===2&&row<8)c.classList.add('rb');
  board.append(c);
}
const pad=$('#pad');
for(let n=1;n<=9;n++){
  const b=document.createElement('button');b.dataset.n=n;b.innerHTML=n+'<small></small>';b.setAttribute('aria-label','Number '+n);
  b.onclick=()=>put(n);pad.append(b);
}
board.onclick=e=>{const c=e.target.closest('.cell');if(!c||!G)return;sel=+c.dataset.i;beep(480,.03);render()};

function render(){
  if(!G)return;
  const sv=sel>=0?G.cur[sel]:0,cells=board.children;
  for(let i=0;i<81;i++){
    const el=cells[i],v=G.cur[i];
    let cls='cell'+(el.classList.contains('cr')?' cr':'')+(el.classList.contains('rb')?' rb':'');
    if(G.puz[i])cls+=' given';
    if(i===sel)cls+=' sel';
    else if(sv&&v===sv)cls+=' same';
    else if(sel>=0&&peers(sel,i))cls+=' peer';
    if(v&&!G.puz[i]&&v!==G.sol[i])cls+=' err';
    el.className=cls;
    if(v)el.textContent=v;
    else if(G.notes[i]){
      let h='<div class="nts">';
      for(let n=1;n<=9;n++)h+='<i>'+((G.notes[i]>>n)&1?n:'')+'</i>';
      el.innerHTML=h+'</div>';
    }else el.textContent='';
  }
  [...pad.children].forEach(b=>{
    const n=+b.dataset.n;let left=9;
    for(let i=0;i<81;i++)if(G.cur[i]===n&&G.sol[i]===n)left--;
    b.disabled=left<=0;b.lastChild.textContent=left>0?left:'';
  });
  $('#time').textContent=fmt(G.secs);
  $('#miss').textContent='Mistakes '+G.mistakes;
  $('#diff').textContent=(G.daily?'Daily · ':'')+NM[G.diff];
  $('#hint').textContent='Hint '+(3-G.hints);
  $('#hint').disabled=G.hints>=3;
  $('#notes').classList.toggle('on',pencil);$('#notes').setAttribute('aria-pressed',pencil);
  $('#undo').disabled=!hist.length;
}

/* ---------- moves ---------- */
const snap=()=>{hist.push({c:G.cur.slice(),n:G.notes.slice()});if(hist.length>200)hist.shift()};
function prune(i,v){for(let j=0;j<81;j++)if(peers(i,j))G.notes[j]&=~(1<<v)}
function put(v){
  if(!G||G.done||sel<0||G.puz[sel])return;
  if(!v){if(G.cur[sel]||G.notes[sel]){snap();G.cur[sel]=0;G.notes[sel]=0;beep(300,.05);after()}return}
  if(pencil){if(G.cur[sel])return;snap();G.notes[sel]^=1<<v;beep(520,.04);render();save();return}
  if(v===G.cur[sel])return;
  snap();G.cur[sel]=v;G.notes[sel]=0;
  if(v!==G.sol[sel]){G.mistakes++;beep(140,.25,'square',.08)}
  else{beep(700,.05);prune(sel,v)}
  after();
}
function after(){
  if(G.cur.every((x,i)=>x===G.sol[i]))win();
  render();save();
}
$('#undo').onclick=()=>{if(!hist.length||G.done)return;const h=hist.pop();G.cur=h.c;G.notes=h.n;beep(400,.04);render();save()};
$('#erase').onclick=()=>put(0);
$('#notes').onclick=()=>{pencil=!pencil;render()};
$('#hint').onclick=()=>{
  if(!G||G.done||G.hints>=3)return;
  let i=sel;
  if(i<0||G.cur[i]===G.sol[i])i=G.cur.findIndex((v,j)=>v!==G.sol[j]);
  if(i<0)return;
  snap();G.cur[i]=G.sol[i];G.notes[i]=0;G.hints++;sel=i;prune(i,G.sol[i]);beep(880,.1);after();
};
document.addEventListener('keydown',e=>{
  if(!G||$('#play').hidden)return;
  if(e.key>='1'&&e.key<='9')put(+e.key);
  else if(e.key==='Backspace'||e.key==='Delete'||e.key==='0')put(0);
  else if(e.key==='n'||e.key==='N'){pencil=!pencil;render()}
  else if((e.key==='z'||e.key==='Z')&&(e.ctrlKey||e.metaKey))$('#undo').click();
  else if(e.key.startsWith('Arrow')){
    e.preventDefault();if(sel<0)sel=40;
    const r=sel/9|0,c=sel%9;
    if(e.key==='ArrowUp'&&r>0)sel-=9;if(e.key==='ArrowDown'&&r<8)sel+=9;
    if(e.key==='ArrowLeft'&&c>0)sel--;if(e.key==='ArrowRight'&&c<8)sel++;
    render();
  }
});

/* ---------- game flow ---------- */
function save(){if(G&&!G.done){G.upd=Date.now();LS.set('sdk_game',G);LS.set('sdk_upd',G.upd);cloudPush()}}
function cloudPush(now){
  if(!cloud||!cloud.me())return;
  clearTimeout(pushT);
  const go=()=>cloud.push({
    game:JSON.stringify(LS.get('sdk_game',null)),upd:LS.get('sdk_upd',Date.now()),
    best:LS.get('sdk_best',{}),solved:LS.get('sdk_solved',0),daily:LS.get('sdk_daily',0)
  }).catch(()=>{});
  if(now)go();else pushT=setTimeout(go,4000);
}
async function pullSave(){
  try{
    const c=await cloud.pull();
    if(!c){cloudPush(true);return}
    const best=Object.assign({},LS.get('sdk_best',{}));
    for(const d in(c.best||{}))best[d]=best[d]?Math.min(best[d],c.best[d]):c.best[d];
    LS.set('sdk_best',best);
    LS.set('sdk_solved',Math.max(LS.get('sdk_solved',0),c.solved||0));
    LS.set('sdk_daily',Math.max(LS.get('sdk_daily',0),c.daily||0));
    if((c.upd||0)>LS.get('sdk_upd',0)&&$('#play').hidden){
      LS.set('sdk_game',JSON.parse(c.game||'null'));LS.set('sdk_upd',c.upd);
    }else cloudPush(true);
    if(!$('#menu').hidden)menu();
  }catch(e){}
}
function startTimer(){
  clearInterval(timer);
  timer=setInterval(()=>{if(G&&!G.done&&document.visibilityState==='visible'){G.secs++;$('#time').textContent=fmt(G.secs);if(G.secs%5===0)save()}},1000);
}
function show(id){['menu','play','auth'].forEach(s=>$('#'+s).hidden=s!==id)}
function menu(){
  clearInterval(timer);save();cloudPush(true);show('menu');renderMe();
  const saved=LS.get('sdk_game',null);
  $('#cont').hidden=!saved;
  if(saved)$('#cont').textContent='Continue · '+(saved.daily?'Daily · ':'')+NM[saved.diff]+' · '+fmt(saved.secs);
  const best=LS.get('sdk_best',{}),solved=LS.get('sdk_solved',0);
  $('#best').innerHTML='Best times<br>'+Object.keys(NM).map(d=>NM[d]+' '+(best[d]?fmt(best[d]):'--:--')).join(' · ')+'<br>Puzzles solved: '+solved;
  $('#daily').textContent=LS.get('sdk_daily',0)===today()?'Daily puzzle · done today':'Daily puzzle';
}
function begin(){
  sel=-1;hist=[];pencil=false;show('play');render();startTimer();save();
}
function start(diff,daily){
  show('play');$('#diff').textContent='Preparing…';
  setTimeout(()=>{
    const r=daily?E.rng(today()):Math.random,p=E.generate(daily?'medium':diff,r);
    G={diff:daily?'medium':diff,daily:!!daily,puz:p.puz,sol:p.sol,cur:p.puz.slice(),notes:Array(81).fill(0),secs:0,mistakes:0,hints:0,done:false};
    begin();
  },30);
}
document.querySelectorAll('#levels .btn').forEach(b=>b.onclick=()=>start(b.dataset.d,false));
$('#daily').onclick=()=>start('medium',true);
$('#cont').onclick=()=>{G=LS.get('sdk_game',null);if(G)begin()};
$('#back').onclick=menu;

function win(){
  G.done=true;clearInterval(timer);
  const best=LS.get('sdk_best',{});
  const pb=!best[G.diff]||G.secs<best[G.diff];
  if(pb&&!G.daily){best[G.diff]=G.secs;LS.set('sdk_best',best)}
  LS.set('sdk_solved',LS.get('sdk_solved',0)+1);
  if(G.daily)LS.set('sdk_daily',today());
  LS.set('sdk_game',null);LS.set('sdk_upd',Date.now());cloudPush(true);
  [523,659,784,1047].forEach((f,i)=>beep(f,.3,'triangle',.15,i*.12));
  $('#wtxt').innerHTML=NM[G.diff]+(G.daily?' daily':'')+' puzzle<br>Time '+fmt(G.secs)+' · Mistakes '+G.mistakes+' · Hints '+G.hints+(pb&&!G.daily?'<br><b>New best time</b>':'');
  const cf=$('#confetti');cf.innerHTML='';
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)
    for(let i=0;i<26;i++){const s=document.createElement('span');s.textContent=['🎉','✨','⭐','🎊'][i%4];
      s.style.left=Math.random()*100+'%';s.style.animationDuration=3+Math.random()*3+'s';s.style.animationDelay=Math.random()*3+'s';cf.append(s)}
  $('#win').hidden=false;
}
$('#wnew').onclick=()=>{$('#win').hidden=true;start(G.daily?'medium':G.diff,false)};
$('#wmenu').onclick=()=>{$('#win').hidden=true;menu()};

/* ---------- login ---------- */
const fe=e=>({'auth/email-already-in-use':'That username is taken','auth/invalid-credential':'Wrong username or password','auth/user-not-found':'Wrong username or password','auth/wrong-password':'Wrong username or password','auth/operation-not-allowed':'Turn on this sign-in method in Firebase','auth/admin-restricted-operation':'Turn on Anonymous sign-in in Firebase','auth/network-request-failed':'No connection','permission-denied':'Database rules are blocking this'}[e.code]||e.message||String(e));
function renderMe(){
  const u=cloud&&cloud.me(),m=$('#me');m.innerHTML='';
  const nm=document.createElement('span');nm.className='uname';nm.textContent=u?'👤 '+u.name:'Not signed in';
  const b=document.createElement('button');b.className='btn sm';
  if(u){b.textContent='Log out';b.onclick=async()=>{await cloud.logout();renderMe()}}
  else{b.textContent='Sign in';b.onclick=()=>{$('#aerr').textContent=cloud?'':'Online save is not set up yet. Check firebase-config.js';show('auth')}}
  m.append(nm,b);
}
async function doAuth(kind){
  if(!cloud){$('#aerr').textContent='Online save is not set up yet. Check firebase-config.js';return}
  const t=$('#u').value.trim(),p=$('#p').value,ok=/^[A-Za-z0-9_]{3,14}$/.test(t);
  try{
    if(kind==='guest')await cloud.guest(ok?t:'Guest'+(1000+Math.floor(Math.random()*9000)));
    else{
      if(!ok)return void($('#aerr').textContent='Username: 3-14 letters, numbers or _');
      if(p.length<6)return void($('#aerr').textContent='Password needs 6 or more characters');
      kind==='up'?await cloud.signUp(t,p):await cloud.signIn(t,p);
    }
    $('#aerr').textContent='';renderMe();pullSave();menu();
  }catch(e){$('#aerr').textContent=fe(e)}
}
$('#signin').onclick=()=>doAuth('in');
$('#signup').onclick=()=>doAuth('up');
$('#guest').onclick=()=>doAuth('guest');
$('#aback').onclick=menu;
import('./sync.js?t='+Date.now()).then(m=>{cloud=m;m.onUser(()=>{renderMe();if(m.me())pullSave()})}).catch(e=>{console.error('Cloud save off:',e);renderMe()});

/* ---------- share ---------- */
async function share(text){
  const url=location.origin+location.pathname.replace(/index\.html$/,'');
  text=text||'Play Sudoku by Supermania Games:';
  if(navigator.share){try{await navigator.share({title:'Sudoku',text,url});return}catch(e){if(e.name==='AbortError')return}}
  window.open('https://wa.me/?text='+encodeURIComponent(text+'\n'+url),'_blank');
}
$('#shareapp').onclick=()=>share();
$('#wshare').onclick=()=>share('I solved a '+NM[G.diff]+' Sudoku in '+fmt(G.secs)+'. Can you beat it?');

/* ---------- back button goes to the menu (progress is saved) ---------- */
let armed=false;
document.addEventListener('pointerdown',()=>{if(!armed){armed=true;history.pushState({s:1},'')}},{passive:true});
addEventListener('popstate',()=>{armed=false;if(!$('#win').hidden)$('#wmenu').click();else if(!$('#play').hidden||!$('#auth').hidden)menu()});

/* ---------- updates always come from the network ---------- */
if('serviceWorker' in navigator){
  const had=!!navigator.serviceWorker.controller;let reloaded=false;
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{
    r.update();
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')r.update()});
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!reloaded){reloaded=true;location.reload()}});
}

/* ---------- install button ---------- */
let installEvt=null;
const standalone=(window.matchMedia&&matchMedia('(display-mode: standalone)').matches)||navigator.standalone;
const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
const showInstall=()=>{$('#install').hidden=!!standalone||(!installEvt&&!isIOS)};
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;showInstall()});
addEventListener('appinstalled',()=>{installEvt=null;showInstall()});
$('#install').onclick=async()=>{
  if(installEvt){installEvt.prompt();await installEvt.userChoice;installEvt=null;showInstall()}
  else alert('On iPhone: tap the Share button, then Add to Home Screen.');
};
showInstall();

/* ---------- reload when a newer version is on the server ---------- */
const FILES=['index.html','style.css','engine.js','app.js','sync.js','manifest.json'];
async function sig(){
  try{
    const t=await Promise.all(FILES.map(f=>fetch(f+'?t='+Date.now(),{cache:'no-store'}).then(r=>r.ok?r.text():'')));
    let h=0;for(const ch of t.join('|'))h=(h*31+ch.charCodeAt(0))|0;return h;
  }catch(e){return null}
}
let loadedSig=null;sig().then(s=>loadedSig=s);
document.addEventListener('visibilitychange',async()=>{
  if(document.visibilityState!=='visible'||loadedSig==null)return;
  const s=await sig();
  if(s!=null&&s!==loadedSig){save();location.reload()}
});
menu();
})();
