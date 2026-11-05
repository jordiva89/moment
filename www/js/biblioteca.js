/* Moment · Biblioteca
   Lista y búsqueda de prácticas, favoritas, pausadas, hechas y prácticas propias.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

let libFilter='', libCat='';
let _libSearchT=null;
function limpiarBusqueda(){
  libFilter='';
  const inp=document.getElementById('libSearchInp'); if(inp) inp.value='';
  const x=document.getElementById('libClear'); if(x) x.style.display='none';
  clearTimeout(_libSearchT);
  renderLibList();
}
function libSearch(v){
  libFilter=v;
  clearTimeout(_libSearchT);
  _libSearchT=setTimeout(renderLibList, 150);
}
function renderLib(){
  const M=document.getElementById('main');
  const cats=[...new Set(ALL().map(p=>p.cat))].sort((a,b)=>a.localeCompare(b));
  M.innerHTML=`
    <div class="searchrow">
      <div style="position:relative;flex:1">
        <input type="text" id="libSearchInp" placeholder="${t('lib_search')}" value="${libFilter}" style="padding-right:38px;width:100%;box-sizing:border-box" oninput="libSearch(this.value);document.getElementById('libClear').style.display=this.value?'block':'none'">
        <button type="button" id="libClear" class="tbtn" aria-label="${t('lib_clear')}" title="${t('lib_clear')}" onclick="limpiarBusqueda()" style="display:${libFilter?'block':'none'};position:absolute;right:12px;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--gris);font-size:1.05rem;padding:4px;line-height:1">✕</button>
      </div>
    </div>
    <select onchange="libCat=this.value;renderLibList()" style="margin-bottom:12px">
      <option value="">${t('lib_all_cats')} (${ALL().length})</option>
      ${cats.map(c=>`<option ${libCat===c?'selected':''} value="${esc(c)}">${esc(catLabel(c))}</option>`).join('')}
    </select>
    <button class="btn gold block" style="margin:0 0 8px" onclick="openAddForm()">${t('lib_new')}</button>
    <button class="btn ghost block" style="margin:0 0 14px" onclick="abrirConstelacionIA()">${t('lib_ai_const')}</button>
    <p class="muted" style="margin:0 2px 8px">${t('lib_offline')}</p>
    ${botonPlegarTodo('toggleAllLib()', !showLibBox && !showFavBox && !showPropias && !showPausedBox && !showHechas)}
    <div id="liblist"></div>
    <div id="pausedbox"></div>`;
  renderLibList();
}
// Filtro compartido del buscador y la categoría: lo usan TODAS las cajas de la biblioteca
function matchFiltro(p){
  if(!p) return false;
  if(libCat && p.cat!==libCat) return false;
  if(libFilter){ const q=libFilter.toLowerCase(); return (p.title+' '+p.text).toLowerCase().includes(q); }
  return true;
}
function libVisibles(){
  return ALL().filter(matchFiltro).filter(p=>!paused.includes(p.id));
}
function renderLibList(){
  const el=document.getElementById('liblist'); if(!el) return;
  const visibles=libVisibles().filter(p=>!p.id.startsWith('u'));
  const todos=visibles.length && visibles.every(p=>expandedLib.has(p.id));
  // Se compone TODO el html antes de asignarlo. Antes se asignaba, se volvía a leer
  // y se asignaba otra vez: eso obliga al navegador a analizar la página dos veces,
  // y con 200 prácticas se nota.
  const caja = `<div class="card">
    ${boxHead(`${t('lib_box_practices')} (${visibles.length})`, showLibBox, 'showLibBox', 'renderLibList()', 'expandLibGroup()', todos, !!visibles.length)}
    ${showLibBox?(visibles.map(p=>libItem(p)).join('') || `<p class="muted center">${t('lib_no_results')}</p>`):''}
  </div>`;
  el.innerHTML = renderPropiasBox() + caja + renderFavBox();
  renderPausedBox();
}
// Resuelve un conjunto de expandidos por su nombre (los onclick usan el nombre; aquí el objeto)
function getSet(n){
  return {expandedLib,expandedPropias,expandedFav,expandedPaused,expandedHechas}[n];
}
/* Ítem de acordeón UNIVERSAL de la biblioteca. Un solo renderer para las 5 cajas.
   o = { suf: sufijo del catpill (' · tuya', ' · en pausa'…), tag: mostrar etiqueta de
   categoría en el cuerpo (true), after: callback tras «Hecha ahora» ('renderLib()'),
   extra: html adicional al final del cuerpo ('') } */
