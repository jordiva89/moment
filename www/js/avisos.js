/* Moment · Avisos
   Notificaciones del sistema (APK) y del navegador: programarlas, posponer, marcar como hecha y los ajustes de puntualidad y sonido.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

function sincronizarCanal(intento){
  try{
    const plug = (typeof CapAjustes!=='undefined' && CapAjustes) ? CapAjustes : null;
    if(plug && plug.renombrarCanal){
      plug.renombrarCanal({nombre:t('canal_nombre'), descripcion:t('canal_desc')}).catch(e=>anota('renombrar-canal', e));
      return;
    }
    // El plugin aún no está listo (o el canal no existe todavía): se reintenta
    // un par de veces. Sin esto, el nombre se quedaba con el idioma del sistema.
    const n=(intento||0);
    if(n<3) setTimeout(()=>sincronizarCanal(n+1), 800*(n+1));
  }catch(e){}
}

let alarmChannelOk = null;                   // ¿existe el canal nativo de alarma en esta compilación?
async function checkAlarmChannel(){
  if(!IS_NATIVE || !CapLN){ return; }
  const antes=alarmChannelOk;
  try{
    const r=await CapLN.listChannels();
    alarmChannelOk=(r.channels||[]).some(c=>c.id==='momento_despertador');
    // el canal ya existe: es el momento seguro para ponerle el nombre del idioma de la app
    if(alarmChannelOk) sincronizarCanal();
  }catch(e){ alarmChannelOk=null; anota('canal-alarma', e); }
  if(tab==='set') renderSet();
}

/* Abre la práctica pendiente en cuanto la app está lista (arranque frío o templado) */
function tryOpenPending(intento){
  const n = intento || 0;
  // al abrir la app DESDE el aviso, cfg o la pantalla pueden no estar listos
  if(!pendingOpen){ return; }
  if(!cfg || document.getElementById('splash')){
    if(n < 30) setTimeout(()=>tryOpenPending(n+1), 400);
    return;
  }
  const id=pendingOpen; pendingOpen=null;
  gotoTab('home');
  try{ openFullPractice(id, true); }catch(e){ toast(t('ts_no_open_notif')); }
}
// Marca como hecha la práctica del aviso, sin tener que buscarla dentro de la app.
// Si el aviso corresponde a una franja de hoy, se marca esa franja (cuenta como
// normal la primera vez); si no, se registra como práctica extra.
function nativeDoneFromNotif(ex){
  ensureDayPlan();
  const s=(ex && ex.d===0 && dayState.plan[ex.idx])?dayState.plan[ex.idx]:null;
  if(s && s.pid===ex.pid && !s.done){
    toggleDone(ex.idx);
  } else if(ex && ex.pid){
    const i=dayState.plan.findIndex(sl=>sl.pid===ex.pid && !sl.done && eff(sl)<=nowMins());
    if(i>=0) toggleDone(i);
    else { statDoneExtra(ex.pid); toast(t('extra_done')); }
  }
  saveDay(); scheduleNext(); startWatch();
  if(!document.hidden && tab==='home') renderHome();
}
async function nativeSnoozeFromNotif(ex){
  ensureDayPlan();
  const s=(ex.d===0 && dayState.plan[ex.idx])?dayState.plan[ex.idx]:null;
  if(s && s.pid===ex.pid && !s.done){
    s.notified=false;
    snooze(ex.idx);            // aplica la secuencia Fibonacci y reprograma el sistema
    return;
  }
  const n=(ex.snoozes||0);
  if(n>=FIB_INC.length){ toast(t('ts_no_snooze')); return; }
  const p=byId(ex.pid); if(!p) return;
  const canal=await canalActual();
  CapLN.schedule({notifications:[{
    id: 90000+Math.floor(Math.random()*9000),
    title:t('app_title'), body:p.title+' — '+p.text.slice(0,80)+'…',
    channelId:canal, actionTypeId:'MPT',
    schedule:{at:new Date(Date.now()+FIB_INC[n]*60000), allowWhileIdle:true},
    extra:{...ex, snoozes:n+1}
  }]}).catch(()=>{});
  toast(t('ts_snoozed').replace('{m}', FIB_INC[n]));
}
// Marca hecha la franja pendiente de esa práctica; si no hay ninguna, cuenta como extra
function doneByPid(id){
  ensureDayPlan();
  const i=dayState.plan.findIndex(s=>s.pid===id && !s.done && eff(s)<=nowMins());
  if(i>=0){ toggleDone(i); }
  else { statDoneExtra(id); toast(t('extra_done')); }
  if(!document.hidden && tab==='home') renderHome();
}
function snoozeByPid(id){
  ensureDayPlan();
  const i=dayState.plan.findIndex(s=>s.pid===id && !s.done);
  if(i<0){ toast(t('ts_not_pending')); return; }
  snooze(i);
  if(!document.hidden && tab==='home') renderHome();
}

