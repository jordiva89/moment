/* Moment · Saneado de datos
   Todo lo que entra desde fuera (una copia de seguridad, un archivo de prácticas,
   un idioma) se revisa aquí antes de guardarlo o de pintarlo: tipos correctos,
   tamaños razonables, identificadores sin caracteres raros y enlaces solo web.

   Por qué importa: la app pinta HTML y usa los identificadores dentro de botones.
   Un archivo preparado con mala intención (una «copia» recibida por mensaje, por
   ejemplo) podía colar código que se ejecutara dentro de la app. Además de
   escapar al pintar, aquí se corta el problema en la entrada.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden. Se carga justo después de base.js y registro.js. */

// Identificadores de prácticas, momentos y adjuntos: letras, números, guion y guion bajo
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const esId = x => typeof x === 'string' && ID_RE.test(x);
// Texto plano con un tamaño máximo (el escapado se hace al pintar)
function texto(x, max){ return (typeof x === 'string' ? x : (x == null ? '' : String(x))).slice(0, max || 500); }
// Número entero dentro de un rango; si no lo es, el valor por defecto
function entero(x, min, max, def){ const n = Math.round(Number(x)); return Number.isFinite(n) && n >= min && n <= max ? n : def; }

/* Enlace seguro: solo http y https. Un enlace «javascript:» ejecutaría código al
   tocarlo, y uno con comillas podía romper el HTML. Se acepta también «www.…»
   sin protocolo, que es como lo escribe mucha gente. Devuelve '' si no vale. */
