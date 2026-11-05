/* Moment · Arranque
   Lo que se ejecuta al abrir la app. Va el último: a esas alturas todo lo demás ya está definido.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

try{ new MutationObserver(hidratarAdjuntos).observe(document.documentElement, {childList:true, subtree:true}); }catch(e){}

const params = new URLSearchParams(location.search);
const fromNotif = params.get('p');
const snoozeParam = params.get('s');
const doneParam = params.get('h');   // «hecha» desde la notificación web

if (!IS_NATIVE && 'serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js?v='+APP_VERSION).then(reg=>{ try{ reg.update(); }catch(e){} });
}
if (!IS_NATIVE && navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e=>{
  if(!e.data) return;
  if(e.data.type==='open-practice') openFullPractice(e.data.id, true);
  if(e.data.type==='snooze-practice') snoozeByPid(e.data.id);
  if(e.data.type==='done-practice') doneByPid(e.data.id);
});

if(IS_NATIVE){
  CapLN.checkPermissions().then(r=>{ nativePerm=r.display; }).catch(()=>{});
  CapLN.registerActionTypes({types:[{id:'MPT', actions:[
    {id:'done', title:t('notif_act_done')},
    {id:'snooze', title:t('notif_act_snooze')},
    {id:'open', title:t('notif_act_open'), foreground:true}
  ]}]}).catch(()=>{});
  CapLN.addListener('localNotificationActionPerformed', ev=>{
    setTimeout(checkRecharge, 1500); // cualquier interacción con una notificación recarga si toca
    const ex=(ev.notification && ev.notification.extra)||{};
    if(ev.actionId==='done'){ if(cfg){ nativeDoneFromNotif(ex); } }
    else if(ev.actionId==='snooze'){ if(cfg){ nativeSnoozeFromNotif(ex); } }
    else if(ex.pid){
      // app abierta: abrir la práctica directamente; si aún hay splash, se encola
      if(cfg && !document.getElementById('splash')){
        try{ gotoTab('home'); openFullPractice(ex.pid, true); }catch(e){ pendingOpen=ex.pid; tryOpenPending(); }
      } else { pendingOpen=ex.pid; tryOpenPending(); }
    }
  });
  CapApp.addListener('backButton', ()=>{
    // 1) si hay un pop-up abierto, el atrás lo cierra
    // 2) si no, navega hacia atrás dentro de la app; para salir, botón de inicio del teléfono
    atrasApp();
  });
  CapApp.addListener('appStateChange', st=>{
    if(!st.isActive){ stopWatch(); return; }
    if(st.isActive && cfg){
      ensureDayPlan(); startWatch();
      // solo re-renderizar Inicio si la vista actual ES la pestaña de inicio
      // (si se acaba de abrir una práctica desde una notificación, NO se pisa)
      const topView=viewStack[viewStack.length-1];
      if(tab==='home' && (!topView || topView.type==='tab') && !document.hidden) renderHome();
      CapLN.checkPermissions().then(r=>{
        const antes=nativePerm; nativePerm=r.display;
        if(antes!=='granted' && nativePerm==='granted') pedirReprogramacion();
      }).catch(()=>{});
      (async ()=>{
        const antes=exactPerm;
        await refreshExactPerm();
        if(antes!=='granted' && exactPerm==='granted') pedirReprogramacion();
      })();
      if(tab==='set'){
        setTimeout(()=>refreshExactPerm(true), 800);
        setTimeout(()=>refreshExactPerm(true), 2500);
        refreshBgEstado(true);
      }
    }
  });
}

function boot(){
  try{
    try{ applyNavLang(); }catch(e){}
    try{ refreshPracticesLang(); }catch(e){}
    try{ sincronizarCanal(); }catch(e){}
    setTimeout(()=>{ try{ avisarRespaldo(); }catch(e){} }, 2600);
    if(!LS.get('mpt_install',0)) LS.set('mpt_install', Date.now());
    if(LS.get('mpt_ver','')!==String(APP_VERSION)){ LS.set('mpt_ver', String(APP_VERSION)); LS.set('mpt_update', Date.now()); }
    // La portada es la ÚNICA pantalla de inicio y se muestra siempre 2 segundos.
    // Solo se salta al venir de un aviso, para ir directos a la práctica.
    if(fromNotif){ _forceShow(); }
    else setTimeout(_forceShow, 2000);
  }catch(e){ _forceShow(); }
  // RED DE SEGURIDAD: pase lo que pase, a los 3,5 s la splash se retira SIEMPRE
  setTimeout(_forceShow, 3500);
}
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden){
    // app oculta: se apagan los temporizadores para no gastar batería en segundo plano
    // (el sistema de Android ya tiene los avisos programados; no se pierde nada)
    stopWatch();
  } else if(cfg){ ensureDayPlan(); startWatch(); if(tab==='home') renderHome(); }
});
function start(){
  if(!cfg){ ob._langDone=!!LS.get('mpt_lang',null); renderOnboarding(ob._langDone?'modo':'lang'); return; }
  // Con la app ya configurada, sin aceptación activa TODO queda bloqueado
  if(!aceptado()){ renderAceptacion('bloqueo'); return; }
  document.getElementById('nav').classList.remove('hidden');
  try{ ensureDayPlan(); }
  catch(e){
    // dato corrupto de una versión anterior: se regenera el plan del día
    try{ LS.remove('mpt_day'); LS.set('mpt_plans', {}); dayState=null; ensureDayPlan(); }
    catch(e2){ dayState={date:todayStr(), used:[], plan:[]}; }
  }
  try{ statOpen(); }catch(e){}
  try{ startWatch(); }catch(e){}
  if(IS_NATIVE){
    setTimeout(async()=>{
      try{
        const r=await CapLN.checkPermissions(); nativePerm=r.display;
        try{ const x=await CapLN.checkExactNotificationSetting(); exactPerm=x.exact_alarm; }catch(e){}
        if(nativePerm==='granted'){
          const pend=await CapLN.getPending();
          if(!pend.notifications || pend.notifications.length===0) pedirReprogramacion();
        }
      }catch(e){}
    }, 1200);
  }
  // propuesta de envío de métricas cada 3 días. El aplazamiento se guarda en su
  // propia clave (mpt_statsRemind): así sobrevive aunque las estadísticas se
  // reinicien o se restaure una copia, y cancelar da SIEMPRE 3 días de silencio.
  setTimeout(()=>{
    const base=Math.max(stats.lastSend||0, LS.get('mpt_statsRemind',0), LS.get('mpt_install',0));
    if(Date.now()-base >= METRICS_CADA_DIAS*24*60*60*1000){
      LS.set('mpt_statsRemind', Date.now());
      if(confirm(t('st_remind_q').replace('{d}', METRICS_CADA_DIAS))) sendMetrics();
    }
  }, 2500);
  history.replaceState({app:1},''); history.pushState({app:1},''); // colchón para el botón atrás
  if(doneParam){ history.replaceState({app:1},'',location.pathname); doneByPid(doneParam); gotoTab('home'); return; }
  if(snoozeParam){ history.replaceState({app:1},'',location.pathname); snoozeByPid(snoozeParam); gotoTab('home'); return; }
  if(fromNotif){ history.replaceState({app:1},'',location.pathname); pushView({type:'tab', tab:'home'}); openFullPractice(fromNotif, true); return; }
  try{ gotoTab('home'); }catch(e){ try{ document.getElementById('main').innerHTML='<div class=\"card\"><p class=\"muted\">'+t('boot_loaded')+'</p></div>'; }catch(e2){} }
  tryOpenPending();
  setTimeout(tryOpenPending, 900); // por si la notificación llega un instante después
}
document.getElementById('nav').addEventListener('click', e=>{
  const b=e.target.closest('button'); if(b) gotoTab(b.dataset.tab);
});

window.addEventListener('popstate', ()=>{
  atrasApp();
  history.pushState({app:1},''); // atrapa el atrás: para salir se usa el botón de inicio del teléfono
});

document.getElementById('modal').addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });

boot();
