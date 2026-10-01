const list=document.getElementById('list');

// Finds a logo wherever it was uploaded: next to index.html or in a common sub folder.
const DIRS=['','logos/','images/','assets/','img/','icons/'];
function loadLogo(img,name,onFail){
  const bust=u=>u+(u.includes('?')?'&':'?')+'t='+Date.now();
  const urls=/^https?:\/\//.test(name)?[name]:DIRS.map(d=>d+name);
  let i=0;
  img.onerror=()=>{i++;if(i<urls.length)img.src=bust(urls[i]);else onFail()};
  img.src=bust(urls[0]);
}
document.querySelectorAll('img[data-logo]').forEach(img=>loadLogo(img,img.dataset.logo,()=>{
  img.replaceWith(Object.assign(document.createElement('b'),{className:'fallback',textContent:img.dataset.fb}));
}));

fetch('games.json?t='+Date.now(),{cache:'no-store'})
  .then(r=>r.json())
  .then(d=>d.games.forEach(g=>list.append(card(g))))
  .catch(()=>{list.innerHTML='<li class="err">Could not load the games list. Check games.json.</li>'});

function card(g){
  const li=document.createElement('li');
  const link=g.url&&!g.soon;
  const a=document.createElement(link?'a':'div');
  a.className='card'+(link?'':' soon');
  if(link)a.href=g.url;

  const lg=document.createElement('span');lg.className='lg';
  const img=document.createElement('img');img.alt='';
  const ph=()=>{img.remove();lg.textContent=(g.name||'?').trim()[0]||'?';lg.classList.add('ph')};
  if(g.logo){lg.append(img);loadLogo(img,g.logo,ph)}else ph();

  const tx=document.createElement('span');tx.className='tx';
  const nm=document.createElement('b');nm.textContent=g.name||'Game';
  const ds=document.createElement('small');ds.textContent=g.desc||'';
  tx.append(nm,ds);

  const go=document.createElement('span');go.className='go';
  go.textContent=link?'Play ▶':'Coming soon';

  a.append(lg,tx,go);li.append(a);return li;
}

document.getElementById('share').onclick=async()=>{
  const url=location.origin+location.pathname.replace(/index\.html$/,'');
  const text='Play games by Supermania Games:';
  if(navigator.share){try{await navigator.share({title:'Supermania Games',text,url});return}catch(e){if(e.name==='AbortError')return}}
  window.open('https://wa.me/?text='+encodeURIComponent(text+'\n'+url),'_blank');
};

if('serviceWorker' in navigator){
  const had=!!navigator.serviceWorker.controller;let reloaded=false;
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(r=>{
    r.update();
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')r.update()});
  });
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!reloaded){reloaded=true;location.reload()}});
}

// reload when a newer version is on the server
const FILES=['index.html','style.css','hub.js','games.json'];
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
  if(s!=null&&s!==loadedSig)location.reload();
});
