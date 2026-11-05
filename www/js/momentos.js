/* Moment · «Momento para ti»
   Los momentos propios: formulario, repeticiones y adjuntos.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

let editingEvent=null;
let _evProf=false;   // el formulario abierto es el de «Profundizar en una constelación»
// Abre el formulario de momento propio con una práctica ya elegida en «Ejercicio»
function crearMomentoDe(pid){
  try{ closeModal(); }catch(e){}
  openEventForm(null, pid);
}
// opts.soloConst: «Profundizar en una constelación». El momento se crea con una
// única constelación, siempre la misma; la lista solo ofrece constelaciones.
function openEventForm(editId, presetPid, opts){
  editingEvent=editId||null;
  const ed=editId?getEvent(editId):null;
  _evAdj={actual:null, nuevo:null, quitar:false};
  const soloConst=!!(opts && opts.soloConst) && !ed;
  _evProf=soloConst;
  const cats={};
  ALL().filter(p=>!soloConst || esCatConst(p.cat)).forEach(p=>{ (cats[p.cat]=cats[p.cat]||[]).push(p); });
  document.getElementById('modalContent').innerHTML=`
    ${soloConst?`<h2>${t('pt_const_deep')}</h2>
    <p class="muted" style="margin:0 0 6px">${t('ef_deep_txt')}</p>`:`<h2>${ed?t('ef_edit'):t('ef_create_h')} «Momento para ti»</h2>`}
    <label class="fld">${t('ef_hour')}</label>
    ${botonHora('ev_h', ed?ed.time:540)}
    <label class="fld">${t('ef_exercise')}</label>
    <select id="ev_p" onchange="document.getElementById('ev_nuevo').style.display=this.value==='__new__'?'block':'none'">
      ${soloConst?'':`<option value="__new__">${t('ef_new_ex')}</option>`}
      ${Object.keys(cats).sort((a,b)=>(a==='constelaciones')-(b==='constelaciones') || catLabel(a).localeCompare(catLabel(b))).map(c=>`<option disabled>── ${esc(catLabel(c).toUpperCase())} ──</option>${cats[c].map(p=>`<option value="${p.id}" ${ed&&ed.pid===p.id?'selected':''}>${esc(p.title)}</option>`).join('')}`).join('')}
    </select>
    <div id="ev_nuevo" ${ed||soloConst?'style="display:none"':''}>
      <label class="fld" id="ev_nuevo_lbl">${t('ef_new_title')}</label>
      <input type="text" id="ev_xt" placeholder="${t('ef_new_title_ph')}">
      <label class="fld">${t('na_cat')}</label>
      ${catSelectHTML('ev_c','ev_c_new')}
      <label class="fld">${t('ef_new_text')}</label>
      <textarea id="ev_x" placeholder="${t('ef_new_text_ph')}"></textarea>
      <label class="fld">${t('ef_link')}</label>
      <input type="url" id="ev_l" placeholder="https://…">
      <label class="fld">${t('ef_adj')}</label>
      <p class="muted" style="margin:0 0 6px;font-size:.85rem">${t('ef_adj_txt').replace('{n}', ADJ_MAX_MB)}</p>
      <input type="file" id="ev_adj" style="display:none" onchange="evAdjElegir(this.files[0]);this.value=''">
      <div id="ev_adj_info"></div>
      <button type="button" class="btn ghost block" onclick="document.getElementById('ev_adj').click()">${t('ef_adj_btn')}</button>
    </div>
    <label class="fld">${t('ef_repeat')}</label>
    <select id="ev_r" onchange="document.getElementById('ev_ndias').style.display=this.value==='days'?'block':'none';evVecesUI();evWdaysUI()">
      <option value="daily" ${ed&&ed.rep==='daily'?'selected':''}>${t('ef_r_daily')}</option>
      <option value="days" ${ed&&ed.rep==='days'?'selected':''}>${t('ef_r_days')}</option>
      <option value="weekly" ${ed&&ed.rep==='weekly'?'selected':''}>${t('ef_r_weekly')}</option>
      <option value="wdays" ${ed&&ed.rep==='wdays'?'selected':''}>${t('ef_r_wdays')}</option>
      <option value="monthly" ${ed&&ed.rep==='monthly'?'selected':''}>${t('ef_r_monthly')}</option>
    </select>
    <div id="ev_ndias" style="display:${ed&&ed.rep==='days'?'block':'none'}">
      <label class="fld">${t('ef_ndays')}</label>
      <select id="ev_n">${Array.from({length:29},(_,k)=>`<option value="${k+2}" ${ed&&ed.n===k+2?'selected':''}>${k+2} ${t('ef_ndays_opt')}</option>`).join('')}</select>
    </div>
    <div id="ev_wdays" style="display:none">
      <label class="fld">${t('ef_wdays')}</label>
      <p class="muted" style="margin:0 0 6px;font-size:.85rem">${t('ef_wdays_txt')}</p>
      <div class="optgrid" style="grid-template-columns:repeat(4,1fr);margin-bottom:4px">
        ${[1,2,3,4,5,6,0].map(d=>`<button type="button" class="optbtn ${(ed&&ed.wd||[]).includes(d)?'sel':''}"
          data-wd="${d}" onclick="evToggleDia(${d})">${t('wd_s'+d)}</button>`).join('')}
      </div>
    </div>

    <label class="fld" id="ev_veces_lbl">${t('ef_times')}</label>
    <p class="muted" id="ev_veces_txt" style="margin:0 0 6px;font-size:.85rem">${t('ef_times_txt')}</p>
    <select id="ev_veces" onchange="evVecesUI()">
      <option value="0"${!ed||!ed.veces?' selected':''}>${t('ef_times_inf')}</option>
      ${[7,13,21,28].map(k=>`<option value="${k}"${ed&&ed.veces===k?' selected':''}>${t('ef_times_n').replace('{n}',k)}</option>`).join('')}
      <option value="otro"${ed&&ed.veces>0&&![7,13,21,28].includes(ed.veces)?' selected':''}>${t('ef_times_other')}</option>
    </select>
    <input type="number" id="ev_veces_n" min="2" max="365" placeholder="${t('ef_times_ph')}"
      value="${ed&&ed.veces>0&&![7,13,21,28].includes(ed.veces)?ed.veces:''}"
        style="display:none;margin-top:6px">

    <label class="fld">${t('ef_dayrep')}</label>
    <select id="ev_dm" onchange="evDayModeUI()">
      <option value="once" ${!ed||!ed.dmode||ed.dmode==='once'?'selected':''}>${t('ef_dr_once')}</option>
      <option value="int" ${ed&&ed.dmode==='int'?'selected':''}>${t('ef_dr_int')}</option>
      <option value="list" ${ed&&ed.dmode==='list'?'selected':''}>${t('ef_dr_list')}</option>
    </select>
    <div id="ev_dint" style="display:none">
      <div class="row cbtn">
        <div style="flex:1">
          <label class="fld">${t('ef_dr_count')}</label>
          <select id="ev_dc">${Array.from({length:11},(_,k)=>`<option value="${k+2}" ${ed&&ed.dcount===k+2?'selected':''}>${k+2}</option>`).join('')}</select>
        </div>
        <div style="flex:1">
          <label class="fld">${t('ef_dr_gap')}</label>
          <select id="ev_dg">${Array.from({length:12},(_,k)=>`<option value="${k+1}" ${ed&&ed.dgap===k+1?'selected':''}>${k+1}</option>`).join('')}</select>
        </div>
      </div>
      <p class="muted" style="margin:6px 2px 0;font-size:.8rem">${t('ef_dr_first')}</p>
    </div>
    <div id="ev_dlist" style="display:none">
      <label class="fld">${t('ef_dr_times')}</label>
      <div id="ev_dtimes"></div>
      <button type="button" class="btn ghost small" style="margin-top:8px" onclick="addEvTime()">${t('ef_dr_add')}</button>
      <p class="muted" style="margin:6px 2px 0;font-size:.8rem">${t('ef_dr_first')}</p>
    </div>
    <div class="row" style="margin-top:16px">
      <button class="btn primary" style="flex:1" onclick="saveEvent()">${ed?t('ef_save'):t('ef_create')}</button>
      <button class="btn ghost" style="flex:1" onclick="closeModal()">${t('ef_cancel')}</button>
    </div>`;
  // práctica premarcada (viene del botón de una tarjeta de la biblioteca)
  if(presetPid && !ed){
    const sel=document.getElementById('ev_p');
    if(sel && [...sel.options].some(o=>o.value===presetPid)){
      sel.value=presetPid;
      const nu=document.getElementById('ev_nuevo'); if(nu) nu.style.display='none';
    }
  }
  // horas adicionales ya guardadas (modo "horas concretas")
  if(ed && ed.dmode==='list' && Array.isArray(ed.dtimes)) ed.dtimes.forEach(m=>addEvTime(m));
  /* Si el momento usa una práctica PROPIA, sus campos se muestran rellenos para
     poder corregir título, descripción o enlace desde aquí. Las de la biblioteca
     siguen protegidas: no se editan desde un momento. */
  if(ed && ed.pid && esUserPractice(ed.pid)){
    const pp = byId(ed.pid);
    const nu = document.getElementById('ev_nuevo');
    if(pp && nu){
      nu.style.display='block';
      const g=(id,v)=>{ const el=document.getElementById(id); if(el) el.value=v||''; };
      g('ev_xt', pp.title); g('ev_x', pp.text); g('ev_l', pp.link);
      _evAdj.actual = pp.adj || null;
      evAdjPintar();
      const lb=document.getElementById('ev_nuevo_lbl');
      if(lb) lb.textContent = t('ef_edit_own');
    }
  }
  evWdaysCargar(ed);
  evDayModeUI();
  evWdaysUI();
  evVecesUI();
  openModal();
}
// Muestra los campos que correspondan al modo de repetición diaria elegido
/* El límite solo tiene sentido si el momento se repite. Y el campo del número
   libre solo aparece si se elige «otro». */