function ditem(p, setName, rerender, o={}){
  const open=getSet(setName).has(p.id);
  const tag=o.tag!==false, after=(o.after!==undefined)?o.after:'renderLib()';
  return `<div class="ditem ${open?'open':''}">
    <div class="dhead" id="dh_${p.id}" role="button" tabindex="0" onclick="toggleFicha(${setName},'${p.id}',()=>{${rerender}},'${setName}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleFicha(${setName},'${p.id}',()=>{${rerender}},'${setName}')}">
      <div class="grow"><h4>${esc(p.title)}</h4><span class="catpill">${esc(catLabel(p.cat))}${o.suf||''}</span></div>
      ${iconCol(p.id,rerender,'renderLib()')}
    </div>
    ${open?`<div class="dbody">
      ${tag?`<span class="cat-tag ${catClass(p.cat)}">${esc(catLabel(p.cat))}</span>
      `:''}<div class="ptext">${esc(p.text)}</div>
      ${enlaceSeguro(p.link)?`<a class="plink" href="${esc(enlaceSeguro(p.link))}" target="_blank" rel="noopener noreferrer">${t('open_ex')}</a>`:''}
      ${adjuntoHTML(p)}
      ${favPauseRow(p.id,rerender,'renderLib()')}
      ${hechaAhoraBtn(p.id,after,true)}
      <button class="btn small ghost block" onclick="crearMomentoDe('${p.id}')">${t('mk_moment_btn')}</button>
      ${o.extra||''}
    </div>`:''}
  </div>`;
}
function libItem(p){ return ditem(p,'expandedLib','renderLibList()'); }
function propiaItem(p){
  return ditem(p,'expandedPropias','renderLibList()',{suf:t('lib_suf_own'),
    extra:`<button class="btn small terra block" onclick="delUser('${p.id}')">${t('lib_del_own')}</button>`});
}
function expandLibGroup(){
  expandedLib=toggleAllIn(libVisibles().filter(p=>!p.id.startsWith('u')), expandedLib);
  renderLibList();
}
function renderFavBox(){
  const list=favs.map(byId).filter(Boolean).filter(matchFiltro);
  if(!list.length) return '';
  const todos=list.every(p=>expandedFav.has(p.id));
  return `<div class="card">
    ${boxHead(`${t('lib_box_fav')} (${list.length})`, showFavBox, 'showFavBox', 'renderLibList()', 'expandFavGroup()', todos)}
    ${showFavBox?list.map(p=>favItem(p)).join(''):''}
  </div>`;
}
function favItem(p){ return ditem(p,'expandedFav','renderLibList()'); }
function expandFavGroup(){
  expandedFav=toggleAllIn(favs.map(byId).filter(Boolean).filter(matchFiltro), expandedFav);
  renderLibList();
}
function renderPausedBox(){
  const el=document.getElementById('pausedbox'); if(!el) return;
  const list=ALL().filter(p=>paused.includes(p.id)).filter(matchFiltro);
  let html='';
  if(list.length){
    const todos=list.every(p=>expandedPaused.has(p.id));
    html+=`<div class="card anteriores">
      ${boxHead(`${t('box_paused')} (${list.length})`, showPausedBox, 'showPausedBox', 'renderPausedBox()', 'expandPausedGroup()', todos)}
      ${showPausedBox?list.map(p=>pausedItem(p)).join(''):''}
    </div>`;
  }
  html=html+renderHechasBox();
  // los canales cierran la pestaña, igual que en Agenda y en El Noveno Camino
  html+=`<div class="card"><h2 style="margin:0 0 12px">${t('nc_social')}</h2>${ncSocialBlock()}</div>`;
  el.innerHTML=html;
}