let _shown=false;
function _forceShow(){
  if(_shown) return; _shown=true;
  const splash=document.getElementById('splash');
  const app=document.getElementById('app');
  // si venimos de una notificación, la splash se retira al instante (sin fundido) para ir directos a la práctica
  if(splash){
    if(fromNotif || snoozeParam || doneParam){ try{splash.remove();}catch(e){} }
    else { splash.classList.add('out'); setTimeout(()=>{ try{splash.remove();}catch(e){} },500); }
  }
  document.body.classList.remove('loading');
  if(app) app.classList.remove('hidden');
  try{ start(); }
  catch(e){
    // Si el arranque normal falla, se muestra un aviso en vez de quedar en blanco
    const m=document.getElementById('main');
    if(m) m.innerHTML='<div class="card"><h2>'+t('err_title')+'</h2><p class="muted">'+t('err_body')+'</p><button class="btn primary block" onclick="try{location.reload()}catch(e){}">'+t('err_retry')+'</button></div>';
    try{ document.getElementById('nav').classList.remove('hidden'); }catch(e2){}
  }
}

function askNotif(){
  if(IS_NATIVE){
    return CapLN.requestPermissions().then(r=>{
      nativePerm=r.display;
      if(nativePerm==='granted'){ notifOn=true; LS.set('mpt_notifOn', true); toast(t('ts_notif_on')); scheduleNext(); }
      else toast(t('ts_perm_no'));
      return nativePerm;
    }).catch(()=>Promise.resolve('denied'));
  }
  if(!('Notification' in window)){ toast(t('ts_no_notif_support')); return Promise.resolve('unsupported'); }
  return Notification.requestPermission().then(p=>{
    if(p==='granted'){ notifOn=true; LS.set('mpt_notifOn', true); toast(t('ts_notif_on')); }
    else toast(t('ts_perm_no'));
    return p;
  });
}
function notifPerm(){
  if(IS_NATIVE) return nativePerm;
  return ('Notification' in window)?Notification.permission:'unsupported';
}
function toggleNotif(after){
  const perm=notifPerm();
  if(perm==='denied'){ toast(t('ts_notif_blocked')); return; }
  if(perm!=='granted'){ askNotif().then(()=>{ if(after)after(); }); return; }
  notifOn=!notifOn; LS.set('mpt_notifOn', notifOn);
  toast(notifOn?t('ts_notif_on'):t('ts_notif_off_t'));
  scheduleNext();   // en nativo, cancela o reprograma los avisos del sistema
  if(after)after();
}
function notifActive(){ return notifPerm()==='granted' && notifOn; }
function chime(){
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type='sine'; o.frequency.value=880; o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25,ctx.currentTime+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.9);
    o.frequency.exponentialRampToValueAtTime(1318,ctx.currentTime+0.15);
    o.start(); o.stop(ctx.currentTime+1);
  }catch(e){}
}

