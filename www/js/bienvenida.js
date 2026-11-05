/* Moment · Bienvenida y aceptación
   El asistente del primer arranque y la aceptación de responsabilidad.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

let ob = { startH:7, startM:0, freq:3, span:12, modo:'patron' };

/* ---- Recorrido de la bienvenida ----
   Idioma → aceptación → copia de seguridad → MODO → pasos del modo → avisos.
   Cada modo tiene sus pasos; la pantalla de los avisos va siempre la última.
   Aquí se elige un solo modo; en Ajustes se pueden combinar los tres. */
const FLUJO_OB = {
  patron: ['modo', 0, 1, 2, 3],
  azar:   ['modo', 'az1', 'az2', 'az3', 3],
  propio: ['modo', 'pr', 3],
};
function obFlujo(){ return FLUJO_OB[ob.modo] || FLUJO_OB.patron; }
function obAnterior(paso){ const f=obFlujo(), k=f.indexOf(paso); return k>0 ? f[k-1] : 'import'; }
function obSiguiente(paso){ const f=obFlujo(), k=f.indexOf(paso); return f[Math.min(k+1, f.length-1)]; }
function obPuntos(paso){ const f=obFlujo(), k=f.indexOf(paso); return f.map((p,i)=>`<span class="${i<=k?'on':''}"></span>`).join(''); }

