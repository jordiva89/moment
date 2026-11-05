const entorno = require('./entorno');
const { JSDOM } = require(entorno.rutaJsdom());
const fs = require('fs');
// index.html con todos sus scripts dentro (los datos y los módulos de js/), para
// ejecutar la app entera en jsdom
let html = entorno.htmlConScripts();
const canal=[], acciones=[], programadas=[], canceladas=[];
let temporizadores=0;

function mk(cb){
  const dom = new JSDOM(html, { runScripts:'dangerously', url:'https://app.local/',
    beforeParse(w){
      const R=w.Date; let _t=0;
      class FD extends R{ constructor(...a){ a.length?super(...a):super(2026,7,29,10,0,0);} static now(){return new R(2026,7,29,10,0,0).getTime()+(_t++);} }
      w.Date=FD;
      let seed=11; w.Math.random=()=>{ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; };
      // contar temporizadores periódicos que quedan vivos
      const si=w.setInterval;
      w.setInterval=(f,ms)=>{ temporizadores++; return si(f,ms); };
      w.localStorage.setItem('mpt_cfg', JSON.stringify({startH:8,startM:0,freq:2,span:14,favPerDay:0,catsPref:{},visDia:false}));
      w.localStorage.setItem('mpt_lang', JSON.stringify('es'));
      w.localStorage.setItem('mpt_accept', JSON.stringify({v:1,ts:1}));
      w.localStorage.setItem('mpt_stats', JSON.stringify({lastOpen:0,lastDone:0,lastSend:FD.now(),days:{}}));
      w.scrollTo=()=>{}; w.requestAnimationFrame=f=>{try{f()}catch(e){}};
      w.confirm=()=>true; w.fetch=()=>Promise.reject();
      w.Notification=function(){}; w.Notification.permission='granted';
      w.Capacitor={ isNativePlatform:()=>true, Plugins:{
        Ajustes:{ renombrarCanal:o=>{canal.push(o);return Promise.resolve();}, abrirPantalla:()=>Promise.resolve(),
                  compartirArchivo:()=>Promise.resolve(), guardarDescarga:()=>Promise.resolve(),
                  listarArchivosMoment:()=>Promise.resolve({archivos:[
                    {nombre:'copia-moment-2026-09-04.json', tamano:900, fecha:1,
                     base64:Buffer.from(JSON.stringify({app:'moment',data:{}})).toString('base64')},
                    {nombre:'moment-ar.json', tamano:800, fecha:2,
                     base64:Buffer.from(JSON.stringify({codigo:'ar',esquema:1,interfaz:{},practicas:{}})).toString('base64')},
                    {nombre:'foto-vacaciones.json', tamano:50, fecha:3,
                     base64:Buffer.from('no soy de moment').toString('base64')}]}),
                  infoDispositivo:()=>Promise.resolve({fabricante:'realme',modelo:'RMX3521',dispositivo:'RE54C4',
                    android:'14',sdk:34,pantalla:'1080x2400',densidad:2.75,canalAlarma:'importancia 4',
                    bateriaExenta:false,nomolestar:1}) },
        LocalNotifications:{ checkPermissions:()=>Promise.resolve({display:'granted'}), requestPermissions:()=>Promise.resolve({display:'granted'}),
          schedule:o=>{ programadas.push(o); return Promise.resolve(); },
          cancel:o=>{ canceladas.push(o); return Promise.resolve(); },
          getPending:()=>Promise.resolve({notifications:[]}), addListener:()=>Promise.resolve(),
          removeAllListeners:()=>Promise.resolve(), createChannel:()=>Promise.resolve(),
          listChannels:()=>Promise.resolve({channels:[]}), deleteChannel:()=>Promise.resolve(),
          registerActionTypes:o=>{acciones.push(o);return Promise.resolve();} },
        App:{ addListener:()=>Promise.resolve({remove(){}}), removeAllListeners:()=>Promise.resolve() } } };
      w.navigator.serviceWorker={register:()=>Promise.resolve({update(){}}),addEventListener:()=>{},getRegistration:()=>Promise.resolve(null)};
    }});
  setTimeout(()=>cb(dom.window, dom.window.document), 3000);
}
const res=[]; const ok=(n,c)=>res.push((c?'OK ':'MAL ')+n);

