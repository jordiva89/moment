/* Moment · Reloj
   El reloj táctil para elegir horas y los botones de hora.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

function clockSVG(h,m,size){
  size = size || 230; const c=size/2, r=c-8;
  let ticks='', nums='';
  for(let i=0;i<60;i++){
    const a=(i*6-90)*Math.PI/180, big=i%5===0;
    const r1=r-(big?14:7), x1=c+r1*Math.cos(a), y1=c+r1*Math.sin(a);
    const x2=c+r*Math.cos(a), y2=c+r*Math.sin(a);
    ticks+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#3A3127" stroke-width="${big?2.4:1}"/>`;
  }
  for(let n=1;n<=12;n++){
    const a=(n*30-90)*Math.PI/180, rr=r-30;
    nums+=`<text x="${(c+rr*Math.cos(a)).toFixed(1)}" y="${(c+rr*Math.sin(a)).toFixed(1)}" font-size="${size*0.082}" font-weight="600" fill="#2B241C" text-anchor="middle" dominant-baseline="central">${n}</text>`;
  }
  const ha=((h%12)+m/60)*30-90, ma=m*6-90;
  const hx=c+(r*0.48)*Math.cos(ha*Math.PI/180), hy=c+(r*0.48)*Math.sin(ha*Math.PI/180);
  const mx=c+(r*0.72)*Math.cos(ma*Math.PI/180), my=c+(r*0.72)*Math.sin(ma*Math.PI/180);
  return `<svg class="clockface" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${c}" cy="${c}" r="${r}" fill="#FFFDF7" stroke="#B08D3E" stroke-width="5"/>
    ${ticks}${nums}
    <line x1="${c}" y1="${c}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#2B241C" stroke-width="6" stroke-linecap="round"/>
    <line x1="${c}" y1="${c}" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#B08D3E" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${c}" cy="${c}" r="7" fill="#B08D3E" stroke="#2B241C" stroke-width="2"/>
  </svg>`;
}

// caraReloj('h'|'m', valorSel, tamaño, cbNombre): esfera con números pulsables.
// Horas: anillo exterior 1-12, anillo interior 13-00. Minutos: 00 a 55, de 5 en 5.
function caraReloj(fase, sel, size, cbNombre){
  size=size||250; const c=size/2, r=c-8;
  let el=`<circle cx="${c}" cy="${c}" r="${r}" fill="#FFFDF7" stroke="#B08D3E" stroke-width="5"/>`;
  const num=(x,y,txt,val,act,fs)=>`<g onclick="${cbNombre}(${val})" style="cursor:pointer">
    <circle cx="${x}" cy="${y}" r="${fs*1.15}" fill="${act?'#B08D3E':'transparent'}"/>
    <text x="${x}" y="${y}" font-size="${fs}" font-weight="600" fill="${act?'#FFFDF7':'#2B241C'}" text-anchor="middle" dominant-baseline="central">${txt}</text></g>`;
  if(fase==='h'){
    for(let n=1;n<=12;n++){
      const a=(n*30-90)*Math.PI/180;
      el+=num(c+(r-24)*Math.cos(a), c+(r-24)*Math.sin(a), n, n, sel===n, size*0.072);
    }
    for(let k=1;k<=12;k++){
      const v=(k+12)%24;  // 13..23 y 00
      const a=(k*30-90)*Math.PI/180;
      el+=num(c+(r-62)*Math.cos(a), c+(r-62)*Math.sin(a), pad(v), v, sel===v, size*0.058);
    }
  } else {
    for(let k=0;k<12;k++){
      const v=k*5, a=(k*30-90)*Math.PI/180;
      el+=num(c+(r-26)*Math.cos(a), c+(r-26)*Math.sin(a), pad(v), v, sel===v, size*0.068);
    }
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${el}</svg>`;
}
// Selector genérico en su propia capa (funciona también sobre un modal abierto)
let _rp={cb:null, h:9, m:0, fase:'h'};
// fase: 'h' abre eligiendo la hora; 'm', directamente los minutos.
function abrirReloj(mins, cb, fase){
  _rp={cb, h:Math.floor(mins/60)%24, m:(mins%60)-((mins%60)%5), fase:fase==='m'?'m':'h'};
  let ov=document.getElementById('relojov');
  if(!ov){ ov=document.createElement('div'); ov.id='relojov';
    ov.style.cssText='position:fixed;inset:0;background:rgba(43,36,28,.55);z-index:300;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.addEventListener('click', e=>{ if(e.target===ov) ov.remove(); });
    document.body.appendChild(ov);
  }
  _pintarReloj();
}
function _pintarReloj(){
  const ov=document.getElementById('relojov'); if(!ov) return;
  ov.innerHTML=`<div style="background:var(--crema);border-radius:18px;padding:18px;text-align:center;max-width:320px;width:100%">
    <div style="font-size:1.7rem;font-weight:700;margin-bottom:6px">
      <button type="button" class="hpart ${_rp.fase==='h'?'act':''}" onclick="_relojFase('h')">${pad(_rp.h)}</button>:<button type="button" class="hpart ${_rp.fase==='m'?'act':''}" onclick="_relojFase('m')">${pad(_rp.m)}</button>
    </div>
    <p class="muted" style="margin:0 0 8px">${_rp.fase==='h'?t('clk_pick_h'):t('clk_pick_m')}</p>
    ${_rp.fase==='m'?`<p class="cbtn" style="margin:0 0 6px"><button type="button" class="tbtn" onclick="_relojAtras()">${t('clk_back')}</button></p>`:''}
    ${caraReloj(_rp.fase, _rp.fase==='h'?_rp.h:_rp.m, 250, '_relojTap')}
  </div>`;
}
/* Volver a elegir la hora sin cerrar el reloj: antes, si te equivocabas al
   marcar la hora, había que cerrar y empezar de nuevo. */