let tickTimer=null;
let diaTimer=null;      // despierta una vez al día, en la medianoche
let reschedTimer=null;  // agrupa varias reprogramaciones seguidas en una sola

/* Cancela todo y entrega al sistema de Android los próximos 7 días de avisos.
   Estos suenan a su hora aunque la app esté completamente cerrada. */
// Canal correcto para programar avisos. Si el modo alarma está activo pero el canal
// aún no aparece (arranque en frío: el nativo lo crea en paralelo), se reintenta hasta
// 2 segundos antes de rendirse. Esto evita que las primeras notificaciones tras abrir
// la app salgan por el canal normal en vez del de alarma.
async function canalActual(){
  if(!alarmMode) return 'momento';
  if(alarmChannelOk!==true){
    try{ await checkAlarmChannel(); }catch(e){}
    for(let i=0;i<4 && alarmChannelOk!==true;i++){
      await new Promise(r=>setTimeout(r,500));
      try{ await checkAlarmChannel(); }catch(e){}
    }
  }
  return (alarmChannelOk===true)?'momento_despertador':'momento';
}
async function nativeReschedule(){
  if(!IS_NATIVE) return;
  try{ await CapLN.createChannel({id:'momento', name:t('canal_std_nombre'), description:t('canal_std_desc'), importance:5, visibility:1, vibration:true}); }catch(e){}
  try{
    const pend=await CapLN.getPending();
    if(pend.notifications && pend.notifications.length){
      await CapLN.cancel({notifications:pend.notifications.map(n=>({id:n.id}))});
    }
  }catch(e){}
  if(!notifOn || nativePerm!=='granted') return;
  const canal=await canalActual();   // faltaba: sin esto la reprogramación fallaba entera
  const now=new Date(), list=[];
  for(let d=0; d<DAYS_AHEAD; d++){
    const day=new Date(now.getFullYear(), now.getMonth(), now.getDate()+d);
    const plan=getPlanFor(dateStrOf(day));
    plan.forEach((s,idx)=>{
      let mins=s.time;
      if(d===0){
        const slot=dayState.plan[idx];
        if(!slot || slot.done || slot.notified || slot.muted) return;
        if(slot.snoozeUntil!==null) mins=slot.snoozeUntil;
      } else if(s.muted) return;
      const at=new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(mins/60), mins%60, 0);
      if(at<=now) return;
      const p=byId(s.pid); if(!p) return;
      const evd=s.ev?getEvent(s.ev):null;
      list.push({
        id:(d+1)*1000+idx,
        title:t('app_title'),
        body:(evd?evd.title+': ':'')+p.title+' — '+p.text.slice(0,70)+'…',
        schedule:{at, allowWhileIdle:true},
        channelId:canal, actionTypeId:'MPT',
        extra:{pid:s.pid, d, idx, snoozes:(d===0 && dayState.plan[idx])?dayState.plan[idx].snoozes:0}
      });
    });
  }
  if(list.length){
    try{ await CapLN.schedule({notifications:list}); }
    catch(e){
      // Android 12+ sin permiso de alarmas exactas puede rechazar la programación:
      // se reintenta en modo compatible (puede retrasarse unos minutos, pero llega)
      try{
        const compat=list.map(n=>({...n, schedule:{at:n.schedule.at}}));
        await CapLN.schedule({notifications:compat});
      }catch(e2){}
    }
  }
  LS.set('mpt_lastProg', Date.now());
}
/* Cambios puntuales: hecha o pospuesta solo tocan SU notificación en el sistema,
   sin reprogramar la planificación general de los 7 días. */
