// Network-first: every request goes to the server (HTTP cache bypassed).
// The cache is used ONLY when the network fails (offline).
const NAME='hub-offline';
const key=u=>u.split('?')[0];
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||!r.url.startsWith(self.location.origin))return;
  e.respondWith(
    fetch(r,{cache:'no-store'}).then(res=>{
      const copy=res.clone();
      caches.open(NAME).then(c=>c.put(key(r.url),copy));
      return res;
    }).catch(()=>caches.match(key(r.url)))
  );
});