// Contenido completo del aviso. Solo con la aceptación activa puede usarse la app;
// el interruptor vive en Ajustes y, desactivado, todo queda bloqueado salvo él mismo.
/* Los textos (ACEPT, NC_TEXTO, NOVENO_QS, PLANTILLA_LINEAS) están en contenido.js */
function ACEPT(){ return getLang()==='en' ? ACEPT_EN : ACEPT_ES; }
function aceptado(){ return !!LS.get('mpt_accept', null); }
function _aceptHTML(x){
  return `
    <h2 style="margin:0 0 12px">${x.titulo}</h2>
    <h3 style="margin:0 0 6px">${x.s1t}</h3><p style="margin:0 0 14px;line-height:1.55">${x.s1}</p>
    <h3 style="margin:0 0 6px">${x.s2t}</h3><p style="margin:0 0 14px;line-height:1.55">${x.s2}</p>
    <h3 style="margin:0 0 6px">${x.s3t}</h3><p style="margin:0 0 6px;line-height:1.55">${x.s3}</p>
    <ul style="margin:0 0 14px;padding-left:20px;line-height:1.5">${x.s3l.map(i=>`<li style="margin:0 0 4px">${i}</li>`).join('')}</ul>
    <h3 style="margin:0 0 6px">${x.s4t}</h3>
    <ul style="margin:0 0 14px;padding-left:20px;line-height:1.5">${x.s4l.map(i=>`<li style="margin:0 0 4px">${i}</li>`).join('')}</ul>
    <h3 style="margin:0 0 6px">${x.s5t}</h3><p style="margin:0 0 14px;line-height:1.55">${x.s5}</p>
    <h3 style="margin:0 0 6px">${x.s6t}</h3><p style="margin:0 0 14px;line-height:1.55">${x.s6}</p>`;
}
// modo 'ob': dentro de la bienvenida (al aceptar sigue el asistente).
// modo 'bloqueo': la app entera está bloqueada (al aceptar se recarga).
function renderAceptacion(modo){
  document.getElementById('nav').classList.add('hidden');
  const x=ACEPT();
  document.getElementById('main').innerHTML=`<div class="ob-step"><div class="card">
    ${modo==='ob'?`<button class="btn ghost small" style="margin:0 0 8px" onclick="renderOnboarding('lang')">${t('ob_back')}</button>`:''}
    ${modo==='bloqueo'?`<div class="infobox" style="margin-bottom:14px"><b>${x.bloqueoT}</b><br>${x.bloqueo}</div>`:''}
    ${_aceptHTML(x)}
    <label class="chkrow" style="margin:6px 0 8px;font-weight:600">
      <input type="checkbox" id="acepto_chk" onchange="document.getElementById('acepto_btn').disabled=!this.checked">
      <span>${x.chk}</span>
    </label>
    <p style="margin:0 0 14px;line-height:1.55">${x.nota}</p>
    <button id="acepto_btn" class="btn primary block" disabled onclick="confirmarAceptacion('${modo}')">${x.btn}</button>
  </div></div>`;
  window.scrollTo(0,0);
}
function confirmarAceptacion(modo){
  if(!document.getElementById('acepto_chk').checked) return;
  LS.set('mpt_accept', {v:1, ts:Date.now()});
  if(modo==='bloqueo'){ location.reload(); return; }
  renderOnboarding('import');
}
function desactivarAceptacion(){
  LS.remove('mpt_accept');
  location.reload();
}
// Pantalla de idioma: cada opción en su propio idioma, porque aún no se ha elegido
function obIdioma(M){
  M.innerHTML = `<div class="ob-step">
    <div class="card center">
      <div style="border:2px solid ${getLang()==='es'?'var(--dorado)':'transparent'};border-radius:14px;padding:14px 12px;margin:0 0 14px">
        <h2 style="margin:0 0 4px">${I18N.es.ob_lang_title}</h2>
        <p class="muted" style="margin:0 0 12px">${I18N.es.ob_lang_sub}</p>
        <button class="optbtn ${getLang()==='es'?'sel':''}" style="width:100%" onclick="setLang('es');ob._langDone=true;renderOnboarding('modo')">🇪🇸 Continuar en español</button>
      </div>
      <div style="border:2px solid ${getLang()==='en'?'var(--dorado)':'transparent'};border-radius:14px;padding:14px 12px">
        <h2 style="margin:0 0 4px">${I18N.en.ob_lang_title}</h2>
        <p class="muted" style="margin:0 0 12px">${I18N.en.ob_lang_sub}</p>
        <button class="optbtn ${getLang()==='en'?'sel':''}" style="width:100%" onclick="setLang('en');ob._langDone=true;renderOnboarding('modo')">🇬🇧 Continue in English</button>
      </div>
    </div>
  </div>`;
}
function obRelojFase(f){ ob._fase=(f==='m'?'m':'h'); renderOnboarding(0); }
function obRelojTap(v){
  if(ob._fase==='m'){ ob.startM=v; ob._fase='h'; }
  else{ ob.startH=v; ob._fase='m'; }
  renderOnboarding(0);
}
function renderOnboarding(step){
  document.getElementById('nav').classList.add('hidden');
  const M = document.getElementById('main');
  // 1. el idioma, antes que nada
  if(step==='lang' || (!LS.get('mpt_lang',null) && !ob._langDone)){ obIdioma(M); return; }
  // 2. sin la aceptación no se configura nada
  if(step!=='import' && !aceptado()){ renderAceptacion('ob'); return; }
  // 3. tras aceptar: ofrecer cargar una copia antes de configurar nada
  if(step==='import'){
    document.getElementById('main').innerHTML=`<div class="ob-step">
      <div class="card center">
        <button class="btn ghost small" style="align-self:flex-start;margin:0 0 8px" onclick="renderAceptacion('ob')">${t('ob_back')}</button>
        <h2>${t('ob_imp_title')}</h2>
        <p class="muted" style="line-height:1.55">${t('ob_imp_sub')}</p>
        <input type="file" id="ob_file" accept=".json,application/json" style="display:none" onchange="importarArchivo(this.files[0]);this.value=''">
        <button class="btn primary block" style="margin-top:16px" onclick="document.getElementById('ob_file').click()">${t('ob_imp_yes')}</button>
        <button class="btn ghost block" onclick="renderOnboarding('modo')">${t('ob_imp_no')}</button>
      </div>
    </div>`;
    window.scrollTo(0,0);
    return;
  }
  if(step===undefined || step===null) step='modo';
  ob._paso=step;
  const dots = obPuntos(step);
  const atras = `<button class="btn ghost small" style="align-self:flex-start;margin:0 0 8px" onclick="renderOnboarding(${jsAttr(obAnterior(step))})">${t('ob_back')}</button>`;
  const seguir = (extra) => `<button class="btn primary block" ${extra||''} onclick="renderOnboarding(${jsAttr(obSiguiente(step))})">${t('ob_continue')}</button>`;
  if(step==='modo'){
    const OPC = [
      {m:'patron', i:'🕐', tit:t('ob_mode_patron'), txt:t('ob_mode_patron_txt')},
      {m:'azar',   i:'🎲', tit:t('ob_mode_azar'),   txt:t('ob_mode_azar_txt')},
      {m:'propio', i:'✍️', tit:t('ob_mode_propio'), txt:t('ob_mode_propio_txt')},
    ];
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card">
        ${atras}
        <h2>${t('ob_mode_title')}</h2>
        <p class="muted">${t('ob_mode_sub')}</p>
        ${OPC.map(o=>`<button type="button" class="modo ${ob.modo===o.m?'sel':''}" aria-pressed="${ob.modo===o.m}" onclick="ob.modo='${o.m}';renderOnboarding('modo')">
          <b>${o.i} ${o.tit}</b><span>${o.txt}</span></button>`).join('')}
        ${seguir()}
      </div>
    </div>`;
  } else if(step==='az1'){
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card">
        ${atras}
        <h2>${t('ob_az_win_title')}</h2>
        <p class="muted">${t('ob_az_win_sub')}</p>
        ${azFranjaHTML('ob')}
        <div style="margin-top:16px">${seguir()}</div>
      </div>
    </div>`;
  } else if(step==='az2'){
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card">
        ${atras}
        <h2>${t('ob_az_n_title')}</h2>
        <p class="muted">${t('ob_az_n_sub')}</p>
        ${azCuantasHTML('ob')}
        ${azResumenHTML('ob')}
        <div style="margin-top:16px">${seguir()}</div>
      </div>
    </div>`;
  } else if(step==='az3'){
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card">
        ${atras}
        <h2>${t('ob_az_cat_title')}</h2>
        <p class="muted">${t('az_cat_txt')}</p>
        ${azCatsHTML('ob')}
        <div style="margin-top:16px">${seguir(azarSinCategorias(azObj('ob'))?'disabled':'')}</div>
      </div>
    </div>`;
  } else if(step==='pr'){
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card">
        ${atras}
        <h2>${t('ob_pr_title')}</h2>
        <p class="muted">${t('ob_pr_txt')}</p>
        <div class="infobox" style="margin-bottom:16px">${t('ob_pr_next')}</div>
        ${seguir()}
      </div>
    </div>`;
  } else if(step===0){
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card center">
        ${atras}
        <h2>${t('ob_hour_title')}</h2>
        <p class="muted">${t('ob_hour_sub')}</p>
        <div style="font-size:1.9rem;font-weight:700;margin:4px 0 2px">
          <button type="button" class="hpart ${ob._fase!=='m'?'act':''}" onclick="obRelojFase('h')">${pad(ob.startH)}</button>:<button type="button" class="hpart ${ob._fase==='m'?'act':''}" onclick="obRelojFase('m')">${pad(ob.startM)}</button>
        </div>
        <p class="muted" style="margin:0 0 8px">${ob._fase==='m'?t('clk_pick_m'):t('clk_pick_h')}</p>
        <div style="display:flex;justify-content:center">${caraReloj(ob._fase==='m'?'m':'h', ob._fase==='m'?ob.startM:ob.startH, 250, 'obRelojTap')}</div>
        <button class="btn primary block" style="margin-top:12px" onclick="renderOnboarding(1)">${t('ob_continue')}</button>
      </div>
    </div>`;
  } else if(step===1){
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card center">
        ${atras}
        <h2>${t('ob_freq_title')}</h2>
        <div class="optgrid">
          ${[1,2,3].map(h=>`<button class="optbtn ${ob.freq===h?'sel':''}" onclick="ob.freq=${h};ajustarSpanDe(ob);renderOnboarding(1)">${t('ob_freq_each')} ${h} ${t('ob_freq_h')}</button>`).join('')}
        </div>
        <button class="btn primary block" onclick="renderOnboarding(2)">${t('ob_continue')}</button>
      </div>
    </div>`;
  } else if(step===2){
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card center">
        ${atras}
        <h2>${t('ob_span_title')}</h2>
        <p class="muted">${t('ob_span_sub')} (${pad(ob.startH)}:${pad(ob.startM)}).</p>
        <div class="optgrid g7">
          ${spanOpciones(ob.freq).map(h=>`<button class="optbtn ${ob.span===h?'sel':''}" onclick="ob.span=${h};renderOnboarding(2)">${h} h</button>`).join('')}
        </div>
        ${resumenPatronHTML(ob, 'ob_sum')}
        <button class="btn primary block" onclick="renderOnboarding(3)">${t('ob_continue')}</button>
      </div>
    </div>`;
  } else {
    M.innerHTML = `<div class="ob-step">
      <div class="progress">${dots}</div>
      <div class="card">
        ${atras}
        ${IS_NATIVE?`
        <h2>${t('ob_rem_title')}</h2>
        <div class="infobox">${t('ob_rem_box')}</div>
        <p class="muted" style="margin-top:14px">${t('ob_rem_notif')}</p>
        <button class="btn ${notifActive()?'gold':'ghost'} block" onclick="toggleNotif(()=>renderOnboarding(3))">${notifActive()?t('ob_notif_on'):t('ob_notif_ask')}</button>`:`
        <h2>${t('set_cal')}</h2>
        <p class="muted">${t('cal_intro').replace('{n}', ICS_LUNAS*ICS_DIAS_LUNA)}</p>
        <p class="muted">${ob.modo==='propio'?t('ob_cal_propio'):t('ob_cal_later')}</p>`}
        <div class="infobox" style="margin-top:16px">💡 <b>${t('ob_hint_title')}:</b> ${t('ob_hint_custom')}</div>
        ${IS_NATIVE || ob.modo==='propio'?`<button class="btn primary block" onclick="finishOnboarding()">${t('ob_start')}</button>`:`
        <button class="btn primary block" onclick="finishOnboarding();descargarICS()">${t('ob_cal_start')}</button>
        <button class="btn ghost block" onclick="finishOnboarding()">${t('ob_start')}</button>`}
      </div>
    </div>`;
  }
}

