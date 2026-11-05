/* Moment · Idiomas
   Textos de la interfaz, idiomas importados y su revisión, y traducir desde la app.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

// Idioma: 'es' o 'en'. Se elige en el onboarding y se puede cambiar en Datos y privacidad.
// Si no se ha elegido aún, se intenta detectar del sistema (en → inglés; resto → español).
let LANG = LS.get('mpt_lang', null);
function detectLang(){
  // Se miran TODOS los idiomas preferidos del sistema, y las lenguas cooficiales
  // (catalán, gallego, euskera) cuentan como español: un móvil en catalán debe
  // arrancar en español, no en inglés.
  try{
    const ls=(navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language||'es']);
    for(const l of ls){
      const c=(l||'').toLowerCase().slice(0,2);
      if(['es','ca','gl','eu'].includes(c)) return 'es';
      if(c==='en') return 'en';
    }
    return 'es';
  }catch(e){ return 'es'; }
}
function getLang(){ return LANG || detectLang(); }
function setLang(l){ LANG=l; LS.set('mpt_lang', l); try{ applyNavLang(); }catch(e){} try{ refreshPracticesLang(); }catch(e){} try{ sincronizarCanal(); }catch(e){} }

// Lo que le falte al idioma activo se muestra en el idioma de respaldo (español o
// inglés, el elegido en Ajustes) y, en último caso, en español. Así se ven también
// los textos legales de un idioma aportado por la comunidad, que nunca se traducen.
function t(key){
  const l=getLang();
  const v=I18N[l] && I18N[l][key];
  if(v) return v;
  if(l!=='es' && l!=='en'){ const r=langRespaldo(); if(I18N[r] && I18N[r][key]) return I18N[r][key]; }
  return I18N.es[key] || key;
}
/* Idioma de respaldo de la biblioteca.
   Cuando un idioma no tenga todas las prácticas traducidas —caso normal en las
   traducciones aportadas por la comunidad— los textos que falten se muestran en
   este idioma en vez de dejar huecos. Español o inglés: los dos van dentro de la app. */
/* ============ Idiomas importados ============
   La app lleva dentro español e inglés. Los demás se descargan de la web como
   archivo JSON y se importan a mano desde Ajustes, igual que una copia de
   seguridad. Se guardan en el móvil y a partir de ahí funcionan sin conexión.

   El archivo es JSON, que se lee como DATOS y nunca se ejecuta: por eso una
   traducción de la comunidad no puede meter código en la app. */
const ESQUEMA_IDIOMA = 1;
const IDIOMAS_BASE = ['es','en'];          // los que van dentro y no se pueden quitar
// Textos que la comunidad no traduce: avisos legales, condiciones y la pantalla de
// elección de idioma. Se muestran siempre en español o en inglés (idioma de respaldo).
const NO_TRADUCIBLE = /^(acept|legal|priv_|cond_|ob_lang|pr_titular|pr_accept)/;
let idiomasPropios = LS.get('mpt_idiomas', {});

/* Revisión del archivo antes de aceptarlo. Es la misma idea que
   tools/validar-idioma.js, resumida a lo que puede comprobarse aquí. */
function revisarIdioma(d){
  const fallos = [];
  if (!d || typeof d !== 'object') return [t('iv_formato')];
  if (!d.codigo || !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(d.codigo)) fallos.push(t('iv_codigo'));
  if (IDIOMAS_BASE.includes(d.codigo)) fallos.push(t('iv_base'));
  // El esquema no se traduce: si viene cambiado se usa el actual (normalizarIdioma).
  // Solo se rechaza un archivo hecho para una versión más nueva de la app.
  if (typeof d.esquema === 'number' && d.esquema > ESQUEMA_IDIOMA) fallos.push(t('iv_esquema'));
  if (!d.interfaz || typeof d.interfaz !== 'object') fallos.push(t('iv_interfaz'));
  if (!d.practicas || typeof d.practicas !== 'object') fallos.push(t('iv_practicas'));
  // HTML: solo las etiquetas de formato que usa la propia app (<b>, <i>, <br>…).
  // Antes se rechazaba cualquier etiqueta, y como la interfaz original ya lleva
  // <b>, ninguna traducción completa podía importarse. Se revisan también las
  // categorías, que también acaban en pantalla. El bloque «fijos» no: se descarta.
  const revisar = o => Object.values(o||{}).some(v =>
    typeof v === 'string' ? htmlNoPermitido(v) : (v && (htmlNoPermitido(v.t) || htmlNoPermitido(v.x))));
  if (revisar(d.interfaz) || revisar(d.practicas) || revisar(d.categorias)) fallos.push(t('iv_html'));
  return fallos;
}