function enlaceSeguro(u){
  let s = (typeof u === 'string' ? u : '').trim();
  if (!s || s.length > 2000) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)){
    if (/^[\w-]+(\.[\w-]+)+([/?#:]|$)/.test(s)) s = 'https://' + s; else return '';
  }
  try{
    const url = new URL(s);
    return (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : '';
  }catch(e){ return ''; }
}
// Un valor dentro de un atributo onclick="…": JSON para el código, escapado para el HTML
function jsAttr(x){ return esc(JSON.stringify(x)); }

function sanearPractica(p){
  if (!p || typeof p !== 'object' || !esId(p.id)) return null;
  const title = texto(p.title, 300).trim();
  if (!title) return null;
  const o = { id: p.id, cat: texto(p.cat, 80).trim() || 'Importadas', title, text: texto(p.text, 20000) };
  const l = enlaceSeguro(p.link); if (l) o.link = l;
  const a = p.adj;
  if (a && typeof a === 'object' && esId(a.id) && ['image','audio','video'].includes(a.tipo))
    o.adj = { id: a.id, tipo: a.tipo, nombre: texto(a.nombre, 200), mime: texto(a.mime, 100), kb: entero(a.kb, 0, 1e7, 0) };
  return o;
}
function sanearEvento(e){
  if (!e || typeof e !== 'object' || !esId(e.id) || !esId(e.pid)) return null;
  const REP = ['daily','days','weekly','wdays','monthly','once'], DM = ['once','int','list'];
  const o = {
    id: e.id, pid: e.pid, title: texto(e.title, 300),
    time: entero(e.time, 0, 1439, 540),
    rep: REP.includes(e.rep) ? e.rep : 'daily',
    n: entero(e.n, 1, 366, 2),
    wd: [...new Set((Array.isArray(e.wd) ? e.wd : []).map(d => entero(d, 0, 6, -1)).filter(d => d >= 0))].sort((a,b) => a-b),
    veces: entero(e.veces, 0, 3650, 0),
    dmode: DM.includes(e.dmode) ? e.dmode : 'once',
    dcount: entero(e.dcount, 1, 24, 1), dgap: entero(e.dgap, 1, 24, 1),
    dtimes: (Array.isArray(e.dtimes) ? e.dtimes : []).map(m => entero(m, 0, 2879, -1)).filter(m => m >= 0).slice(0, 12),
    startY: entero(e.startY, 2000, 2200, new Date().getFullYear()),
    startM: entero(e.startM, 1, 12, 1), startD: entero(e.startD, 1, 31, 1),
  };
  if (e.excl) o.excl = true;
  return o;
}
function sanearIds(a, max){ return [...new Set((Array.isArray(a) ? a : []).filter(esId))].slice(0, max || 5000); }

/* Configuración: se corrigen los campos conocidos y, del resto, solo se conservan
   valores simples (sí/no, números, textos cortos sin marcas): así una versión
   futura no pierde ajustes y una copia manipulada no cuela nada. */
function sanearCfg(c){
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const o = {};
  Object.keys(c).forEach(k => {
    const v = c[k];
    if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) return;
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) o[k] = v;
    else if (typeof v === 'string' && v.length <= 40 && !/[<>"'`&]/.test(v)) o[k] = v;
  });
  o.startH = entero(c.startH, 0, 23, 7);
  o.startM = entero(c.startM, 0, 59, 0);
  o.freq = entero(c.freq, 1, 12, 3);
  o.span = entero(c.span, 0, 24, 12);
  if (c.favPerDay !== undefined) o.favPerDay = entero(c.favPerDay, 0, 100, 1);
  if (c.langBiblio !== undefined) o.langBiblio = c.langBiblio === 'en' ? 'en' : 'es';
  if (c.catsPref && typeof c.catsPref === 'object'){
    o.catsPref = {};
    Object.keys(c.catsPref).slice(0, 200).forEach(k => { if (c.catsPref[k] && k.length <= 80) o.catsPref[k] = true; });
  }
  // Modos: el patrón (sí/no) y las prácticas al azar
  if (c.patron !== undefined) o.patron = c.patron !== false;
  if (c.azar && typeof c.azar === 'object'){
    const z = c.azar, mx = entero(z.max, 1, 24, 5);
    o.azar = {
      on: !!z.on,
      ini: entero(z.ini, 0, 1439, 540), fin: entero(z.fin, 0, 1439, 1260),
      min: Math.min(entero(z.min, 1, 24, 3), mx), max: mx,
      excl: [...new Set((Array.isArray(z.excl) ? z.excl : []).filter(x => typeof x === 'string' && x.length <= 80))].slice(0, 200),
    };
  }
  if (c.constSem && typeof c.constSem === 'object'){
    const s = c.constSem;
    o.constSem = {
      on: !!s.on,
      dias: [...new Set((Array.isArray(s.dias) ? s.dias : []).map(d => entero(d, 0, 6, -1)).filter(d => d >= 0))].sort((a,b) => a-b),
      horas: [...new Set((Array.isArray(s.horas) ? s.horas : []).map(m => entero(m, 0, 1439, -1)).filter(m => m >= 0))].sort((a,b) => a-b).slice(0, 6),
    };
  }
  return o;
}
function sanearStats(s){
  const o = { lastOpen: 0, lastDone: 0, lastSend: 0, days: {} };
  if (!s || typeof s !== 'object') return o;
  ['lastOpen','lastDone','lastSend'].forEach(k => { o[k] = entero(s[k], 0, 8.64e15, 0); });
  const cuenta = obj => { const r = {}; if (obj && typeof obj === 'object') Object.keys(obj).slice(0, 500).forEach(k => { if (k.length <= 64) r[k] = entero(obj[k], 0, 1e6, 0); }); return r; };
  if (s.days && typeof s.days === 'object') Object.keys(s.days).slice(0, 400).forEach(k => {
    const d = s.days[k];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !d || typeof d !== 'object') return;
    o.days[k] = { h: entero(d.h, 0, 1e4, 0), ps: sanearIds(d.ps, 500), pv: entero(d.pv, 0, 1e5, 0),
                  hor: cuenta(d.hor), camb: cuenta(d.camb), extra: entero(d.extra, 0, 1e4, 0) };
  });
  return o;
}
function sanearDonelog(l){
  const o = {};
  if (l && typeof l === 'object' && !Array.isArray(l)) Object.keys(l).forEach(k => { if (esId(k)) { const n = entero(l[k], 0, 1e6, 0); if (n) o[k] = n; } });
  return o;
}

/* Copia de seguridad: solo las claves conocidas, cada una saneada. Las que son
   caché (el plan ya calculado, el registro de incidencias) no se traen: se
   rehacen solas. Devuelve {clave: valor} listo para guardar, o null. */
function sanearCopia(data){
  if (!data || typeof data !== 'object') return null;
  const leer = k => { try { return JSON.parse(data[k]); } catch(e) { return undefined; } };
  const tiene = k => Object.prototype.hasOwnProperty.call(data, k);
  const out = {};
  if (tiene('mpt_cfg')) { const c = sanearCfg(leer('mpt_cfg')); if (c) out.mpt_cfg = c; }
  if (tiene('mpt_userlib')) out.mpt_userlib = (Array.isArray(leer('mpt_userlib')) ? leer('mpt_userlib') : []).map(sanearPractica).filter(Boolean).slice(0, 5000);
  if (tiene('mpt_events')) out.mpt_events = (Array.isArray(leer('mpt_events')) ? leer('mpt_events') : []).map(sanearEvento).filter(Boolean).slice(0, 500);
  ['mpt_favs','mpt_paused','mpt_evpaused'].forEach(k => { if (tiene(k)) out[k] = sanearIds(leer(k)); });
  if (tiene('mpt_stats')) out.mpt_stats = sanearStats(leer('mpt_stats'));
  if (tiene('mpt_donelog')) out.mpt_donelog = sanearDonelog(leer('mpt_donelog'));
  if (tiene('mpt_lang')) { const l = leer('mpt_lang'); if (typeof l === 'string' && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(l)) out.mpt_lang = l; }
  if (tiene('mpt_idiomas')) {
    const ids = leer('mpt_idiomas'), ok = {};
    if (ids && typeof ids === 'object') Object.keys(ids).forEach(c => { const d = ids[c]; if (d && d.codigo === c && !revisarIdioma(d).length) ok[c] = d; });
    out.mpt_idiomas = ok;
  }
  ['mpt_alarm','mpt_notifOn','mpt_guiaVista'].forEach(k => { if (tiene(k)) out[k] = !!leer(k); });
  ['mpt_install','mpt_update','mpt_statsRemind'].forEach(k => { if (tiene(k)) { const n = entero(leer(k), 0, 8.64e15, -1); if (n >= 0) out[k] = n; } });
  if (tiene('mpt_accept')) { const a = leer('mpt_accept'); if (a && typeof a === 'object') out.mpt_accept = { v: entero(a.v, 0, 100, 1), ts: entero(a.ts, 0, 8.64e15, 0) }; }
  return Object.keys(out).length ? out : null;
}

/* Al arrancar se sanea también lo que ya está guardado: protege a quien importó
   una copia manipulada con una versión anterior. Si algo cambia, se guarda
   limpio. Lo legítimo que genera la app pasa sin cambios. */
// Comparación sin tener en cuenta el orden de las claves
function canonico(x){
  if (Array.isArray(x)) return '[' + x.map(canonico).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonico(x[k])).join(',') + '}';
  return JSON.stringify(x);
}
(function sanearAlArrancar(){
  try{
    const limpia = (clave, nombre, actual, nuevo) => {
      if (canonico(actual) === canonico(nuevo)) return actual;
      LS.set(clave, nuevo);
      // solo se anota si se ha descartado algo (no por completar campos que faltaban).
      // El nombre es técnico y sin el prefijo mpt_: el registro viaja en el diagnóstico.
      const antes = Array.isArray(actual) ? actual.length : 0, despues = Array.isArray(nuevo) ? nuevo.length : 0;
      if (antes > despues) anota('saneado', new Error(nombre + ': ' + (antes - despues) + ' descartado(s)'));
      return nuevo;
    };
    userLib    = limpia('mpt_userlib', 'userlib', userLib, (Array.isArray(userLib) ? userLib : []).map(sanearPractica).filter(Boolean));
    userEvents = limpia('mpt_events', 'events', userEvents, (Array.isArray(userEvents) ? userEvents : []).map(sanearEvento).filter(Boolean));
    favs       = limpia('mpt_favs', 'favs', favs, sanearIds(favs));
    paused     = limpia('mpt_paused', 'paused', paused, sanearIds(paused));
    evPaused   = limpia('mpt_evpaused', 'evpaused', evPaused, sanearIds(evPaused));
    stats      = limpia('mpt_stats', 'stats', stats, sanearStats(stats));
    if (cfg) cfg = limpia('mpt_cfg', 'cfg', cfg, sanearCfg(cfg));
  }catch(e){ anota('saneado', e); }
})();