function hechasStats(){
  // recuento por práctica a partir de mpt_stats.days (guardamos ids al marcar hecha)
  const done=LS.get('mpt_donelog', {}); // { pid: veces }
  const total=Object.values(done).reduce((a,b)=>a+b,0);
  const cats=new Set();
  Object.keys(done).forEach(pid=>{ const p=byId(pid); if(p) cats.add(p.cat); });
  // racha de días: días consecutivos con al menos una hecha (de mpt_stats.days)
  const st=LS.get('mpt_stats',{days:{}});
  const dias=Object.keys(st.days||{}).filter(d=>st.days[d].h>0).sort();
  let racha=0, mejor=0, prev=null;
  dias.forEach(d=>{
    if(prev){ const diff=Math.round((new Date(d)-new Date(prev))/(864e5)); racha=diff===1?racha+1:1; }
    else racha=1;
    if(racha>mejor) mejor=racha;
    prev=d;
  });
  // racha actual: solo vale si el último día es hoy o ayer
  if(dias.length){ const ult=dias[dias.length-1]; const dh=Math.round((new Date(todayStr())-new Date(ult))/(864e5)); if(dh>1) racha=0; }
  else racha=0;
  return {total, cats:cats.size, racha, mejor, done};
}
function nivelSemilla(total){
  const niveles=[[0,'🌰',t('lvl_seed')],[5,'🌱',t('lvl_sprout')],[15,'🌿',t('lvl_plant')],[30,'🪴',t('lvl_rooted')],[60,'🌷',t('lvl_bloom')],[120,'🌳',t('lvl_tree')]];
  let cur=niveles[0];
  for(const n of niveles){ if(total>=n[0]) cur=n; }
  const idx=niveles.indexOf(cur);
  const sig=niveles[idx+1];
  return {emoji:cur[1], nombre:cur[2], sig:sig?sig[0]:null, sigNombre:sig?sig[2]:null};
}
function renderPropiasBox(){
  const propias=userLib.filter(p=>!paused.includes(p.id)).filter(matchFiltro);
  if(!propias.length) return '';
  const todos=propias.every(p=>expandedPropias.has(p.id));
  return `<div class="card" style="border-color:var(--verde)">
    ${boxHead(`${t('lib_box_own')} (${propias.length})`, showPropias, 'showPropias', 'renderLibList()', 'expandPropiasGroup()', todos)}
    ${showPropias?propias.map(p=>propiaItem(p)).join(''):''}
  </div>`;
}
function expandPropiasGroup(){
  expandedPropias=toggleAllIn(userLib.filter(p=>!paused.includes(p.id)).filter(matchFiltro), expandedPropias);
  renderLibList();
}
function renderHechasBox(){
  // En la web no hay avisos propios, así que nadie entra cada día a marcar nada:
  // una racha permanentemente rota desanima más de lo que motiva. Fuera.
  if(!IS_NATIVE) return '';
  const g=hechasStats();
  if(g.total===0) return '';
  const niv=nivelSemilla(g.total);
  const hechas=Object.entries(g.done).map(([pid,n])=>({p:byId(pid),n})).filter(x=>x.p && matchFiltro(x.p)).sort((a,b)=>b.n-a.n);
  const todos=hechas.every(x=>expandedHechas.has(x.p.id));
  const medallas=[];
  if(g.cats>=totalCats()) medallas.push(t('medal_explorer').replace('{n}',totalCats()));
  else medallas.push(t('medal_cats_a')+g.cats+t('medal_cats_b').replace('{n}',totalCats()));
  if(g.racha>=7) medallas.push(t('medal_streak_fire')+g.racha+(g.racha===1?t('medal_streak_day'):t('medal_streak_days')));
  else if(g.racha>=3) medallas.push(t('medal_streak_star')+g.racha+(g.racha===1?t('medal_streak_day'):t('medal_streak_days')));
  return `<div class="card anteriores" style="background:linear-gradient(180deg,#F3EDE0,#EFE7D2)">
    ${boxHead(`${t('lib_box_done')} (${g.total})`, showHechas, 'showHechas', 'renderPausedBox()', 'expandHechasGroup()', todos)}
    ${showHechas?`
      <div style="text-align:center;padding:6px 0 12px">
        <div style="font-size:2.6rem;line-height:1">${niv.emoji} <button type="button" class="tbtn suave" onclick="infoHechas()">i</button></div>
        <div style="font-weight:700;color:var(--verde2)">${niv.nombre}</div>
        <div class="muted" style="font-size:.82rem">${niv.sig?`${niv.sig-g.total} ${t('lvl_to_next_a')}${niv.sigNombre}${t('lvl_to_next_b')}`:t('lvl_max')}</div>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
          ${medallas.map(m=>`<span class="catpill" style="background:#E8DCC0">${m}</span>`).join('')}
        </div>
        <div class="muted" style="font-size:.8rem;margin-top:8px">${t('streak_now')} <b>${g.racha}</b> ${g.racha===1?t('day_s'):t('days_s')} · ${t('streak_best')} <b>${g.mejor}</b> ${g.mejor===1?t('day_s'):t('days_s')}</div>
      </div>
      ${hechas.map(x=>ditem(x.p,'expandedHechas','renderPausedBox()',{suf:` · ${t('lib_done_n')} ${x.n} ${x.n===1?t('lib_done_1v'):t('lib_done_nv')}`, tag:false, after:''})).join('')}
    `:''}
  </div>`;
}

