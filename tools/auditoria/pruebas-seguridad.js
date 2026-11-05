// Pruebas de SEGURIDAD: datos preparados con mala intención.
//
//   node tools/auditoria/pruebas-seguridad.js
//
// Simula lo peor que puede llegar a la app desde fuera —una copia de seguridad o
// un archivo de prácticas manipulados— y comprueba que nada de eso se ejecuta:
// ni etiquetas que se cuelan en la pantalla, ni enlaces «javascript:», ni código
// metido en los botones a través de un identificador.
const entorno = require('./entorno');
const { JSDOM } = require(entorno.rutaJsdom());
const fs = require('fs'), path = require('path');
const html = entorno.htmlConScripts();

// ---------- la carga maliciosa ----------
const X = n => `<img id="xss${n}" src="x" onerror="window.__xss=${n}">`;
const MAL = {
  mpt_userlib: [
    { id: "u1');window.__xss=90;('", title: 'id con código', text: 't', cat: 'Meditación' },
    { id: 'u2', title: X(1), text: X(2), cat: '"><svg id="xss3" onload="window.__xss=3">', link: 'javascript:window.__xss=4' },
    { id: 'u3', title: 'Enlace con comillas', text: 't', cat: 'Mia', link: 'https://ejemplo.com/a" onmouseover="window.__xss=5' },
  ],
  mpt_cfg: { startH: X(6), startM: 0, freq: 2, span: 14, favPerDay: 1, visDia: false, catsPref: { 'a&quot;);window.__xss=7;//': true },
             azar: { on: true, ini: X(12), fin: 1260, min: '<b>', max: 5, excl: ["');window.__xss=93;('", X(13)] } },
  mpt_events: [
    { id: 'e1', pid: 'u2', title: X(8), time: 600, rep: 'daily', n: 2, startY: 2026, startM: 1, startD: 1 },
    { id: "e2');window.__xss=91;('", pid: 'p001', title: 'x', time: 660, rep: 'daily', startY: 2026, startM: 1, startD: 1 },
  ],
  mpt_favs: ['p001', "x');window.__xss=92;('"],
  mpt_idiomas: { zz: { codigo: 'zz', nombre: X(9), esquema: 1, interfaz: { app_title: X(10) }, practicas: {} } },
  mpt_stats: { lastOpen: 0, lastDone: 0, lastSend: 0, days: { '2026-08-29': { h: '<b>', ps: ['p001'], pv: 0, hor: {}, camb: { u2: 3 }, extra: 0 } } },
  mpt_lang: 'es',
  mpt_accept: { v: 1, ts: 1 },
};

function arrancar(datos){
  return new Promise(res => {
    const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://app.local/',
      beforeParse(w){
        const R = w.Date;
        class FD extends R{ constructor(...a){ a.length ? super(...a) : super(2026,7,29,9,0,0); } static now(){ return new R(2026,7,29,9,0,0).getTime(); } }
        w.Date = FD;
        Object.entries(datos).forEach(([k, v]) => w.localStorage.setItem(k, JSON.stringify(v)));
        w.scrollTo=()=>{}; w.requestAnimationFrame=f=>{ try{ f(); }catch(e){} };
        w.confirm=()=>true; w.alert=()=>{}; w.fetch=()=>Promise.reject();
        w.Notification=function(){}; w.Notification.permission='granted';
        w.navigator.serviceWorker={register:()=>Promise.resolve({update(){}}),addEventListener:()=>{},getRegistration:()=>Promise.resolve(null)};
        w.Capacitor={ isNativePlatform:()=>true, Plugins:{
          Ajustes:{ renombrarCanal:()=>Promise.resolve(), listarArchivosMoment:()=>Promise.resolve({archivos:[]}), infoDispositivo:()=>Promise.resolve({}) },
          LocalNotifications:{ checkPermissions:()=>Promise.resolve({display:'granted'}), requestPermissions:()=>Promise.resolve({display:'granted'}),
            schedule:()=>Promise.resolve(), cancel:()=>Promise.resolve(), getPending:()=>Promise.resolve({notifications:[]}),
            addListener:()=>Promise.resolve(), removeAllListeners:()=>Promise.resolve(), createChannel:()=>Promise.resolve(),
            listChannels:()=>Promise.resolve({channels:[]}), deleteChannel:()=>Promise.resolve(), registerActionTypes:()=>Promise.resolve() },
          App:{ addListener:()=>Promise.resolve({remove(){}}), removeAllListeners:()=>Promise.resolve() } } };
      }});
    setTimeout(() => res(dom.window), 2500);
  });
}

