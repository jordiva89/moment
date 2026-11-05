/* Moment · Tu patrón: configuración, migraciones y categorías
   Qué ha elegido la persona (hora, intervalo, duración, categorías) y cómo se actualiza la configuración guardada al cambiar de versión.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

function esCatConst(c){ return c==='constelaciones'||c==='Constellations'; }
// La práctica de visualización diaria vive ahora en Introspección: se localiza por
// su id fijo (VIS_ID, definido en practices.js), no por categoría.
function practicaVis(){ try{ return byId(VIS_ID) || null; }catch(e){ return null; } }

function totalCats(){ try{ return new Set(PRACTICES.map(p=>p.cat)).size; }catch(e){ return 19; } }

/* ---- Tres modos que se combinan ----
   El día se forma con tres fuentes, independientes entre sí:
     · el patrón (cfg.patron): a horas fijas, desde la primera y cada X horas;
     · al azar (cfg.azar.on): a horas distintas cada día, dentro de una franja;
     · los «Momentos para ti» propios, que se activan o pausan uno a uno.
   En la bienvenida se elige solo uno; en Ajustes se combinan como se quiera.
   Lo que antes era «solo mis momentos» es ahora patrón y azar apagados. */
function patronActivo(){ return !!cfg && cfg.patron!==false; }
// Valores de partida del modo al azar: de 09:00 a 21:00, de 3 a 5 prácticas al día,
// de todas las categorías (excl = las que NO se proponen).
function azarPorDefecto(){ return {on:false, ini:9*60, fin:21*60, min:3, max:5, excl:[]}; }

/* migración desde versión anterior (wakeH/wakeM) */
if(cfg && cfg.wakeH!==undefined){ cfg={startH:cfg.wakeH, startM:cfg.wakeM, freq:cfg.freq, span:cfg.span}; LS.set('mpt_cfg',cfg); dayState=null; }
/* ---- Migraciones de la configuración ----
   Cada ajuste nuevo se añade aquí, con su número. La configuración guarda en qué
   versión está (cfg.v) y solo se aplican las migraciones que le faltan, en orden.
   Antes esto eran comprobaciones sueltas que se ejecutaban siempre y crecían sin
   control; así queda claro qué se añadió, cuándo y en qué orden. */
const MIGRACIONES = [
  { v:1, aplica(c){ if(c.favPerDay===undefined) c.favPerDay=1; } },
  { v:2, aplica(c){ if(c.constIni===undefined){ c.constIni=false; c.constMed=false; c.constFin=false; } } },
  { v:3, aplica(c){ if(c.constNo===undefined) c.constNo=false; } },
  { v:4, aplica(c){ if(c.soloEventos===undefined) c.soloEventos=false; } },
  { v:5, aplica(c){ if(c.visDia===undefined) c.visDia=false; } },
  { v:6, aplica(c){ if(!c.catsPref) c.catsPref={}; } },
  // v7: las categorías preferidas se guardaban con el nombre en español
  // («Armonización»); ahora se guardan con el código («armonizacion»).
  { v:8, aplica(c){ if(!c.langBiblio) c.langBiblio='es'; } },
  { v:7, aplica(c){
      if(!c.catsPref) { c.catsPref={}; return; }
      const nuevo={};
      Object.keys(c.catsPref).forEach(k=>{
        if(!c.catsPref[k]) return;
        const cat = (typeof CATEGORIAS!=='undefined') && CATEGORIAS.find(x=>x.es===k || x.en===k || x.id===k);
        nuevo[cat ? cat.id : k] = true;   // las categorías propias se quedan igual
      });
      c.catsPref=nuevo;
  } },
  // v9: constelaciones «x por semana» (días y horas elegidos)
  { v:9, aplica(c){ if(!c.constSem) c.constSem={on:false, dias:[], horas:[]}; } },
  // v10: tres modos que se combinan. «Solo mis momentos» pasa a ser «patrón apagado»
  // y aparece el modo al azar, apagado.
  { v:10, aplica(c){
      if(c.patron===undefined) c.patron = !c.soloEventos;
      delete c.soloEventos;
      if(!c.azar) c.azar = azarPorDefecto();
  } },
];
// La versión es siempre la de la última migración: antes era un número fijo y,
// al añadir la v8 sin subirlo, esa migración se repetía en cada arranque.
const CFG_VERSION = Math.max(...MIGRACIONES.map(m=>m.v));
function migrarCfg(){
  if(!cfg) return;
  const desde = cfg.v || 0;
  let cambia = false;
  MIGRACIONES.forEach(m=>{ if(m.v>desde){ m.aplica(cfg); cambia=true; } });
  // instalaciones anteriores al control de versiones: se repasan todas por si acaso
  if(!cfg.v) MIGRACIONES.forEach(m=>m.aplica(cfg));
  if(cambia || cfg.v!==CFG_VERSION){ cfg.v=CFG_VERSION; LS.set('mpt_cfg', cfg); }
}
migrarCfg();