/* Lo que no se traduce es siempre lo oficial, traiga lo que traiga el archivo:
   la licencia, el esquema, si está revisado, de qué idioma se tradujo, los textos
   legales (bloque «fijos» y las claves de NO_TRADUCIBLE, que se ven en el idioma de
   respaldo) y el nombre «Moment». Además, cada frase que haya perdido o ganado un
   marcador ({n}, {d}…) usa la oficial, para que no salga rota. Hasta la 3.88 un
   archivo sí podía cambiar los textos legales que se ven en pantalla.
   Devuelve el idioma limpio y cuántas frases se han cambiado por la oficial. */
const MARCA_FIJA = ['app_title', 'app_title_br', 'canal_std_nombre'];   // «Moment»
const marcadoresDe = s => (String(s).match(/\{[a-z0-9_]+\}/gi) || []).sort().join('|');
function normalizarIdioma(d){
  const de = d.traducidoDe === 'en' ? 'en' : 'es', base = I18N[de] || I18N.es;
  const interfaz = {}; let corregidas = 0;
  Object.keys(d.interfaz || {}).forEach(k => {
    const v = d.interfaz[k];
    if (typeof v !== 'string' || !(k in base)) return;              // claves que la app no tiene
    if (NO_TRADUCIBLE.test(k) || MARCA_FIJA.includes(k)) return;      // siempre las oficiales
    if (marcadoresDe(v) !== marcadoresDe(base[k])){ corregidas++; return; }
    interfaz[k] = v;
  });
  const ids = new Set(PRACTICAS.map(p => p.id)), practicas = {};
  Object.keys(d.practicas || {}).forEach(id => {
    const p = d.practicas[id];
    if (ids.has(id) && p && typeof p === 'object' && typeof p.t === 'string') practicas[id] = {t: texto(p.t, 300), x: texto(p.x, 20000)};
  });
  const categorias = {};
  CATEGORIAS.forEach(c => { const v = d.categorias && d.categorias[c.id]; if (typeof v === 'string' && v.trim()) categorias[c.id] = texto(v.trim(), 80); });
  const idioma = { codigo: d.codigo, nombre: texto(d.nombre || d.codigo, 60), autor: texto(d.autor, 120),
    esquema: ESQUEMA_IDIOMA, licencia: 'AGPL-3.0', revisado: false, traducidoDe: de,
    categorias, interfaz, practicas };
  if (d.bandera) idioma.bandera = texto(d.bandera, 16);
  return { idioma, corregidas };
}
// Misma regla que tools/validar-idioma.js: <b>, <i>, <br>, <strong>, <em> (con
// un estilo sencillo como mucho); nada de enlaces, imágenes, código ni recursos
// externos (url(...) en un estilo cargaría algo de internet).
const ETIQUETAS_OK = /^<\/?(b|i|br|strong|em)(\s+style="[^"<>]*")?\s*\/?>$/i;
const HTML_PELIGROSO = /\bon\w+\s*=|javascript:|<script|<iframe|<img|<a\s|href\s*=|src\s*=|url\s*\(|expression\s*\(|@import/i;
function htmlNoPermitido(v){
  const txt = String(v==null ? '' : v);
  if (HTML_PELIGROSO.test(txt)) return true;
  return (txt.match(/<[^>]+>/g) || []).some(e => !ETIQUETAS_OK.test(e));
}

/* Incorpora un idioma guardado al diccionario y a la biblioteca. */
function activarIdioma(d){
  try{
    const c = d.codigo;
    // interfaz: la ya limpia (normalizarIdioma); lo que falte, incluidos los textos
    // legales, lo resuelve t() con el idioma de respaldo
    I18N[c] = Object.assign({}, d.interfaz || {});
    if (d.practicas) TEXTOS[c] = d.practicas;
    if (d.categorias) CATEGORIAS.forEach(cat => { if (d.categorias[cat.id]) cat[c] = d.categorias[cat.id]; });
    if (typeof CREDITOS !== 'undefined' && d.autor) CREDITOS[c] = d.autor;
    return true;
  }catch(e){ anota('activar-idioma', e); return false; }
}
// Cada idioma guardado se revisa otra vez al arrancar: si alguno no pasa (por
// ejemplo, porque llegó dentro de una copia manipulada), se descarta.
function cargarIdiomasPropios(){
  let quitados = 0, cambia = false;
  Object.keys(idiomasPropios || {}).forEach(c => {
    const d = idiomasPropios[c];
    if (!d || d.codigo !== c || revisarIdioma(d).length){ delete idiomasPropios[c]; quitados++; return; }
    // los guardados antes de la 3.89 se limpian igual que uno recién importado
    const limpio = normalizarIdioma(d).idioma;
    if (JSON.stringify(limpio) !== JSON.stringify(d)){ idiomasPropios[c] = limpio; cambia = true; }
    activarIdioma(limpio);
  });
  if (quitados || cambia) LS.set('mpt_idiomas', idiomasPropios);
  if (quitados) anota('idioma-descartado', new Error(quitados + ' idioma(s)'));
}
cargarIdiomasPropios();

/* Nombre visible de un idioma, para las listas. */
/* Bandera del idioma, para los selectores. Los idiomas importados declaran la
   suya en el archivo; si no, se usa un globo terráqueo. */
const BANDERAS = {es:'🇪🇸', en:'🇬🇧', fr:'🇫🇷', de:'🇩🇪', it:'🇮🇹', pt:'🇵🇹',
  ar:'🇸🇦', zh:'🇨🇳', ja:'🇯🇵', ru:'🇷🇺', ca:'🏴', eu:'🏴', gl:'🏴', nl:'🇳🇱', pl:'🇵🇱'};
function banderaIdioma(c){
  const d = idiomasPropios[c];
  // la bandera viene del archivo: se escapa como cualquier otro texto ajeno
  return esc(String((d && d.bandera) || BANDERAS[c] || '🌐').slice(0, 16));
}
function nombreIdioma(c){
  if (c === 'es') return 'Español';
  if (c === 'en') return 'English';
  const d = idiomasPropios[c];
  return (d && d.nombre) || c;
}
function idiomasDisponibles(){ return IDIOMAS_BASE.concat(Object.keys(idiomasPropios || {})); }

function aplicarIdiomaTexto(texto){
  {
    let d = null;
    try{ d = JSON.parse(texto); }
    catch(e){ toast(t('id_bad')); anota('importar-idioma', e); return; }
    const fallos = revisarIdioma(d);
    if (fallos.length){ alert(t('id_rejected') + '\n\n· ' + fallos.join('\n· ')); return; }
    // lo que no se traduce vuelve a ser lo oficial (normalizarIdioma)
    const {idioma, corregidas} = normalizarIdioma(d);
    const total = PRACTICAS.length;
    const hechas = Object.keys(idioma.practicas).length;
    if (!confirm(t('id_confirm')
        .replace('{n}', idioma.nombre || idioma.codigo)
        .replace('{p}', hechas + '/' + total)
        .replace('{a}', idioma.autor || '—')
        + (corregidas ? '\n\n' + t('id_fixed').replace('{n}', corregidas) : ''))) return;
    idiomasPropios[idioma.codigo] = idioma;
    LS.set('mpt_idiomas', idiomasPropios);
    activarIdioma(idioma);
    olvidarPrefijos();
    setLang(idioma.codigo);
    toast(t('id_added').replace('{n}', idioma.nombre || idioma.codigo));
    renderSet();
    ofrecerEnviarIdioma(idioma.codigo);
  }
}
/* ---- Traducir desde la app ----
   1) Descargar el archivo para traducir: el mismo formato que idiomas/<código>.json
      (tools/exportar-idiomas.js), así lo traducido se valida y se importa igual.
      La regla de qué NO traduce la comunidad es la del exportador; una prueba
      comprueba que las dos coinciden.
   2) Enviar un idioma importado a Jordi para que lo revise y valore incluirlo en la
      app para todo el mundo o publicarlo en la web.
   (NO_TRADUCIBLE está arriba, junto a ESQUEMA_IDIOMA: lo usa la limpieza de los
   idiomas guardados, que se ejecuta al cargar este archivo.) */
function plantillaTraduccion(base){
  const b = (base==='en') ? 'en' : 'es';
  const interfaz={}, fijos={};
  Object.entries(I18N[b]).forEach(([k,v])=>{ (NO_TRADUCIBLE.test(k) ? fijos : interfaz)[k]=v; });
  const practicas={}, tx=TEXTOS[b]||{};
  PRACTICAS.forEach(p=>{ if(tx[p.id]) practicas[p.id]={t:tx[p.id].t, x:tx[p.id].x}; });
  const categorias={};
  CATEGORIAS.forEach(c=>{ if(c[b]) categorias[c.id]=c[b]; });
  return {
    _leeme:[t('tr_l1'), t('tr_l2'), t('tr_l3'), t('tr_l4'), t('tr_l5')],
    codigo:'', nombre:'', esquema:ESQUEMA_IDIOMA, autor:'', licencia:'AGPL-3.0', revisado:false,
    traducidoDe:b,
    fijos, categorias, interfaz, practicas
  };
}
function descargarPlantillaTraduccion(){
  const b = getLang()==='en' ? 'en' : 'es';
  descargarTexto('moment-traducir-'+b+'.json', JSON.stringify(plantillaTraduccion(b), null, 1), 'application/json');
}

function ofrecerEnviarIdioma(c){
  const d=idiomasPropios[c]; if(!d) return;
  document.getElementById('modalContent').innerHTML=
    '<h3>'+t('tr_send_title')+'</h3>'+
    '<p class="muted" style="line-height:1.5">'+t('tr_send_txt')+'</p>'+
    '<button class="btn primary block" style="margin-bottom:8px" onclick="closeModal();enviarIdiomaEmail(\''+c+'\')">'+t('tr_send_yes')+'</button>'+
    '<button class="btn ghost block" onclick="closeModal()">'+t('sh_no')+'</button>';
  openModal();
}
// En el móvil se abre el menú de compartir con el archivo adjunto y, si se elige
// el correo, con destinatario, asunto y texto ya puestos. En el navegador no se
// puede adjuntar desde un enlace de correo: se descarga el archivo y se abre el
// correo pidiendo que se adjunte.
async function enviarIdiomaEmail(c){
  const d=idiomasPropios[c]; if(!d) return;
  const nombre='moment-'+c+'.json', json=JSON.stringify(d, null, 1);
  const n=d.nombre||c;
  const asunto=t('tr_mail_subj').replace('{n}', n);
  const cuerpo=t('tr_mail_body').replace('{n}', n).replace('{a}', d.autor||'—');
  if(IS_NATIVE && CapAjustes && CapAjustes.compartirArchivo){
    try{
      await CapAjustes.compartirArchivo({nombre, base64:btoa(unescape(encodeURIComponent(json))), mime:'application/json',
        titulo:asunto, email:METRICS_EMAIL, asunto, texto:cuerpo});
      return;
    }catch(e){ anota('enviar-idioma', e); }
  }
  await descargarTexto(nombre, json, 'application/json');
  location.href='mailto:'+METRICS_EMAIL+'?subject='+encodeURIComponent(asunto)
    +'&body='+encodeURIComponent(cuerpo+'\n\n'+t('tr_mail_attach').replace('{f}', nombre));
}
function quitarIdioma(c){
  if (!confirm(t('id_remove_q').replace('{n}', nombreIdioma(c)))) return;
  delete idiomasPropios[c];
  LS.set('mpt_idiomas', idiomasPropios);
  if (getLang() === c) setLang('es');
  toast(t('id_removed'));
  setTimeout(()=>{ try{ location.reload(); }catch(e){} }, 700);
}

/* Créditos de traducción del idioma activo, si los hay. */
function creditoIdioma(l){
  try{ return (typeof CREDITOS!=='undefined' && CREDITOS[l || getLang()]) || ''; }
  catch(e){ return ''; }
}
function langRespaldo(){
  const l = (cfg && cfg.langBiblio) || 'es';
  return (l === 'en') ? 'en' : 'es';
}
function refreshPracticesLang(){
  try{
    const l = getLang();
    // si el idioma activo tiene su propia lista lista, se usa tal cual;
    // si no, se construye rellenando con el idioma de respaldo
    if(l === 'es') PRACTICES = PRACTICES_ES;
    else if(l === 'en') PRACTICES = PRACTICES_EN;
    else PRACTICES = construirPracticas(l, langRespaldo());
  }catch(e){ anota('idioma-biblioteca', e); }
  try{ libCacheDirty(); }catch(e){}
}
/* ¿Está completa la traducción de la biblioteca en el idioma activo? */
function traduccionCompleta(lang){
  try{
    const t = TEXTOS[lang || getLang()];
    if(!t) return false;
    return PRACTICAS.every(p => t[p.id] && t[p.id].t);
  }catch(e){ return true; }
}
/* Si al idioma activo le faltan prácticas y aún no se ha elegido respaldo, se
   pregunta UNA vez. Después se cambia en Ajustes. */
function avisarRespaldo(){
  try{
    if(!cfg || cfg.langBiblioPreg) return;
    const l = getLang();
    if(l === 'es' || l === 'en') return;      // los idiomas de dentro están completos
    if(traduccionCompleta(l)) return;
    cfg.langBiblioPreg = true; LS.set('mpt_cfg', cfg);
    document.getElementById('modalContent').innerHTML = `
      <h3>${t('lb_ask_title')}</h3>
      <p class="muted" style="line-height:1.55">${t('lb_ask_txt')}</p>
      <button class="btn primary block" onclick="elegirRespaldo('es')">Español</button>
      <button class="btn primary block" onclick="elegirRespaldo('en')">English</button>`;
    openModal();
  }catch(e){ anota('aviso-respaldo', e); }
}
function elegirRespaldo(l){
  if(!cfg) return;
  cfg.langBiblio = (l === 'en') ? 'en' : 'es';
  LS.set('mpt_cfg', cfg);
  refreshPracticesLang();
  closeModal();
  toast(t('lb_set').replace('{l}', l === 'en' ? 'English' : 'Español'));
}

// El idioma del documento afecta a la tipografía que elige el sistema y al sentido
// de lectura. Se actualiza al cambiar de idioma, no solo al cargar.
const IDIOMAS_RTL = ['ar','he','fa','ur'];
function aplicarIdiomaDocumento(){
  try{
    const l=getLang();
    document.documentElement.lang = l;
    document.documentElement.dir = IDIOMAS_RTL.includes(l) ? 'rtl' : 'ltr';
  }catch(e){ anota('idioma-documento', e); }
}
function applyNavLang(){
  aplicarIdiomaDocumento();
  document.querySelectorAll('[data-lbl]').forEach(el=>{ el.textContent=t(el.getAttribute('data-lbl')); });
  document.querySelectorAll('[data-lbl-html]').forEach(el=>{ el.innerHTML=t(el.getAttribute('data-lbl-html')); });
}