function _relojAtras(){ _relojFase('h'); }
// Tocar la hora o los minutos de la hora mostrada cambia qué se está eligiendo.
function _relojFase(f){ if(_rp){ _rp.fase=(f==='m'?'m':'h'); _pintarReloj(); } }
// La hora como dos partes tocables por separado: horas y minutos.
function horaPartes(mins){
  return `<span class="hpart" data-f="h">${pad(Math.floor(mins/60)%24)}</span>:<span class="hpart" data-f="m">${pad(mins%60)}</span>`;
}
// Qué parte de la hora se ha tocado en un botón: los minutos o, si no, la hora.
function faseDe(e){
  try{ const x=e && e.target && e.target.closest && e.target.closest('[data-f]'); return x ? x.getAttribute('data-f') : 'h'; }
  catch(err){ return 'h'; }
}
function relojDeBoton(b, idInput, e){
  const i=document.getElementById(idInput); if(!i) return;
  const [h,m]=(i.value||'09:00').split(':').map(Number);
  abrirReloj(h*60+m, mm=>{ i.value=pad(Math.floor(mm/60))+':'+pad(mm%60); b.innerHTML='🕐 '+horaPartes(mm); }, faseDe(e));
}
function _relojTap(v){
  if(_rp.fase==='h'){ _rp.h=v; _rp.fase='m'; _pintarReloj(); }
  else{
    _rp.m=v;
    const ov=document.getElementById('relojov'); if(ov) ov.remove();
    if(_rp.cb) _rp.cb(_rp.h*60+_rp.m);
  }
}
// Botón estándar que muestra la hora y abre el reloj; escribe en un input oculto
function botonHora(idInput, mins, clase){
  const v=(typeof mins==='number')?pad(Math.floor(mins/60))+':'+pad(mins%60):'';
  return `<input type="hidden" id="${idInput}" ${clase?`class="${clase}"`:''} value="${v}">`+
    `<button type="button" class="btn ghost" style="width:100%;font-size:1.15rem;font-weight:700" `+
    `onclick="relojDeBoton(this,'${idInput}',event)">🕐 ${(typeof mins==='number')?horaPartes(mins):'--:--'}</button>`;
}
