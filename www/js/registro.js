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
  if(!stats.days[d]) stats.days[d]={h:0, ps:[], pv:0, hor:{}, camb:{}, extra:0};
  if(stats.days[d].extra===undefined) stats.days[d].extra=0;
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
    +' · '+t('dv_m_az')+' '+(azarActivo()?'✓ ('+a.min+'–'+a.max+', '+fmtT(a.ini)+'–'+fmtT(a.fin)+')':'✗')
    +' · '+t('dv_m_mom')+' '+userEvents.filter(ev=>!evPaused.includes(ev.id)).length;
}
function saveStats(){ LS.set('mpt_stats', stats); }
function statOpen(){ stats.lastOpen=Date.now(); statsDay(); saveStats(); }
function statDone(marcada, pid, extra){
  const d=statsDay();
  const log=LS.get('mpt_donelog', {});
  if(marcada){
    if(extra) d.extra++; else d.h++;
    stats.lastDone=Date.now();
    if(pid) log[pid]=(log[pid]||0)+1;
  } else {
    if(extra) d.extra=Math.max(0,d.extra-1); else d.h=Math.max(0,d.h-1);
    if(pid && log[pid]) { log[pid]--; if(log[pid]<=0) delete log[pid]; }
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
  let h=0, pPract=0, pVeces=0, extra=0; const hor={}, camb={};
  dias.forEach(k=>{
    const d=stats.days[k];
    h+=d.h; pPract+=d.ps.length; pVeces+=d.pv; extra+=(d.extra||0);
    Object.entries(d.hor).forEach(([hh,n])=>hor[hh]=(hor[hh]||0)+n);
    Object.entries(d.camb).forEach(([pid,n])=>camb[pid]=(camb[pid]||0)+n);
  });
  const topHoras=Object.entries(hor).sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([hh,n])=>`${pad(hh)}:00–${pad((+hh+1)%24)}:00 (${n})`);
  const topCamb=Object.entries(camb).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([pid,n])=>({t:(byId(pid)||{}).title||pid, n}));
  return {dias:dias.length, h, pPract, pVeces, extra, topHoras, topCamb};
}
function fmtFecha(ts){ if(!ts) return '—'; const d=new Date(ts); return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes()); }
function cuerpoMetricas(){
  const r=statsResumen();
  const L=[];
  L.push(t('mx_title'));
  L.push(t('mx_date')+' '+fmtFecha(Date.now()));
  L.push(t('mx_installed')+' '+fmtFecha(LS.get('mpt_install',0)));
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
  L.push('');
  L.push(t('mx_last_a')+' '+r.dias+' '+t('mx_last_b'));
  L.push(t('mx_done')+' '+r.h);
  L.push(t('mx_extra')+' '+r.extra);
  L.push(t('mx_snoozed')+' '+r.pPract+' ('+r.pVeces+' '+t('mx_snoozes')+')');
  L.push(t('mx_top_slots')+' '+(r.topHoras.length?r.topHoras.join(', '):'—'));
  L.push(t('mx_fav_saved')+' '+favs.length);
  L.push(t('mx_top_disc'));
  if(r.topCamb.length) r.topCamb.forEach(c=>L.push('  · '+c.t+' ('+c.n+')'));
  else L.push('  · '+t('mx_none'));
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
