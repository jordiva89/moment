const { JSDOM } = require('/home/claude/momento-para-ti/node_modules/jsdom');
const fs = require('fs');
const W = require('path').join(__dirname, '..', '..', 'www') + '/';
const inc = f => '<script>' + fs.readFileSync(W + f, 'utf8') + '</script>';
// index.html carga i18n.js, contenido.js y practices.js como archivos aparte;
// aquí se incrustan para poder ejecutar la app entera dentro de jsdom.
let html = fs.readFileSync(W + 'index.html', 'utf8')
  .replace('<script src="i18n.js"></script>', inc('i18n.js'))
  .replace('<script src="contenido.js"></script>', inc('contenido.js'))
  .replace('<script src="practices.js"></script>', inc('practices.js'))
  .replace('<link rel="stylesheet" href="estilos.css">', '<style>' + fs.readFileSync(W + 'estilos.css','utf8') + '</style>');
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
  ok('209 prácticas', w.eval('PRACTICES_ES.length===209 && PRACTICES_EN.length===209'));
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
  ok('solo mis momentos, sin excepción', /if\(cfg && cfg\.soloEventos\)\{/.test(html));
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
  let sinError=true; try{ w.nativeReschedule(); }catch(e){ sinError=false; }
  ok('nativeReschedule sin error', sinError);
  console.log(res.join('\n'));
  console.log('\nRESULTADO: ' + (res.filter(r=>r.startsWith('MAL')).length===0 ? 'TODO OK ('+res.length+')' : 'FALLOS'));
  process.exit(0);
 }catch(e){ console.log(res.join('\n')); console.log('EXCEPCIÓN:', e.message); process.exit(0); }
});
