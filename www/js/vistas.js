/* Moment · Navegación y Agenda
   La pila de vistas (botón atrás), la pantalla de inicio y la práctica a pantalla completa.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

// Tras plegar o desplegar una caja, se lleva su cabecera a la parte alta de la
// pantalla: si no, al plegar una caja larga el contenido "salta" y se pierde el hilo.
function verCaja(sel){
  // Coloca el elemento indicado en la parte alta de la pantalla.
  // Sin animación a propósito: con desplazamiento suave, el segundo cálculo se hacía
  // mientras la página aún se movía y el resultado se pasaba de largo.
  const objetivo=()=>{
    try{
      let el=typeof sel==='string' ? document.querySelector(sel) : sel;
      if(!el) return null;
      // se sube a la tarjeta contenedora, para ver su borde superior y su título
      if(el.closest){ el=el.closest('.card, .ditem') || el; }
      // La cabecera de la app es pegajosa (position:sticky) y se queda fija arriba:
      // hay que descontar su altura o taparía justo el inicio de la caja.
      let tapa=0;
      const h=document.querySelector('header.top');
      if(h){ const r=h.getBoundingClientRect(); if(r.top<=1) tapa=r.height; }
      return Math.max(0, el.getBoundingClientRect().top + window.scrollY - tapa - 10);
    }catch(e){ return null; }
  };
  const ir=()=>{ const y=objetivo(); if(y!==null) window.scrollTo(0, y); };
  requestAnimationFrame(()=>requestAnimationFrame(ir));
  setTimeout(ir, 120);   // por si el contenido cambió de alto al desplegarse
  setTimeout(ir, 320);
}
let lastUpcoming=[], lastPast=[];
function allOpen(list){ return list.length>0 && list.every(o=>expandedSlots.has(o.i)); }
function expandGroup(g){
  const list=g==='day'?lastUpcoming:lastPast;
  if(allOpen(list)) list.forEach(o=>expandedSlots.delete(o.i));
  else list.forEach(o=>expandedSlots.add(o.i));
  renderHome();
}

let viewStack=[];
function navActive(t){ document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active', b.dataset.tab===t)); }
function renderView(v){
  if(v.type==='tab'){ tab=v.tab; navActive(v.tab); ({home:renderHome, lib:renderLib, fav:renderFav, set:renderSet})[v.tab](); }
  else { renderFullPractice(v.id, v.origin||'day'); }
  window.scrollTo(0,0);
}
function pushView(v){
  const top=viewStack[viewStack.length-1];
  if(top && top.type===v.type && top.tab===v.tab && top.id===v.id) { renderView(v); return; }
  viewStack.push(v); renderView(v);
}
// Botón atrás: primero cierra un pop-up abierto; si no, retrocede dentro de la app.
// Definición única, compartida por la ruta nativa (Capacitor) y la web (popstate).
function atrasApp(){
  const modal=document.getElementById('modal');
  if(modalOpen || (modal && !modal.classList.contains('hidden'))){ closeModal(); return true; }
  if(viewStack.length>1){ viewStack.pop(); renderView(viewStack[viewStack.length-1]); return true; }
  return false;   // no había nada que cerrar ni a donde volver
}

function gotoTab(t){ tab=t; pushView({type:'tab', tab:t}); }

function catClass(cat){
  if(['respiracion','meditacion','energia'].includes(cat)) return '';
  return cat==='constelaciones' ? 't2' : 't3';
}

function renderHome(){
  ensureDayPlan();
  const M=document.getElementById('main');
  const nm=nowMins();
  const doneCount=statsDay().h;  // hechas reales del día (se mantienen aunque cambies la práctica)
  // si la app se instaló hoy, los momentos "del día" cuentan desde la instalación
  const instTs=LS.get('mpt_install',0);
  const instHoy=instTs && dateStrOf(new Date(instTs))===todayStr();
  const instMin=instHoy?(new Date(instTs).getHours()*60+new Date(instTs).getMinutes()):0;
  const momentosHoy=instHoy?dayState.plan.filter(s=>eff(s)>=instMin).length:dayState.plan.length;
  // estadísticas del día anterior (guardadas en mpt_stats.days)
  const ayer=new Date(); ayer.setDate(ayer.getDate()-1);
  const stAyer=(stats.days&&stats.days[dateStrOf(ayer)])||null;
  const withIdx=dayState.plan.map((s,i)=>({s,i}));
  // Clasificación v2:
  //  - La práctica ACTUAL (la de la franja vigente ahora mismo, si está pendiente) es la
  //    destacada y encabeza "Tu día". Las FUTURAS van después.
  //  - TODAS las anteriores a la actual (hechas o no) pasan a "Día pasado".
  const orden=withIdx.slice().sort((a,b)=>eff(a.s)-eff(b.s));
  // hora de la franja vigente: la última cuyo horario ya ha llegado
  let vigEff=null;
  orden.forEach(o=>{ if(eff(o.s)<=nm) vigEff=eff(o.s); });
  // "Tu día" = TODAS las pendientes de la franja vigente (pueden ser varias a la misma
  // hora, p. ej. la programada + momentos propios) + todas las futuras (hora > ahora)
  const vigentes=vigEff===null?[]:orden.filter(o=>eff(o.s)===vigEff && !o.s.done);
  const futuras=orden.filter(o=>eff(o.s)>nm);
  const upcoming=[...vigentes, ...futuras];
  // "Día pasado" = todo lo demás (anteriores a la actual, y la actual si ya está hecha),
  // más reciente primero
  const enDia=new Set(upcoming.map(o=>o.i));
  const past=orden.filter(o=>!enDia.has(o.i)).sort((a,b)=>eff(b.s)-eff(a.s));
  const primera=upcoming.find(o=>!o.s.done);
  const nextIdx=primera?primera.i:-1;
  if(expandedDay!==dayState.date){ expandedSlots=new Set(); expandedDay=dayState.date; lastAutoNext=-1; }
  if(nextIdx>=0 && nextIdx!==lastAutoNext){ expandedSlots.add(nextIdx); lastAutoNext=nextIdx; }
  const next=primera?primera.s:null;
  lastUpcoming=upcoming; lastPast=past;
  M.innerHTML=`
    <p class="muted" style="margin:4px 2px 4px">${t('hdr_today')}: ${momentosHoy} ${t('hdr_moments')} · ${doneCount} ${t('hdr_done')}${(statsDay().extra||0)>0?` · ${statsDay().extra} ${t('hdr_extra')}`:''}${next?` · ${t('hdr_next_at')} <b>${fmtT(eff(next))}</b>`:''}</p>
    <p class="muted" style="margin:0 2px 12px;font-size:.8rem">${t('hdr_yest')}: ${stAyer?`${stAyer.h} ${t('hdr_yest_done')}${(stAyer.extra||0)>0?` · ${stAyer.extra} ${t('hdr_extra')}`:''} · ${stAyer.ps.length} ${t('hdr_yest_snoozed')}`:t('hdr_nodata')}</p>
    ${botonPlegarTodo('toggleAllHome()', !showDay && !showPast && !showNextDay)}
    <div class="card">
      ${boxHead(t('h_today'), showDay, 'showDay', 'renderHome()', "expandGroup('day')", allOpen(upcoming), !!upcoming.length)}
      ${showDay?(upcoming.map(o=>dayItem(o, o.i===nextIdx, 'day')).join('') || `<p class="muted center">${t('no_more')}</p>`):''}
    </div>
    ${past.length?`<div class="card anteriores">
      ${boxHead(t('h_past'), showPast, 'showPast', 'renderHome()', "expandGroup('past')", allOpen(past))}
      ${showPast?past.map(o=>dayItem(o,false,'past')).join(''):''}
    </div>`:''}
    ${(function(){
      const man=new Date(); man.setDate(man.getDate()+1);
      const nx=getPlanFor(dateStrOf(man));
      lastNext=nx;
      return `<div class="card">
      ${boxHead(t('h_next'), showNextDay, 'showNextDay', 'renderHome()', 'expandNextGroup()', nx.length && nx.every((e,k)=>expandedNext.has(k)))}
      ${showNextDay?nx.map((e,k)=>nextItem(e,k)).join(''):''}
    </div>
    <div class="card">
      <h2 style="margin:0 0 12px">${t('nc_social')}</h2>
      ${ncSocialBlock()}
    </div>`; })()}`;
}
function homeBody(p, evd, botones, extra=''){
  // Cuerpo desplegable común de las tarjetas del Programa: categoría, texto,
  // enlace, fila de botones (variable), fila fav/pausa y extra opcional (posposiciones)
  return `<div class="dbody">
      <span class="cat-tag ${catClass(p.cat)}">${esc(catLabel(p.cat))}${evd?` · ${t('hm_own')}`:''}</span>
      <div class="ptext">${esc(p.text)}</div>
      ${enlaceSeguro(p.link)?`<a class="plink" href="${esc(enlaceSeguro(p.link))}" target="_blank" rel="noopener noreferrer">${t('open_ex')}</a>`:''}
      ${adjuntoHTML(p)}
      <div class="row" style="margin-top:14px">
        ${botones}
      </div>
      ${favPauseRow(p.id,'renderHome()')}
      <button class="btn small ghost block" onclick="crearMomentoDe('${p.id}')">${t('mk_moment_btn')}</button>${extra}
    </div>`;
}
// De dónde viene una propuesta de la Agenda: momento propio, al azar o patrón estándar
function origenTxt(s){ return s.ev ? t('hm_own') : s.az ? t('hm_az') : t('hm_pat'); }
function dayItem(o, isNext, section){
  const s=o.s, i=o.i, p=byId(s.pid);
  if(!p) return '';
  const open=expandedSlots.has(i);
  const isFav=favs.includes(p.id);
  const evd=s.ev?getEvent(s.ev):null;
  const esVigente = eff(s)<=nowMins();  // su hora ya ha llegado
  const estado=s.done?t('st_done'):(isNext?t('st_next'):'');
  return `<div class="ditem ${isNext?'next':''} ${open?'open':''} ${s.done?'done':''}">
    <div class="dhead" id="dh${i}" role="button" tabindex="0" onclick="toggleExpand(${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleExpand(${i})}">
      <div class="hora">${fmtT(eff(s))}</div>
      <div class="grow"><h4>${esc(p.title)}</h4><span class="catpill">${esc(catLabel(p.cat))} · ${origenTxt(s)}${estado}${s.muted?t('st_muted'):''}</span></div>
      ${iconColHome(p.id, i, 'renderHome()')}
    </div>
    ${open?homeBody(p, evd,
      (section==='past'
        ? (s.done
           // ya estaba hecha: cualquier repetición cuenta como extra
           ? `<button class="btn small gold" style="flex:1" onclick="hacerAhora('${p.id}');renderHome()">${t('done_now')}</button>`
           // aún pendiente: al hacerla ahora cuenta como HECHA (su primera vez), no como extra
           : `<button class="btn small ghost" style="flex:1" onclick="toggleDone(${i});renderHome()">${t('done_mark')}</button>`)
        : (esVigente
           ? `<button class="btn small ${s.done?'primary':'ghost'}" style="flex:1" onclick="toggleDone(${i});renderHome()">${t('done_mark')}</button>`
           : `<button class="btn small gold" style="flex:1" onclick="hacerAhora('${p.id}');renderHome()">${t('done_now')}</button>`))
      +'\n        '+(section==='past'?'':`<button class="btn small ghost" style="flex:1" onclick="newRecommendation(${i})">${t('change')}</button>`),
      '\n      '+(s.snoozes && !s.done?`<div class="snoozeinfo">${t('snoozed_pre')} ${s.snoozes} ${s.snoozes===1?t('snoozed_1'):t('snoozed_n')} · ${t('snoozed_next')} ${fmtT(s.snoozeUntil)}</div>`:'')):''}
  </div>`;
}
let lastNext=[];
function nextItem(e,k){
  const p=byId(e.pid); if(!p) return '';
  const evd=e.ev?getEvent(e.ev):null;
  const open=expandedNext.has(k);
  const isFav=favs.includes(p.id);
  return `<div class="ditem ${open?'open':''} ${e.done?'done':''}">
    <div class="dhead" id="dhn${k}" role="button" tabindex="0" onclick="toggleNext(${k})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleNext(${k})}">
      <div class="hora">${fmtT(e.time)}</div>
      <div class="grow"><h4>${esc(p.title)}</h4><span class="catpill">${esc(catLabel(p.cat))} · ${origenTxt(e)}${e.muted?t('st_muted'):''}</span></div>
      ${homeIcons(p.id, e.muted, `toggleMuteNext(${k}, renderHome)`)}
    </div>
    ${open?homeBody(p, evd,
      `<button class="btn small gold" style="flex:1" onclick="hacerAhora('${p.id}');renderHome()">${t('done_now')}</button>`
      +'\n        '+`<button class="btn small ghost" style="flex:1" onclick="newRecNext(${k})">${t('change')}</button>`):''}
  </div>`;
}

function newRecNext(k){
  const ds=nextDateStr(); const plans=LS.get('mpt_plans',{});
  if(!plans[ds]) plans[ds]=lastNext;
  const usados=plans[ds].map(e=>e.pid);
  const fresh=pickRandom(usados);
  if(!fresh){ toast(t('ts_no_more_avail')); return; }
  plans[ds][k].pid=fresh;
  LS.set('mpt_plans', plans); renderHome();
}
function expandNextGroup(){
  const todos=lastNext.length && lastNext.every((e,k)=>expandedNext.has(k));
  expandedNext=new Set(todos?[]:lastNext.map((e,k)=>k));
  renderHome();
}
// Plegar/desplegar una tarjeta del plan de mañana o de la biblioteca.
// Extraídas del atributo onclick para que la cabecera pueda responder también
// al teclado sin duplicar la lógica en dos sitios.
function toggleNext(k){
  if(expandedNext.has(k)) expandedNext.delete(k); else expandedNext.add(k);
  renderHome(); verCaja('#dhn'+k);
}
// Plegar o desplegar una tarjeta afecta SOLO a esa tarjeta. Antes se rehacía la
// lista entera —doscientas y pico— por abrir una sola.
const ITEM_RENDER = {
  expandedLib:     p=>libItem(p),
  expandedFav:     p=>favItem(p),
  expandedPropias: p=>propiaItem(p),
  expandedPaused:  p=>pausedItem(p),
};
function toggleFicha(conjunto, id, rerender, setName){
  if(conjunto.has(id)) conjunto.delete(id); else conjunto.add(id);
  const cab=document.getElementById('dh_'+id);
  const tarjeta=cab && cab.closest('.ditem');
  const pintar=ITEM_RENDER[setName];
  const p=byId(id);
  if(tarjeta && pintar && p){
    tarjeta.outerHTML=pintar(p);          // se sustituye únicamente esta tarjeta
  } else if(typeof rerender==='function'){
    rerender();                            // respaldo: si algo no encaja, se rehace todo
  }
  verCaja('#dh_'+id);
}
function toggleExpand(i){
  if(expandedSlots.has(i)) expandedSlots.delete(i); else expandedSlots.add(i);
  renderHome(); verCaja('#dh'+i);
}
function toggleDone(i){
  const s=dayState.plan[i];
  if(s.done){
    s.done=false;
    const enFuturo = eff(s) > nowMins();
    s.notified = !enFuturo;
    saveDay(); statDone(false, s.pid, s.extraDone);
    s.extraDone=false;
    if(enFuturo) nativeScheduleSlot(i);
    startWatch();
    toast(t('ts_unmarked'));
  } else {
    // ¿es la práctica del momento actual o una ya vencida y pendiente? → cuenta normal.
    // ¿es una práctica FUTURA (su hora aún no ha llegado)? → cuenta como EXTRA y se
    // regenera esa franja para que, cuando llegue su hora, se proponga una nueva sin hacer.
    const esFutura = eff(s) > nowMins();
    const esExtra = esFutura || !!s.doneOnce;
    if(esFutura){
      // registrar la extra sobre esta práctica
      statDone(true, s.pid, true);
      const pidHecha=s.pid;
      // regenerar la franja con otra práctica no usada hoy
      const fresh=pickRandom(dayState.used);
      if(fresh){
        s.pid=fresh; s.done=false; s.snoozes=0; s.snoozeUntil=null; s.notified=false; s.doneOnce=false; s.extraDone=false;
        dayState.used.push(fresh);
      } else {
        // si no queda ninguna nueva, se deja marcada como hecha normal
        s.done=true; s.extraDone=true; s.doneOnce=true;
      }
      saveDay(); scheduleNext(); startWatch();
      if(!document.hidden && tab==='home') renderHome();
      toast(t('ts_extra_done'));
      return;
    }
    s.done=true; s.snoozeUntil=null;
    // si este momento ya tuvo una hecha antes (se cambió tras completarla), esta cuenta como EXTRA
    s.extraDone = esExtra;
    s.doneOnce = true;
    saveDay(); statDone(true, s.pid, esExtra); nativeCancelSlot(i); startWatch();
    toast(esExtra ? t('ts_done_extra') : t('ts_done_ok'));
  }
}
function snooze(i){
  const s=dayState.plan[i];
  if(s.done){ toast(t('ts_already_done')); return; }
  if(s.snoozes>=FIB_INC.length){ toast(t('ts_no_snooze')); return; }
  const inc=FIB_INC[s.snoozes];
  const base=s.snoozeUntil!==null? s.snoozeUntil : Math.max(s.time, nowMins());
  let until=base+inc;
  const nxt=dayState.plan[i+1];
  if(nxt && until>=nxt.time){ s.done=true; s.snoozeUntil=null; saveDay(); nativeCancelSlot(i); startWatch(); toast(t('ts_next_sooner')); return; }
  s.snoozes++; s.snoozeUntil=until; s.notified=false;
  saveDay(); statSnooze(i); nativeScheduleSlot(i); startWatch();
  toast(t('ts_snoozed_to').replace('{m}', inc).replace('{h}', fmtT(s.snoozeUntil)));
}
function newRecommendation(i){
  const fresh=pickRandom(dayState.used);
  if(!fresh){ toast(t('ts_seen_all')); return; }
  if(i>=0){
    const s=dayState.plan[i];
    // Si la práctica actual estaba hecha, esa hecha SE MANTIENE en las estadísticas
    // (no se descuenta) — solo se sustituye la propuesta por otra a hacer.
    statDiscard(s.pid);
    s.pid=fresh; s.done=false; s.snoozes=0; s.snoozeUntil=null; s.notified=false;
  }
  dayState.used.push(fresh);
  saveDay(); scheduleNext();
  if(i>=0) renderHome(); else openFullPractice(fresh);
  toast(t('ts_new_sugg'));
}
function togglePause(id){
  const k=paused.indexOf(id);
  if(k>=0){ paused.splice(k,1); toast(t('ts_unpaused')); }
  else{
    paused.push(id);
    // solo se sustituyen sus apariciones FUTURAS de hoy que eligió la app: no las
    // hechas, ni los momentos propios, ni lo que la persona escogió a mano (una
    // constelación concreta de «x por semana», la visualización del día): eso se
    // hace aunque esté en pausa. Las de hora ya pasada se respetan.
    if(dayState){
      dayState.plan.forEach(sl=>{
        const aMano = sl.ev || sl.fija || (cfg && cfg.visDia && sl.pid===VIS_ID);
        if(sl.pid===id && !sl.done && !aMano && eff(sl)>nowMins()){
          const f=pickRandom(dayState.used);
          if(f){ sl.pid=f; sl.snoozes=0; sl.snoozeUntil=null; sl.notified=false; dayState.used.push(f); }
        }
      });
      saveDay();
    }
    toast(t('ts_paused'));
  }
  LS.set('mpt_paused', paused);
  LS.set('mpt_plans', {});
  scheduleNext();
}
function toggleFav(id){
  const k=favs.indexOf(id);
  if(k>=0) favs.splice(k,1); else favs.push(id);
  LS.set('mpt_favs', favs);
}

function openFullPractice(id, adopt, origin){
  const p=byId(id);
  if(!p){ toast(t('ts_notif_gone')); return; }
  try{
    ensureDayPlan();
    let i=dayState.plan.findIndex(s=>s.pid===id);
    // Si viene de una notificación de hoy y no está en el plan, se asigna al momento actual
    if(i<0 && adopt){
      i=currentSlotIndex();
      Object.assign(dayState.plan[i], {pid:id, done:false, snoozes:0, snoozeUntil:null, notified:false});
      if(!dayState.used.includes(id)) dayState.used.push(id);
      saveDay(); scheduleNext();
    }
  }catch(e){ /* pase lo que pase con el plan, la práctica se muestra igualmente */ }
  pushView({type:'p', id, origin:origin||'day'});
}
function goSibling(id, origin){
  if(!id) return;
  const top=viewStack[viewStack.length-1];
  if(top && top.type==='p'){ top.id=id; top.origin=origin||top.origin; renderView(top); } else openFullPractice(id, false, origin);
}
function renderFullPractice(id, origin){
  origin=origin||'day';
  const p=byId(id); if(!p) return;
  document.getElementById('nav').classList.remove('hidden');
  let i=-1, slot=null;
  try{ ensureDayPlan(); i=dayState.plan.findIndex(s=>s.pid===id); slot=i>=0?dayState.plan[i]:null; }catch(e){}
  const isFav=favs.includes(p.id);
  const isPaused=paused.includes(p.id);
  // Anterior/Siguiente según el listado de ORIGEN
  let seq;
  if(origin==='fav') seq=favs.filter(x=>byId(x));
  else if(origin==='lib') seq=ALL().filter(x=>!paused.includes(x.id)).map(x=>x.id);
  else if(origin==='paused') seq=ALL().filter(x=>paused.includes(x.id)).map(x=>x.id);
  else seq=(i>=0)?dayState.plan.map(s=>s.pid):ALL().filter(x=>!paused.includes(x.id)).map(x=>x.id);
  const k=seq.indexOf(id);
  const prevId=k>0?seq[k-1]:null;
  const nextId=(k>=0 && k<seq.length-1)?seq[k+1]:null;
  const soloLib=(origin==='fav'||origin==='lib'||origin==='paused'); // vistas de biblioteca/favoritas
  const M=document.getElementById('main');
  M.innerHTML=`
    <div class="backbar" style="justify-content:space-between">
      <button class="btn small ghost" ${prevId?`onclick="goSibling('${prevId}','${origin}')"`:'disabled style="opacity:.35"'}>${t('fp_prev')}</button>
      <button class="btn small ghost" onclick="history.back()">${t('fp_back')}</button>
      <button class="btn small ghost" ${nextId?`onclick="goSibling('${nextId}','${origin}')"`:'disabled style="opacity:.35"'}>${t('fp_next')}</button>
    </div>
    <span class="cat-tag ${catClass(p.cat)}">${esc(catLabel(p.cat))}</span>
    <h2 style="margin:4px 0 14px;font-size:1.5rem">${esc(p.title)}</h2>
    <div class="ptext" style="font-size:1.12rem">${esc(p.text)}</div>
    ${enlaceSeguro(p.link)?`<a class="plink" href="${esc(enlaceSeguro(p.link))}" target="_blank" rel="noopener noreferrer">${t('open_ex')}</a>`:''}
    ${adjuntoHTML(p)}
    <div class="row" style="margin-top:22px">
      ${(!soloLib && slot)?`<button class="btn ${slot.done?'primary':'ghost'}" style="flex:1" onclick="toggleDone(${i});renderFullPractice('${p.id}','${origin}')">${t('done_mark')}</button>`:''}
      <button class="btn ${isFav?'terra':'ghost'}" style="flex:1" onclick="toggleFav('${p.id}');renderFullPractice('${p.id}','${origin}')">♥ ${isFav?t('fav_saved'):t('fav_save')}</button>
      ${origin==='fav'?`<button class="btn gold" style="flex:1" onclick="hacerAhora('${p.id}')">${t('done_now')}</button>`:''}
    </div>
    <button class="btn ${isPaused?'gold':'ghost'} block" onclick="togglePause('${p.id}');renderFullPractice('${p.id}','${origin}')">${isPaused?t('pause_remove'):t('pause_add')}</button>
    ${(!soloLib && slot && !slot.done)?`<button class="btn ghost block" onclick="snooze(${i});renderFullPractice('${p.id}','${origin}')">${t('fp_snooze')}</button>
    ${slot.snoozes?`<div class="snoozeinfo">${t('snoozed_pre')} ${slot.snoozes} ${slot.snoozes===1?t('snoozed_1'):t('snoozed_n')} · ${t('snoozed_next')} ${fmtT(slot.snoozeUntil)}</div>`:''}`:''}
    <button class="btn ghost block" onclick="crearMomentoDe('${p.id}')">${t('mk_moment_btn')}</button>
    ${!soloLib?`<button class="btn primary block" onclick="gotoTab('home')">${t('fp_go_app')}</button>`:''}
  `;
  window.scrollTo(0,0);
}