function infoHechas(){
  document.getElementById('modalContent').innerHTML=`
    <h3>${t('ih_title')}</h3>
    <p class="muted" style="line-height:1.6">${t('ih_intro')}</p>
    <p class="muted" style="line-height:1.6">${t('ih_level')}</p>
    <p class="muted" style="line-height:1.6">${t('ih_streak')}</p>
    <p class="muted" style="line-height:1.6">${t('ih_medals')}</p>
    <button class="btn primary block" onclick="closeModal()">${t('gd_ok')}</button>`;
  openModal();
}
function hacerAhora(pid){
  statDoneExtra(pid);
  toast(t('extra_done'));
  renderPausedBox();
}
function expandHechasGroup(){
  expandedHechas=toggleAllIn(Object.keys(hechasStats().done).filter(id=>byId(id) && matchFiltro(byId(id))).map(id=>({id})), expandedHechas);
  renderPausedBox();
}
function pausedItem(p){ return ditem(p,'expandedPaused','renderPausedBox()',{suf:t('lib_paused_suf'), tag:false}); }
function expandPausedGroup(){
  expandedPaused=toggleAllIn(ALL().filter(p=>paused.includes(p.id)).filter(matchFiltro), expandedPaused);
  renderPausedBox();
}
function catSelectHTML(selId, inpId, selCat){
  // Selector de categoría compartido (Crear práctica y Crear momento): categorías
  // de la biblioteca + «Otra», que despliega un campo para escribir una nueva.
  const cats=[...new Set(ALL().map(p=>p.cat))].sort((a,b)=>a.localeCompare(b));
  return `<select id="${selId}" onchange="document.getElementById('${inpId}').style.display=this.value==='__otra__'?'block':'none'">
    ${cats.map(c=>`<option value="${esc(c)}" ${selCat===c?'selected':''}>${esc(catLabel(c))}</option>`).join('')}
    <option value="__otra__">${t('na_cat_other')}</option>
  </select>
  <input type="text" id="${inpId}" placeholder="${t('cat_new_ph')}" style="display:none;margin-top:8px">`;
}
function catSelectValue(selId, inpId){
  const v=document.getElementById(selId).value;
  if(v!=='__otra__') return v;
  return (document.getElementById(inpId).value||'').trim() || t('na_cat_other');
}
/* ---- Crear una constelación con ayuda de una IA ----
   La persona copia unas instrucciones (el «prompt»), las pega en la IA que use y
   esta le hace unas preguntas y le propone una constelación de Moment o una nueva.
   Si es nueva, la añade aquí a su Biblioteca, en Constelaciones: a partir de ahí
   puede llegarle con el patrón, al azar o como momento propio, como cualquier otra.
   No está atada a ninguna función: por eso vive en la Biblioteca. */
function promptConstelacion(){
  const lista=ALL().filter(p=>esCatConst(p.cat)).map((p,i)=>(i+1)+'. '+p.title).join('\n');
  return t('cp_prompt').replace('{lista}', lista);
}
function abrirConstelacionIA(){
  document.getElementById('modalContent').innerHTML=`
    <h2>${t('cp_title')}</h2>
    <p class="muted" style="line-height:1.55">${t('cp_txt')}</p>
    <button class="btn primary block" onclick="copyText(promptConstelacion()).then(ok=>toast(ok?t('tr_prompt_ok'):t('sr_copy_fail')))">${t('cp_copy')}</button>
    <button class="btn gold block" onclick="openAddForm('constelaciones')">${t('cp_add')}</button>
    <button class="btn ghost block" onclick="closeModal()">${t('gd_ok')}</button>`;
  openModal();
}