const res = []; const ok = (n, c) => res.push((c ? 'OK ' : 'MAL ') + n);
// ¿Se ha colado algo en la pantalla?
function limpio(w){
  const d = w.document;
  const etiquetas = [...Array(14).keys()].some(n => d.getElementById('xss' + n));
  const enlaces = [...d.querySelectorAll('a[href]')].some(a => /^\s*javascript:/i.test(a.getAttribute('href')));
  // En un atributo onclick/onchange, la carga puede aparecer como DATO dentro de una
  // cadena de texto (eso es correcto: no se ejecuta). Solo cuenta si queda fuera.
  const sinCadenas = v => v.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  const handlers = [...d.querySelectorAll('*')].some(el => [...el.attributes].some(at => /^on/i.test(at.name) && /__xss/.test(sinCadenas(at.value))));
  if (process.env.DEPURAR && (etiquetas || enlaces || handlers)){
    [...Array(14).keys()].forEach(n => { const el = d.getElementById('xss' + n); if (el) console.log('  colado xss' + n + ' en', (el.parentElement && el.parentElement.outerHTML || '').slice(0, 300)); });
    [...d.querySelectorAll('*')].forEach(el => [...el.attributes].forEach(at => { if (/^on/i.test(at.name) && /__xss/.test(sinCadenas(at.value))) console.log('  atributo', at.name, '=', at.value.slice(0,120), 'en <' + el.tagName + '>'); }));
  }
  return !etiquetas && !enlaces && !handlers && w.__xss === undefined;
}