function slotTimes(){ return slotTimesDe(cfg); }
// Horas de las propuestas de un patrón cualquiera (el guardado o el que se está
// configurando en la bienvenida).
// Los tiempos pueden superar las 24 h (25:30 = 01:30 de la madrugada): así los
// momentos de después de medianoche ordenan y clasifican correctamente.
// Nunca se llega a las 24 h justas desde la primera: esa propuesta sería la
// primera del día siguiente, y sonarían dos a la vez.
function slotTimesDe(c){
  if(!c) return [];
  const t0=(c.startH||0)*60+(c.startM||0), out=[];
  const f=Math.max(1, c.freq||1)*60, fin=t0+Math.max(0, c.span||0)*60;
  for(let t=t0; t<=fin && t<t0+1440; t+=f) out.push(t);
  return out;
}
// Resumen del patrón: cuántas propuestas salen al día y a qué hora cae la última.
function resumenPatron(c){
  const ts=slotTimesDe(c); if(!ts.length) return '';
  const ult=ts[ts.length-1], sig=ult>=1440 ? ' '+t('pt_sum_next') : '';
  return ts.length===1
    ? t('pt_sum_one').replace('{h}', fmtT(ult))
    : t('pt_sum_many').replace('{n}', ts.length).replace('{h}', fmtT(ult)+sig);
}
function resumenPatronHTML(c, id){
  return `<p class="muted" ${id?`id="${id}"`:''} style="margin:8px 0 0;text-align:center"><b>${resumenPatron(c)}</b></p>`;
}

// Pares de categorías (nombre canónico ES ↔ etiqueta EN), en orden de aparición
// Duraciones ofrecidas en "Horas de propuestas al día": múltiplos del intervalo
// elegido en "Propuesta cada", para que la última propuesta caiga siempre en hora.
// Siempre desde 0 h (una sola propuesta al día) hasta 24 h, en saltos del
// intervalo elegido: así la última propuesta cae siempre en punto.
function spanOpciones(freq){
  const f=Math.max(1, freq || (cfg && cfg.freq) || 1), out=[0];
  for(let h=f; h<=24; h+=f) out.push(h);
  return out;
}
// Ajusta el periodo activo al intervalo (se llama al cambiar "Propuesta cada")
function ajustarSpan(){ ajustarSpanDe(cfg); }
// Si al cambiar el intervalo la duración elegida deja de existir, se toma la
// opción válida más cercana. Vale para Ajustes y para la bienvenida.
function ajustarSpanDe(c){
  if(!c) return;
  const ops=spanOpciones(c.freq); if(!ops.length) return;
  if(!ops.includes(c.span)){
    c.span=ops.reduce((a,b)=>Math.abs(b-c.span)<Math.abs(a-c.span)?b:a, ops[0]);
  }
}
// Etiqueta visible de una categoría. La práctica guarda un CÓDIGO
// ('armonizacion'); aquí se traduce al idioma activo. Las categorías que crea la
// persona usuaria no están en CATEGORIAS: se muestran tal cual las escribió.
function catLabel(cod){
  const c = (typeof CATEGORIAS!=='undefined') && CATEGORIAS.find(x=>x.id===cod);
  if(!c) return cod || '';
  return getLang()==='en' ? c.en : c.es;
}
// Lista de categorías para los ajustes: las oficiales y luego las propias.
function catPairs(){
  const out = (typeof CATEGORIAS!=='undefined' ? CATEGORIAS : []).map(c=>({id:c.id, es:c.es, en:c.en}));
  const oficiales = new Set(out.map(o=>o.id));
  userLib.forEach(p=>{
    if(!p.cat || oficiales.has(p.cat)) return;
    oficiales.add(p.cat);
    out.push({id:p.cat, es:p.cat, en:p.cat, propia:true});
  });
  return out;
}
// Marca o desmarca una categoría preferida. Crea catsPref si faltara (instalaciones
// que se configuraron antes de que existiera este ajuste).
function setCatPref(cat, on){
  if(!cfg) return;
  if(!cfg.catsPref) cfg.catsPref={};
  if(on) cfg.catsPref[cat]=true; else delete cfg.catsPref[cat];
  applyCfg();
}
// Prácticas "especiales": pensadas para una hora fija del día. La lista vive en
// practices.js (ESPECIALES) para que siga siendo válida si cambia la numeración.
function especialesLista(){
  try{
    if(typeof ESPECIALES==='undefined') return [];
    return ESPECIALES.map(id=>byId(id)).filter(Boolean);
  }catch(e){ return []; }
}
function catCanonOf(pid){
  const i=PRACTICES_ES.findIndex(p=>p.id===pid);
  if(i>=0) return PRACTICES_ES[i].cat;
  const u=userLib.find(p=>p.id===pid);       // práctica propia: su categoría tal cual
  return u ? u.cat : null;
}

function setTime(dh,dm){
  cfg.startH=(cfg.startH+dh+24)%24; cfg.startM=(cfg.startM+dm+60)%60;
  document.getElementById('vh').textContent=pad(cfg.startH);
  document.getElementById('vm').textContent=pad(cfg.startM);
  document.getElementById('clk').innerHTML=clockSVG(cfg.startH,cfg.startM,190);
  applyCfg(false);
}
function applyCfg(rerender=true){
  cfg.favPerDay=Math.min(cfg.favPerDay===undefined?1:cfg.favPerDay, slotTimes().length);
  LS.set('mpt_cfg',cfg);
  LS.set('mpt_plans', {});   // los días futuros se regeneran con el nuevo patrón
  dayState=null; ensureDayPlan(); scheduleNext();
  if(rerender) renderSet();
  toast(t('ts_pattern_upd'));
}
