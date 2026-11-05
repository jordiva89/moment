// La versión llega en la URL con la que index.html registra este archivo
// (sw.js?v=3.85). Así basta con subir APP_VERSION para que la caché se renueve:
// no hay que acordarse de tocar nada aquí.
const CACHE = 'mpt-v' + ((new URL(self.location)).searchParams.get('v') || 'dev').replace(/\./g,'_');
const FILES = ['./', './index.html', './i18n.js', './contenido.js', './practices.js', './estilos.css', './noveno-es.png', './noveno-en.png', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  // la lógica de la app, en el mismo orden en que la carga index.html
  './js/base.js', './js/registro.js', './js/saneado.js', './js/idioma.js', './js/configuracion.js', './js/adjuntos.js', './js/plan.js', './js/azar.js', './js/avisos.js', './js/reloj.js', './js/bienvenida.js', './js/momentos.js', './js/vistas.js', './js/biblioteca.js', './js/archivos.js', './js/compartir.js', './js/noveno.js', './js/ajustes.js', './js/calendario.js', './js/arranque.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// RED PRIMERO para el código (index, prácticas, manifest): siempre la última versión
// publicada; la caché solo entra en juego sin conexión. Los iconos van con caché primero.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const esCodigo = e.request.mode === 'navigate' ||
    /(index\.html|practices\.js|manifest\.webmanifest|sw\.js)$/.test(url.pathname) ||
    url.pathname.endsWith('/');
  if (esCodigo) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone();
      if (url.origin === location.origin) caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const id = (e.notification.data && e.notification.data.id) || '';

  if (e.action === 'done') {
    e.waitUntil(
      clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
        if (list.length) { list[0].postMessage({type: 'done-practice', id}); return; }
        return clients.openWindow('./index.html?h=' + encodeURIComponent(id));
      })
    );
    return;
  }

  if (e.action === 'snooze') {
    e.waitUntil(
      clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
        if (list.length) { list[0].postMessage({type: 'snooze-practice', id}); return; }
        return clients.openWindow('./index.html?s=' + encodeURIComponent(id));
      })
    );
    return;
  }

  e.waitUntil(
    clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
      for (const c of list) {
        if ('focus' in c) { c.focus(); c.postMessage({type: 'open-practice', id}); return; }
      }
      return clients.openWindow('./index.html?p=' + encodeURIComponent(id));
    })
  );
});