(async () => {
 try{
  // ---------- 1. Enlaces ----------
  const w0 = await arrancar({ mpt_lang: 'es', mpt_accept: { v: 1, ts: 1 }, mpt_cfg: { startH: 8, startM: 0, freq: 2, span: 14 } });
  ok('enlace: «javascript:» se rechaza', w0.enlaceSeguro('javascript:alert(1)') === '' && w0.enlaceSeguro(' JavaScript:alert(1)') === '');
  ok('enlace: data: y file: se rechazan', w0.enlaceSeguro('data:text/html,<b>') === '' && w0.enlaceSeguro('file:///etc/passwd') === '');
  ok('enlace: «www…» sin protocolo se completa', w0.enlaceSeguro('www.youtube.com/watch?v=1') === 'https://www.youtube.com/watch?v=1');
  ok('enlace: las comillas no rompen el HTML', !/"/.test(w0.enlaceSeguro('https://ejemplo.com/a" onmouseover="x')));
  ok('enlace: uno normal no cambia', w0.enlaceSeguro('https://www.youtube.com/watch?v=abc') === 'https://www.youtube.com/watch?v=abc');

  // ---------- 2. Una copia de seguridad manipulada ----------
  const copia = { app: 'momento-para-ti', data: {} };
  Object.entries(Object.assign({}, MAL, { mpt_plans: { x: 1 }, mpt_log: '<script>', mpt_otra: 'x' }))
    .forEach(([k, v]) => { copia.data[k] = JSON.stringify(v); });
  ok('copia: se acepta y se sanea', w0.aplicarCopia(copia) === true);
  const LS = k => JSON.parse(w0.localStorage.getItem(k));
  const lib = LS('mpt_userlib') || [];
  ok('copia: fuera las prácticas con identificador raro', lib.length === 2 && lib.every(p => /^[A-Za-z0-9_-]+$/.test(p.id)));
  ok('copia: fuera los enlaces peligrosos', !lib.some(p => /javascript:|"/.test(p.link || '')));
  ok('copia: la configuración vuelve a ser números', LS('mpt_cfg').startH === 7);
  ok('copia: fuera los momentos con identificador raro', (LS('mpt_events') || []).length === 1);
  ok('copia: fuera las favoritas raras', JSON.stringify(LS('mpt_favs')) === '["p001"]');
  ok('copia: un idioma con HTML no entra', JSON.stringify(LS('mpt_idiomas')) === '{}');
  ok('copia: no se traen ni cachés ni claves desconocidas', w0.localStorage.getItem('mpt_plans') === null && w0.localStorage.getItem('mpt_log') === null && w0.localStorage.getItem('mpt_otra') === null);
  ok('copia: un archivo que no es de Moment se rechaza', w0.aplicarCopia({ app: 'otra', data: {} }) === false);
  w0.close();

  // ---------- 3. Datos ya guardados por una versión anterior ----------
  // (como si la copia manipulada se hubiera importado antes de esta versión)
  const w = await arrancar(MAL);
  ok('al arrancar: se sanean las prácticas guardadas', w.eval('userLib.length') === 2 && w.eval('userLib.every(p=>esId(p.id))'));
  ok('al arrancar: se descarta el idioma con HTML', w.eval('!idiomasPropios.zz') && w.eval("JSON.stringify(LS.get('mpt_idiomas',{}))") === '{}');
  ok('al arrancar: la configuración es válida', w.eval('typeof cfg.startH') === 'number');
  ok('al arrancar: el modo al azar queda con números válidos', w.eval('cfg.azar.on') === true && w.eval('cfg.azar.ini') === 540 && w.eval('cfg.azar.min') === 3);
  w.gotoTab('home'); w.eval('expandedSlots=new Set(dayState.plan.map((s,i)=>i))'); w.renderHome();
  ok('Agenda: nada se cuela', limpio(w));
  w.gotoTab('lib'); w.eval('expandedPropias=new Set(userLib.map(p=>p.id)); expandedLib=new Set(userLib.map(p=>p.id)); showPropias=true'); w.renderLib();
  ok('Biblioteca: nada se cuela', limpio(w));
  w.renderFullPractice('u2', 'lib');
  ok('Práctica a pantalla completa: nada se cuela', limpio(w));
  w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet();
  ok('Ajustes (con estadísticas): nada se cuela', limpio(w));
  w.openEventForm('e1');
  ok('Formulario del momento: nada se cuela', limpio(w));
  w.closeModal();
  w.gotoTab('fav');
  ok('El Noveno Camino: nada se cuela', limpio(w));
  ok('ningún código llegó a ejecutarse', w.__xss === undefined);
  w.close();

  // ---------- 4. Política de contenido y cabeceras ----------
  const idx = entorno.indexHtml();
  const csp = (idx.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  ok('la app declara su política de contenido', /connect-src 'self'/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'none'/.test(csp) && /default-src 'self'/.test(csp));
  ok('sin «unsafe-eval»', !/unsafe-eval/.test(csp));
  const toml = fs.readFileSync(path.join(entorno.RAIZ, 'netlify.toml'), 'utf8');
  ok('Netlify: misma política y sin marcos ajenos', toml.includes(csp.replace(/;?\s*$/, '')) && /frame-ancestors 'none'/.test(toml) && /X-Content-Type-Options = "nosniff"/.test(toml));
  ok('Netlify: publica la carpeta www', /publish = "www"/.test(toml));
  const sw = entorno.leer('sw.js');
  ok('el service worker guarda todos los scripts', entorno.scripts().every(f => sw.includes("'./" + f + "'")));
  const java = fs.readFileSync(path.join(entorno.RAIZ, 'tools', 'prepare-android.js'), 'utf8');
  ok('Android: los nombres de archivo no pueden salir de su carpeta', (java.match(/new File\(nombre\)\.getName\(\)/g) || []).length === 2);
  const firma = fs.readFileSync(path.join(entorno.RAIZ, 'tools', 'setup-signing.js'), 'utf8');
  ok('firma: las contraseñas se leen de los secretos', /ANDROID_KEYSTORE_PASSWORD/.test(firma) && !/storePassword 'momento2026'/.test(firma));
 }catch(e){ res.push('MAL excepción: ' + e.message); }
 console.log(res.join('\n'));
 const fallos = res.filter(r => r.startsWith('MAL')).length;
 console.log('\nRESULTADO: ' + (fallos ? 'FALLOS (' + fallos + ')' : 'TODO OK (' + res.length + ')'));
 process.exit(fallos ? 1 : 0);
})();
