// Pruebas de la VERSIÓN WEB (navegador, sin Capacitor).
//
//   node tools/auditoria/pruebas-web.js
//
// La web no puede programar avisos: en su lugar descarga un calendario (.ics).
// Aquí se comprueba que la web muestra lo que le corresponde, que no muestra lo
// que solo tiene sentido en el APK, y que el calendario generado es válido.
const entorno = require('./entorno');
const { JSDOM } = require(entorno.rutaJsdom());
const html = entorno.htmlConScripts();
let swRegistrado = null;

const dom = new JSDOM(html, { runScripts:'dangerously', url:'https://app.local/',
  beforeParse(w){
    w.localStorage.setItem('mpt_cfg', JSON.stringify({startH:8,startM:0,freq:2,span:14,favPerDay:0,catsPref:{},visDia:false}));
    w.localStorage.setItem('mpt_lang', JSON.stringify('es'));
    w.localStorage.setItem('mpt_accept', JSON.stringify({v:1,ts:1}));
    w.localStorage.setItem('mpt_stats', JSON.stringify({lastOpen:0,lastDone:0,lastSend:0,days:{}}));
    w.scrollTo=()=>{}; w.requestAnimationFrame=f=>{try{f()}catch(e){}};
    w.confirm=()=>true; w.fetch=()=>Promise.reject();
    w.Notification=function(){}; w.Notification.permission='default';
    w.navigator.serviceWorker={register:u=>{ swRegistrado=u; return Promise.resolve({update(){}}); },
      addEventListener:()=>{}, getRegistration:()=>Promise.resolve(null)};
    // sin window.Capacitor: es el navegador
  }});

const res=[]; const ok=(n,c)=>res.push((c?'OK ':'MAL ')+n);
setTimeout(()=>{
 const w=dom.window, d=w.document;
 try{
  ok('arranca en modo web', w.eval('IS_NATIVE')===false);
  ok('service worker con la versión en la dirección', swRegistrado==='sw.js?v='+w.eval('APP_VERSION'));
  // ---------- Ajustes ----------
  w.eval('setCollapsed={}'); w.gotoTab('set'); w.renderSet();
  const st=d.getElementById('main').innerHTML;
  ok('Ajustes: sección «Tu calendario»', st.includes(w.t('set_cal')) && st.includes('descargarICS()'));
  ok('Ajustes: instrucciones para iPhone y Android', st.includes(w.t('cal_ios')) && st.includes(w.t('cal_android')));
  ok('Ajustes: sin activar avisos ni alarmas', !st.includes('toggleNotif') && !st.includes('toggleAlarmMode') && !st.includes('abrirAjusteExacto'));
  ok('Ajustes: sin métricas ni historial de uso', !st.includes('sendMetrics') && !st.includes(w.t('st_top_slots')));
  ok('Ajustes: patrón, resumen y constelaciones siguen', st.includes(w.t('pt_first_hour')) && st.includes('id="pt_sum"') && st.includes('class="subcaja"'));
  ok('Ajustes: traducir desde la web también', st.includes('descargarPlantillaTraduccion()'));
  ok('Biblioteca: sin rachas ni niveles', w.renderHechasBox()==='');
  // ---------- bienvenida ----------
  w.renderOnboarding(3);
  const ob=d.getElementById('main').innerHTML;
  ok('bienvenida: el último paso habla del calendario', ob.includes(w.t('ob_cal_start')) && ob.includes('descargarICS()'));
  ok('bienvenida: sin pedir permiso de notificaciones', !ob.includes('toggleNotif') && !ob.includes(w.t('ob_rem_title')));
  // ---------- calendario ----------
  w.eval("cfg.constSem={on:true,dias:[1],horas:[1260]}; LS.set('mpt_plans',{});");
  const ics=w.generarICS(), L=ics.split('\r\n'), enc=new w.TextEncoder();
  ok('calendario: empieza y termina bien', ics.startsWith('BEGIN:VCALENDAR') && ics.trim().endsWith('END:VCALENDAR'));
  ok('calendario: tres avisos de renovación', (ics.match(/moment-renovar-/g)||[]).length===3);
  ok('calendario: ninguna línea pasa de 75 octetos', L.every(l=>enc.encode(l).length<=75));
  ok('calendario: identificadores únicos', (function(){ const u=L.filter(l=>l.startsWith('UID:')); return new Set(u).size===u.length; })());
  ok('calendario: hora flotante, sin zona', !/DTSTART:[0-9T]+Z/.test(ics) && !/TZID/.test(ics));
  ok('calendario: incluye las constelaciones semanales', /DTSTART:\d{8}T210000/.test(ics));
  ok('calendario: el aviso legal va como texto fijo', w.eval("NO_TRADUCIBLE.test('legal_ics')") && ics.replace(/\r\n /g,'').includes('No diagnostica'));
  w.eval("cfg.constSem={on:false,dias:[],horas:[]}; LS.set('mpt_plans',{});");
  // como hace Ajustes al cambiar algo (applyCfg): se rehace también el día de hoy
  w.eval("cfg.patron=false; cfg.azar={on:true,ini:540,fin:1260,min:2,max:2,excl:[]}; LS.set('mpt_plans',{}); dayState=null;");
  const icsAz=w.generarICS();
  ok('calendario: solo al azar, 2 al día durante 84 días', (icsAz.match(/BEGIN:VEVENT/g)||[]).length===84*2+3);
  w.eval("cfg.patron=true; cfg.azar.on=false; LS.set('mpt_plans',{}); dayState=null;");
  w.eval("ob.modo='propio'"); w.renderOnboarding(3);
  const obPr=d.getElementById('main').innerHTML;
  ok('bienvenida web, personalizado: sin descargar aún el calendario vacío', !obPr.includes('descargarICS()') && obPr.includes(w.t('ob_cal_propio')));
  w.eval("ob.modo='patron'");
  console.log(res.join('\n'));
  const fallos=res.filter(r=>r.startsWith('MAL')).length;
  console.log('\nRESULTADO: ' + (fallos===0 ? 'TODO OK ('+res.length+')' : 'FALLOS ('+fallos+')'));
  process.exit(fallos ? 1 : 0);
 }catch(e){ console.log(res.join('\n')); console.log('EXCEPCIÓN:', e.message); process.exit(1); }
}, 2500);