function openAddForm(selCat){
  document.getElementById('modalContent').innerHTML=`
    <h2>${t('na_title')}</h2>
    <p class="muted">${t('na_intro')}</p>
    <label class="fld">${t('na_title_l')}</label><input type="text" id="np_t" placeholder="${t('na_title_ph')}">
    <label class="fld">${t('na_cat')}</label>
    ${catSelectHTML('np_c','np_c_new', selCat)}
    <label class="fld">${t('na_text')}</label>
    <textarea id="np_x" placeholder="${t('na_text_ph')}"></textarea>
    <label class="fld">${t('na_link')}</label><input type="url" id="np_l" placeholder="https://…">
    <div class="row" style="margin-top:16px">
      <button class="btn primary" style="flex:1" onclick="saveUserPractice()">${t('na_save')}</button>
      <button class="btn ghost" style="flex:1" onclick="closeModal()">${t('na_cancel')}</button>
    </div>
    <p class="muted" style="margin-top:6px">${t('na_email_note').replace('{e}',METRICS_EMAIL)}</p>
    <input type="file" id="np_file" accept=".docx,.json,.txt,.js" style="display:none" onchange="importPracticesFile(this.files[0])">
    <button class="btn ghost block" style="margin-top:16px" onclick="document.getElementById('np_file').click()">${t('na_upload')}</button>
    <p class="center cbtn" style="margin-top:8px"><button type="button" class="tbtn" onclick="descargarPlantilla()">${t('na_download_tpl')}</button></p>
    <p class="muted" style="margin-top:6px">${t('na_formats')}</p>`;
  openModal(true);
}

/* ¿El prefijo leído corresponde a este campo, en cualquier idioma? */
/* ¿Es una práctica creada por la persona? Los ids propios empiezan por «u». */
function esUserPractice(id){ return typeof id==='string' && id.startsWith('u'); }

function saveUserPractice(enviar){
  const titulo=document.getElementById('np_t').value.trim();
  const x=document.getElementById('np_x').value.trim();
  const l=document.getElementById('np_l').value.trim();
  const c=catSelectValue('np_c','np_c_new');
  if(!titulo || (!x && !l)){ toast(t('ts_add_titletext')); return; }
  if(l && !enlaceSeguro(l)){ toast(t('ev_bad_link')); return; }
  const p={id:'u'+Date.now(), cat:texto(c,80), title:texto(titulo,300), text:texto(x||t('default_link_text'),20000)};
  if(l) p.link=enlaceSeguro(l);
  userLib.push(p); LS.set('mpt_userlib', userLib); libCacheDirty();
  closeModal(); renderLib(); toast(t('ts_added_sent'));
  const body=t('sh_prop_intro')+'\n\n'
    +t('fmt_title')+titulo+'\n'+t('fmt_cat')+c+'\n\n'+t('fmt_text')+'\n'+(x||'—')+'\n\n'+t('fmt_link')+(l||'—');
  location.href='mailto:'+METRICS_EMAIL+'?subject='+encodeURIComponent(t('sh_prop_subject')+titulo)+'&body='+encodeURIComponent(body);
}
function delUser(id){
  const borrada=userLib.find(p=>p.id===id);
  if(borrada && borrada.adj && borrada.adj.id) adjBorrar(borrada.adj.id).catch(()=>{});
  userLib=userLib.filter(p=>p.id!==id); LS.set('mpt_userlib', userLib); libCacheDirty();
  favs=favs.filter(f=>f!==id); LS.set('mpt_favs', favs);
  renderLibList(); toast(t('ts_practice_del'));
}

function toggleAllLib(){
  const todo = !showLibBox && !showFavBox && !showPropias && !showPausedBox && !showHechas;
  showLibBox=todo; showFavBox=todo; showPropias=todo; showPausedBox=todo; showHechas=todo;
  renderLib();
}
