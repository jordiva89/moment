/* Moment · Registro de incidencias, diagnóstico y estadísticas
   Todo se queda en el dispositivo: solo sale si la persona decide enviarlo.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

/* El diccionario I18N vive en i18n.js (se carga antes que este script) */
/* ---- Registro de incidencias ----
   Muchas operaciones (plugins nativos, avisos, almacenamiento) van envueltas en
   try/catch para que un fallo no tumbe la app. El problema es que fallaban en
   SILENCIO: el canal de alarma estuvo roto veinte versiones sin que se supiera.
   Ahora esos fallos quedan anotados aquí, se ven en Ajustes y viajan en el correo
   de diagnóstico. Solo se guardan los 40 últimos y nada sale del móvil. */
const LOG_MAX = 40;
let _log = [];
try{ _log = JSON.parse(localStorage.getItem('mpt_log') || '[]'); }catch(e){ _log = []; }
function anota(donde, err){
  try{
    const msg = (err && (err.message || err.name)) ? (err.message || err.name) : String(err||'');
    const ult = _log[_log.length-1];
    // no repetir la misma incidencia una y otra vez: se cuenta
    if(ult && ult.d===donde && ult.m===msg){ ult.n=(ult.n||1)+1; ult.t=Date.now(); }
    else _log.push({t:Date.now(), d:donde, m:msg.slice(0,140), n:1});
    if(_log.length>LOG_MAX) _log = _log.slice(-LOG_MAX);
    localStorage.setItem('mpt_log', JSON.stringify(_log));
  }catch(e){}
}
// Envuelve una operación que puede fallar sin que importe: si falla, queda anotada.
function intentar(donde, fn, porDefecto){
  try{ return fn(); }catch(e){ anota(donde, e); return porDefecto; }
}
function logTexto(){
  if(!_log.length) return t('lg_none');
  return _log.slice().reverse().map(x=>{
    const f=new Date(x.t);
    return pad(f.getDate())+'/'+pad(f.getMonth()+1)+' '+pad(f.getHours())+':'+pad(f.getMinutes())+
           '  '+x.d+': '+x.m+(x.n>1?'  (x'+x.n+')':'');
  }).join('\n');
}
function borrarLog(){ _log=[]; try{ localStorage.removeItem('mpt_log'); }catch(e){} toast(t('lg_cleared')); renderSet(); }
// cualquier error no capturado también queda anotado
window.addEventListener('error', e=>anota('js', e.error||e.message));
window.addEventListener('unhandledrejection', e=>anota('promesa', e.reason));

// El canal de alarma de Android se creó con el idioma del sistema; aquí se renombra
// según el idioma elegido dentro de la app, para que Ajustes > Notificaciones coincida.
/* ---- Datos técnicos del dispositivo (solo para diagnóstico) ----
   Se piden al sistema por la vía nativa, que da modelo y versión exactos. Si no
   está disponible (web, o APK antiguo), se deduce del navegador. Ninguno de estos
   datos identifica a la persona ni sale del móvil: viajan solo si el usuario
   decide enviar el correo, y los ve escritos antes de mandarlo. */