function nativeCancelSlot(idx){
  if(!IS_NATIVE) return;
  CapLN.cancel({notifications:[{id:1000+idx}]}).catch(()=>{});
}
async function nativeScheduleSlot(idx){
  if(!IS_NATIVE) return;
  CapLN.cancel({notifications:[{id:1000+idx}]}).catch(()=>{});
  if(!notifOn || nativePerm!=='granted') return;
  const s=dayState.plan[idx]; if(!s || s.done || s.muted) return;
  const p=byId(s.pid); if(!p) return;
  const mins=eff(s);
  const now=new Date();
  const at=new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(mins/60), mins%60, 0);
  if(at<=now) at.setTime(Date.now()+30000);
  const canal=await canalActual();
  const nn={id:1000+idx, title:t('app_title'), body:p.title+' — '+p.text.slice(0,80)+'…',
    channelId:canal, actionTypeId:'MPT',
    schedule:{at, allowWhileIdle:true},
    extra:{pid:s.pid, d:0, idx, snoozes:s.snoozes}};
  CapLN.schedule({notifications:[nn]}).catch(()=>{
    CapLN.schedule({notifications:[{...nn, schedule:{at}}]}).catch(()=>{});
  });
}
/* Recarga silenciosa: en cualquier despertar de la app (abrirla, volver del segundo
   plano, o tocar un botón de una notificación), si han pasado RECARGA_DIAS desde la
   última programación, se renuevan los 7 días de avisos sin intervención del usuario. */
function checkRecharge(){
  if(!IS_NATIVE || !cfg || !notifOn || nativePerm!=='granted') return;
  const last=LS.get('mpt_lastProg', 0);
  if(Date.now()-last >= RECARGA_DIAS*24*60*60*1000) pedirReprogramacion();
}
// Puerta única a la reprogramación nativa. Agrupa las peticiones que llegan
// seguidas (marcar varias prácticas, cambiar ajustes, arrancar) en una sola
// operación: cancelar y volver a programar decenas de avisos es lo más caro que
// hace la app en el sistema.
function pedirReprogramacion(){
  if(!IS_NATIVE) return;
  clearTimeout(reschedTimer);
  reschedTimer=setTimeout(()=>{ reschedTimer=null; nativeReschedule(); }, 700);
}

/* startWatch: vigilancia ligera al abrir/volver a la app. NO reprograma el sistema.
   scheduleNext: reprogramación completa. Se llama SOLO cuando algo cambia de verdad:
   una práctica (hecha, pospuesta, sustituida) o el patrón (hora de inicio, intervalo,
   periodo activo, interruptor de notificaciones). */