mk(async (w,d)=>{
 try{
  // ---------- consumo de batería ----------
  ok('sin intervalo periódico en nativo', temporizadores===0);
  ok('vigilancia por medianoche, no por sondeo', typeof w.armMedianoche==='function' && /armMedianoche\(\);\s*\n\s*return;/.test(html));
  ok('mpt_lastActive eliminado', !/mpt_lastActive/.test(html));
  ok('stopWatch limpia los tres temporizadores', /clearTimeout\(diaTimer\)/.test(html) && /clearTimeout\(notifTimer\)/.test(html));
  ok('reprogramación agrupada', /reschedTimer=setTimeout/.test(html));
  // varias acciones seguidas → una sola reprogramación
  w.eval('ensureDayPlan(); notifOn=true; nativePerm="granted";');
  programadas.length=0;
  w.scheduleNext(); w.scheduleNext(); w.scheduleNext();
  await new Promise(r=>setTimeout(r,150));
  ok('3 llamadas seguidas no reprograman 3 veces', programadas.length===0);
  await new Promise(r=>setTimeout(r,1200));
  ok('tras la pausa, reprograma una sola vez', programadas.length===1, programadas.length);
  // ---------- redes sociales ----------
  w.gotoTab('fav');
  const fav=d.getElementById('main').innerHTML;
  ok('TikTok presente', fav.includes('https://www.tiktok.com/@elnovenocamino'));
  ok('TikTok justo después de YouTube', fav.indexOf('youtube.com/@elnovenocamino') < fav.indexOf('tiktok.com/@elnovenocamino') &&
     fav.indexOf('tiktok.com/@elnovenocamino') < fav.indexOf('whatsapp.com/channel'));
  ok('los 5 canales', ['youtube.com/@elnovenocamino','tiktok.com/@elnovenocamino','whatsapp.com/channel','t.me/elnovenocamino','jordibeold.com'].every(u=>fav.includes(u)));
  w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet();
  const st=d.getElementById('main').innerHTML;
  ok('TikTok también en Ajustes', st.includes('tiktok.com/@elnovenocamino'));
  ok('mismo orden en Ajustes', st.indexOf('youtube.com/@elnovenocamino') < st.indexOf('tiktok.com/@elnovenocamino'));
  // ---------- regresiones ----------
  ok('208 prácticas', w.eval('PRACTICES_ES.length===208 && PRACTICES_EN.length===208'));
  ok('ids alineados ES/EN', w.eval('PRACTICES_ES.every((p,i)=>p.id===PRACTICES_EN[i].id)'));
  ok('sin vocabulario sanitario', w.eval('PRACTICES_ES.filter(p=>/chakra|sanaci|terapia|síntoma/i.test(p.title+p.text)).length')===0);
  ok('secAjustes: 5 secciones', ['notif','patron','share','stats','cuenta'].every(x=>st.includes('data-card="'+x+'"')));
  ok('plan del día se construye', w.eval('dayState.plan.length')>0);
  ok('mañana también', w.eval('getPlanFor(nextDateStr()).length')>0);
  ok('reloj táctil', typeof w.caraReloj==='function' && w.caraReloj('h',9,250,'x').includes('>13<'));
  ok('canal sincronizado con el idioma', canal.length>0);
  w.setLang('en'); ok('canal en inglés', canal[canal.length-1].nombre==='Moment (alarm)'); w.setLang('es');
  ok('acción Hecha en la notificación', JSON.stringify(acciones).includes('"id":"done"'));
  ok('categorías preferidas', typeof w.setCatPref==='function' && w.eval('catPairs().length')>=8);
  ok('el patrón se puede apagar (antes «solo mis momentos»)', /if\(patronActivo\(\)\)\{/.test(html) && typeof w.patronActivo==='function');
  ok('momentos propios repetibles', JSON.stringify(w.eval('eventTimes({time:1320, dmode:"int", dcount:3, dgap:4})'))==='[1320,1560,1800]');
  ok('franjasConstelacion única', typeof w.franjasConstelacion==='function');
  ok('aceptación de responsabilidad', typeof w.aceptado==='function' && d.body.innerHTML.length>0);
  w.gotoTab('home'); ok('Agenda renderiza', d.getElementById('main').innerHTML.length>500);
  w.gotoTab('lib'); ok('Biblioteca renderiza', d.getElementById('main').innerHTML.length>500);
  // ---------- escapado de contenido de usuario ----------
  w.eval('userLib=[{id:"uX", cat:"<b>Cat</b>", title:"<img src=x onerror=1>Título \\"raro\\"", text:"texto"}]; LS.set("mpt_userlib",userLib); _allCache=null; _byIdCache=null;');
  w.gotoTab('lib');
  const hl=d.getElementById('main').innerHTML;
  // lo que importa no es el texto serializado, sino que NO se cree ningún elemento
  ok('el título del usuario no inyecta HTML', d.querySelectorAll('#main img').length===0 && hl.includes('&lt;img'));
  ok('la categoría del usuario no inyecta HTML', d.querySelectorAll('#main .catpill b, #main h4 b').length===0);
  ok('el texto se muestra escapado', hl.includes('&lt;b&gt;Cat&lt;/b&gt;'));
  ok('esc() neutraliza comillas y >', w.esc('a"b<c>d')==='a&quot;b&lt;c&gt;d');
  w.eval('userLib=[]; LS.set("mpt_userlib",[]); _allCache=null; _byIdCache=null;');
  // ---------- textos traducidos ----------
  ok('correo de compartir traducido', w.eval("I18N.en.sh_mail_hi")==='Hi Jordi,' && w.eval("I18N.es.sh_mail_hi")==='Hola Jordi,');
  ok('buscador y ayuda con clave i18n', w.eval("I18N.en.lib_clear")==='Clear search' && !/getLang\(\)==='en'\?'Clear search'/.test(html));
  ok('sin claves i18n huérfanas', (function(){
    const kES=[...html.matchAll(/\n    (\w+):/g)].map(m=>m[1]);
    return kES.filter(k=>k==='lib_box_paused').length===0;
  })());
  // ---------- canal de alarma en el idioma de la app ----------
  canal.length=0;
  w.setLang('en'); await new Promise(r=>setTimeout(r,50));
  ok('canal en inglés al cambiar idioma', canal.length>0 && canal[canal.length-1].nombre==='Moment (alarm)'
     && /silent/.test(canal[canal.length-1].descripcion));
  w.setLang('es'); await new Promise(r=>setTimeout(r,50));
  ok('canal en español al volver', canal[canal.length-1].nombre==='Moment (alarma)');
  ok('sincronizarCanal reintenta si el plugin no está', /setTimeout\(\(\)=>sincronizarCanal\(n\+1\)/.test(html));
  ok('se renombra al confirmar que el canal existe', /if\(alarmChannelOk\) sincronizarCanal\(\)/.test(html));
  ok('el canal estándar también se traduce', /createChannel\(\{id:'momento', name:t\('canal_std_nombre'\)/.test(html));
  // ---------- etiquetas del formato en correos ----------
  ok('etiquetas de formato traducidas', w.eval("I18N.en.fmt_title")==='Title: ' && w.eval("I18N.en.fmt_cat")==='Category: ');
  ok('sin etiquetas fijas en los correos', !/'Título: '\+p\.title|'Título: '\+titulo/.test(html));
  ok('plantilla bilingüe', /PLANTILLA_LINEAS_EN/.test(html) && /function PLANTILLA_LINEAS\(\)/.test(html));
  ok('los ejemplos se detectan en ambos idiomas', /PLANTILLA_LINEAS_ES\.join[\s\S]{0,120}PLANTILLA_LINEAS_EN\.join/.test(html));
  ok('el lector acepta claves en inglés', (function(){
    const r=w.parseFriendlyPracticas('Title: My practice\nCategory: Calm\nText: Breathe slowly.\nLink: https://x.test');
    return r.length===1 && r[0].title==='My practice' && r[0].cat==='Calm' && r[0].link==='https://x.test';
  })());
  ok('y en español', (function(){
    const r=w.parseFriendlyPracticas('Título: Mi práctica\nCategoría: Calma\nTexto: Respira despacio.');
    return r.length===1 && r[0].cat==='Calma';
  })());
  // ---------- datos técnicos en el correo de sugerencias ----------
  const blq=await w.bloqueDiagnostico();
  ok('bloque con encabezado visible', blq.includes(w.eval("t('dv_title')")));
  ok('modelo real por la vía nativa', blq.includes('realme RMX3521') && blq.includes('RE54C4'));
  ok('versión de Android y API', blq.includes('Android 14') && blq.includes('API 34'));
  ok('pantalla, app y patrón', blq.includes('1080x2400') && blq.includes('v'+w.eval('APP_VERSION')) && blq.includes('08:00'));
  ok('estado del canal y la batería', blq.includes('importancia 4') && blq.includes(w.eval("t('dv_batt_saving')")));
  ok('aviso de que puede borrarlo', blq.includes(w.eval("t('dv_note')")));
  ok('sin datos personales', !/mpt_|localStorage|jordibeold|[\w.]+@[\w.]+|IMEI|serial/i.test(blq));
  w.setLang('en');
  const blqEN=await w.bloqueDiagnostico();
  ok('bloque traducido al inglés', blqEN.includes('Technical details') && blqEN.includes('Phone:') && blqEN.includes('System:'));
  ok('sin etiquetas en español en el bloque inglés', !/Móvil|Sistema:|Pantalla|Batería|Patrón/.test(blqEN));
  w.setLang('es');
  ok('enviarFeedback existe y es la que usa el botón', typeof w.enviarFeedback==='function' && /onclick="enviarFeedback\(\)"/.test(html));
  ok('respaldo si no hay vía nativa', /navigator.userAgent/.test(html) && /Android\[\^;\]\*;/.test(html.replace(/\\/g,'')) || /userAgent/.test(html));
  // ---------- v3.56: consumo y texto legal ----------
  ok('el APK no se descarga entero para comprobarlo', /method:'HEAD'/.test(html) && !/const b=await r\.blob\(\); apkAssetOk/.test(html));
  ok('la comprobación del APK no va en el arranque', !/^\s*if\(IS_NATIVE\) checkApkAsset\(\);/m.test(html));
  ok('respaldo con Range si no hay HEAD', /Range:'bytes=0-0'/.test(html));
  ok('pulso web a 60 s', /setInterval\(tick, 60000\)/.test(html));
  ok('aviso legal: datos técnicos en el correo', w.eval("ACEPT_ES.s5").includes('datos técnicos de tu móvil') &&
     w.eval("ACEPT_ES.s5").includes('puedes borrarlos antes de enviarlo'));
  ok('aviso legal en inglés', w.eval("ACEPT_EN.s5").includes('technical details of your phone') &&
     w.eval("ACEPT_EN.s5").includes('delete them before sending'));
  ok('el aviso legal se ve en pantalla', (function(){ w.renderAceptacion('ob');
     return d.getElementById('main').innerHTML.includes('datos técnicos de tu móvil'); })());
  // ============ auditoría: puntos 1-5 y separación de archivos ============
  ok('sin eval()', !/\beval\(/.test(html));
  ok('migraciones con versión de esquema', w.eval('typeof CFG_VERSION')==='number' && w.eval('MIGRACIONES.length')>=6);
  ok('cfg queda migrada', w.eval('cfg.v')===w.eval('CFG_VERSION'));
  ok('registro de incidencias disponible', typeof w.anota==='function' && typeof w.logTexto==='function');
  ok('el registro anota y se limita', (function(){
    for(let i=0;i<60;i++) w.anota('prueba'+i, new Error('fallo '+i));
    const n=JSON.parse(w.localStorage.getItem('mpt_log')||'[]').length;
    return n>0 && n<=40;
  })());
  ok('no repite la misma incidencia', (function(){
    w.localStorage.removeItem('mpt_log'); w.eval('_log=[]');
    for(let i=0;i<5;i++) w.anota('igual', new Error('mismo'));
    const l=JSON.parse(w.localStorage.getItem('mpt_log'));
    return l.length===1 && l[0].n===5;
  })());
  ok('el registro viaja en el diagnóstico', (await w.bloqueDiagnostico()).includes(w.eval("t('lg_label')")));
  ok('se ve en Ajustes', (function(){ w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet();
     return d.getElementById('main').innerHTML.includes(w.eval("t('lg_label')")); })());
  w.eval('_log=[]'); w.localStorage.removeItem('mpt_log');
  // botones accesibles
  ok('botones de texto en vez de spans', (html.match(/class="tbtn/g)||[]).length>=15);
  ok('sin spans pulsables', !/<span[^>]*onclick/.test(html));
  ok('cabeceras con rol de botón y teclado', /role="button" tabindex="0"[^>]*onkeydown/.test(html));
  ok('estilo .tbtn con foco visible', /\.tbtn:focus-visible/.test(html));
  // rendimiento de la biblioteca
  ok('una sola asignación de html', !/el\.innerHTML = renderPropiasBox\(\) \+ el\.innerHTML/.test(html));
  ok('plegar una tarjeta no rehace la lista', typeof w.toggleFicha==='function' && /ITEM_RENDER/.test(html));
  ok('toggleFicha cambia solo su tarjeta', (function(){
    w.gotoTab('lib'); w.eval('expandedLib=new Set()'); w.eval('renderLibList()');
    const id=w.eval('libVisibles().filter(p=>!p.id.startsWith("u"))[0].id');
    const antes=d.querySelectorAll('.ditem').length;
    w.eval(`toggleFicha(expandedLib,'${id}',renderLibList,'expandedLib')`);
    return w.eval(`expandedLib.has('${id}')`)===true && d.querySelectorAll('.ditem').length===antes;
  })());
  // separación de archivos
  ok('i18n.js y contenido.js existen', (function(){
    const p=require('path').join(__dirname,'..','..','www');
    return fs.existsSync(p+'/i18n.js') && fs.existsSync(p+'/contenido.js') && fs.existsSync(p+'/estilos.css');
  })());
  ok('el service worker los cachea', (function(){
    const sw=fs.readFileSync(require('path').join(__dirname,'..','..','www','sw.js'),'utf8');
    return ['i18n.js','contenido.js','estilos.css','practices.js'].every(f=>sw.includes(f));
  })());
  ok('index.html los carga antes del código', (function(){
    const h=fs.readFileSync(require('path').join(__dirname,'..','..','www','index.html'),'utf8');
    return h.indexOf('i18n.js') < h.indexOf('practices.js') && h.includes('estilos.css');
  })());
  ok('el mensaje de invitación usa el nombre nuevo', w.shareMsg().includes('moment.apk') && !w.shareMsg().includes('momento-para-ti.apk'));
  // ---- preparación multiidioma ----
  ok('la fuente del sistema va primero', (function(){
    const css=fs.readFileSync(require('path').join(__dirname,'..','..','www','estilos.css'),'utf8');
    return /font-family:system-ui/.test(css) && !/font-family:'Segoe UI'/.test(css);
  })());
  ok('reglas para alfabetos no latinos', (function(){
    const css=fs.readFileSync(require('path').join(__dirname,'..','..','www','estilos.css'),'utf8');
    return css.includes(':lang(ar)') && css.includes('[dir="rtl"]');
  })());
  ok('el documento declara idioma y sentido', (function(){
    w.setLang('en');
    const a = d.documentElement.lang==='en' && d.documentElement.dir==='ltr';
    w.setLang('es');
    return a && d.documentElement.lang==='es';
  })());
  ok('el sentido se invierte en idiomas RTL', (function(){
    w.eval("LANG='ar'"); w.aplicarIdiomaDocumento();
    const r = d.documentElement.dir==='rtl';
    w.eval("LANG='es'"); w.aplicarIdiomaDocumento();
    return r && d.documentElement.dir==='ltr';
  })());
  // ---- categorías como códigos ----
  ok('las prácticas guardan un código', w.eval('PRACTICES_ES.every(p=>/^[a-z]+$/.test(p.cat))'));
  ok('mismo código en ambos idiomas', w.eval('PRACTICES_ES.every((p,i)=>p.cat===PRACTICES_EN[i].cat)'));
  ok('CATEGORIAS con 8 entradas traducidas', w.eval('CATEGORIAS.length')===8 && w.eval("CATEGORIAS.every(c=>c.id&&c.es&&c.en)"));
  ok('catLabel traduce', w.eval("catLabel('armonizacion')")==='Armonización' && (function(){
     w.setLang('en'); const r=w.eval("catLabel('armonizacion')")==='Harmonization'; w.setLang('es'); return r; })());
  ok('la etiqueta se ve traducida en pantalla', (function(){
     w.gotoTab('lib'); return d.getElementById('main').innerHTML.includes('Constelaciones'); })());
  ok('migración v7 traduce las preferencias guardadas', (function(){
     w.eval("cfg.catsPref={'Armonización':true,'Values':true}; cfg.v=6; migrarCfg();");
     const r = w.eval("cfg.catsPref['armonizacion']===true && cfg.catsPref['valores']===true");
     w.eval("cfg.catsPref={}; LS.set('mpt_cfg',cfg);"); return r; })());
  // ---- biblioteca reestructurada: textos por identificador ----
  ok('estructura separada de los textos', w.eval('typeof PRACTICAS')==='object' && w.eval('typeof TEXTOS')==='object');
  ok('la correspondencia es por id, no por posición', w.eval('Object.keys(TEXTOS.es).length')===w.eval('PRACTICAS.length'));
  ok('las categorías son códigos', w.eval('PRACTICAS.every(p=>CATEGORIAS.some(c=>c.id===p.cat))'));
  ok('cada categoría tiene etiqueta en los dos idiomas', w.eval('CATEGORIAS.every(c=>c.es&&c.en)'));
  ok('las listas derivadas conservan la forma', w.eval('PRACTICES_ES.every(p=>p.id&&p.cat&&p.title&&p.text)'));
  ok('etiqueta traducida disponible', w.eval("PRACTICES_ES[0].catLabel!==PRACTICES_EN[0].catLabel || PRACTICAS.length===0"));
  ok('añadir un idioma no exige reordenar', w.eval('IDIOMAS_BIBLIOTECA.join(",")')==='es,en');
  ok('traducción incompleta se rellena con el respaldo', (function(){
    const r = w.eval("(function(){ const falso={p001:{t:'Solo una', x:'texto'}}; TEXTOS.xx=falso; const l=construirPracticas('xx','es'); delete TEXTOS.xx; return [l.length, l[0].title, l[1].title]; })()");
    return r[0]===w.eval('PRACTICAS.length') && r[1]==='Solo una' && r[2]===w.eval('TEXTOS.es[PRACTICAS[1].id].t');
  })());
  // ---- idioma de respaldo de la biblioteca ----
  ok('ajuste de idioma de respaldo', typeof w.langRespaldo==='function' && ['es','en'].includes(w.langRespaldo()));
  ok('migración lo deja en español', w.eval('cfg.langBiblio')==='es' && w.eval('CFG_VERSION')>=7);
  ok('se puede cambiar a inglés', (function(){ w.elegirRespaldo('en'); const r=w.langRespaldo()==='en'; w.elegirRespaldo('es'); return r; })());
  ok('el ajuste aparece en Ajustes', (function(){ w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet();
     return d.getElementById('main').innerHTML.includes(w.eval("t('lb_label')")); })());
  ok('detecta traducción incompleta', w.eval("(function(){ TEXTOS.xx={}; TEXTOS.xx[PRACTICAS[0].id]={t:'a',x:'b'}; const r=traduccionCompleta('xx'); delete TEXTOS.xx; return r; })()")===false && w.traduccionCompleta('es')===true);
  ok('un idioma incompleto se rellena al vuelo', w.eval("(function(){ TEXTOS.xx={}; TEXTOS.xx[PRACTICAS[0].id]={t:'Uno',x:'y'}; LANG='xx'; refreshPracticesLang(); const a=PRACTICES.length, b=PRACTICES[1].title; LANG='es'; refreshPracticesLang(); delete TEXTOS.xx; return a===PRACTICAS.length && b===TEXTOS.es[PRACTICAS[1].id].t; })()")===true);
  ok('la pregunta solo sale una vez', /langBiblioPreg/.test(html));
  ok('créditos de traducción', typeof w.creditoIdioma==='function' && w.creditoIdioma('es')==='Jordi Beold');
  ok('se ven en Ajustes', (function(){ w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet();
     return d.getElementById('main').innerHTML.includes('Jordi Beold'); })());
  // ---- importación manual de idiomas y reconocimiento de archivos ----
  ok('reconoce una copia de seguridad', w.tipoDeArchivo(JSON.stringify({app:'moment',data:{}}),'x.json')==='copia');
  ok('reconoce un idioma', w.tipoDeArchivo(JSON.stringify({codigo:'ar',interfaz:{},practicas:{}}),'ar.json')==='idioma');
  ok('reconoce prácticas en texto', w.tipoDeArchivo('Título: X\nTexto: Y','p.txt')==='practicas');
  ok('rechaza lo desconocido', w.tipoDeArchivo('hola qué tal','x.txt')==='desconocido');
  ok('valida el esquema del idioma', w.revisarIdioma({codigo:'ar',esquema:9,interfaz:{},practicas:{}}).length>0);
  ok('rechaza HTML en un idioma', w.revisarIdioma({codigo:'ar',esquema:1,interfaz:{a:'<img src=x>'},practicas:{}}).length>0);
  ok('no deja sobrescribir es/en', w.revisarIdioma({codigo:'es',esquema:1,interfaz:{},practicas:{}}).length>0);
  ok('acepta un idioma correcto', w.revisarIdioma({codigo:'ar',esquema:1,interfaz:{tab_program:'x'},practicas:{}}).length===0);
  ok('un idioma importado se activa', (function(){
    const d={codigo:'ar',nombre:'العربية',esquema:1,autor:'Prueba',licencia:'AGPL-3.0',
             interfaz:{tab_program:'جدول'},categorias:{},practicas:{}};
    d.practicas[w.eval('PRACTICAS[0].id')]={t:'ممارسة',x:'نص'};
    w.activarIdioma(d);
    w.eval("LANG='ar'"); w.refreshPracticesLang();
    const a = w.eval("t('tab_program')")==='جدول';
    const b = w.eval('PRACTICES[0].title')==='ممارسة';
    const c = w.eval('PRACTICES.length')===w.eval('PRACTICAS.length');
    const relleno = w.eval('PRACTICES[1].title')===w.eval('TEXTOS.es[PRACTICAS[1].id].t');
    w.eval("LANG='es'"); w.refreshPracticesLang();
    return a && b && c && relleno;
  })());
  ok('al guardarlo aparece en la lista', (function(){
    w.eval("idiomasPropios['ar']={codigo:'ar',nombre:'العربية'}");
    const r = w.idiomasDisponibles().includes('ar') && w.nombreIdioma('ar')==='العربية';
    w.eval("delete idiomasPropios['ar']");
    return r;
  })());
  // ---- detección de archivos en el móvil ----
  ok('busca archivos de Moment', typeof w.buscarArchivosMoment==='function');
  const det = await w.buscarArchivosMoment();
  ok('encuentra copia e idioma, descarta el resto', det.length===2 &&
     det.some(a=>a.tipo==='copia') && det.some(a=>a.tipo==='idioma') &&
     !det.some(a=>/vacaciones/.test(a.nombre)));
  ok('los clasifica por tipo', det.every(a=>['copia','idioma','practicas'].includes(a.tipo)));
  // ---- todo lo exportable sigue el idioma activo ----
  ok('plantilla Word bilingüe', (function(){
    w.setLang('es'); const a=w.eval('PLANTILLA_LINEAS()[0]');
    w.setLang('en'); const b=w.eval('PLANTILLA_LINEAS()[0]');
    w.setLang('es');
    return a!==b && a.includes('Moment') && b.includes('Moment');
  })());
  ok('nombre del archivo de plantilla traducido', w.eval("I18N.es.tpl_filename")!==w.eval("I18N.en.tpl_filename"));
  ok('nombre de la copia traducido', w.eval("I18N.es.bk_fileprefix")!==w.eval("I18N.en.bk_fileprefix"));
  ok('sin el nombre antiguo en la plantilla', !/Moment for you|Momento para ti/.test(w.eval('PLANTILLA_LINEAS_EN.join(" ")')));
  ok('correo de métricas y sugerencias traducidos', w.eval("I18N.es.mx_subject")!==w.eval("I18N.en.mx_subject") && w.eval("I18N.es.st_feedback_subj")!==w.eval("I18N.en.st_feedback_subj"));
  ok('etiquetas del formato traducidas', w.eval("I18N.en.fmt_title")==='Title: ');
  // ---- prefijos de plantilla en cualquier idioma ----
  ok('sigue leyendo español', w.parseFriendlyPracticas('Título: A\nCategoría: B\nTexto: C').length===1);
  ok('sigue leyendo inglés', (function(){ const r=w.parseFriendlyPracticas('Title: A\nCategory: B\nText: C'); return r.length===1 && r[0].cat==='B'; })());
  ok('aprende de un idioma importado', (function(){
    w.eval("I18N.fr={fmt_title:'Titre: ', fmt_cat:'Catégorie: ', fmt_text:'Texte: ', fmt_link:'Lien: '}");
    w.olvidarPrefijos();
    const r=w.parseFriendlyPracticas('Titre: Respirer\nCatégorie: Calme\nTexte: Doucement');
    w.eval('delete I18N.fr'); w.olvidarPrefijos();
    return r.length===1 && r[0].title==='Respirer' && r[0].cat==='Calme' && r[0].text==='Doucement';
  })());
  ok('los prefijos se recalculan al importar', /olvidarPrefijos\(\)/.test(html));
  // ---- límite de repeticiones de un momento propio ----
  ok('el momento se apaga al llegar al límite', (function(){
    w.eval("userEvents=[{id:'eL',title:'P',time:540,pid:'p001',rep:'daily',n:2,veces:7,startY:2026,startM:1,startD:1}]");
    const a=w.eval("eventsFor('2026-01-07').length>0"), b=w.eval("eventsFor('2026-01-08').length>0");
    return a && !b;
  })());
  ok('sin límite se repite siempre', (function(){
    w.eval('userEvents[0].veces=0');
    return w.eval("eventsFor('2026-06-01').length>0");
  })());
  ok('vale para semanas y meses', (function(){
    w.eval("userEvents=[{id:'eS',title:'S',time:540,pid:'p001',rep:'weekly',n:2,veces:3,startY:2026,startM:1,startD:1}]");
    const a=w.eval("eventsFor('2026-01-15').length>0"), b=w.eval("eventsFor('2026-01-22').length>0");
    return a && !b;
  })());
  ok('el límite se ve en el texto', (function(){
    w.eval("userEvents=[{id:'eT',title:'T',time:540,pid:'p001',rep:'daily',n:2,veces:21,startY:2026,startM:1,startD:1}]");
    return w.repFullText(w.eval('userEvents[0]')).includes('21');
  })());
  w.eval('userEvents=[]; LS.set("mpt_events",[]);');
  ok('días concretos de la semana', (function(){
    w.eval("userEvents=[{id:'wD',title:'W',time:540,pid:'p001',rep:'wdays',wd:[1,4],startY:2026,startM:1,startD:1}]");
    const a=w.eval("eventsFor('2026-01-05').length>0"), b=w.eval("eventsFor('2026-01-06').length>0");
    w.eval('userEvents=[]');
    return a && !b;
  })());
  ok('el reloj permite corregir la hora', typeof w._relojAtras==='function');
  ok('se pueden crear momentos', (function(){
    w.eval('userEvents=[]; LS.set("mpt_events",[]);'); w.openEventForm();
    d.getElementById('ev_h').value='09:30';
    d.getElementById('ev_p').value=w.eval('PRACTICAS[0].id');
    d.getElementById('ev_r').value='daily';
    w.saveEvent();
    return w.eval('userEvents.length')===1;
  })());
  ok('se edita la descripción de una práctica propia', (function(){
    w.eval("userLib=[{id:'u9',cat:'meditacion',title:'M',text:'viejo'}]; LS.set('mpt_userlib',userLib); libCacheDirty();");
    w.eval("userEvents=[{id:'eZ',title:'M',time:600,pid:'u9',rep:'daily',n:2,startY:2026,startM:1,startD:1}]");
    w.openEventForm('eZ');
    d.getElementById('ev_x').value='nuevo';
    w.saveEvent();
    const r = w.eval("userLib[0].text")==='nuevo';
    w.eval('userLib=[]; userEvents=[]; LS.set("mpt_userlib",[]); LS.set("mpt_events",[]); libCacheDirty();');
    return r;
  })());
  // ================= 3.86 =================
  const byIdW=id=>w.eval('byId('+JSON.stringify(id)+')');
  // ---------- aviso inicial ----------
  ok('la nota de la aceptación va con el mismo formato que el aviso', (function(){
    w.renderAceptacion('ob');
    const h=d.getElementById('main').innerHTML, nota=w.eval('ACEPT().nota');
    return h.includes('<p style="margin:0 0 14px;line-height:1.55">'+nota+'</p>');
  })());
  // ---------- reloj ----------
  ok('reloj: «Selecciona la hora / los minutos»', w.t('clk_pick_h')==='Selecciona la hora' && w.t('clk_pick_m')==='Selecciona los minutos');
  ok('reloj: tocar los minutos de la hora mostrada pasa a minutos', (function(){
    w.abrirReloj(9*60+30, ()=>{});
    const bs=[...d.querySelectorAll('#relojov button.hpart')];
    if(bs.length!==2) return false;
    bs[1].click(); const a=w.eval('_rp.fase')==='m';
    d.querySelector('#relojov button.hpart').click(); const b=w.eval('_rp.fase')==='h';
    d.getElementById('relojov').remove();
    return a && b;
  })());
  ok('reloj: un botón de hora abre directamente los minutos si se tocan', (function(){
    const box=d.createElement('div'); box.innerHTML=w.botonHora('pr_h', 600); d.body.appendChild(box);
    box.querySelector('[data-f="m"]').click();
    const enMin=w.eval('_rp.fase')==='m';
    w._relojTap(45);
    const r=enMin && d.getElementById('pr_h').value==='10:45' && box.querySelector('button').textContent.trim()==='🕐 10:45'
      && !!box.querySelector('[data-f="h"]');
    box.remove(); return r;
  })());
  ok('reloj: la bienvenida también se toca por partes', (function(){
    w.eval("ob._fase='h'"); w.renderOnboarding(0);
    const bs=d.querySelectorAll('#main button.hpart'); if(bs.length!==2) return false;
    bs[1].click(); const r=w.eval('ob._fase')==='m'; w.eval("ob._fase='h'"); return r;
  })());
  // ---------- horas de propuestas ----------
  ok('horas: de 0 a 24 en saltos del intervalo', JSON.stringify(w.spanOpciones(3))==='[0,3,6,9,12,15,18,21,24]'
     && w.spanOpciones(1).length===25 && w.spanOpciones(2)[0]===0 && w.spanOpciones(2).slice(-1)[0]===24);
  ok('horas: 0 h es una sola propuesta', JSON.stringify(w.slotTimesDe({startH:7,startM:0,freq:2,span:0}))==='[420]');
  ok('horas: 24 h no repite la primera del día siguiente', (function(){
    const a=w.slotTimesDe({startH:7,startM:0,freq:1,span:24}), b=w.slotTimesDe({startH:7,startM:0,freq:3,span:24});
    return a.length===24 && a[23]<420+1440 && b.length===8;
  })());
  ok('resumen: total y última hora', w.resumenPatron({startH:7,startM:0,freq:3,span:12})==='Total: 5 propuestas al día · Última: 19:00'
     && w.resumenPatron({startH:7,startM:0,freq:1,span:0})==='Total: 1 propuesta al día · Hora: 07:00'
     && w.resumenPatron({startH:7,startM:0,freq:2,span:18}).includes('01:00 (del día siguiente)'));
  ok('bienvenida: las horas siguen al intervalo y llevan resumen', (function(){
    w.eval('ob.freq=2; ob.span=12;'); w.renderOnboarding(2);
    const n=d.querySelectorAll('#main .optgrid .optbtn').length, sum=!!d.getElementById('ob_sum');
    w.eval('ob.freq=3; ob.span=14; ajustarSpanDe(ob);');
    const aj=w.eval('ob.span')===15 || w.eval('ob.span')===12;
    w.eval('ob.freq=3; ob.span=12;');
    return n===13 && sum && aj;
  })());
  // ---------- Ajustes ----------
  w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet();
  let aj=d.getElementById('main').innerHTML;
  ok('Ajustes: resumen bajo las horas', aj.includes('id="pt_sum"'));
  ok('Ajustes: la primera hora se toca por partes', /onclick="abrirReloj\(cfg\.startH\*60\+cfg\.startM[^"]*faseDe\(event\)\)">🕐 <span class="hpart" data-f="h">/.test(aj));
  ok('Ajustes: las horas empiezan en 0 h', /onclick="cfg\.span=0;applyCfg\(\)">0 h</.test(aj));
  ok('Ajustes: constelaciones dentro de Categorías preferidas', (function(){
    const iCat=aj.indexOf(w.t('pt_vis_label')), iCaja=aj.indexOf('class="subcaja"'), iConst=aj.indexOf(w.t('pt_const_label'));
    return iCat>0 && iCaja>iCat && iConst>iCaja && aj.indexOf(w.t('pt_const_label'))===aj.lastIndexOf(w.t('pt_const_label'));
  })());
  ok('Ajustes: «x por semana» y «Profundizar», los dos en la lista', aj.includes(w.t('pt_const_sem')) && aj.includes('profundizarToggle(this.checked)')
     && aj.includes(w.t('pt_const_deep_txt')) && !aj.includes('class="btn ghost block" style="margin-top:10px" onclick="openEventForm(null,null,{soloConst:true})"'));
  ok('configuración: migraciones al día', w.eval('CFG_VERSION')===11 && w.eval('cfg.v')===11 && Array.isArray(w.eval('cfg.constSem.filas')) && w.eval('cfg.azar.sep')===13);
  // ---------- constelaciones x por semana ----------
  ok('x por semana: entra solo los días elegidos', (function(){
    w.eval("cfg.constNo=false; cfg.constIni=false; cfg.constMed=false; cfg.constFin=false; cfg.constSem={on:true,filas:[{d:1,h:1260,pid:null}]};");
    const lun=w.buildDayEntries('2026-01-05'), mar=w.buildDayEntries('2026-01-06');
    const c=lun.find(e=>e.time===1260);
    return !!c && w.esCatConst(byIdW(c.pid).cat) && !mar.some(e=>e.time===1260);
  })());
  ok('x por semana: si coincide con una propuesta, la sustituye', (function(){
    w.eval("cfg.constSem={on:true,filas:[{d:1,h:600,pid:null}]};");
    const lun=w.buildDayEntries('2026-01-05').filter(e=>e.time===600);
    return lun.length===1 && w.esCatConst(byIdW(lun[0].pid).cat);
  })());
  ok('x por semana: las constelaciones no salen por azar en otros huecos', (function(){
    const mar=w.buildDayEntries('2026-01-06');
    return mar.every(e=>!w.esCatConst((byIdW(e.pid)||{}).cat));
  })());
  ok('x por semana: cada una con su día y su hora', (function(){
    w.eval("cfg.constSem={on:true,filas:[{d:1,h:600,pid:null},{d:3,h:1260,pid:null}]};");
    const lun=w.buildDayEntries('2026-01-05'), mie=w.buildDayEntries('2026-01-07');
    const esC=e=>w.esCatConst((byIdW(e.pid)||{}).cat);
    return lun.some(e=>e.time===600 && esC(e)) && !lun.some(e=>e.time===1260)
      && mie.some(e=>e.time===1260 && esC(e)) && !mie.some(e=>e.time===600 && esC(e));
  })());
  ok('x por semana: una concreta sale siempre ese día, a esa hora', (function(){
    w.eval("cfg.constSem={on:true,filas:[{d:1,h:1265,pid:'p039'}]};");
    return ['2026-01-05','2026-01-12','2026-01-19'].every(f=>w.buildDayEntries(f).some(e=>e.time===1265 && e.pid==='p039'));
  })());
  ok('x por semana: la elegida se propone aunque esté en pausa', (function(){
    w.eval("paused.push('p039');");
    const r=w.buildDayEntries('2026-01-05').some(e=>e.time===1265 && e.pid==='p039');
    w.eval("paused=paused.filter(x=>x!=='p039');"); return r;
  })());
  ok('x por semana: si la elegida ya no existe, vuelve a ser al azar', (function(){
    w.eval("cfg.constSem={on:true,filas:[{d:1,h:1265,pid:'uBorrada'}]};");
    const c=w.buildDayEntries('2026-01-05').find(e=>e.time===1265);
    return !!c && w.esCatConst(byIdW(c.pid).cat);
  })());
  ok('x por semana: de 1 a 7, cada una con día, hora y cuál', (function(){
    w.eval("cfg.constSem={on:true,filas:[{d:1,h:600,pid:null}]};");
    const uno=w.constSemBloque();
    w.constSemCuantas(1); w.constSemCuantas(1);
    const f=w.eval('cfg.constSem.filas');
    const tres=f.length===3 && f[1].d===2 && f[2].d===3 && f[2].h===600;
    for(let k=0;k<9;k++) w.constSemCuantas(1);
    const siete=w.eval('cfg.constSem.filas.length')===7 && w.constSemBloque().includes('Total: 7 constelaciones por semana');
    for(let k=0;k<9;k++) w.constSemCuantas(-1);
    const minimo=w.eval('cfg.constSem.filas.length')===1;
    w.constSemCual(0,'p039'); w.constSemDia(0,'5');
    const b=w.constSemBloque();
    const fila=w.eval('cfg.constSem.filas[0]');
    return uno.includes('Total: 1 constelación por semana') && uno.includes('🎲 '+w.t('pt_const_sem_rand'))
      && (uno.match(/<option value="p0\d\d"/g)||[]).length>=58 && uno.includes('>'+w.nombreDia(1)+'<')
      && tres && siete && minimo && fila.pid==='p039' && fila.d===5 && b.includes('value="p039" selected');
  })());
  ok('x por semana: lo de antes (días × horas) pasa a filas', (function(){
    const c=w.constSemFilasDe({on:true,dias:[0,1,3],horas:[1260,600]});
    const muchas=w.constSemFilasDe({on:true,dias:[0,1,2,3,4,5,6],horas:[600,1260]});
    return c.on && JSON.stringify(c.filas)==='[{"d":1,"h":600,"pid":null},{"d":1,"h":1260,"pid":null},{"d":3,"h":600,"pid":null},{"d":3,"h":1260,"pid":null},{"d":0,"h":600,"pid":null},{"d":0,"h":1260,"pid":null}]'
      && muchas.filas.length===7 && w.constSemFilasDe({on:true,dias:[],horas:[600]}).on===false;
  })());
  ok('«No proponer» apaga también las semanales', /cfg\.constNo=this\.checked;if\(this\.checked\)\{[^}]*cfg\.constSem\.on=false/.test(html));
  w.eval("cfg.constSem={on:false,filas:[]}; LS.set('mpt_cfg',cfg); LS.set('mpt_plans',{});");
  ok('Profundizar: solo constelaciones, sin «ejercicio nuevo»', (function(){
    w.openEventForm(null,null,{soloConst:true});
    const ops=[...d.getElementById('ev_p').options].filter(o=>!o.disabled);
    const r=ops.length>10 && ops.every(o=>w.esCatConst(byIdW(o.value).cat)) && !ops.some(o=>o.value==='__new__')
      && d.getElementById('modalContent').innerHTML.includes(w.t('pt_const_deep'));
    w.closeModal(); return r;
  })());
  ok('Profundizar: casilla que crea, pausa y retoma', (function(){
    w.eval('userEvents=[]; evPaused=[]; LS.set("mpt_events",[]); LS.set("mpt_evpaused",[]); setCollapsed={};'); w.renderSet();
    const cas=()=>d.querySelector('#main input[onchange="profundizarToggle(this.checked)"]');
    const sinMarcar=!!cas() && !cas().checked;
    w.profundizarToggle(true);                       // sin ninguna: abre el formulario de constelaciones
    const form=d.getElementById('modalContent').innerHTML.includes(w.t('ef_deep_txt'));
    d.getElementById('ev_h').value='21:00'; d.getElementById('ev_p').value='p039'; d.getElementById('ev_r').value='daily'; d.getElementById('ev_veces').value='21';
    w.saveEvent();
    const ev=w.eval('userEvents[0]');
    const creado=!!ev && ev.prof===true && ev.pid==='p039' && ev.veces===21;
    w.closeModal(); w.renderSet();
    const h=d.getElementById('main').innerHTML;
    const marcada=cas().checked && h.includes('🔍 <b>') && h.includes(w.t('pt_const_deep_add'));
    w.profundizarToggle(false);
    const pausa=w.eval('evPaused.includes(userEvents[0].id)') && !cas().checked;
    w.profundizarToggle(true);
    const retoma=w.eval('evPaused.length')===0 && cas().checked;
    w.eval('userEvents=[]; evPaused=[]; LS.set("mpt_events",[]); LS.set("mpt_evpaused",[]); rebuildToday();'); w.renderSet();
    return sinMarcar && form && creado && marcada && pausa && retoma;
  })());
  ok('Profundizar: un momento normal no lleva la marca', (function(){
    w.openEventForm();
    d.getElementById('ev_h').value='10:30'; d.getElementById('ev_p').value='p001'; d.getElementById('ev_r').value='daily';
    w.saveEvent(); w.closeModal();
    const r=w.eval('userEvents.length')===1 && w.eval('userEvents[0].prof')===undefined;
    w.eval('userEvents=[]; LS.set("mpt_events",[]); rebuildToday();'); return r;
  })());
  // ---------- idiomas ----------
  const pl=w.plantillaTraduccion('es');
  const esJson=JSON.parse(require('fs').readFileSync(require('path').join(entorno.RAIZ,'idiomas','es.json'),'utf8'));
  ok('plantilla: mismo reparto que tools/exportar-idiomas.js', JSON.stringify(Object.keys(pl.fijos).sort())===JSON.stringify(Object.keys(esJson.fijos).sort())
     && Object.keys(pl.interfaz).length===Object.keys(esJson.interfaz).length);
  ok('plantilla: 208 prácticas, 8 categorías e instrucciones', Object.keys(pl.practicas).length===208 && Object.keys(pl.categorias).length===8 && pl._leeme.length===5);
  ok('plantilla sin código: la app la rechaza explicando por qué', w.revisarIdioma(pl).includes(w.t('iv_codigo')));
  ok('idioma traducido: se importa y se ofrece enviarlo', (function(){
    const fr=Object.assign({}, pl, {codigo:'fr', nombre:'Français', autor:'Prueba'});
    w.confirm=()=>true;
    w.aplicarIdiomaTexto(JSON.stringify(fr));
    const r=!!w.eval("idiomasPropios.fr") && d.getElementById('modalContent').innerHTML.includes(w.t('tr_send_title'));
    w.closeModal(); return r;
  })());
  let enviado=null;
  w.Capacitor.Plugins.Ajustes.compartirArchivo=o=>{ enviado=o; return Promise.resolve(); };
  await w.enviarIdiomaEmail('fr');
  ok('idioma: se envía adjunto, a Jordi, con asunto', !!enviado && enviado.nombre==='moment-fr.json' && enviado.email===w.eval('METRICS_EMAIL')
     && enviado.asunto.includes('Français') && JSON.parse(Buffer.from(enviado.base64,'base64').toString('utf8')).codigo==='fr');
  w.setLang('es'); w.eval("delete idiomasPropios.fr; LS.set('mpt_idiomas', idiomasPropios);");
  w.eval('setCollapsed={}'); w.renderSet(); aj=d.getElementById('main').innerHTML;
  ok('Ajustes: descargar plantilla y copiar instrucciones para la IA', aj.includes('descargarPlantillaTraduccion()') && aj.includes("copyText(t('tr_prompt'))"));
  ok('Ajustes: todo lo de traducir junto, en tres pasos, con el botón de subir', (function(){
    // (el título también se cita en el texto de «Idioma»: se busca la etiqueta)
    const i0=aj.indexOf('>'+w.t('tr_title')+'</label>'), i1=aj.indexOf(w.t('tr_s1')), i2=aj.indexOf(w.t('tr_s2')), i3=aj.indexOf(w.t('tr_s3'));
    const iSubir=aj.indexOf('id="id_file"'), iResp=aj.indexOf(w.t('lb_label')), iIdiomas=aj.indexOf("setLang('en')");
    return i0>0 && iIdiomas<iResp && iResp<i0 && i1>i0 && i2>i1 && i3>i2 && iSubir>i3
      && aj.split('id="id_file"').length===2 && aj.includes(w.t('id_import'));
  })());
  // ---------- idiomas: lo que no se traduce es siempre lo oficial (3.89) ----------
  const legal=Object.keys(pl.fijos)[0];
  let alertado='';
  w.alert=m=>{ alertado=String(m); };
  ok('idioma: licencia, esquema, revisado, legales y «Moment» vuelven a ser los oficiales', (function(){
    const it=JSON.parse(JSON.stringify(pl));
    Object.assign(it, {codigo:'it', nombre:'Italiano', autor:'Prova', licencia:'MIT', esquema:'uno', revisado:true, traducidoDe:'xx'});
    it.fijos[legal]='TESTO LEGALE CAMBIATO';
    it.interfaz[legal]='ANCHE QUI CAMBIATO';
    it.interfaz.app_title='Momento';
    it.interfaz.az_cap='Ci stanno al massimo tante';           // ha perdido {n} y {s}
    it.interfaz.set_pattern='Pratiche proposte';
    it.interfaz.clave_inventada='x';
    let msg='';
    w.confirm=m=>{ msg=String(m); return true; };
    w.aplicarIdiomaTexto(JSON.stringify(it));
    w.closeModal(); w.confirm=()=>true;
    const g=w.eval('idiomasPropios.it');
    return !!g && g.licencia==='AGPL-3.0' && g.esquema===1 && g.revisado===false && g.traducidoDe==='es' && !g.fijos
      && !(legal in g.interfaz) && !('app_title' in g.interfaz) && !('az_cap' in g.interfaz) && !('clave_inventada' in g.interfaz)
      && w.getLang()==='it' && w.t(legal)===w.eval('I18N.es['+JSON.stringify(legal)+']') && w.t('app_title')==='Moment'
      && w.t('set_pattern')==='Pratiche proposte' && w.t('az_cap').includes('{s}')
      && msg.includes(w.eval('I18N.es.id_fixed').replace('{n}',1));
  })());
  ok('idioma: lo que falta se ve en el idioma de respaldo elegido', (function(){
    w.eval("cfg.langBiblio='en';");
    const r=w.t(legal)===w.eval('I18N.en['+JSON.stringify(legal)+']') && w.t('app_title')==='Moment';
    w.eval("cfg.langBiblio='es';"); return r;
  })());
  ok('idioma: en Ajustes aparece entre «Tus idiomas añadidos»', (function(){
    w.eval('setCollapsed={}'); w.renderSet(); const h=d.getElementById('main').innerHTML;
    return h.includes(w.t('tr_mine')) && h.includes("enviarIdiomaEmail('it')") && h.includes("quitarIdioma('it')") && h.indexOf("quitarIdioma('it')")>h.indexOf('id="id_file"');
  })());
  ok('idioma: los guardados antes de la 3.89 se limpian al arrancar', (function(){
    w.eval("idiomasPropios.it.fijos={"+JSON.stringify(legal)+":'VIEJO'}; idiomasPropios.it.interfaz["+JSON.stringify(legal)+"]='VIEJO'; idiomasPropios.it.licencia='MIT'; LS.set('mpt_idiomas', idiomasPropios);");
    w.eval('cargarIdiomasPropios()');
    const g=JSON.parse(w.localStorage.getItem('mpt_idiomas')).it;
    return !g.fijos && !(legal in g.interfaz) && g.licencia==='AGPL-3.0' && w.t(legal)!=='VIEJO';
  })());
  ok('idioma: un archivo de una versión más nueva se rechaza', (function(){
    alertado='';
    const nuevo=Object.assign(JSON.parse(JSON.stringify(pl)), {codigo:'pt', nombre:'Português', esquema:99});
    w.aplicarIdiomaTexto(JSON.stringify(nuevo));
    return alertado.includes(w.t('iv_esquema')) && !w.eval('idiomasPropios.pt');
  })());
  w.setLang('es'); w.eval("delete idiomasPropios.it; LS.set('mpt_idiomas', idiomasPropios); delete I18N.it;");
  w.eval('setCollapsed={}'); w.renderSet(); aj=d.getElementById('main').innerHTML;
  ok('plugin nativo: el correo llega con destinatario', /EXTRA_EMAIL/.test(require('fs').readFileSync(require('path').join(entorno.RAIZ,'tools','prepare-android.js'),'utf8')));
  // ---------- El Noveno Camino ----------
  w.gotoTab('fav');
  ok('El Noveno Camino: título centrado', d.getElementById('main').innerHTML.includes('font-size:1.7rem;text-align:center'));
  // ---------- crear una constelación con IA (3.89) ----------
  w.gotoTab('lib');
  ok('Ajustes: también al final de las constelaciones del día', (function(){
    w.eval('setCollapsed={}'); w.renderSet(); const caja=d.querySelector('#main .subcaja');
    const bs=[...caja.querySelectorAll('button')]; return bs.length && bs[bs.length-1].getAttribute('onclick')==='abrirConstelacionIA()';
  })());
  ok('Biblioteca: botón para crear una constelación con IA', d.getElementById('main').innerHTML.includes('abrirConstelacionIA()')
     && d.getElementById('main').innerHTML.includes(w.t('lib_ai_const')));
  ok('prompt de constelaciones: preguntas, contexto y la lista entera', (function(){
    const p=w.promptConstelacion(), n=w.eval("ALL().filter(p=>esCatConst(p.cat)).length");
    return n>=58 && p.includes('Bert Hellinger') && p.includes('Brigitte Champetier de Ribes') && p.includes('o crea una nueva')
      && p.includes('\n'+n+'. ') && p.includes('\n1. '+w.eval("ALL().filter(p=>esCatConst(p.cat))[0].title")) && !p.includes('{lista}')
      && p.includes('emergencias') && p.includes('¿Qué tema o situación quieres trabajar?') && !/<[a-z]/i.test(p);
  })());
  ok('prompt de constelaciones: también en inglés', (function(){
    w.setLang('en'); const p=w.promptConstelacion(); w.setLang('es');
    return p.startsWith('I would like you to help me') && p.includes('\n1. '+w.eval("PRACTICES_EN.find(p=>p.cat==='constelaciones').title")) && !p.includes('{lista}');
  })());
  ok('crear constelación con IA: copiar y añadirla a la Biblioteca, en Constelaciones', (function(){
    w.abrirConstelacionIA();
    const h=d.getElementById('modalContent').innerHTML;
    const r=h.includes('copyText(promptConstelacion())') && h.includes("openAddForm('constelaciones')");
    w.openAddForm('constelaciones');
    const sel=d.getElementById('np_c').value==='constelaciones';
    w.closeModal(); return r && sel;
  })());
  ok('una constelación propia se puede elegir en «x por semana», en Profundizar y entra en el prompt', (function(){
    w.eval("userLib.push({id:'uC1',cat:'constelaciones',title:'Mi constelación',text:'pasos'}); libCacheDirty(); cfg.constSem={on:true,filas:[{d:1,h:600,pid:null}]};");
    const enSem=w.constSemBloque().includes('value="uC1"');
    w.openEventForm(null,null,{soloConst:true});
    const enProf=[...d.getElementById('ev_p').options].some(o=>o.value==='uC1'); w.closeModal();
    const enPrompt=w.promptConstelacion().includes('Mi constelación');
    w.eval("userLib=userLib.filter(p=>p.id!=='uC1'); libCacheDirty(); cfg.constSem={on:false,filas:[]};");
    return enSem && enProf && enPrompt;
  })());
  // ---------- archivos en la biblioteca estándar (3.89) ----------
  ok('biblioteca: las prácticas pueden llevar archivos de dentro de la app, por idioma', (function(){
    const p={id:'p001', cat:'armonizacion', adj:[
      {tipo:'audio', src:'medios/p001-es.mp3', idioma:'es'}, {tipo:'audio', src:'medios/p001-en.mp3', idioma:'en'},
      {tipo:'image', src:'medios/p001.jpg'}, {tipo:'video', src:'https://malo.example/v.mp4'},
      {tipo:'audio', src:'medios/../../secreto'}, {tipo:'script', src:'medios/x.js'}]};
    const src=l=>JSON.stringify(l.map(a=>a.src));
    const es=w.adjuntosDe(p,'es','es'), en=w.adjuntosDe(p,'en','es'), de=w.adjuntosDe(p,'de','en');
    const h=w.adjuntoHTML({id:'p001', adjs:es});
    return src(es)==='["medios/p001.jpg","medios/p001-es.mp3"]' && src(en)==='["medios/p001.jpg","medios/p001-en.mp3"]'
      && src(de)==='["medios/p001.jpg","medios/p001-en.mp3"]'
      && h.includes('<img src="medios/p001.jpg"') && h.includes('<audio controls preload="none" src="medios/p001-es.mp3">')
      && w.adjuntoHTML({id:'p002'})==='';
  })());
  ok('biblioteca: con un archivo declarado, la práctica lo muestra', (function(){
    w.eval("PRACTICAS.find(p=>p.id==='p002').adj=[{tipo:'audio',src:'medios/p002.mp3'}]; PRACTICES=construirPracticas('es','es'); libCacheDirty();");
    w.renderFullPractice('p002','lib');
    const r=d.getElementById('main').innerHTML.includes('src="medios/p002.mp3"');
    w.eval("delete PRACTICAS.find(p=>p.id==='p002').adj; refreshPracticesLang();");
    return r && !w.eval("byId('p002').adjs");
  })());
  ok('service worker: los archivos de medios/ van directos, sin caché',
     fs.readFileSync(require('path').join(entorno.RAIZ,'www','sw.js'),'utf8').includes("if (url.pathname.includes('/medios/')) return;"));
  // ---------- adjuntos ----------
  w.eval("window._adjMem=new Map(); ADJ.guardar=(id,b)=>{ _adjMem.set(id,b); return Promise.resolve(); }; ADJ.leer=id=>Promise.resolve(_adjMem.get(id)); ADJ.borrar=id=>{ _adjMem.delete(id); return Promise.resolve(); };");
  w.URL.createObjectURL=()=>'blob:prueba'; w.URL.revokeObjectURL=()=>{};
  ok('adjunto: el formulario lo ofrece', (function(){ w.openEventForm(); const r=!!d.getElementById('ev_adj'); return r; })());
  ok('adjunto: acepta cualquier archivo (un PDF también)', (function(){
    w.evAdjElegir(new w.File(['x'], 'a.pdf', {type:'application/pdf'}));
    const r=w.eval('_evAdj.nuevo && _evAdj.nuevo.name')==='a.pdf' && w.adjTipo('application/pdf','a.pdf')==='file'
      && w.adjTipo('text/plain','n.txt')==='text' && w.adjTipo('','notas.md')==='text' && w.adjTipo('image/png')==='image';
    w.eval('_evAdj={actual:null, nuevo:null, quitar:false}'); return r;
  })());
  ok('adjunto: rechaza archivos demasiado grandes', (function(){
    w.evAdjElegir({name:'v.mp4', type:'video/mp4', size:300*1024*1024}); return w.eval('_evAdj.nuevo')===null;
  })());
  let pidAdj=null;
  ok('adjunto: un momento solo con audio se guarda', (function(){
    w.eval('userEvents=[]; LS.set("mpt_events",[]);');
    w.openEventForm();
    d.getElementById('ev_h').value='11:00'; d.getElementById('ev_p').value='__new__'; d.getElementById('ev_r').value='daily';
    d.getElementById('ev_xt').value='Audio guiado';
    w.evAdjElegir(new w.File(['abc'], 'guia.mp3', {type:'audio/mpeg'}));
    w.saveEvent();
    const p=w.eval('userLib[userLib.length-1]'); pidAdj=p.id;
    return w.eval('userEvents.length')===1 && p.adj && p.adj.tipo==='audio' && p.adj.nombre==='guia.mp3' && p.text===w.t('default_adj_text');
  })());
  await new Promise(r=>setTimeout(r,50));
  ok('adjunto: el archivo queda en el dispositivo', w.eval('_adjMem.size')===1);
  ok('adjunto: se ve al abrir la práctica', await (async function(){
    w.closeModal(); w.renderFullPractice(pidAdj,'lib');
    await new Promise(r=>setTimeout(r,50));
    return !!d.querySelector('#main .adjunto audio[controls]');
  })());
  ok('adjunto: al borrar la práctica se borra el archivo', (function(){
    w.delUser(pidAdj); return w.eval('_adjMem.size')===0;
  })());
  w.eval('userEvents=[]; LS.set("mpt_events",[]);');
  ok('Crear nueva práctica: permite adjuntar un archivo y basta con él', (function(){
    w.openAddForm();
    const hay=!!d.getElementById('ev_adj') && !d.getElementById('ev_adj').getAttribute('accept');
    d.getElementById('np_t').value='Con PDF';
    w.evAdjElegir(new w.File(['%PDF'], 'guia.pdf', {type:'application/pdf'}));
    w.eval('location.href="#"'); w.saveUserPractice();
    const p=w.eval('userLib[userLib.length-1]');
    const r=hay && p.title==='Con PDF' && p.adj && p.adj.tipo==='file' && p.adj.nombre==='guia.pdf';
    w.eval("userLib=userLib.filter(x=>x.id!=="+JSON.stringify(p.id)+"); LS.set('mpt_userlib',userLib); libCacheDirty();");
    return r;
  })());
  ok('cualquier práctica de la biblioteca admite un archivo, también las de la app', (function(){
    w.abrirAdjuntoPractica('p002');
    const form=!!d.getElementById('ev_adj') && d.getElementById('modalContent').innerHTML.includes(w.t('lib_adj_title'));
    w.evAdjElegir(new w.File(['hola'], 'nota.txt', {type:'text/plain'}));
    w.guardarAdjuntoPractica();
    const a=w.eval("adjLibreria.p002");
    const guardado=!!a && a.tipo==='text' && JSON.parse(w.localStorage.getItem('mpt_adjlib')).p002.nombre==='nota.txt';
    const h=w.adjuntoHTML(w.eval("byId('p002')"));
    const pinta=h.includes('data-adj="'+a.id+'"') && h.includes('data-tipo="text"');
    w.gotoTab('lib'); w.eval("expandedLib.add('p002')"); w.renderLibList();
    const boton=d.getElementById('main').innerHTML.includes("abrirAdjuntoPractica('p002')") && d.getElementById('main').innerHTML.includes(w.t('lib_adj_change'));
    w.abrirAdjuntoPractica('p002'); w.evAdjQuitar(); w.guardarAdjuntoPractica();
    const quitado=!w.eval("adjLibreria.p002") && !JSON.parse(w.localStorage.getItem('mpt_adjlib')).p002;
    w.eval("expandedLib.delete('p002')");
    return form && guardado && pinta && boton && quitado;
  })());
  ok('saneado: los adjuntos de texto y otros archivos se conservan', w.sanearPractica({id:'u9',title:'x',text:'y',cat:'c',adj:{id:'a1',tipo:'file',nombre:'a.pdf',mime:'application/pdf',kb:3}}).adj.tipo==='file');
  // ---------- arreglo: editar un momento guarda días y límite ----------
  ok('editar un momento guarda los días de la semana y el límite', (function(){
    w.eval("userEvents=[{id:'eW',title:'W',time:540,pid:'p001',rep:'wdays',wd:[1,4],veces:7,n:2,startY:2026,startM:1,startD:1}]; LS.set('mpt_events',userEvents);");
    w.openEventForm('eW');
    w.evToggleDia(4); w.evToggleDia(6);
    d.getElementById('ev_veces').value='21';
    w.saveEvent();
    const ev=w.eval("getEvent('eW')"); w.closeModal();
    const r=JSON.stringify(ev.wd)==='[1,6]' && ev.veces===21;
    w.eval('userEvents=[]; LS.set("mpt_events",[]);');
    return r;
  })());
  // ================= 3.88: tres modos =================
  const cfg0=w.eval('JSON.stringify(cfg)'), ev0=w.eval('JSON.stringify(userEvents)'), pa0=w.eval('JSON.stringify(paused)');
  const restaurar=()=>w.eval('cfg='+cfg0+'; userEvents='+ev0+'; paused='+pa0+'; LS.set("mpt_cfg",cfg); LS.set("mpt_events",userEvents); LS.set("mpt_paused",paused); LS.set("mpt_plans",{}); libCacheDirty();');
  const dias=n=>Array.from({length:n},(_,k)=>{ const d=new w.Date(2026,0,1+k); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); });
  const plan=d=>w.eval('buildDayEntries('+JSON.stringify(d)+')');
  // ---------- migración ----------
  ok('migración: «solo mis momentos» pasa a patrón apagado', (function(){
    w.eval("cfg={startH:8,startM:0,freq:2,span:14,soloEventos:true,v:9}; migrarCfg();");
    const r=w.eval('cfg.patron')===false && w.eval('cfg.soloEventos')===undefined && w.eval('cfg.azar.on')===false && w.eval('cfg.v')===w.eval('CFG_VERSION');
    w.eval("cfg={startH:8,startM:0,freq:2,span:14,soloEventos:false,v:9}; migrarCfg();");
    const r2=w.eval('cfg.patron')===true;
    restaurar(); return r && r2;
  })());
  // ---------- solo momentos propios ----------
  ok('patrón y azar apagados: el día son solo los momentos', (function(){
    w.eval("cfg.patron=false; cfg.azar.on=false; userEvents=[{id:'eM',title:'M',time:600,pid:'p001',rep:'daily',n:2,startY:2026,startM:1,startD:1}];");
    const e=plan('2026-01-05');
    const r=e.length===1 && e[0].ev==='eM' && w.eval('evChocaPatron(userEvents[0]).length')===0;
    restaurar(); return r;
  })());
  // ---------- al azar ----------
  const revisar=(cfgAz, n, fn)=>{
    w.eval('cfg.patron=false; userEvents=[]; cfg.azar='+JSON.stringify(Object.assign({on:true},cfgAz))+';');
    const r=dias(n).every(d=>fn(plan(d), d));
    restaurar(); return r;
  };
  ok('al azar: entre el mínimo y el máximo cada día', revisar({ini:540,fin:1260,min:3,max:5,excl:[]}, 60, e=>e.length>=3 && e.length<=5));
  ok('al azar: el número varía de un día a otro', (function(){
    const n=new Set(); revisar({ini:540,fin:1260,min:3,max:5,excl:[]}, 60, e=>{ n.add(e.length); return true; }); return n.size>=2;
  })());
  ok('al azar: las horas cambian de un día a otro, también en franjas justas', (function(){
    const h=new Set(), h2=new Set();
    revisar({ini:540,fin:1260,min:3,max:3,excl:[]}, 30, e=>{ h.add(e.map(x=>x.time).join()); return true; });
    revisar({ini:570,fin:660,min:4,max:4,excl:[]}, 30, e=>{ h2.add(e.map(x=>x.time).join()); return true; });
    return h.size>=25 && h2.size>=5;
  })());
  ok('al azar: mínimo = máximo da siempre las mismas', revisar({ini:540,fin:1260,min:4,max:4,excl:[]}, 40, e=>e.length===4));
  ok('al azar: dentro de la franja y a cualquier minuto (13:00 o 13:41)', (function(){
    let sueltos=0;
    const r=revisar({ini:540,fin:1260,min:2,max:8,excl:[]}, 60, e=>{ sueltos+=e.filter(x=>x.time%5!==0).length; return e.every(x=>x.time>=540 && x.time<=1260); });
    return r && sueltos>20;
  })());
  ok('al azar: al menos 13 minutos entre una y otra de partida', revisar({ini:600,fin:720,min:6,max:9,excl:[]}, 60, e=>e.every((x,i)=>!i || x.time-e[i-1].time>=13)));
  ok('al azar: la separación la elige la persona', revisar({ini:600,fin:840,min:5,max:5,sep:45,excl:[]}, 60, e=>e.length===5 && e.every((x,i)=>!i || x.time-e[i-1].time>=45)));
  ok('al azar: caben como mucho las de 13 en 13 minutos', revisar({ini:600,fin:660,min:9,max:9,excl:[]}, 20, e=>e.length===5)
     && revisar({ini:600,fin:660,min:9,max:9,sep:30,excl:[]}, 10, e=>e.length===3));
  ok('al azar: la franja puede pasar la medianoche', revisar({ini:1320,fin:120,min:3,max:3,excl:[]}, 40, e=>e.length===3 && e.every(x=>x.time>=1320 && x.time<=1560)));
  ok('al azar: sin franja, una sola a su hora', revisar({ini:600,fin:600,min:3,max:5,excl:[]}, 10, e=>e.length===1 && e[0].time===600));
  ok('al azar: sin repetir práctica en el día', revisar({ini:0,fin:1435,min:24,max:24,excl:[]}, 30, e=>new Set(e.map(x=>x.pid)).size===e.length && e.length===24));
  ok('al azar: solo las categorías marcadas', revisar({ini:540,fin:1260,min:5,max:5,excl:['constelaciones','meditacion','respiracion']}, 60,
     e=>e.every(x=>!['constelaciones','meditacion','respiracion'].includes(byIdW(x.pid).cat))));
  ok('al azar: nunca las prácticas en pausa', (function(){
    const todas=w.eval("PRACTICES.filter(p=>p.cat==='valores').map(p=>p.id)");
    w.eval('paused='+JSON.stringify(todas.slice(0, todas.length-2))+';');
    const libres=todas.slice(-2);
    w.eval("cfg.patron=false; userEvents=[]; cfg.azar={on:true,ini:540,fin:1260,min:5,max:5,excl:"+JSON.stringify(w.eval('catPairs().map(c=>c.id)').filter(c=>c!=='valores'))+"};");
    const r=dias(20).every(d=>{ const e=plan(d); return e.length===2 && e.every(x=>libres.includes(x.pid)); });
    restaurar(); return r;
  })());
  ok('al azar: también las categorías propias, y se pueden quitar', (function(){
    w.eval("userLib=[{id:'uA',cat:'Mi cosa',title:'A',text:'a'},{id:'uB',cat:'Mi cosa',title:'B',text:'b'}]; libCacheDirty();");
    const enLista=w.eval("catPairs().some(c=>c.id==='Mi cosa')");
    w.eval("cfg.patron=false; userEvents=[]; cfg.azar={on:true,ini:540,fin:1260,min:2,max:2,excl:"+JSON.stringify(w.eval('catPairs().map(c=>c.id)').filter(c=>c!=='Mi cosa'))+"};");
    const solo=dias(5).every(d=>plan(d).every(x=>x.pid==='uA'||x.pid==='uB'));
    w.eval("cfg.azar.excl.push('Mi cosa');");
    const ninguna=plan('2026-01-09').length===0;
    w.eval("userLib=[]; libCacheDirty();"); restaurar();
    return enLista && solo && ninguna;
  })());
  ok('al azar + patrón: no pisa sus horas ni repite prácticas', (function(){
    w.eval("cfg.patron=true; cfg.freq=1; cfg.span=12; cfg.startH=9; cfg.startM=0; userEvents=[]; cfg.azar={on:true,ini:540,fin:1260,min:5,max:8,excl:[]};");
    const pat=w.eval('slotTimes()');
    const r=dias(40).every(d=>{
      const e=plan(d), az=e.filter(x=>!pat.includes(x.time));
      return az.length>=5 && az.every(x=>pat.every(p=>Math.abs(p-x.time)>=13)) && new Set(e.map(x=>x.pid)).size===e.length;
    });
    restaurar(); return r;
  })());
  ok('al azar: no pisa los momentos propios', (function(){
    w.eval("cfg.patron=false; userEvents=[{id:'eQ',title:'Q',time:600,pid:'p001',rep:'daily',n:2,startY:2026,startM:1,startD:1}]; cfg.azar={on:true,ini:570,fin:660,min:4,max:4,excl:[]};");
    const r=dias(30).every(d=>{ const e=plan(d); return e.length===5 && e.filter(x=>!x.ev).every(x=>Math.abs(x.time-600)>=13) && e.filter(x=>x.pid==='p001').length===1; });
    restaurar(); return r;
  })());
  ok('al azar: el plan de cada día no cambia al pedirlo otra vez', (function(){
    w.eval("cfg.patron=false; userEvents=[]; cfg.azar={on:true,ini:540,fin:1260,min:3,max:6,excl:[]}; LS.set('mpt_plans',{});");
    const a=JSON.stringify(w.eval("getPlanFor('2026-12-01')")), b=JSON.stringify(w.eval("getPlanFor('2026-12-01')"));
    restaurar(); return a===b && a.length>10;
  })());
  ok('al azar: resumen legible', (function(){
    const r1=w.azarResumen({ini:540,fin:1260,min:3,max:5})==='Cada día, de 3 a 5 prácticas al azar, entre las 09:00 y las 21:00. Al menos 13 minutos entre una propuesta y otra.';
    const r2=w.azarResumen({ini:540,fin:1260,min:4,max:4,sep:20})==='Cada día, 4 prácticas al azar, entre las 09:00 y las 21:00. Al menos 20 minutos entre una propuesta y otra.';
    const r3=w.azarResumen({ini:1320,fin:120,min:1,max:1}).includes('02:00 (del día siguiente)');
    const r4=w.azarFranjaTxt({ini:540,fin:1290})==='Franja de 12 h 30 min: de 09:00 a 21:30';
    return r1 && r2 && r3 && r4;
  })());
  // ---------- bienvenida ----------
  w.eval("ob.modo='patron'; ob.azar=null;");
  ok('bienvenida: tras la copia viene la elección de modo', (function(){
    w.renderOnboarding('import');
    return d.getElementById('main').innerHTML.includes("renderOnboarding('modo')");
  })());
  ok('bienvenida: tres modos, explicados, con «Con un patrón» de partida', (function(){
    w.renderOnboarding('modo');
    const bs=[...d.querySelectorAll('#main button.modo')];
    return bs.length===3 && bs[0].classList.contains('sel') && bs.every(b=>b.querySelector('span') && b.querySelector('span').textContent.length>40)
      && d.querySelectorAll('#main .progress span').length===5;
  })());
  ok('bienvenida: el patrón sigue con la hora, el intervalo y las horas', (function(){
    w.renderOnboarding('modo');
    d.querySelector('#main .btn.primary').click();
    const enHora=d.getElementById('main').innerHTML.includes(w.t('ob_hour_title'));
    const atras=d.querySelector('#main .btn.ghost.small').getAttribute('onclick').includes('modo');
    return enHora && atras && JSON.stringify(w.eval('FLUJO_OB.patron'))==='["modo",0,1,2,3]';
  })());
  ok('bienvenida: el modo al azar tiene franja, cantidad y categorías', (function(){
    d.querySelectorAll('#main button.modo')[1] || w.renderOnboarding('modo');
    w.renderOnboarding('modo'); d.querySelectorAll('#main button.modo')[1].click();
    const sel=w.eval('ob.modo')==='azar' && d.querySelectorAll('#main button.modo')[1].classList.contains('sel');
    d.querySelector('#main .btn.primary').click();
    const p1=d.getElementById('main').innerHTML.includes(w.t('ob_az_win_title')) && d.querySelectorAll('#main [onclick^="azHora(\'ob\'"]').length===2;
    d.querySelector('#main .btn.primary').click();
    const p2=d.getElementById('main').innerHTML.includes(w.t('ob_az_n_title')) && d.querySelectorAll('#main .contador').length===3
      && !!d.querySelector('#main input.numsep');
    d.querySelector('#main .btn.primary').click();
    const p3=d.getElementById('main').innerHTML.includes(w.t('ob_az_cat_title')) && d.querySelectorAll('#main .chkrow input[type=checkbox]').length>=8;
    d.querySelector('#main .btn.primary').click();
    const fin=w.eval('ob._paso')===3 && d.querySelector('#main .btn.ghost.small').getAttribute('onclick').includes('az3');
    return sel && p1 && p2 && p3 && fin;
  })());
  ok('bienvenida: mínimo y máximo se ajustan entre sí', (function(){
    w.eval("ob.azar={on:false,ini:540,fin:1260,min:3,max:5,excl:[]}; ob._paso='az2';");
    w.azPaso('ob','min',1); w.azPaso('ob','min',1); w.azPaso('ob','min',1);
    const a=w.eval('ob.azar.min')===6 && w.eval('ob.azar.max')===6;
    w.azPaso('ob','max',-1);
    const b=w.eval('ob.azar.min')===5 && w.eval('ob.azar.max')===5;
    w.eval("ob.azar.fin=600;"); w.azPaso('ob','max',1);   // 1 h: caben 5
    const c=w.eval('ob.azar.max')===5 && d.getElementById('main').innerHTML.includes(w.t('az_cap').replace('{n}',5).replace('{s}',13));
    return a && b && c;
  })());
  ok('bienvenida: la separación mínima se elige y ajusta lo que cabe', (function(){
    w.eval("ob.azar={on:false,ini:540,fin:600,min:4,max:5,sep:13,excl:[]}; ob._paso='az2';");
    w.azSepFijar('ob', '30');                       // 1 h con 30 min: caben 3
    const a=w.eval('ob.azar.sep')===30 && w.eval('ob.azar.max')===3 && w.eval('ob.azar.min')===3;
    w.azSep('ob', 1);
    const b=w.eval('ob.azar.sep')===31 && d.querySelector('#main input.numsep').value==='31';
    w.azSepFijar('ob', '999'); const c=w.eval('ob.azar.sep')===240;
    w.azSepFijar('ob', 'abc'); const e=w.eval('ob.azar.sep')===13;
    w.eval("ob.azar.fin=1260;");
    return a && b && c && e;
  })());
  ok('bienvenida: sin categorías no se puede seguir', (function(){
    w.eval("ob.azar.excl=catPairs().map(c=>c.id);"); w.renderOnboarding('az3');
    const r=d.querySelector('#main .btn.primary').disabled && d.getElementById('main').innerHTML.includes(w.t('az_cat_none'));
    w.eval("ob.azar.excl=[];"); return r;
  })());
  ok('bienvenida: personalizado explica y va directo a los avisos', (function(){
    w.eval("ob.modo='propio';"); w.renderOnboarding('pr');
    const h=d.getElementById('main').innerHTML;
    const r=h.includes(w.t('ob_pr_txt')) && d.querySelectorAll('#main .progress span').length===3;
    d.querySelector('#main .btn.primary').click();
    return r && w.eval('ob._paso')===3 && d.querySelector('#main .btn.ghost.small').getAttribute('onclick').includes('pr');
  })());
  ok('bienvenida: la pantalla de avisos sigue siendo la última', (function(){
    w.eval("ob.modo='azar'"); w.renderOnboarding(3);
    const h=d.getElementById('main').innerHTML;
    return h.includes(w.t('ob_rem_title')) && h.includes('toggleNotif') && h.includes('finishOnboarding()');
  })());
  ok('bienvenida: al terminar en modo azar, se guarda solo ese modo', (function(){
    w.eval("ob.modo='azar'; ob.azar={on:false,ini:600,fin:1200,min:2,max:4,excl:['psicomagia']};");
    w.finishOnboarding();
    const c=w.eval('cfg');
    const r=c.patron===false && c.azar.on===true && c.azar.ini===600 && c.azar.min===2 && c.azar.max===4
      && c.azar.excl.join()==='psicomagia' && c.v===w.eval('CFG_VERSION') && JSON.parse(w.localStorage.getItem('mpt_cfg')).azar.on===true;
    const n=w.eval('dayState.plan.filter(s=>!s.ev).length');
    // la configuración nueva tiene todos los valores por defecto, como una migrada
    const completa=c.langBiblio==='es' && c.constNo===false && c.soloEventos===undefined && !!c.constSem && c.visDia===false;
    restaurar(); return r && n>=2 && n<=4 && completa;
  })());
  ok('bienvenida: personalizado abre el primer momento en Ajustes', (function(){
    w.eval("ob.modo='propio';");
    w.finishOnboarding();
    const r=w.eval('cfg.patron')===false && w.eval('cfg.azar.on')===false && w.eval('tab')==='set' && !!d.getElementById('ev_h')
      && !d.getElementById('modal').classList.contains('hidden');
    w.closeModal(); w.eval("ob.modo='patron'"); restaurar(); return r;
  })());
  // ---------- Ajustes ----------
  w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet();
  let aj2=d.getElementById('main').innerHTML;
  ok('Ajustes: el patrón tiene su interruptor, encendido', aj2.includes('patronToggle(this.checked)') && aj2.includes(w.t('pt_first_hour')));
  ok('Ajustes: «Al azar» va al final, tras los momentos propios', (function(){
    const iMom=aj2.indexOf(w.t('pt_moments_label')), iCrear=aj2.indexOf("openEventForm()\">"), iAz=aj2.indexOf(w.t('pt_az_label'));
    const finSec=aj2.indexOf('data-card="share"');
    return iMom>0 && iCrear>iMom && iAz>iCrear && (finSec<0 || iAz<finSec) && aj2.includes('azToggle(this.checked)') && !aj2.includes('class="contador"');
  })());
  ok('Ajustes: ya no existe «solo mis momentos»', !aj2.includes('soloEventos') && w.t('pt_only_own')==='pt_only_own');
  ok('Ajustes: «Prácticas propuestas», con tres títulos: Patrón estándar, Momentos propios y Al azar', (function(){
    w.eval('setCollapsed={}'); w.renderSet();
    const h=d.getElementById('main').innerHTML;
    const tit=[...d.querySelectorAll('#main h3.modotit')].map(x=>x.textContent.trim());
    return w.t('set_pattern')==='Prácticas propuestas' && h.includes('>'+w.t('set_pattern')+' <')
      && JSON.stringify(tit)===JSON.stringify(['🕐 Patrón estándar','✍️ Momentos propios','🎲 Al azar'])
      && h.includes('Prácticas de la biblioteca o creadas por ti');
  })());
  ok('Ajustes: con el azar activo aparecen franja, cantidad y categorías', (function(){
    w.azToggle(true); aj2=d.getElementById('main').innerHTML;
    const r=w.eval('cfg.azar.on')===true && aj2.includes("azHora('cfg','ini'") && d.querySelectorAll('#main .contador').length===3
      && aj2.includes("azSepFijar('cfg', this.value)")
      && aj2.includes('id="az_sum_cfg"') && aj2.includes(w.t('st_az'));
    restaurar(); return r;
  })());
  ok('Ajustes: con el patrón apagado se ocultan sus opciones', (function(){
    w.patronToggle(false); const h=d.getElementById('main').innerHTML;
    const r=!h.includes(w.t('pt_first_hour')) && h.includes(w.t('pt_pat_off')) && h.includes(w.t('st_pat_off'));
    restaurar(); return r;
  })());
  ok('Ajustes: avisa si no se va a proponer nada', (function(){
    w.eval("userEvents=[]; cfg.azar.on=false;"); w.patronToggle(false);
    const r=d.getElementById('main').innerHTML.includes(w.t('pt_nothing'));
    w.eval("cfg.azar={on:true,ini:540,fin:1260,min:2,max:3,excl:[]};"); w.applyCfg();
    const r2=!d.getElementById('main').innerHTML.includes(w.t('pt_nothing'));
    restaurar(); return r && r2;
  })());
  ok('diagnóstico: dice qué modos hay activos', (await w.bloqueDiagnostico()).includes(w.t('dv_modes')+': '+w.t('dv_m_pat')+' ✓'));
  ok('saneado: los modos se conservan y se corrigen', (function(){
    const c=w.sanearCfg({startH:8,startM:0,freq:2,span:12,patron:false,azar:{on:1,ini:9999,fin:'x',min:30,max:2,excl:['a',7,'<b>'.repeat(40)]}});
    return c.patron===false && c.azar.on===true && c.azar.ini===540 && c.azar.fin===1260 && c.azar.max===2 && c.azar.min===2 && c.azar.excl.join()==='a';
  })());
  ok('saneado: separación del azar, constelaciones por filas y la marca de Profundizar', (function(){
    const c=w.sanearCfg({startH:8,startM:0,freq:2,span:12,azar:{on:true,ini:540,fin:1260,min:2,max:3,sep:9999},
      constSem:{on:true,filas:[{d:9,h:-5,pid:'<img src=x onerror=alert(1)>'},{d:3,h:600,pid:'p039'},null,'x'].concat(Array(10).fill({d:1,h:60,pid:null}))}});
    const viejo=w.sanearCfg({startH:8,startM:0,freq:2,span:12,constSem:{on:true,dias:[1,9],horas:[600]}});
    const ev=w.sanearEvento({id:'e1',pid:'p039',title:'x',time:600,rep:'daily',prof:'sí'});
    return c.azar.sep===13 && c.constSem.filas.length===7 && c.constSem.filas[0].d===1 && c.constSem.filas[0].h===1260 && c.constSem.filas[0].pid===null
      && c.constSem.filas[1].pid==='p039' && JSON.stringify(viejo.constSem)==='{"on":true,"dias":[1],"horas":[600]}' && ev.prof===true
      && w.sanearEvento({id:'e2',pid:'p039',title:'x',time:600,rep:'daily'}).prof===undefined;
  })());
  ok('diagnóstico: el azar dice también su separación', (function(){
    w.eval("cfg.azar={on:true,ini:540,fin:1260,min:2,max:3,sep:21,excl:[]};");
    const r=w.modosTxt().includes('(2–3, 09:00–21:00, 21 min)');
    restaurar(); return r;
  })());
  ok('bienvenida: los modos se llaman como en Ajustes', (function(){
    w.renderOnboarding('modo');
    const nombres=[...d.querySelectorAll('#main button.modo b')].map(b=>b.textContent.trim());
    return JSON.stringify(nombres)===JSON.stringify(['🕐 Patrón estándar','🎲 Al azar','✍️ Momentos propios'])
      && w.t('ob_mode_sub').includes('Prácticas propuestas') && w.t('ob_pr_next').includes('Prácticas propuestas');
  })());
  restaurar(); w.eval('setCollapsed={}'); w.renderSet();
  ok('el .gitignore no deja fuera los iconos (resources/android)', (function(){
    const lineas=fs.readFileSync(require('path').join(entorno.RAIZ,'.gitignore'),'utf8').split('\n').map(l=>l.trim());
    return lineas.includes('/android/') && !lineas.some(l=>/^android\/?$/.test(l));
  })());
  let sinError=true; try{ w.nativeReschedule(); }catch(e){ sinError=false; }
  ok('nativeReschedule sin error', sinError);
  console.log(res.join('\n'));
  const fallos=res.filter(r=>r.startsWith('MAL')).length;
  console.log('\nRESULTADO: ' + (fallos===0 ? 'TODO OK ('+res.length+')' : 'FALLOS ('+fallos+')'));
  process.exit(fallos ? 1 : 0);
 }catch(e){ console.log(res.join('\n')); console.log('EXCEPCIÓN:', e.message); process.exit(1); }
});