// Columna de iconos para el PROGRAMA: favorita + campanilla de silencio (no pausa)
function homeIcons(pid, muted, muteClick){
  // Columna fav + campanilla de las tarjetas del Programa (Tu día, Día pasado y Siguiente día)
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
    <button class="fav-btn ${favs.includes(pid)?'on':''}" style="font-size:1.35rem" onclick="event.stopPropagation();toggleFav('${pid}');renderHome()">♥</button>
    <button class="bell ${muted?'on':''}" onclick="event.stopPropagation();${muteClick}" title="${muted?t('mute_on'):t('mute_off')}">${muted?'🔕':'🔔'}</button>
  </div>`;
}
function iconColHome(pid, idx, after){
  const s=dayState.plan[idx];
  return homeIcons(pid, s && s.muted, `toggleMute(${idx}, ${after||'null'})`);
}
function iconCol(pid, afterFav, afterPause){
  afterPause=afterPause||afterFav;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px">
    <button class="fav-btn ${favs.includes(pid)?'on':''}" style="font-size:1.35rem" onclick="event.stopPropagation();toggleFav('${pid}');${afterFav}">♥</button>
    <button class="pau ${paused.includes(pid)?'on':''}" onclick="event.stopPropagation();togglePause('${pid}');${afterPause}" title="${paused.includes(pid)?t('pause_remove_t'):t('pause_add_t')}">⏸</button>
  </div>`;
}
// Fila de botones Favorita + Poner/Quitar pausa de los cuerpos de ítem
function favPauseRow(pid, afterFav, afterPause){
  afterPause=afterPause||afterFav;
  const isFav=favs.includes(pid);
  const txtFav=isFav?t('fav_saved'):t('fav_save');
  return `<div class="row" style="margin-top:10px">
    <button class="btn small ${isFav?'terra':'ghost'}" style="flex:1" onclick="toggleFav('${pid}');${afterFav}">♥ ${txtFav}</button>
    <button class="btn small ${paused.includes(pid)?'gold':'ghost'}" style="flex:1" onclick="togglePause('${pid}');${afterPause}">${paused.includes(pid)?t('pause_remove'):t('pause_add')}</button>
  </div>`;
}
// Botón "Hecha ahora" (extra). block=true ocupa toda la línea
function hechaAhoraBtn(pid, after, block){
  return `<button class="btn small gold ${block?'block':''}" ${block?'style="margin-top:10px"':'style="flex:1"'} onclick="hacerAhora('${pid}');${after||''}">${t('done_now')}</button>`;
}
// Cabecera de caja plegable: título + flecha + botón Desplegar/Plegar todo.
// showVar y las llamadas van como texto porque se insertan en atributos onclick.
function boxHead(tit, isOpen, showVar, rerender, expandCall, todos, conBoton){
  return `<div class="cardhead" data-box="${showVar}">
    <h2 onclick="${showVar}=!${showVar};${rerender};verCaja('[data-box=\\'${showVar}\\']')" style="cursor:pointer;margin:0">${tit} <span class="muted">${isOpen?'▲':'▼'}</span></h2>
    ${conBoton!==false?`<button class="btn small ghost" onclick="${showVar}=true;${expandCall};verCaja('[data-box=\\'${showVar}\\']')">${todos?t('fold_all'):t('unfold_all')}</button>`:''}
  </div>`;
}
// Alternar plegado total de un conjunto de ítems
function toggleAllIn(list, set){
  const ids=list.map(p=>p.id);
  const todos=ids.length && ids.every(id=>set.has(id));
  return new Set(todos?[]:ids);
}

// Botón «Plegar todo / Desplegar todo», igual que el de Ajustes, para las cajas
// de cada pestaña. Devuelve el botón ya montado.
function botonPlegarTodo(fn, todoPlegado){
  return `<div style="display:flex;justify-content:flex-end;margin:0 2px 10px">
    <button class="btn small ghost" onclick="${fn}">${todoPlegado?t('set_expand_all'):t('set_collapse_all')}</button>
  </div>`;
}
function toggleAllHome(){
  const todo = !showDay && !showPast && !showNextDay;
  showDay=todo; showPast=todo; showNextDay=todo;
  renderHome();
}