function stopWatch(){
  clearInterval(tickTimer); clearTimeout(notifTimer); clearTimeout(diaTimer);
  tickTimer=null; notifTimer=null; diaTimer=null;
}
function startWatch(){
  stopWatch();
  if(!cfg || !dayState) return;
  if(IS_NATIVE){
    // El sistema ya tiene los avisos programados: aquí no hace falta vigilar nada
    // segundo a segundo. Basta con despertar UNA vez, en la próxima medianoche,
    // para rehacer el plan del día. Antes esto era un intervalo de 60 s: 1440
    // despertares diarios para detectar un cambio que ocurre una vez al día.
    if(dayState.date!==todayStr()) ensureDayPlan();
    checkRecharge();
    armMedianoche();
    return;
  }
  // Pulso de seguridad. La precisión la da armPrecise(), que pone un temporizador
  // exacto para el próximo momento; este solo recoge lo que se hubiera quedado atrás,
  // así que un minuto sobra y son la mitad de despertares.
  tickTimer=setInterval(tick, 60000);
  armPrecise();                        // y un temporizador exacto para el próximo momento
  tick();                              // dispara ya cualquier aviso que quedara atrasado
}
// Reprogramación agrupada: varias acciones seguidas (marcar hechas, posponer,
// cambiar ajustes) producen UNA sola reprogramación del sistema en vez de una por
// acción. Cancelar y volver a programar decenas de avisos es la operación nativa
// más costosa de la app.
function scheduleNext(){
  startWatch();
  pedirReprogramacion();
}
// Un único temporizador hasta la próxima medianoche (con 2 s de margen).
// Al dispararse, rehace el plan, refresca la pantalla si procede y se rearma.
function armMedianoche(){
  clearTimeout(diaTimer);
  const ahora=new Date();
  const manana=new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()+1, 0, 0, 2);
  const ms=Math.max(1000, manana-ahora);
  diaTimer=setTimeout(()=>{
    if(dayState && dayState.date!==todayStr()){
      ensureDayPlan();
      if(tab==='home' && !document.hidden) renderHome();
    }
    checkRecharge();
    armMedianoche();
  }, ms);
}
function armPrecise(){
  clearTimeout(notifTimer);
  const nm=nowMins(); let best=null;
  dayState.plan.forEach(s=>{
    if(s.done || s.notified) return;
    const t=eff(s);
    if(t>nm && (best===null || t<best.t)) best={t, slot:s};
  });
  if(!best) return;
  const ms=(best.t-nm)*60*1000 - (new Date().getSeconds()*1000);
  notifTimer=setTimeout(()=>{ tick(); armPrecise(); }, Math.max(1000,ms));
}
function tick(){
  if(!cfg || !dayState) return;
  if(dayState.date!==todayStr()){ ensureDayPlan(); armPrecise(); if(tab==='home' && !document.hidden) renderHome(); return; }
  const nm=nowMins();
  // momentos cuyo tiempo ya pasó y aún no se han notificado (incluye los perdidos
  // mientras Android tenía la app congelada: se recuperan al instante)
  const perdidos=dayState.plan.filter(s=>!s.done && !s.notified && eff(s)<=nm);
  if(perdidos.length){
    perdidos.forEach(s=>s.notified=true);
    saveDay();
    fireNotification(perdidos[perdidos.length-1]); // se avisa de la más reciente, sin acumular
    if(tab==='home' && !document.hidden) renderHome();
  }
}
async function fireNotification(slot){
  if(!notifOn) return;                    // interruptor de la app
  const p=byId(slot.pid); if(!p) return;
  const body=p.title+' — '+p.text.slice(0,80)+'…';
  chime();                                // refuerzo sonoro cuando la app está viva
  try{
    const reg=await navigator.serviceWorker.getRegistration();
    if(reg && Notification.permission==='granted'){
      reg.showNotification(t('app_title'), {
        body, icon:'icon-192.png', badge:'icon-192.png', tag:'mpt-'+p.id, renotify:true,
        data:{id:p.id}, silent:false, vibrate:[120,60,120],
        actions:[{action:'done', title:t('notif_act_done')},{action:'snooze', title:t('notif_act_snooze')},{action:'open', title:t('notif_act_open')}]
      });
      return;
    }
  }catch(e){}
  if(Notification.permission==='granted'){
    const n=new Notification(t('app_title'),{body, icon:'icon-192.png'});
    n.onclick=()=>{ window.focus(); openFullPractice(p.id); };
  }
}

// Columna de iconos ♥/⏸ de las cabeceras de ítem
// Silencia (o reactiva) la notificación de un slot concreto de hoy, sin quitar la práctica
function toggleMute(idx, after){
  const s=dayState.plan[idx]; if(!s) return;
  s.muted=!s.muted; saveDay();
  if(s.muted){ nativeCancelSlot(idx); toast(t('notif_muted_toast')); }
  else { nativeScheduleSlot(idx); toast(t('notif_unmuted_toast')); }
  pedirReprogramacion();
  if(typeof after==='function') after();
}
// Silenciar en el plan de un día futuro (persistido en mpt_plans)
function toggleMuteNext(k, after){
  const man=new Date(); man.setDate(man.getDate()+1);
  const dstr=dateStrOf(man);
  const plans=LS.get('mpt_plans', {});
  if(!plans[dstr] || !plans[dstr][k]) return;
  plans[dstr][k].muted=!plans[dstr][k].muted;
  LS.set('mpt_plans', plans);
  toast(plans[dstr][k].muted?t('notif_muted_toast'):t('notif_unmuted_toast'));
  pedirReprogramacion();
  if(typeof after==='function') after();
}

