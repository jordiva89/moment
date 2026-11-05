// Carga real: abre www/index.html como lo haría el móvil, con cada script como
// archivo aparte (no incrustado), y comprueba que la app arranca sin errores.
//
//   node tools/auditoria/carga.js
//
// Las demás pruebas incrustan los scripts en el HTML. Esta no: así detecta lo
// que solo pasa al cargar archivos separados, como un módulo que use al cargar
// algo que se define en otro posterior.
const entorno = require('./entorno');
const { JSDOM, VirtualConsole, requestInterceptor } = require(entorno.rutaJsdom());
const path = require('path'), fs = require('fs');

// Sirve los archivos de www/ como si vinieran de la app (https://app.local/...):
// con file:// el navegador no da almacenamiento local y la app no arrancaría.
// Cualquier otra dirección se rechaza: la app no debe pedir nada de fuera.
const externas = [];
const local = requestInterceptor(request => {
  const u = new URL(request.url);
  if (u.host !== 'app.local'){ externas.push(request.url); return new Response('', { status: 404 }); }
  const f = path.join(entorno.WWW, decodeURIComponent(u.pathname));
  if (!f.startsWith(entorno.WWW) || !fs.existsSync(f)) return new Response('', { status: 404 });
  const tipo = f.endsWith('.js') ? 'application/javascript' : f.endsWith('.css') ? 'text/css' : 'application/octet-stream';
  return new Response(fs.readFileSync(f), { headers: { 'Content-Type': tipo } });
});

function abrir(nativo){
  return new Promise(res => {
    const errores = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errores.push(String(e && (e.detail || e.message) || e)));
    const dom = new JSDOM(entorno.indexHtml(), {
      url: 'https://app.local/index.html',
      runScripts: 'dangerously', resources: { interceptors: [local] }, virtualConsole: vc, pretendToBeVisual: true,
      beforeParse(w){
        w.localStorage.setItem('mpt_cfg', JSON.stringify({startH:8,startM:0,freq:2,span:14,favPerDay:1,catsPref:{},visDia:false}));
        w.localStorage.setItem('mpt_lang', JSON.stringify('es'));
        w.localStorage.setItem('mpt_accept', JSON.stringify({v:1,ts:1}));
        w.scrollTo=()=>{}; w.confirm=()=>true; w.alert=()=>{}; w.fetch=()=>Promise.reject();
        w.Notification=function(){}; w.Notification.permission='granted';
        w.navigator.serviceWorker={register:()=>Promise.resolve({update(){}}),addEventListener:()=>{},getRegistration:()=>Promise.resolve(null)};
        if (nativo) w.Capacitor={ isNativePlatform:()=>true, Plugins:{
          Ajustes:{ renombrarCanal:()=>Promise.resolve(), listarArchivosMoment:()=>Promise.resolve({archivos:[]}), infoDispositivo:()=>Promise.resolve({}) },
          LocalNotifications:{ checkPermissions:()=>Promise.resolve({display:'granted'}), requestPermissions:()=>Promise.resolve({display:'granted'}),
            schedule:()=>Promise.resolve(), cancel:()=>Promise.resolve(), getPending:()=>Promise.resolve({notifications:[]}),
            addListener:()=>Promise.resolve(), removeAllListeners:()=>Promise.resolve(), createChannel:()=>Promise.resolve(),
            listChannels:()=>Promise.resolve({channels:[]}), deleteChannel:()=>Promise.resolve(), registerActionTypes:()=>Promise.resolve() },
          App:{ addListener:()=>Promise.resolve({remove(){}}), removeAllListeners:()=>Promise.resolve() } } };
      }
    });
    dom.window.addEventListener('load', () => setTimeout(() => {
      const main = dom.window.document.getElementById('main');
      res({ errores, arranco: !!(main && main.innerHTML.length > 200), w: dom.window });
    }, 3500));   // la pantalla de bienvenida (splash) se retira a los pocos segundos
  });
}

(async () => {
  let mal = 0;
  for (const nativo of [true, false]){
    const r = await abrir(nativo), modo = nativo ? 'APK' : 'web';
    const errs = r.errores.filter(e => !/Not implemented/.test(e));
    console.log((r.arranco ? 'OK ' : 'MAL ') + modo + ': la app arranca y pinta la Agenda');
    console.log((errs.length ? 'MAL ' : 'OK ') + modo + ': sin errores al cargar' + (errs.length ? ' → ' + errs.slice(0,3).join(' | ') : ''));
    if (!r.arranco || errs.length) mal++;
    r.w.close();
  }
  console.log((externas.length ? 'MAL ' : 'OK ') + 'ninguna petición fuera de la app' + (externas.length ? ' → ' + externas.join(', ') : ''));
  if (externas.length) mal++;
  console.log('\nRESULTADO: ' + (mal ? 'FALLOS' : 'TODO OK'));
  process.exit(mal ? 1 : 0);
})();