/* Adjunto elegido en el formulario, pendiente de guardar. Nada se escribe hasta
   pulsar Guardar: así cancelar no deja archivos sueltos en el dispositivo. */
let _evAdj={actual:null, nuevo:null, quitar:false};
function evAdjElegir(f){
  if(!f) return;
  if(f.size>ADJ_MAX_MB*1024*1024){ toast(t('adj_too_big').replace('{n}', ADJ_MAX_MB)); return; }
  _evAdj.nuevo=f; _evAdj.quitar=false;
  evAdjPintar();
}
function evAdjQuitar(){ _evAdj.nuevo=null; _evAdj.quitar=true; evAdjPintar(); }
function evAdjPintar(){
  const el=document.getElementById('ev_adj_info'); if(!el) return;
  const f=_evAdj.nuevo;
  const ficha = f ? {nombre:f.name, kb:Math.round(f.size/1024), tipo:adjTipo(f.type, f.name)}
                  : (!_evAdj.quitar && _evAdj.actual) ? _evAdj.actual : null;
  el.innerHTML = ficha ? `<div class="row" style="align-items:center;margin:0 0 6px">
      <div style="flex:1;font-size:.88rem">${adjIcono(ficha.tipo)} <b>${esc(ficha.nombre||'')}</b> · ${tamanoTxt(ficha.kb||0)}</div>
      <button type="button" class="btn ghost small" onclick="evAdjQuitar()">${t('ef_dr_del')}</button>
    </div>` : '';
}
// Aplica a una práctica propia el adjunto elegido (o su retirada) y guarda el
// archivo en el dispositivo. Devuelve true si la ficha ha cambiado.
function evAdjAplicar(p){
  if(!p) return false;
  if(_evAdj.nuevo){
    const f=_evAdj.nuevo, id='a'+Date.now()+Math.floor(Math.random()*1000);
    if(p.adj && p.adj.id) adjBorrar(p.adj.id).catch(()=>{});
    p.adj={id, tipo:adjTipo(f.type, f.name), nombre:f.name||'', mime:f.type||'', kb:Math.round(f.size/1024)};
    // el archivo ya está en memoria como Blob: se muestra al instante mientras se guarda
    try{ _adjURL.set(id, URL.createObjectURL(f)); }catch(e){}
    ADJ.guardar(id, f).then(()=>{
      try{ if(!IS_NATIVE && navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
    }).catch(e=>{
      anota('adjunto', e); toast(t('adj_fail'));
      const k=userLib.findIndex(u=>u.id===p.id);
      if(k>=0 && userLib[k].adj && userLib[k].adj.id===id){ delete userLib[k].adj; LS.set('mpt_userlib', userLib); libCacheDirty(); }
    });
    return true;
  }
  if(_evAdj.quitar && p.adj){
    if(p.adj.id) adjBorrar(p.adj.id).catch(()=>{});
    delete p.adj;
    return true;
  }
  return false;
}
/* Días de la semana elegidos. Se guardan en ev.wd como números (0 = domingo). */
let _wdSel = [];
function evToggleDia(d){
  const i=_wdSel.indexOf(d);
  if(i>=0) _wdSel.splice(i,1); else _wdSel.push(d);
  const b=document.querySelector('#ev_wdays [data-wd="'+d+'"]');
  if(b) b.classList.toggle('sel', _wdSel.includes(d));
}
function evWdaysUI(){
  const r=document.getElementById('ev_r'), c=document.getElementById('ev_wdays');
  if(c && r) c.style.display = r.value==='wdays' ? '' : 'none';
}
function evWdaysCargar(ed){ _wdSel = (ed && ed.wd) ? ed.wd.slice() : []; }
function evVecesUI(){
  const rep=document.getElementById('ev_r'), sel=document.getElementById('ev_veces');
  const lbl=document.getElementById('ev_veces_lbl'), txt=document.getElementById('ev_veces_txt');
  const num=document.getElementById('ev_veces_n');
  if(!sel) return;
  const repite = rep && rep.value!=='once';
  [lbl,txt,sel].forEach(el=>{ if(el) el.style.display = repite ? '' : 'none'; });
  if(num) num.style.display = (repite && sel.value==='otro') ? '' : 'none';
}
function evDayModeUI(){
  const v=(document.getElementById('ev_dm')||{}).value;
  const gi=document.getElementById('ev_dint'), gl=document.getElementById('ev_dlist');
  if(gi) gi.style.display = v==='int' ? 'block':'none';
  if(gl) gl.style.display = v==='list' ? 'block':'none';
  if(v==='list' && gl && !gl.querySelector('.ev_dt')) addEvTime();
}
// Añade una fila de hora en el modo "horas concretas" (m = minutos desde medianoche)
function addEvTime(m){
  const cont=document.getElementById('ev_dtimes'); if(!cont) return;
  if(cont.querySelectorAll('.ev_dt').length>=11){ toast(t('ev_times_max')); return; }
  const val = (typeof m==='number') ? pad(Math.floor(m/60))+':'+pad(m%60) : '';
  const fila=document.createElement('div');
  fila.className='row'; fila.style.marginTop='8px';
  const uid='evdt'+Date.now()+Math.floor(Math.random()*1000);
  fila.innerHTML='<div style="flex:1">'+botonHora(uid, (typeof m==='number')?m:540, 'ev_dt')+'</div>'
    +'<button type="button" class="btn ghost small" onclick="this.parentNode.remove()">'+t('ef_dr_del')+'</button>';
  cont.appendChild(fila);
}
function saveEvent(){
  const hh=document.getElementById('ev_h').value;
  const sel=document.getElementById('ev_p').value;
  const rep=document.getElementById('ev_r').value;
  const n=parseInt(document.getElementById('ev_n').value)||2;
  // días de la semana elegidos
  if(rep==='wdays' && !_wdSel.length){ alert(t('ef_wdays_none')); return; }
  const wd=_wdSel.slice().sort((a,b)=>a-b);
  // límite de repeticiones
  let veces=0;
  const selV=document.getElementById('ev_veces');
  if(selV && document.getElementById('ev_r').value!=='once'){
    veces = selV.value==='otro'
      ? Math.max(0, parseInt(document.getElementById('ev_veces_n').value||'0',10)||0)
      : (parseInt(selV.value,10)||0);
  }
  // pauta de repetición DENTRO del día
  const dmode=document.getElementById('ev_dm').value;
  const dcount=parseInt(document.getElementById('ev_dc').value)||1;
  const dgap=parseInt(document.getElementById('ev_dg').value)||1;
  const dtimes=[...document.querySelectorAll('.ev_dt')].map(i=>i.value)
    .filter(v=>v).map(v=>{ const [a,b]=v.split(':').map(Number); return a*60+b; });
  if(dmode==='list' && !dtimes.length){ toast(t('ev_need_times')); return; }
  if(!hh){ toast(t('ev_pick_hour')); return; }
  // el título del momento se llamaba «t» y tapaba la función de traducción t():
  // cualquier aviso de este formulario fallaba en vez de mostrarse
  let pid=sel, titulo;
  if(sel==='__new__'){
    const xt=(document.getElementById('ev_xt').value||'').trim();
    const x=(document.getElementById('ev_x').value||'').trim();
    const l=(document.getElementById('ev_l').value||'').trim();
    if(!xt){ toast(t('ev_title_req')); return; }
    if(!x && !l && !_evAdj.nuevo){ toast(t('ev_text_req')); return; }
    if(l && !enlaceSeguro(l)){ toast(t('ev_bad_link')); return; }
    const p={id:'u'+Date.now(), cat:texto(catSelectValue('ev_c','ev_c_new'),80), title:texto(xt,300),
      text:texto(x || (l ? t('default_link_text') : t('default_adj_text')),20000)};
    if(l) p.link=enlaceSeguro(l);
    evAdjAplicar(p);
    userLib.push(p); LS.set('mpt_userlib', userLib); libCacheDirty();
    pid=p.id;
    titulo=xt;
  } else {
    // práctica elegida de la lista: el título del momento es el de esa práctica
    const pp=byId(sel);
    if(!pp){ toast(t('ev_pick_ex')); return; }
    // si es una práctica propia y se han editado sus campos, se actualiza
    if(esUserPractice(sel)){
      const xt=(document.getElementById('ev_xt').value||'').trim();
      const x=(document.getElementById('ev_x').value||'').trim();
      const l=(document.getElementById('ev_l').value||'').trim();
      const k=userLib.findIndex(u=>u.id===sel);
      if(k>=0 && xt){
        if(l && !enlaceSeguro(l)){ toast(t('ev_bad_link')); return; }
        userLib[k].title=texto(xt,300);
        if(x) userLib[k].text=texto(x,20000);
        if(l) userLib[k].link=enlaceSeguro(l); else delete userLib[k].link;
        evAdjAplicar(userLib[k]);
        LS.set('mpt_userlib', userLib); libCacheDirty();
      }
      titulo = xt || pp.title;
    } else titulo=pp.title;
  }
  const [H,M]=hh.split(':').map(Number);
  let ev;
  if(editingEvent){
    ev=getEvent(editingEvent);
    if(!ev){ closeModal(); return; }
    Object.assign(ev, {title:titulo, time:H*60+M, pid, rep, n, wd, veces, dmode, dcount, dgap, dtimes});
    // se retiran las ocurrencias pendientes de hoy y se recoloca si toca hoy
    ensureDayPlan();
    dayState.plan=dayState.plan.filter(sl=>!(sl.ev===ev.id && !sl.done));
  } else {
    const now=new Date();
    ev={id:'e'+Date.now(), title:titulo, time:H*60+M, pid, rep, n, wd, veces, dmode, dcount, dgap, dtimes,
      startY:now.getFullYear(), startM:now.getMonth()+1, startD:now.getDate()};
    if(_evProf) ev.prof=true;          // se lista también en «Profundizar en una constelación»
    userEvents.push(ev);
    ensureDayPlan();
  }
  LS.set('mpt_events', userEvents);
  const horasHoy=eventOccurrences(todayStr()).filter(o=>o.ev.id===ev.id).map(o=>o.time);
  if(horasHoy.length){
    horasHoy.forEach(m=>dayState.plan.push({time:m, pid:ev.pid, ev:ev.id, done:false, snoozes:0, snoozeUntil:null}));
    dayState.plan.sort((a,b)=>a.time-b.time);
    if(!dayState.used.includes(ev.pid)) dayState.used.push(ev.pid);
  }
  const era=editingEvent;
  const esNuevoEjercicio=(sel==='__new__');
  // Se pregunta cuando el momento pisa alguna propuesta PREDEFINIDA del patrón: es la
  // única elección real. Los momentos propios (este u otros) se conservan siempre.
  const hayConflicto = evChocaPatron(ev).length>0;    // con el patrón apagado no hay choque
  finalizarEvento(ev, era, esNuevoEjercicio, pid, hayConflicto?'preguntar':'ambas');
}
// ¿el choque afecta a más de una hora? (para elegir los textos en singular o plural)
function _cfPlural(ev){ return evChocaPatron(ev).length>1; }
// modo: 'preguntar' (modal sustituir/ambas), 'sustituir', 'ambas'
function finalizarEvento(ev, era, esNuevoEjercicio, pid, modo){
  if(modo==='preguntar'){
    const eraArg = era ? ("'"+era+"'") : 'null';
    document.getElementById('modalContent').innerHTML=
      '<h3>'+t('cf_title')+'</h3>'+
      (function(){
        const choca=evChocaPatron(ev);
        const uno=choca.length<=1;
        return '<p class="muted">'+(uno?t('cf_at'):t('cf_at_pl'))+' <b>'+
          (choca.length?choca.map(fmtT).join(', '):fmtT(ev.time%1440))+'</b> '+(uno?t('cf_body'):t('cf_body_pl'))+'</p>';
      })()+
      '<button class="btn primary block" style="margin-bottom:8px" onclick="finalizarEvento(getEvent(\''+ev.id+'\'), '+eraArg+', '+esNuevoEjercicio+', \''+pid+'\', \'sustituir\')">'+(_cfPlural(ev)?t('cf_replace_pl'):t('cf_replace'))+'</button>'+
      '<button class="btn ghost block" onclick="finalizarEvento(getEvent(\''+ev.id+'\'), '+eraArg+', '+esNuevoEjercicio+', \''+pid+'\', \'ambas\')">'+(_cfPlural(ev)?t('cf_both_pl'):t('cf_both'))+'</button>';
    openModal();
    return;
  }
  // La decisión se guarda EN EL MOMENTO, no solo en el día de hoy: así se respeta
  // también mañana y cada vez que el plan se reconstruya.
  if(modo==='sustituir' || modo==='ambas'){
    ev.excl = (modo==='sustituir');
    const g=getEvent(ev.id); if(g) g.excl=ev.excl;
    LS.set('mpt_events', userEvents);
  }
  if(modo==='sustituir' && dayState){
    // se retiran SOLO las propuestas predefinidas (las que no son momento propio).
    // Todos los momentos creados por el usuario se conservan.
    const horas=new Set(eventOccurrences(todayStr()).filter(o=>o.ev.id===ev.id).map(o=>o.time));
    dayState.plan=dayState.plan.filter(sl=>!(horas.has(sl.time) && !sl.ev && !sl.done));
    dayState.plan.sort((a,b)=>a.time-b.time);
  }
  saveDay();
  LS.set('mpt_plans', {});  // invalida el caché de días futuros → se reconstruyen con el momento nuevo
  scheduleNext();
  editingEvent=null;
  closeModal(); renderSet();
  toast(t('ev_saved')+' '+(era?t('ev_updated'):t('ev_created'))+' ✔ · '+evTimesText(ev)+' · '+repFullText(ev));
  if(!era && esNuevoEjercicio){
    const p=byId(pid);
    if(p) ofrecerEnviarPractica(p);
  }
}
function ofrecerEnviarPractica(p){
  document.getElementById('modalContent').innerHTML=
    '<h3>'+t('sh_title')+'</h3>'+
    '<p class="muted">'+t('sh_body')+'</p>'+
    '<button class="btn primary block" style="margin-bottom:8px" onclick="closeModal();enviarPracticasEmail([byId(\''+p.id+'\')])">'+t('sh_yes')+'</button>'+
    '<button class="btn ghost block" onclick="closeModal()">'+t('sh_no')+'</button>';
  openModal();
}
function toggleEventPause(id){
  const k=evPaused.indexOf(id);
  if(k>=0){ evPaused.splice(k,1); toast(t('ev_unpaused_t')); }
  else{ evPaused.push(id); toast(t('ev_paused_t')); }
  LS.set('mpt_evpaused', evPaused);
  // reconstruir hoy: si el momento pausado coincidía con una franja del patrón estándar
  // (y está activo), esa franja vuelve a proponer una práctica normal
  rebuildToday();
  scheduleNext(); renderSet();
}
function delEvent(id){
  if(!confirm(t('cf_del_moment'))) return;
  userEvents=userEvents.filter(e=>e.id!==id); LS.set('mpt_events', userEvents);
  // La opción "solo mis momentos" se mantiene aunque no quede ninguno: los días sin
  // momentos propios se llenan con el patrón estándar (nunca queda un día vacío).
  rebuildToday();
  scheduleNext(); renderSet();
  toast(t('ev_deleted'));
}

function evTimesText(ev){
  return eventTimes(ev).map(m=>{
    const d=Math.floor(m/1440);
    return fmtT(m%1440)+(d?' (+'+d+')':'');
  }).join(' · ');
}
function repText(ev){
  const dias=[t('wd_sun'),t('wd_mon'),t('wd_tue'),t('wd_wed'),t('wd_thu'),t('wd_fri'),t('wd_sat')];
  if(ev.rep==='daily') return t('rep_daily');
  if(ev.rep==='days') return t('rep_days_a')+' '+ev.n+' '+t('rep_days_b');
  if(ev.rep==='weekly'){ const sd=new Date(ev.startY,ev.startM-1,ev.startD); return t('rep_weekly')+' '+dias[sd.getDay()]; }
  if(ev.rep==='wdays'){
    const w=(ev.wd||[]).slice().sort((a,b)=>a-b).map(d=>t('wd_s'+d)).join(', ');
    return t('rep_wdays')+' '+w;
  }
  if(ev.rep==='monthly') return t('rep_monthly_a')+' '+ev.startD+t('rep_monthly_b');
  return '';
}
// Texto del patrón completo: repetición entre días + repetición dentro del día
function repFullText(ev){
  const base=repText(ev) + (ev.veces>0 ? ' · '+t('ev_total').replace('{n}', ev.veces) : '');
  const n=eventTimes(ev).length;
  if(n<=1) return base;
  if(ev.dmode==='int') return base+' · '+n+' '+t('rep_ntimes')+' ('+t('rep_each')+' '+ev.dgap+' h)';
  return base+' · '+n+' '+t('rep_ntimes');
}