let bgExenta=null; // ¿la app está exenta de la optimización de batería? (null = desconocido)
let _bgCheckT=0;
async function refreshBgEstado(force){
  if(!IS_NATIVE || !CapAjustes || !CapAjustes.estadoBateria) return;
  // acompasado: renderSet se ejecuta con cada toque en Ajustes; no hace falta
  // consultar al sistema más de una vez cada 4 segundos (salvo verificación forzada)
  if(!force && Date.now()-_bgCheckT<4000){
    const el0=document.getElementById('bgestado');
    if(el0) el0.innerHTML=bgEstadoTxt();
    return;
  }
  _bgCheckT=Date.now();
  try{
    const r=await CapAjustes.estadoBateria();
    bgExenta=(r && r.exenta===true);
  }catch(e){ bgExenta=null; }
  const el=document.getElementById('bgestado');
  if(el) el.innerHTML=bgEstadoTxt();
}
function bgEstadoTxt(){
  const enlace=`<br><button type="button" class="tbtn" onclick="abrirAjustesBateria()">${t('bg_open_batt')}</button>`;
  if(bgExenta===true) return t('bg_allowed_full')+enlace;
  if(bgExenta===false) return t('bg_limited_full')+enlace;
  return '';
}
function abrirPantalla(tipo){
  if(IS_NATIVE && CapAjustes && CapAjustes.abrirPantalla) CapAjustes.abrirPantalla({tipo}).catch(()=>{});
  else toast(t('ts_update_apk'));
}
function abrirGuiaBloqueado(){
  const esRealme=/RMX|realme|OPPO|CPH2/i.test(navigator.userAgent||'');
  document.getElementById('modalContent').innerHTML=`
    <h3>${t('gd_title')}</h3>
    <p class="muted">${esRealme?t('gd_realme'):t('gd_some')} ${t('gd_intro')}</p>
    <div class="infobox" style="margin:0 0 10px;font-size:.88rem">${t('bg_optional')}</div>
    <p class="muted" style="margin-bottom:6px">${t('gd_s1')} <button type="button" class="tbtn" onclick="abrirAjustesBateria()">${t('gd_open')}</button></p>
    <p class="muted" style="margin-bottom:6px">${t('gd_s2')} <button type="button" class="tbtn" onclick="abrirPantalla('bateria_general')">${t('gd_open_bat')}</button></p>
    <p class="muted" style="margin-bottom:6px">${t('gd_s3')}</p>
    <p class="muted" style="margin-bottom:6px">${t('gd_s4')} <button type="button" class="tbtn" onclick="abrirPantalla('app')">${t('gd_open_app')}</button></p>
    <p class="muted" style="margin-bottom:6px">${t('gd_s5')}</p>
    <p class="muted" style="margin-bottom:6px">${t('gd_s6')} <button type="button" class="tbtn" onclick="abrirPantalla('sonido')">${t('gd_open_sound')}</button></p>
    <p class="muted" style="font-size:.85rem;margin-top:10px">${t('gd_diag')} <button type="button" class="tbtn" onclick="abrirPantalla('canal')">${t('gd_open_channel')}</button></p>
    <button class="btn primary block" onclick="closeModal()">${t('gd_ok')}</button>`;
  openModal();
}
// Función compartida: abre los ajustes de batería y, al volver, verifica los cambios
async function abrirAjustesBateria(){
  if(!IS_NATIVE || !CapAjustes) return;
  try{ await CapAjustes.abrirBateria(); }catch(e){ toast(t('ts_open_batt')); return; }
  // el usuario tarda un tiempo variable en cambiar el ajuste: se verifica al volver
  // (appStateChange también refresca al regresar a primer plano estando en Ajustes)
  setTimeout(()=>refreshBgEstado(true), 1500);
  setTimeout(()=>refreshBgEstado(true), 5000);
}
async function toggleAlarmMode(){
  alarmMode=!alarmMode; LS.set('mpt_alarm', alarmMode);
  // refrescar la interfaz de inmediato: el botón cambia de forma al instante
  renderSet();
  toast(alarmMode?'Modo alarma activado 🔔':'Modo alarma desactivado');
  // al activarlo: consultar el estado REAL del segundo plano y pedirlo solo si falta.
  // Va antes que cualquier operación nativa para que nada pueda bloquear el diálogo.
  if(alarmMode && IS_NATIVE){
    // la primera vez (o en marcas agresivas sin guía vista): abrir la guía completa
    if(!LS.get('mpt_guiaVista', false)){
      LS.set('mpt_guiaVista', true);
      abrirGuiaBloqueado();
    } else if(CapAjustes){
      await refreshBgEstado(true);
      if(bgExenta===true){
        toast(t('ts_bg_ok'));
      }
      // No se propone activamente desactivar el ahorro de batería: es la medida que
      // más consumo añade (deja la app fuera del modo de reposo de Android). Solo se
      // sugiere si los avisos fallan de verdad, desde la guía o desde Ajustes.
    } else {
      toast(t('ts_bg_tip'));
    }
  }
  // el trabajo nativo va al final y protegido paso a paso
  if(IS_NATIVE && CapLN){
    try{ await CapLN.deleteChannel({id:'momento_alarma'}); }catch(e){}
    try{ await checkAlarmChannel(); }catch(e){}
    try{ nativeReschedule(); }catch(e){}
  }
}

