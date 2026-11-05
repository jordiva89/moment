/* Moment · Ajustes
   La pantalla de Ajustes y sus secciones.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

let setCollapsed={};  // {idCaja:true} cajas de Ajustes plegadas

/* ---- Constelaciones «x por semana» ----
   Primero cuántas a la semana (de 1 a 7); después, cada una con su día, su hora y
   cuál: una concreta o al azar. */
const DIAS_LARGOS=['wd_sun','wd_mon','wd_tue','wd_wed','wd_thu','wd_fri','wd_sat'];
function nombreDia(d){ const s=t(DIAS_LARGOS[d]||'wd_mon'); return s.charAt(0).toUpperCase()+s.slice(1); }
function constSemToggle(on){
  const c=constSemCfg(); c.on=!!on;
  if(on){ cfg.constNo=false; if(!c.filas.length) c.filas=[{d:1, h:cfg.startH*60+cfg.startM, pid:null}]; }
  applyCfg();
}
// Una más (el día siguiente a la última, a la misma hora) o una menos (la última)
function constSemCuantas(delta){
  const c=constSemCfg(), n=Math.max(1, Math.min(CONST_SEM_MAX, c.filas.length+delta));
  while(c.filas.length<n){
    const u=c.filas[c.filas.length-1] || {d:0, h:cfg.startH*60+cfg.startM};
    c.filas.push({d:(u.d+1)%7, h:u.h, pid:null});
  }
  c.filas.length=n;
  applyCfg();
}
function constSemDia(k, d){
  const f=constSemCfg().filas[k]; if(!f) return;
  f.d=Math.max(0, Math.min(6, parseInt(d,10)||0));
  applyCfg();
}
function constSemHora(k, e){
  const f=constSemCfg().filas[k]; if(!f) return;
  abrirReloj(f.h, m=>{ f.h=m; applyCfg(); }, faseDe(e));
}
function constSemCual(k, pid){
  const f=constSemCfg().filas[k]; if(!f) return;
  f.pid = (pid && byId(pid)) ? pid : null;
  applyCfg();
}
function constelacionesLista(){
  return ALL().filter(p=>esCatConst(p.cat)).slice().sort((a,b)=>a.title.localeCompare(b.title));
}
function constSemBloque(){
  const c=constSemCfg(), n=c.filas.length, consts=constelacionesLista();
  return `<div style="margin:2px 0 8px 26px">
    <p class="muted" style="margin:0 0 6px;font-size:.85rem">${t('pt_const_sem_txt')}</p>
    <div class="contador">
      <span>${t('pt_const_sem_n')}</span>
      <button type="button" class="stp" ${n<=1?'disabled':''} onclick="constSemCuantas(-1)" aria-label="−">−</button>
      <b>${n}</b>
      <button type="button" class="stp" ${n>=CONST_SEM_MAX?'disabled':''} onclick="constSemCuantas(1)" aria-label="+">+</button>
    </div>
    ${c.filas.map((f,k)=>{
      const elegida=f.pid && byId(f.pid) ? f.pid : '';
      return `<div class="constfila">
        <p class="constfila-n">${t('pt_const_sem_k').replace('{n}', k+1)}</p>
        <div class="row" style="align-items:center;gap:8px;flex-wrap:nowrap">
          <select style="flex:1 1 auto;min-width:0;margin:0" aria-label="${t('pt_const_sem_day')}" onchange="constSemDia(${k}, this.value)">
            ${[1,2,3,4,5,6,0].map(d=>`<option value="${d}" ${f.d===d?'selected':''}>${nombreDia(d)}</option>`).join('')}
          </select>
          <button type="button" class="btn ghost" style="flex:0 0 auto;margin:0;padding:8px 10px;font-weight:700" onclick="constSemHora(${k},event)" aria-label="${t('pt_const_sem_hour')}: ${fmtT(f.h)}">${horaPartes(f.h)}</button>
        </div>
        <select style="margin:6px 0 0" aria-label="${t('pt_const_sem_which')}" onchange="constSemCual(${k}, this.value)">
          <option value="" ${elegida?'':'selected'}>🎲 ${t('pt_const_sem_rand')}</option>
          ${consts.map(p=>`<option value="${esc(p.id)}" ${elegida===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}
        </select>
      </div>`;
    }).join('')}
    <p class="muted" style="margin:8px 0 0;text-align:center"><b>${n===1 ? t('pt_const_sem_total1') : t('pt_const_sem_total').replace('{n}', n)}</b></p>
  </div>`;
}

// Una fila de momento propio con sus botones (pausar, editar, borrar). La usan la
// lista de «Momentos propios» (con la lupa en los de Profundizar) y la de Profundizar.
function filaMomentoHTML(ev, conLupa){
  const pausado=evPaused.includes(ev.id);
  return `<div style="display:flex;align-items:center;gap:10px;font-size:.92rem;margin-bottom:8px">
      <div style="flex:1">${conLupa&&ev.prof?'🔍 ':''}<b>${esc(ev.title)}</b> · ${evTimesText(ev)} · ${repFullText(ev)}</div>
      <button class="pau ${pausado?'on':''}" onclick="toggleEventPause('${ev.id}')" title="${pausado?t('pause_remove_t'):t('pause_add_t')}">⏸</button>
      <button class="pau" onclick="openEventForm('${ev.id}')" title="${t('mo_edit')}" style="opacity:1;filter:none;color:var(--verde2)">✏️</button>
      <button class="pau" onclick="delEvent('${ev.id}')" title="${t('mo_delete')}" style="color:#B3402A;opacity:1;filter:none">🗑</button>
    </div>`;
}

/* ---- «Profundizar en una constelación» ----
   Una opción más de la lista de constelaciones. Por dentro es un «Momento para ti»
   marcado con prof: true: la misma constelación, con su hora, sus días y cuántas
   veces (7, 13, 21, 28…). Así funciona aunque luego se apague el patrón, y aparece
   también entre los momentos propios.
   Casilla marcada = hay alguna en marcha. Al desmarcarla se ponen en pausa (no se
   borran); al volver a marcarla se retoman, o se elige una si no había ninguna. */
function momentosProfundizar(){ return userEvents.filter(ev=>ev.prof); }
function profundizarActivo(){ return momentosProfundizar().some(ev=>!evPaused.includes(ev.id)); }
function profundizarToggle(on){
  const todos=momentosProfundizar();
  if(on){
    const pausados=todos.filter(ev=>evPaused.includes(ev.id));
    if(pausados.length){
      evPaused=evPaused.filter(id=>!pausados.some(ev=>ev.id===id));
      LS.set('mpt_evpaused', evPaused);
      rebuildToday(); scheduleNext(); renderSet(); toast(t('pt_const_deep_on'));
      return;
    }
    renderSet();                      // la casilla refleja lo real mientras se elige
    openEventForm(null, null, {soloConst:true});
    return;
  }
  todos.forEach(ev=>{ if(!evPaused.includes(ev.id)) evPaused.push(ev.id); });
  LS.set('mpt_evpaused', evPaused);
  rebuildToday(); scheduleNext(); renderSet(); toast(t('pt_const_deep_off'));
}
function profundizarBloque(){
  const todos=momentosProfundizar();
  if(!todos.length) return '';
  return `<div style="margin:2px 0 8px 26px">
    ${todos.map(ev=>filaMomentoHTML(ev, false)).join('')}
    <p class="cbtn" style="margin:2px 0 0"><button type="button" class="tbtn" onclick="openEventForm(null,null,{soloConst:true})">${t('pt_const_deep_add')}</button></p>
  </div>`;
}

async function restaurarTodo(){
  if(!confirm(t('cf_reset'))) return;
  // cancelar todos los avisos programados
  try{ if(IS_NATIVE && CapLN){ const pend=await CapLN.getPending(); if(pend && pend.notifications && pend.notifications.length) await CapLN.cancel({notifications:pend.notifications}); } }catch(e){}
  // borrar todos los datos de la app excepto las fechas de instalación/actualización
  ['mpt_cfg','mpt_day','mpt_plans','mpt_favs','mpt_paused','mpt_evpaused','mpt_userlib','mpt_events','mpt_stats','mpt_donelog','mpt_alarm','mpt_log'].forEach(k=>{ try{ localStorage.removeItem(k); }catch(e){} });
  // los adjuntos de las prácticas propias también
  try{ if(window.indexedDB) indexedDB.deleteDatabase(ADJ_DB); }catch(e){}
  location.reload();
}

function toggleAllSet(){
  const secs=['patron','stats','notif','share','cuenta'];
  const todoPlegado=secs.every(x=>setCollapsed[x]);
  secs.forEach(x=>setCollapsed[x]=!todoPlegado);
  renderSet();
}

// Armazón de una sección plegable de Ajustes: cabecera con el título, cuerpo y
// enlace de plegar. Antes este mismo bloque estaba repetido en las cinco secciones,
// con el identificador escrito seis veces en cada una.
function secAjustes(id, titulo, cuerpo){
  const abierta=!setCollapsed[id];
  const alt=`setCollapsed['${id}']`, ver=`verCaja('[data-card=\\'${id}\\']')`;
  return `<div class="card">
    <div class="cardhead" data-card="${id}"><h2 onclick="${alt}=!${alt};renderSet();${ver}" style="cursor:pointer;margin:0">${titulo} <span class="muted">${abierta?'▲':'▼'}</span></h2></div>
    <div class="setbody" data-sec="${id}" style="${abierta?'':'display:none'}">
      ${cuerpo}
      <p class="center cbtn" style="margin-top:10px"><button type="button" class="tbtn suave" onclick="${alt}=true;renderSet();${ver}">${t('set_collapse')}</button></p>
    </div>
  </div>`;
}

// ¿Se va a proponer algo? Si el patrón está apagado, el azar no tiene categorías
// (o está apagado) y no hay momentos propios activos, el día quedaría vacío.
function nadaQueProponer(){
  const azarUtil = azarActivo() && !azarSinCategorias(cfg.azar);
  const momentos = userEvents.some(ev=>!evPaused.includes(ev.id));
  return !patronActivo() && !azarUtil && !momentos;
}
function patronToggle(on){ cfg.patron=!!on; applyCfg(); }
function resumenModosHTML(){
  return `<p class="muted"><b>${t('st_pattern')}</b> ${patronActivo()
      ? `${slotTimes().length} ${t('st_pattern_a')} ${pad(cfg.startH)}:${pad(cfg.startM)} ${t('st_pattern_b')} ${cfg.freq} ${t('st_pattern_c')} ${cfg.span} ${t('st_pattern_d')}`
      : t('st_pat_off')}</p>`
    + (azarActivo() ? `<p class="muted"><b>${t('st_az')}</b> ${esc(azarResumen(cfg.azar))}</p>` : '');
}
function renderSet(){
  ensureDayPlan();
  refreshExactPerm();
  refreshBgEstado();
  const M=document.getElementById('main');
  const perm=notifPerm();
  const nm=nowMins();
  const prox=dayState.plan.map(s=>({s,t:eff(s)})).filter(o=>!o.s.done && !o.s.notified && o.t>nm).sort((a,b)=>a.t-b.t)[0];
  const secs=['patron','stats','notif','share','cuenta'];
  const todoPlegado=secs.every(x=>setCollapsed[x]);
  M.innerHTML=`
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
      <button class="btn small ghost" onclick="toggleAllSet()">${todoPlegado?t('set_expand_all'):t('set_collapse_all')}</button>
    </div>
    ${secAjustes('notif', IS_NATIVE?t('set_notif'):t('set_cal'), IS_NATIVE?`
      <p class="muted"><b>${t('nt_next')}</b> ${prox?(t('nt_next_today')+' '+fmtT(prox.t)):t('nt_next_none')}.</p>
      <p class="muted">${IS_NATIVE?t('nt_native').replace('{n}',DAYS_AHEAD):t('nt_web')}</p>
      <button class="btn ${notifActive()?'gold':'ghost'} block" onclick="toggleNotif(renderSet)">${notifActive()?t('nt_on'):t('nt_off')}</button>
      ${perm==='denied'?`<p class="muted" style="margin-top:8px">${t('nt_denied')}</p>`:''}
      ${IS_NATIVE?`<label class="fld" style="margin-top:16px">${t('nt_punct')}</label>
      <p class="muted">${t('nt_punct_txt')}</p>
      <p class="cbtn" style="margin:4px 0 0"><button type="button" class="tbtn" onclick="abrirAjusteExacto()">${t('nt_punct_open')}</button></p>
      <label class="fld" style="margin-top:16px">${t('nt_sound')}</label>
      <p class="muted">${t('nt_sound_txt')}</p>
      <button class="btn ${alarmMode?'gold':'ghost'} block" onclick="toggleAlarmMode()">${alarmMode?t('nt_alarm_on'):t('nt_alarm_off')}</button>
      <p class="muted" id="bgestado" style="font-size:.78rem;margin-top:4px;text-align:center">${bgEstadoTxt()}</p>
      <p class="muted" style="font-size:.8rem;margin-top:10px">${t('nt_blocked_q')}</p>
      <p class="center cbtn" style="margin-top:8px"><button type="button" class="tbtn" onclick="abrirGuiaBloqueado()">${t('nt_guide')}</button></p>
      ${alarmChannelOk===false?`<p class="muted" style="font-size:.8rem;margin-top:6px;color:#B3402A">${t('nt_no_channel')}</p>`:''}`:''}
      <p class="center cbtn" style="margin-top:14px"><button type="button" class="tbtn" onclick="testNotif()">${t('nt_test')}</button></p>
    `:`
      <p class="muted">${t('cal_intro').replace('{n}', ICS_LUNAS*ICS_DIAS_LUNA)}</p>
      <button class="btn gold block" onclick="descargarICS()">${t('cal_btn')}</button>
      <label class="fld" style="margin-top:18px">${t('cal_ios')}</label>
      <p class="muted" style="white-space:pre-line">${t('cal_ios_txt')}</p>
      <label class="fld" style="margin-top:18px">${t('cal_android')}</label>
      <p class="muted" style="white-space:pre-line">${t('cal_android_txt')}</p>
      <label class="fld" style="margin-top:18px">${t('cal_know')}</label>
      <p class="muted" style="white-space:pre-line">${t('cal_know_txt')}</p>
    `)}
    ${secAjustes('patron', t('set_pattern'), `
      <p class="muted" style="margin:0 0 8px">${t('pt_modes_txt')}</p>
      ${nadaQueProponer()?`<div class="infobox" style="margin:0 0 10px">⚠️ ${t('pt_nothing')}</div>`:''}
      <h3 class="modotit">🕐 ${t('pt_pat_label')}</h3>
      <label class="chkrow" style="margin:0 0 6px">
        <input type="checkbox" ${patronActivo()?'checked':''} onchange="patronToggle(this.checked)"> ${t('pt_pat_on')}
      </label>
      ${patronActivo()?`
        <label class="fld">${t('pt_first_hour')}</label>
        <p class="muted" style="margin:0 0 8px">${t('pt_start_txt')}</p>
        <div class="clockwrap">
          <div id="clk">${clockSVG(cfg.startH,cfg.startM,190)}</div>
          <div class="timeset">
            <div style="flex:1">${''}<button type="button" class="btn ghost" style="width:100%;font-size:1.2rem;font-weight:700" onclick="abrirReloj(cfg.startH*60+cfg.startM, m=>{ cfg.startH=Math.floor(m/60); cfg.startM=m%60; applyCfg(); renderSet(); }, faseDe(event))">🕐 ${horaPartes(cfg.startH*60+cfg.startM)}</button></div>

          </div>
        </div>
        <label class="fld">${t('pt_each')}</label>
        <p class="muted" style="margin:0 0 8px">${t('pt_each_txt')}</p>
        <div class="optgrid">${[1,2,3].map(h=>`<button class="optbtn ${cfg.freq===h?'sel':''}" onclick="cfg.freq=${h};ajustarSpan();applyCfg()">${t('pt_each_btn')} ${h} h</button>`).join('')}</div>
        <p class="muted">${t('pt_snooze_txt')}</p>
        <label class="fld">${t('pt_span_label')}</label>
        <p class="muted" style="margin:0 0 8px">${t('pt_span_txt')}</p>
        <div class="optgrid g7">${spanOpciones().map(h=>`<button class="optbtn ${cfg.span===h?'sel':''}" onclick="cfg.span=${h};applyCfg()">${h} h</button>`).join('')}</div>
        ${resumenPatronHTML(cfg, 'pt_sum')}
        <label class="fld">${t('pt_fav_label_a')} <b id="favN">${cfg.favPerDay}</b> ${t('pt_fav_label_b')} ${slotTimes().length} ${t('pt_fav_label_c')}</label>
        <p class="muted" style="margin:0 0 8px">${t('pt_fav_txt')}</p>
        <input type="range" class="favrange" list="favticks" min="0" max="${slotTimes().length}" step="1" value="${cfg.favPerDay}"
          oninput="document.getElementById('favN').textContent=this.value"
          onchange="cfg.favPerDay=parseInt(this.value);applyCfg()">
        <datalist id="favticks">${Array.from({length:slotTimes().length+1},(_,k)=>`<option value="${k}"></option>`).join('')}</datalist>
        <label class="fld">${t('pt_vis_label')}</label>
        <p class="muted" style="margin:0 0 8px">${t('pt_cats_txt')}</p>
        <label class="chkrow" style="margin:0 0 6px">
          <input type="checkbox" ${cfg.visDia?'checked':''} onchange="cfg.visDia=this.checked;applyCfg()"> ${t('pt_vis_chk')}
        </label>
        ${catPairs().filter(cp=>cp.id!=='constelaciones').map(cp=>`<label class="chkrow" style="margin:0 0 6px">
          <input type="checkbox" ${cfg.catsPref && cfg.catsPref[cp.id]?'checked':''} onchange="setCatPref(${jsAttr(cp.id)}, this.checked)"> ${cp.propia?esc(cp.id):esc(catLabel(cp.id))}
        </label>`).join('')}
        <div class="subcaja">
          <label class="fld" style="margin-top:0">${t('pt_const_label')}</label>
          <p class="muted" style="margin:0 0 8px">${t('pt_const_txt')}</p>
          <label class="chkrow">
            <input type="checkbox" ${cfg.constNo?'checked':''} onchange="cfg.constNo=this.checked;if(this.checked){cfg.constIni=false;cfg.constMed=false;cfg.constFin=false;if(cfg.constSem)cfg.constSem.on=false;}applyCfg()"> ${t('pt_const_no')}
          </label>
          <label class="chkrow">
            <input type="checkbox" ${cfg.constIni?'checked':''} onchange="cfg.constIni=this.checked;if(this.checked)cfg.constNo=false;applyCfg()"> ${t('pt_const_ini')}
          </label>
          <label class="chkrow">
            <input type="checkbox" ${cfg.constMed?'checked':''} onchange="cfg.constMed=this.checked;if(this.checked)cfg.constNo=false;applyCfg()"> ${t('pt_const_med')}
          </label>
          <label class="chkrow">
            <input type="checkbox" ${cfg.constFin?'checked':''} onchange="cfg.constFin=this.checked;if(this.checked)cfg.constNo=false;applyCfg()"> ${t('pt_const_fin')}
          </label>
          <label class="chkrow">
            <input type="checkbox" ${cfg.constSem&&cfg.constSem.on?'checked':''} onchange="constSemToggle(this.checked)"> ${t('pt_const_sem')}
          </label>
          ${cfg.constSem&&cfg.constSem.on?constSemBloque():''}
          <label class="chkrow" style="margin-bottom:2px">
            <input type="checkbox" ${profundizarActivo()?'checked':''} onchange="profundizarToggle(this.checked)"> ${t('pt_const_deep')}
          </label>
          <p class="muted" style="margin:0 0 8px 26px;font-size:.85rem">${t('pt_const_deep_txt')}</p>
          ${profundizarBloque()}
          <button type="button" class="btn ghost block" style="margin-top:10px" onclick="abrirConstelacionIA()">${t('lib_ai_const')}</button>
        </div>
      `:`<p class="muted" style="margin:0 0 8px;font-size:.85rem">${t('pt_pat_off')}</p>`}

      <h3 class="modotit">✍️ ${t('pt_moments_label')}</h3>
      <p class="muted" style="margin:0 0 8px">${t('pt_moments_txt')}</p>
      ${userEvents.length?userEvents.map(ev=>filaMomentoHTML(ev, true)).join(''):`<p class="muted">${t('mo_none')}</p>`}

      <button class="btn gold block" onclick="openEventForm()">${t('pt_create')}</button>
      <label class="fld">${t('pt_esp_label')}</label>
      <p class="muted" style="margin:0 0 8px">${t('pt_esp_txt')}</p>
      ${especialesLista().map(p=>`<button class="btn ghost block" style="text-align:left" onclick="crearMomentoDe('${p.id}')">⏰ ${esc(p.title)}</button>`).join('')}
      <div class="infobox" style="margin-top:12px">💡 <b>${t('ob_hint_title')}:</b> ${t('ob_hint_custom')}</div>

      <h3 class="modotit">🎲 ${t('pt_az_label')}</h3>
      <p class="muted" style="margin:0 0 8px">${t('pt_az_txt')}</p>
      <label class="chkrow" style="margin:0 0 6px">
        <input type="checkbox" ${azarActivo()?'checked':''} onchange="azToggle(this.checked)"> ${t('pt_az_on')}
      </label>
      ${azarActivo()?azBloqueAjustes():''}
    `)}
    ${secAjustes('share', t('set_share'), `
      <p class="muted">${t('sr_intro')}</p>
      <button class="btn primary block" onclick="shareApp(getLang()==='en'?'the world':'el mundo')">${t('sr_world')}</button>
      <button class="btn ghost block" onclick="copyText(shareMsg()).then(ok=>toast(ok?t('sr_copied'):t('sr_copy_fail')))">${t('sr_copy')}</button>
      <p class="muted" style="margin-top:8px;font-size:.8rem">${t('sr_wa')}</p>
            <p class="muted" style="font-size:.8rem;margin-top:10px">${t('sr_trust')}</p>
    `)}
    ${secAjustes('stats', t('set_stats'), `
      ${IS_NATIVE?(function(){ const r=statsResumen(); return `
      <p class="muted"><b>${t('st_last_conn')}</b> ${fmtFecha(stats.lastOpen)}<br>
      <b>${t('st_last_done')}</b> ${fmtFecha(stats.lastDone)}</p>
      ${resumenModosHTML()}
      <p class="muted"><b>${t('st_last_days_a')} ${r.dias||0} ${t('st_last_days_b')}</b> ${r.h} ${t('st_done')} · ${r.extra} ${t('st_extra')} · ${r.pPract} ${t('st_snoozed_a')} (${r.pVeces} ${t('st_snoozed_b')})</p>
      <p class="muted"><b>${t('st_top_slots')}</b> ${r.topHoras.length?r.topHoras.join(', '):'—'}</p>
      <p class="muted"><b>${t('st_top_disc')}</b> ${r.topCamb.length?r.topCamb.map(c=>esc(c.t)+' ('+c.n+')').join(' · '):'—'}</p>
      <p class="muted">${t('st_last_send')} ${fmtFecha(stats.lastSend)}</p>`; })():`
      ${resumenModosHTML()}`}
      ${IS_NATIVE?`<p class="center cbtn"><button type="button" class="tbtn" onclick="sendMetrics()">${t('st_send_metrics')}</button></p>`:''}
      <p class="muted" style="margin-top:14px">${t('st_feedback_txt')}</p>
      <button class="btn ghost block" onclick="enviarFeedback()">${t('st_feedback_btn')}</button>
      <p class="center cbtn" style="margin-top:14px"><button type="button" class="tbtn peligro" onclick="openResetStats()">${t('st_reset')}</button></p>
    `)}
    ${secAjustes('cuenta', t('set_privacy'), `
      <label class="fld">${I18N.es.priv_language} · ${I18N.en.priv_language}</label>
      <p class="muted" style="margin:0 0 8px;font-size:.85rem">${t('id_txt')}</p>
      <div class="optgrid g2" style="margin-bottom:8px">
        ${idiomasDisponibles().map(c=>`<button class="optbtn ${getLang()===c?'sel':''}"
          onclick="setLang('${c}');renderSet()">${banderaIdioma(c)} ${esc(nombreIdioma(c))}</button>`).join('')}
      </div>
      ${creditoIdioma()?`<p class="muted" style="margin:8px 0 0;font-size:.85rem">${t('cr_txt').replace('{n}', esc(creditoIdioma()))}</p>`:''}

      <label class="fld" style="margin-top:16px">${t('lb_label')}</label>
      <p class="muted" style="margin:0 0 8px;font-size:.85rem">${t('lb_txt')}</p>
      <div class="optgrid g2" style="margin-bottom:8px">
        <button class="optbtn ${langRespaldo()==='es'?'sel':''}" onclick="elegirRespaldo('es')">🇪🇸 Español</button>
        <button class="optbtn ${langRespaldo()==='en'?'sel':''}" onclick="elegirRespaldo('en')">🇬🇧 English</button>
      </div>

      <div class="subcaja" style="margin-bottom:16px">
        <label class="fld" style="margin-top:0">${t('tr_title')}</label>
        <p class="muted" style="margin:0 0 4px;font-size:.85rem">${t('tr_txt')}</p>
        <p class="pasotr">${t('tr_s1')}</p>
        <button class="btn ghost block" onclick="descargarPlantillaTraduccion()">${t('tr_download')}</button>
        <p class="pasotr">${t('tr_s2')}</p>
        <button class="btn ghost block" onclick="copyText(t('tr_prompt')).then(ok=>toast(ok?t('tr_prompt_ok'):t('sr_copy_fail')))">${t('tr_prompt_btn')}</button>
        <p class="pasotr">${t('tr_s3')}</p>
        <input type="file" id="id_file" accept=".json,application/json" style="display:none"
          onchange="importarArchivo(this.files[0]);this.value=''">
        <button class="btn gold block" onclick="document.getElementById('id_file').click()">${t('id_import')}</button>
        ${idiomasDisponibles().filter(c=>!IDIOMAS_BASE.includes(c)).length?`
          <label class="fld">${t('tr_mine')}</label>
          ${idiomasDisponibles().filter(c=>!IDIOMAS_BASE.includes(c)).map(c=>`<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 6px">
            <span style="flex:1;min-width:120px">${banderaIdioma(c)} <b>${esc(nombreIdioma(c))}</b></span>
            <button type="button" class="tbtn" onclick="enviarIdiomaEmail('${c}')">${t('tr_send_btn')}</button>
            <button type="button" class="tbtn peligro" onclick="quitarIdioma('${c}')">${t('id_remove')}</button>
          </div>`).join('')}`:''}
      </div>
      <label class="fld">${t('ab_title')}</label>
      <p class="muted">${t('pr_intro')}</p>
      <p class="muted">${t('pr_astro')}</p>
      <button class="btn primary block" style="margin:12px 0" onclick="abrirFormularioSuscripcion()">${t('pr_subscribe')}</button>
      <p class="muted" style="font-size:.82rem;text-align:center">${t('pr_sub_txt')}</p>
      <p class="center cbtn" style="margin-top:12px"><button type="button" class="tbtn" onclick="verLegal('cond')">${t('pr_terms')}</button> · <button type="button" class="tbtn" onclick="verLegal('priv')">${t('pr_privacy')}</button></p>
      <label class="fld" style="margin-top:16px">${t('bk_title')}</label>
      <p class="muted">${t('bk_txt')}</p>
      <button class="btn ghost block" onclick="exportarDatos()">${t('bk_export')}</button>
      <input type="file" id="bk_file" accept=".json,application/json" style="display:none" onchange="importarArchivo(this.files[0]);this.value=''">
      <button class="btn ghost block" onclick="document.getElementById('bk_file').click()">${t('bk_import')}</button>
      <p class="muted" style="margin-top:16px">${t('pr_first_install')} <b>${fmtFecha(LS.get('mpt_install',0))}</b><br>
      ${t('pr_last_update')} <b>${fmtFecha(LS.get('mpt_update',0)||LS.get('mpt_install',0))}</b></p>
      <label class="chkrow" style="margin:0 0 10px">
        <input type="checkbox" checked onchange="if(!this.checked) desactivarAceptacion(); else this.checked=true;"> ${t('pr_accept_chk')}
      </label>
      <p class="muted" style="font-size:.85rem">${t('pr_accept_txt')}</p>
      <p class="muted" style="font-size:.85rem">${t('pr_titular')}</p>
      ${IS_NATIVE?`<label class="fld">${t('im_found')}</label>
      <p class="muted" style="margin:0 0 8px;font-size:.85rem">${t('im_found_txt')}</p>
      <div id="detectados"></div>
      <button class="btn ghost block" style="margin-bottom:16px" onclick="renderDetectados()">${t('im_scan')}</button>`:''}

      <label class="fld">${t('lg_label')}</label>
      <p class="muted" style="margin:0 0 8px;font-size:.85rem">${t('lg_txt')}</p>
      <pre style="background:#FFFDF7;border:1px solid #E2D7BF;border-radius:10px;padding:10px;
        font-size:.72rem;line-height:1.5;max-height:180px;overflow:auto;white-space:pre-wrap;margin:0 0 8px">${esc(logTexto())}</pre>
      ${_log.length?`<button class="btn small ghost" onclick="borrarLog()">${t('lg_clear')}</button>`:''}
      <p class="muted" style="margin-top:14px">${t('pr_version')} <b>v${APP_VERSION}</b></p>
      <p class="muted">${t('pr_upgrade')}</p>
      <p class="muted" style="margin-top:14px;font-size:.82rem">${t('pr_reset_warn')}</p>
      <p class="center cbtn"><button type="button" class="tbtn peligro" onclick="restaurarTodo()">${t('pr_reset')}</button></p>
    `)}
    <div class="card"><h2 style="margin:0 0 12px">${t('nc_social')}</h2>${ncSocialBlock()}</div>`;
}