function finishOnboarding(){
  const modo=FLUJO_OB[ob.modo] ? ob.modo : 'patron';
  const azar=Object.assign(azarPorDefecto(), ob.azar||{}, {on: modo==='azar'});
  azarAjustar(azar);
  // Se guardan también los valores del patrón aunque no se use: si se activa
  // después desde Ajustes, parte de algo razonable. Las migraciones completan los
  // ajustes que faltan (así la configuración nueva tiene la misma forma que una
  // migrada) y la versión evita que se repitan en el próximo arranque.
  cfg={startH:ob.startH, startM:ob.startM, freq:ob.freq, span:ob.span, favPerDay:1, visDia:false, catsPref:{},
       patron: modo==='patron', azar};
  MIGRACIONES.forEach(m=>m.aplica(cfg));
  cfg.v=CFG_VERSION;
  LS.set('mpt_cfg', cfg);
  LS.set('mpt_plans', {});
  dayState=null; LS.set('mpt_day', null);
  document.getElementById('nav').classList.remove('hidden');
  ensureDayPlan(); scheduleNext(); gotoTab('home');
  // Personalizado: el día se forma con los momentos propios, así que se empieza
  // por crear el primero. Se abre desde Ajustes, que es donde se ven al guardar.
  if(modo==='propio'){ gotoTab('set'); openEventForm(); }
}
