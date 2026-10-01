// Network-first: always fetch the latest files. The cache is only an offline fallback.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||!r.url.startsWith(self.location.origin))return;
  e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{const c=res.clone();caches.open('sudoku').then(x=>x.put(r,c));return res}).catch(()=>caches.match(r)));
});