async function datosDispositivo(){
  const d={};
  try{
    if(typeof CapAjustes!=='undefined' && CapAjustes && CapAjustes.infoDispositivo){
      const r=await CapAjustes.infoDispositivo();
      if(r){
        d.movil=[r.fabricante, r.modelo].filter(Boolean).join(' ');
        if(r.dispositivo && r.dispositivo!==r.modelo) d.movil+=' ('+r.dispositivo+')';
        d.android=r.android ? ('Android '+r.android+(r.sdk?' · API '+r.sdk:'')) : null;
        d.pantalla=r.pantalla ? (r.pantalla+(r.densidad?' @'+r.densidad+'x':'')) : null;
        d.canal=r.canalAlarma||null;
        if(typeof r.bateriaExenta==='boolean') d.bateria=r.bateriaExenta?t('dv_batt_free'):t('dv_batt_saving');
        if(typeof r.nomolestar==='number') d.nomolestar=(r.nomolestar===1?t('dv_dnd_off'):t('dv_dnd_on'));
      }
    }
  }catch(e){}
  // respaldo desde el navegador
  try{
    const ua=navigator.userAgent||'';
    if(!d.movil){
      const m=ua.match(/Android[^;]*;\s*([^)]+?)(?:\s+Build\/|\))/);
      d.movil=(m&&m[1].trim())||null;
    }
    if(!d.android){ const a=ua.match(/Android\s+([\d.]+)/); if(a) d.android='Android '+a[1]; }
    if(!d.pantalla && screen && screen.width) d.pantalla=screen.width+'x'+screen.height;
  }catch(e){}
  return d;
}
// Bloque legible que se añade al final del correo, a la vista del usuario
async function bloqueDiagnostico(){
  const d=await datosDispositivo();
  const l=[];
  l.push(t('dv_title'));
  if(d.movil) l.push(t('dv_phone')+': '+d.movil);
  if(d.android) l.push(t('dv_os')+': '+d.android);
  if(d.pantalla) l.push(t('dv_screen')+': '+d.pantalla);
  l.push(t('dv_app')+': v'+APP_VERSION+(IS_NATIVE?' (Android)':' (web)'));
  l.push(t('dv_lang')+': '+(getLang()==='en'?'English':'Español')+
         ' · '+t('dv_sys')+': '+((navigator.languages&&navigator.languages[0])||navigator.language||'?'));
  try{ l.push(t('dv_notif')+': '+(notifOn?t('dv_on'):t('dv_off'))+
              (IS_NATIVE?(' · '+t('dv_mode')+' '+(alarmMode?t('dv_alarm'):t('dv_normal'))):'')); }catch(e){}
  if(d.canal) l.push(t('dv_chan')+': '+d.canal);
  if(d.bateria) l.push(t('dv_batt')+': '+d.bateria);
  if(d.nomolestar) l.push(t('dv_dnd')+': '+d.nomolestar);
  try{ l.push(t('dv_pattern')+': '+t('dv_start')+' '+pad(cfg.startH)+':'+pad(cfg.startM)+
              ' · '+t('dv_each')+' '+cfg.freq+' h · '+cfg.span+' '+t('dv_active')); }catch(e){}
  try{ l.push(t('dv_modes')+': '+modosTxt()); }catch(e){}
  if(_log.length){ l.push(''); l.push('— ' + t('lg_label') + ' —'); l.push(logTexto()); }
  l.push('');
  l.push(t('dv_note'));
  return l.join('\n');
}
// Abre el correo de sugerencias con el bloque técnico ya escrito y visible
async function enviarFeedback(){
  let cuerpo='';
  try{ cuerpo=t('dv_write')+'\n\n\n\n'+await bloqueDiagnostico(); }
  catch(e){ cuerpo=t('dv_write')+'\n\n'; }
  location.href='mailto:'+METRICS_EMAIL+'?subject='+encodeURIComponent(t('st_feedback_subj'))
    +'&body='+encodeURIComponent(cuerpo);
}

let stats = LS.get('mpt_stats', {lastOpen:0, lastDone:0, lastSend:0, days:{}});
function statsDay(){
  const d=todayStr();
  if(!stats.days[d]) stats.days[d]={h:0, ps:[], pv:0, hor:{}, camb:{}, extra:0, org:{}, hh:{}, u:{}};
  const dd=stats.days[d];
  if(dd.extra===undefined) dd.extra=0;
  ['org','hh','u'].forEach(k=>{ if(!dd[k] || typeof dd[k]!=='object') dd[k]={}; });   // días de antes de la 3.97
  // poda: solo se conservan 30 días
  const lim=new Date(); lim.setDate(lim.getDate()-30);
  const limS=dateStrOf(lim);
  Object.keys(stats.days).forEach(k=>{ if(k<limS) delete stats.days[k]; });
  return stats.days[d];
}
// Qué modos están activos, en una línea: «patrón ✓ · al azar ✓ (3–5, 09:00–21:00) · momentos propios 2»
function modosTxt(){
  const a=cfg && cfg.azar;
  return t('dv_m_pat')+' '+(patronActivo()?'✓':'✗')
    +' · '+t('dv_m_az')+' '+(azarActivo()?'✓ ('+a.min+'–'+a.max+', '+fmtT(a.ini)+'–'+fmtT(a.fin)+', '+azarSep(a)+' min)':'✗')
    +' · '+t('dv_m_mom')+' '+userEvents.filter(ev=>!evPaused.includes(ev.id)).length;
}
function saveStats(){ LS.set('mpt_stats', stats); }
function statOpen(){ stats.lastOpen=Date.now(); statsDay(); saveStats(); }
/* MÉTRICAS: solo recuentos y ajustes. Nunca textos, títulos de prácticas propias,
   nombres de categorías propias ni nombres de archivos. Por día (se podan a los 30):
     org  hechas por origen (STAT_ORIGENES)        hh   hechas por hora (0–23)
     u    uso de funciones (STAT_USOS)             prop propuestas del día */