let _exCheckT=0;
async function refreshExactPerm(force){
  if(!IS_NATIVE || !CapLN) return;
  if(!force && Date.now()-_exCheckT<4000) return;
  _exCheckT=Date.now();
  let v=null;
  try{
    const r=await CapLN.checkExactNotificationSetting();
    v=r && (r.exact_alarm || r.exactAlarm);
  }catch(e){}
  if(!v){
    // segunda vía: algunas versiones del plugin lo exponen en checkPermissions
    try{ const r2=await CapLN.checkPermissions(); v=r2 && (r2.exact_alarm || r2.exactAlarm); }catch(e){}
  }
  if(v) exactPerm=v;
}

async function abrirAjusteExacto(){
  if(!IS_NATIVE) return;
  try{
    await CapLN.changeExactNotificationSetting();
    // al volver de los ajustes del sistema, re-verificar con reintentos
    refreshExactPerm(true);
    setTimeout(()=>refreshExactPerm(true), 800);
    setTimeout(()=>refreshExactPerm(true), 2500);
  }catch(e){ toast(t('ts_no_perm_needed')); }
}
async function testNotif(){
  if(!notifActive()){ toast(t('ts_enable_notif_first')); return; }
  const p=ALL()[Math.floor(Math.random()*ALL().length)];
  if(IS_NATIVE){
    const canal=await canalActual();
    CapLN.schedule({notifications:[{id:99999, title:t('app_title'),
      body:p.title+' — '+p.text.slice(0,80)+'…', channelId:canal, actionTypeId:'MPT',
      schedule:{at:new Date(Date.now()+4000), allowWhileIdle:true},
      extra:{pid:p.id, d:0, idx:-1, snoozes:0}}]}).catch(()=>{});
    toast(t('ts_test_4s'));
    return;
  }
  toast(t('ts_test_sent'));
  chime();
  const reg=await navigator.serviceWorker.getRegistration();
  if(reg) reg.showNotification(t('app_title'),{body:p.title+' — '+p.text.slice(0,80)+'…', icon:'icon-192.png', data:{id:p.id}, renotify:true, tag:'mpt-test', silent:false, vibrate:[120,60,120], actions:[{action:'snooze',title:t('notif_act_snooze')},{action:'open',title:t('notif_act_open')}]});
}