const STAT_ORIGENES=['pat','az','own','prof','csem','vis','fuera'];
const STAT_USOS=['ia','iacopy','qwen','iaadd','zip','imp','adj'];
// De dónde sale una práctica del día: patrón, azar, momento propio, Profundizar,
// constelación de la semana o visualización del día. Sin franja: fuera del plan.
function origenStat(s){
  if(!s) return 'fuera';
  if(s.ev){ const ev=(typeof getEvent==='function')?getEvent(s.ev):null; return ev && ev.prof ? 'prof' : 'own'; }
  if(s.cs) return 'csem';
  if(s.az) return 'az';
  if(cfg && cfg.visDia && typeof VIS_ID!=='undefined' && s.pid===VIS_ID) return 'vis';
  return 'pat';
}
function statUso(k, n){
  if(!STAT_USOS.includes(k)) return;
  const d=statsDay(); d.u[k]=(d.u[k]||0)+(n||1); saveStats();
}
function statPropuestas(n){ const d=statsDay(); d.prop=Math.max(0, n|0); saveStats(); }
function statDone(marcada, pid, extra, origen){
  const d=statsDay();
  const log=LS.get('mpt_donelog', {});
  const o=STAT_ORIGENES.includes(origen) ? origen : 'fuera', h=new Date().getHours();
  if(marcada){
    if(extra) d.extra++; else d.h++;
    stats.lastDone=Date.now();
    if(pid) log[pid]=(log[pid]||0)+1;
    d.org[o]=(d.org[o]||0)+1;
    d.hh[h]=(d.hh[h]||0)+1;
  } else {
    if(extra) d.extra=Math.max(0,d.extra-1); else d.h=Math.max(0,d.h-1);
    if(pid && log[pid]) { log[pid]--; if(log[pid]<=0) delete log[pid]; }
    if(d.org[o]) d.org[o]--;
    if(d.hh[h]) d.hh[h]--;
  }
  LS.set('mpt_donelog', log);
  saveStats();
}
// registrar una práctica hecha "ahora" (extra), fuera del plan del momento
function statDoneExtra(pid){ statDone(true, pid, true); }
function statSnooze(idx){
  const d=statsDay();
  if(!d.ps.includes(idx)) d.ps.push(idx);
  d.pv++;
  const h=new Date().getHours(); d.hor[h]=(d.hor[h]||0)+1;
  saveStats();
}
function statDiscard(pid){
  if(!pid) return;
  const d=statsDay();
  d.camb[pid]=(d.camb[pid]||0)+1;
  saveStats();
}
function statsResumen(){
  const dias=Object.keys(stats.days).sort();
  let h=0, pPract=0, pVeces=0, extra=0, activos=0, prop=0, hProp=0;
  const hor={}, camb={}, org={}, hh={}, u={};
  const suma=(dst, src)=>Object.entries(src||{}).forEach(([k,n])=>dst[k]=(dst[k]||0)+n);
  dias.forEach(k=>{
    const d=stats.days[k];
    h+=d.h; pPract+=d.ps.length; pVeces+=d.pv; extra+=(d.extra||0);
    if(d.h+(d.extra||0)>0) activos++;
    // cumplimiento: solo los días en que se sabe cuántas se propusieron
    if(d.prop>0){ prop+=d.prop; hProp+=Math.min(d.h, d.prop); }
    suma(hor, d.hor); suma(camb, d.camb); suma(org, d.org); suma(hh, d.hh); suma(u, d.u);
  });
  const franja=([x,n])=>`${pad(x)}:00–${pad((+x+1)%24)}:00 (${n})`;
  const topHoras=Object.entries(hor).sort((a,b)=>b[1]-a[1]).slice(0,3).map(franja);
  const topHechas=Object.entries(hh).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,3).map(franja);
  // Solo prácticas de la biblioteca oficial: el título de una propia lo escribió la
  // persona y no sale de su teléfono.
  const topCamb=Object.entries(camb).filter(([pid])=>!String(pid).startsWith('u') && byId(pid))
    .sort((a,b)=>b[1]-a[1]).slice(0,5).map(([pid,n])=>({t:byId(pid).title, n}));
  const tasa=prop ? Math.round(100*hProp/prop) : null;
  return {dias:dias.length, h, pPract, pVeces, extra, topHoras, topCamb, activos, prop, hProp, tasa, org, topHechas, u};
}
// «patrón estándar 5 · al azar 2 …» (solo los orígenes con alguna)
function origenesTxt(org){
  const l=STAT_ORIGENES.filter(k=>org[k]>0).map(k=>t('mx_o_'+k)+' '+org[k]);
  return l.length ? l.join(' · ') : '—';
}
// Hechas por categoría (desde el último borrado). Las propias van juntas: el nombre
// de una categoría propia lo escribió la persona.
function categoriasHechas(){
  const log=LS.get('mpt_donelog', {}), c={};
  Object.entries(log).forEach(([pid,n])=>{
    const p=byId(pid); if(!p) return;
    const k=String(pid).startsWith('u') ? t('mx_own_bucket') : catLabel(p.cat);
    c[k]=(c[k]||0)+n;
  });
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,n])=>k+' '+n).join(' · ') || '—';
}
// Configuración y biblioteca, en recuentos
function datosUso(){
  const cs=(cfg && cfg.constSem && Array.isArray(cfg.constSem.filas)) ? cfg.constSem : {on:false, filas:[]};
  const filas=cs.on ? cs.filas : [];
  const elegidas=filas.filter(f=>f && f.pid).length;
  const adjs=userLib.map(p=>p.adj).filter(Boolean).concat(Object.values(adjLibreria||{}));
  const porTipo={}; adjs.forEach(a=>{ porTipo[a.tipo]=(porTipo[a.tipo]||0)+1; });
  return {
    csem:filas.length, csemFijas:elegidas, csemAzar:filas.length-elegidas,
    prof:userEvents.filter(ev=>ev.prof && !evPaused.includes(ev.id)).length,
    evPausados:userEvents.filter(ev=>evPaused.includes(ev.id)).length,
    pausadas:paused.length, propias:userLib.length,
    propiasConst:userLib.filter(p=>typeof esCatConst==='function' && esCatConst(p.cat)).length,
    adj:adjs.length, porTipo,
    instalada:LS.get('mpt_install',0)
  };
}
function siNo(v){ return v ? t('mx_yes') : t('mx_no'); }
function fmtFecha(ts){ if(!ts) return '—'; const d=new Date(ts); return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes()); }
function cuerpoMetricas(){
  const r=statsResumen(), x=datosUso();
  const L=[];
  L.push(t('mx_title'));
  L.push(t('mx_date')+' '+fmtFecha(Date.now()));
  L.push(t('mx_installed')+' '+fmtFecha(x.instalada)
    +(x.instalada?' ('+Math.max(0, Math.floor((Date.now()-x.instalada)/864e5))+' '+t('mx_days')+')':''));
  L.push('');
  L.push(t('mx_app'));
  L.push(t('mx_version')+' '+APP_VERSION+' · '+(IS_NATIVE?'Android':'web'));
  L.push(t('mx_lang')+' '+getLang());
  L.push('');
  L.push(t('mx_freq'));
  L.push(t('mx_last_conn')+' '+fmtFecha(stats.lastOpen));
  L.push(t('mx_last_done')+' '+fmtFecha(stats.lastDone));
  L.push('');
  L.push(t('mx_config'));
  L.push(t('mx_modes')+' '+modosTxt());
  L.push(t('mx_moments')+' '+slotTimes().length);
  L.push(t('mx_first')+' '+pad(cfg.startH)+':'+pad(cfg.startM));
  L.push(t('mx_interval')+' '+cfg.freq+' '+t('mx_interval_h'));
  L.push(t('mx_active')+' '+cfg.span+' '+t('mx_active_h'));
  L.push(t('mx_fav_def')+' '+cfg.favPerDay);
  L.push(t('mx_csem')+' '+(x.csem ? x.csem+' ('+t('mx_csem_fix')+' '+x.csemFijas+' · '+t('mx_csem_rnd')+' '+x.csemAzar+')' : t('mx_no')));
  L.push(t('mx_prof')+' '+x.prof);
  L.push(t('mx_ev_paused')+' '+x.evPausados);
  L.push(t('mx_vis')+' '+siNo(cfg.visDia));
  L.push(t('mx_notif')+' '+(notifOn?t('dv_on'):t('dv_off'))+(IS_NATIVE?' · '+t('dv_mode')+' '+(alarmMode?t('dv_alarm'):t('dv_normal')):''));
  L.push('');
  L.push(t('mx_lib'));
  L.push(t('mx_fav_saved')+' '+favs.length);
  L.push(t('mx_paused')+' '+x.pausadas);
  L.push(t('mx_own')+' '+x.propias+' ('+t('mx_own_const')+' '+x.propiasConst+')');
  L.push(t('mx_adj')+' '+x.adj+(x.adj?' ('+ADJ_TIPOS_OK.filter(k=>x.porTipo[k]).map(k=>adjIcono(k)+' '+x.porTipo[k]).join(' · ')+')':''));
  L.push('');
  L.push(t('mx_last_a')+' '+r.dias+' '+t('mx_last_b'));
  L.push(t('mx_active_days')+' '+r.activos);
  L.push(t('mx_done')+' '+r.h);
  L.push(t('mx_extra')+' '+r.extra);
  L.push(t('mx_rate')+' '+(r.tasa===null ? '—' : r.tasa+'% ('+r.hProp+' / '+r.prop+')'));
  L.push(t('mx_by_origin')+' '+origenesTxt(r.org));
  L.push(t('mx_top_done')+' '+(r.topHechas.length?r.topHechas.join(', '):'—'));
  L.push(t('mx_snoozed')+' '+r.pPract+' ('+r.pVeces+' '+t('mx_snoozes')+')');
  L.push(t('mx_top_slots')+' '+(r.topHoras.length?r.topHoras.join(', '):'—'));
  try{ const g=hechasStats(); L.push(t('mx_streak')+' '+g.racha+' / '+g.mejor+' '+t('mx_days')); }catch(e){}
  L.push(t('mx_top_disc'));
  if(r.topCamb.length) r.topCamb.forEach(c=>L.push('  · '+c.t+' ('+c.n+')'));
  else L.push('  · '+t('mx_none'));
  L.push(t('mx_cats')+' '+categoriasHechas());
  L.push('');
  L.push(t('mx_features').replace('{n}', r.dias));
  STAT_USOS.forEach(k=>L.push(t('mx_f_'+k)+' '+(r.u[k]||0)));
  L.push('');
  L.push(t('mx_privacy'));
  return L.join('\n');
}
function sendMetrics(){
  const asunto=t('mx_subject')+' '+todayStr();
  location.href='mailto:'+METRICS_EMAIL+'?subject='+encodeURIComponent(asunto)+'&body='+encodeURIComponent(cuerpoMetricas());
  stats.lastSend=Date.now(); saveStats();
}

function openResetStats(){
  const box=document.getElementById('modalContent');
  box.innerHTML=`
    <h3>${t('rs_title')}</h3>
    <p class="muted">${t('rs_body')}</p>
    <p class="muted">${t('rs_send').replace('{e}',METRICS_EMAIL)}</p>
    <button class="btn gold block" onclick="sendMetrics()">${t('rs_send_btn')}</button>
    <button class="btn terra block" onclick="doResetStats()">${t('rs_delete_btn')}</button>
    <button class="btn ghost block" onclick="closeModal()">${t('na_cancel')}</button>`;
  openModal();
}
function doResetStats(){
  stats={lastOpen:Date.now(), lastDone:0, lastSend:stats.lastSend, days:{}};
  saveStats();
  LS.set('mpt_donelog', {});
  closeModal(); renderSet();
  toast(t('ts_stats_reset'));
}
