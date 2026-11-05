/* Moment · El plan del día
   Qué se propone y a qué hora: patrón, favoritas, categorías, constelaciones y momentos propios.

   Script clásico: comparte el ámbito global con los demás módulos de js/, que
   index.html carga en orden (ver la tabla en DOCUMENTACION-TECNICA.md). El orden
   solo importa para lo que se ejecuta al cargar; las funciones se llaman después. */

function pickPractices(n, exclude){
  // favoritas al día: las que el usuario definió con la barra (0..máximo de momentos).
  // Si pide más de las que tiene, los huecos se completan con propuestas aleatorias;
  // si tiene más de las pedidas, se eligen al azar entre sus favoritas.
  const excl=new Set(exclude||[]);
  const favPool=favs.filter(id=>{
    if(!byId(id) || excl.has(id) || paused.includes(id)) return false;
    if((cfg.constNo || anyConstFlag()) && esCatConst((byId(id)||{}).cat)) return false;
    return true;
  });
  const objetivo=Math.min(n, Math.max(0, (cfg && cfg.favPerDay!==undefined)?cfg.favPerDay:1));
  const nFav=Math.min(objetivo, favPool.length);
  const chosen=[];
  shuffle(favPool);
  for(let i=0;i<nFav;i++){ chosen.push(favPool[i]); excl.add(favPool[i]); }
  const rest=ALL().map(p=>p.id).filter(id=>{
    if(excl.has(id) || favs.includes(id) || paused.includes(id)) return false;
    if((cfg.constNo || anyConstFlag()) && esCatConst((byId(id)||{}).cat)) return false;
    return true;
  });
  shuffle(rest);
  while(chosen.length<n && rest.length) { const id=rest.pop(); chosen.push(id); excl.add(id); }
  shuffle(chosen);
  return placeVisualization(placeCategoryPrefs(placeConstellations(chosen)));
}

// Categorías preferidas: garantiza al menos una práctica de cada categoría marcada,
// igual que la visualización diaria, ocupando huecos libres del patrón
function placeCategoryPrefs(ids){
  if(!cfg || !cfg.catsPref || !ids.length) return ids;
  const prefs=catPairs().filter(cp=>cfg.catsPref[cp.id] && cp.id!=='constelaciones');
  if(!prefs.length) return ids;
  const franjas=franjasConstelacion(ids.length);
  prefs.forEach(cp=>{
    if(ids.some(id=>catCanonOf(id)===cp.id)) return;   // ya hay una de esa categoría
    const cand=ids.map((_,k)=>k).filter(k=>!franjas.has(k) && !favs.includes(ids[k]) && ids[k]!==VIS_ID);
    if(!cand.length) return;
    const pool=ALL().filter(p=>p.cat===cp.id && !ids.includes(p.id) && !paused.includes(p.id)).map(p=>p.id);
    if(!pool.length) return;
    const k=cand[Math.floor(Math.random()*cand.length)];
    ids[k]=pool[Math.floor(Math.random()*pool.length)];
  });
  return ids;
}
// Índices del día reservados a constelaciones, según los ajustes del usuario.
// Única definición: la usan tanto la visualización diaria como las categorías preferidas.
function franjasConstelacion(n){
  const f=new Set();
  if(!cfg) return f;
  if(cfg.constIni) f.add(0);
  if(cfg.constMed) f.add(Math.floor((n-1)/2));
  if(cfg.constFin) f.add(n-1);
  return f;
}
// Si el usuario lo activa, la visualización del día entra una vez, en un hueco libre.
// Es una práctica concreta que la persona ha pedido: entra aunque esté en pausa
// (la pausa solo vale para lo que elige la app; ver DOCUMENTACION-TECNICA §5).
function placeVisualization(ids){
  if(!cfg || !cfg.visDia || !ids.length) return ids;
  const vis=practicaVis();
  if(!vis || ids.includes(vis.id)) return ids;
  const franjas=franjasConstelacion(ids.length);
  let cand=ids.map((id,k)=>k).filter(k=>!franjas.has(k) && !favs.includes(ids[k]));
  if(!cand.length) cand=ids.map((id,k)=>k).filter(k=>!franjas.has(k));
  if(!cand.length) return ids;
  ids[cand[Math.floor(Math.random()*cand.length)]]=vis.id;
  return ids;
}
function anyConstFlag(){ return cfg && (cfg.constIni || cfg.constMed || cfg.constFin || constSemActiva()); }
/* ---- Constelaciones «x por semana» ----
   Además de (o en vez de) una constelación diaria, la persona elige cuántas quiere a
   la semana (de 1 a 7) y, para cada una, el día, la hora y cuál: una concreta o al
   azar. Formato y conversión del antiguo en configuracion.js (constSemFilasDe). */
function constSemCfg(){
  if(!cfg.constSem || !Array.isArray(cfg.constSem.filas)) cfg.constSem=constSemFilasDe(cfg.constSem);
  return cfg.constSem;
}
function constSemActiva(){
  const c=cfg && cfg.constSem;
  return !!(c && c.on && Array.isArray(c.filas) && c.filas.length);
}
// Constelaciones de la semana que tocan en una fecha (AAAA-MM-DD): [{h, pid}] por hora.
// pid null = al azar.
function constSemanaDe(dstr){
  if(!constSemActiva() || cfg.constNo) return [];
  const [y,m,d]=dstr.split('-').map(Number), dia=new Date(y,m-1,d).getDay();
  return cfg.constSem.filas.filter(f=>f.d===dia).map(f=>({h:f.h, pid:f.pid||null})).sort((a,b)=>a.h-b.h);
}
// Una constelación para hoy que no se repita en el día: primero las favoritas
function elegirConstelacion(usados){
  const libre=id=>!usados.has(id) && !paused.includes(id);
  const favC=favs.filter(id=>esCatConst((byId(id)||{}).cat) && libre(id));
  const pool=favC.length ? favC : PRACTICES.filter(p=>esCatConst(p.cat) && libre(p.id)).map(p=>p.id);
  return pool.length ? pool[Math.floor(Math.random()*pool.length)] : null;
}

function getEvent(id){ return userEvents.find(e=>e.id===id); }
function eventsFor(dstr){
  const [y,m,dd]=dstr.split('-').map(Number);
  const date=new Date(y,m-1,dd);
  return userEvents.filter(ev=>{
    if(evPaused.includes(ev.id)) return false;
    const sd=new Date(ev.startY, ev.startM-1, ev.startD);
    const diff=Math.round((date-sd)/(24*60*60*1000));
    if(diff<0) return false;
    // ¿Toca hoy, según la frecuencia?
    let toca, vuelta;   // vuelta = qué repetición es esta, empezando en 0
    if(ev.rep==='wdays'){
      // días concretos de la semana: lunes y jueves, por ejemplo
      const wd = ev.wd || [];
      toca = wd.includes(date.getDay());
      // cuántas veces ha tocado ya, para el límite de repeticiones
      const semanas = Math.floor(diff/7);
      let extra = 0;
      for(let k=semanas*7; k<diff; k++){
        const d2=new Date(sd.getFullYear(), sd.getMonth(), sd.getDate()+k);
        if(wd.includes(d2.getDay())) extra++;
      }
      vuelta = semanas*wd.length + extra;
    }
    else if(ev.rep==='daily'){ toca=true; vuelta=diff; }
    else if(ev.rep==='days'){ toca = ev.n>0 && diff%ev.n===0; vuelta = ev.n>0 ? Math.floor(diff/ev.n) : 0; }
    else if(ev.rep==='weekly'){ toca = date.getDay()===sd.getDay(); vuelta = Math.floor(diff/7); }
    else if(ev.rep==='monthly'){
      toca = date.getDate()===sd.getDate();
      vuelta = (date.getFullYear()-sd.getFullYear())*12 + (date.getMonth()-sd.getMonth());
    }
    else { toca = diff===0; vuelta = 0; }
    if(!toca) return false;
    // Límite de repeticiones: probar algo durante 7, 21 días… y que se apague solo.
    // Sin ev.veces (o 0) se repite indefinidamente, como hasta ahora.
    if(ev.veces>0 && vuelta>=ev.veces) return false;
    return true;
  });
}
// Horas a las que ocurre un momento propio dentro de un mismo día.
// dmode: 'int' = n veces cada x horas · 'list' = horas concretas · ausente = una sola vez
// Minutos "crudos" desde la medianoche del día en que arranca la tanda. Pueden
// superar 1439: esas repeticiones NO se descartan, saltan al día siguiente.
// Los duplicados tampoco se descartan: se resuelven preguntando al usuario.
function eventTimes(ev){
  if(!ev) return [];
  let ts;
  if(ev.dmode==='list' && Array.isArray(ev.dtimes) && ev.dtimes.length){
    ts=[ev.time].concat(ev.dtimes);
  } else if(ev.dmode==='int' && ev.dcount>1 && ev.dgap>0){
    ts=[];
    for(let k=0;k<ev.dcount;k++) ts.push(ev.time + k*ev.dgap*60);
  } else ts=[ev.time];
  return ts.filter(m=>typeof m==='number' && m>=0).sort((a,b)=>a-b);
}
// Cuántos días abarca la tanda más larga (para buscar arrastres de días anteriores)
function maxSpillDays(){
  let mx=0;
  userEvents.forEach(ev=>{ const r=eventTimes(ev); const u=r[r.length-1]||0; if(u>mx) mx=u; });
  return Math.min(7, Math.floor(mx/1440));
}
// Ocurrencias reales de los momentos propios en una fecha: las que empiezan ese día
// más las arrastradas desde días anteriores por pasar de medianoche.
function eventOccurrences(dstr){
  const [y,m,dd]=dstr.split('-').map(Number);
  const base=new Date(y,m-1,dd);
  const out=[];
  for(let k=0;k<=maxSpillDays();k++){
    const ref=new Date(base.getFullYear(), base.getMonth(), base.getDate()-k);
    eventsFor(dateStrOf(ref)).forEach(ev=>{
      eventTimes(ev).forEach(raw=>{
        if(Math.floor(raw/1440)===k) out.push({ev, time: raw%1440});
      });
    });
  }
  return out.sort((a,b)=>a.time-b.time);
}
// Horas del momento tal como se muestran, marcando las que caen en días siguientes
// Horas del patrón estándar que quedan pisadas por un momento propio.
// Se compara contra slotTimes(), que es igual todos los días: así la detección
// vale para hoy y para cualquier día futuro.
function evChocaPatron(ev){
  if(!patronActivo()) return [];             // con el patrón apagado no hay nada que pisar
  const patron=slotTimes().map(m=>m%1440);
  return [...new Set(eventTimes(ev).map(m=>m%1440).filter(m=>patron.includes(m)))].sort((a,b)=>a-b);
}
// Horas en las que algún momento propio pidió quedarse solo (ev.excl)
function horasExclusivas(dstr){
  return new Set(eventOccurrences(dstr).filter(o=>o.ev && o.ev.excl).map(o=>o.time));
}

// Día completo: momentos del patrón + momentos propios, ordenados por hora
// El día lo forman tres fuentes que se combinan: el patrón, los momentos propios
// y las prácticas al azar. Con el patrón y el azar apagados, el día son solo los
// momentos propios; si ese día no hay ninguno, queda vacío: es lo que se ha pedido.
function buildDayEntries(dstr){
  const occ=eventOccurrences(dstr);
  const entries=[];
  // las horas donde un momento propio pidió quedarse solo pierden la propuesta del patrón
  const excl=horasExclusivas(dstr);
  if(patronActivo()){
    const times=slotTimes();
    const ids=pickPractices(times.length, occ.map(o=>o.ev.pid));
    times.forEach((t,i)=>{ if(!excl.has(t%1440)) entries.push({time:t, pid:ids[i]||null}); });
  }
  occ.forEach(o=>entries.push({time:o.time, pid:o.ev.pid, ev:o.ev.id}));
  if(patronActivo()){
    // Constelaciones «x por semana»: si coinciden con una propuesta del patrón, la
    // sustituyen (así no suenan dos a la vez); si no, se añaden a su hora.
    const usados=new Set(entries.map(e=>e.pid));
    constSemanaDe(dstr).forEach(({h, pid})=>{
      if(excl.has(h)) return;                 // un momento propio pidió esa hora para él solo
      // La elegida se propone tal cual, aunque esté en pausa en la biblioteca: lo que
      // la persona escoge se hace. Solo si ya sale ese día no se repite. Si ya no
      // existe (una propia que se borró), vuelve a ser al azar.
      let c, fija=false;
      if(pid && byId(pid)){ if(usados.has(pid)) return; c=pid; fija=true; }
      else c=elegirConstelacion(usados);
      if(!c) return;
      usados.add(c);
      const k=entries.findIndex(e=>!e.ev && e.time===h);
      if(k>=0){ usados.delete(entries[k].pid); entries[k].pid=c; if(fija) entries[k].fija=true; }
      else entries.push(fija ? {time:h, pid:c, fija:true} : {time:h, pid:c});
    });
  }
  // Prácticas al azar: a horas que no pisan las anteriores y sin repetir ninguna
  azarEntradas(entries).forEach(e=>entries.push(e));
  entries.sort((a,b)=>a.time-b.time);
  return entries;
}
// Coloca una constelación al principio, al mediodía y/o al final del día según lo elegido
function placeConstellations(ids){
  if(cfg.constNo || !anyConstFlag() || !ids.length) return ids;
  const n=ids.length, pos=new Set();
  if(cfg.constIni) pos.add(0);
  if(cfg.constMed) pos.add(Math.floor((n-1)/2));
  if(cfg.constFin) pos.add(n-1);
  const usados=new Set(ids);
  const favConst=favs.filter(id=>esCatConst((byId(id)||{}).cat) && !usados.has(id) && !paused.includes(id));
  const otras=PRACTICES.filter(p=>esCatConst(p.cat) && !usados.has(p.id) && !favConst.includes(p.id) && !paused.includes(p.id)).map(p=>p.id);
  shuffle(favConst); shuffle(otras);
  // pop() toma primero del final: favoritas al final = favoritas primero
  const pool=[...otras, ...favConst];
  [...pos].forEach(i=>{
    const c=pool.pop();
    if(!c) return;
    // si en esta franja cayó una favorita normal, se recoloca en otro hueco antes
    if(favs.includes(ids[i])){
      const j=ids.findIndex((id,k)=>!pos.has(k) && !favs.includes(id));
      if(j>=0){ const tmp=ids[j]; ids[j]=ids[i]; ids[i]=tmp; }
    }
    usados.delete(ids[i]); ids[i]=c; usados.add(c);
  });
  return ids;
}
// sustituciones puntuales ("nueva recomendación"): aleatoria pura entre todas
function pickRandom(exclude){
  const excl=new Set(exclude||[]);
  const pool=ALL().map(p=>p.id).filter(id=>{
    if(excl.has(id) || paused.includes(id)) return false;
    if(cfg && cfg.constNo && esCatConst((byId(id)||{}).cat)) return false;
    return true;
  });
  return pool.length? pool[Math.floor(Math.random()*pool.length)] : null;
}

function ensureDayPlan(){
  if(dayState && dayState.date===todayStr()) return;
  const plans=LS.get('mpt_plans', {});
  const pre=plans[todayStr()];
  // usa el plan pregenerado (coincide con lo ya programado en el sistema) o construye uno
  const entries=(pre && pre.length && pre[0] && pre[0].pid!==undefined) ? pre : buildDayEntries(todayStr());
  Object.keys(plans).forEach(k=>{ if(k<=todayStr()) delete plans[k]; });
  LS.set('mpt_plans', plans);
  dayState={date:todayStr(), used:[...new Set(entries.map(e=>e.pid))],
    plan: entries.map(e=>Object.assign({time:e.time, pid:e.pid, ev:e.ev, done:false, snoozes:0, snoozeUntil:null}, e.fija?{fija:true}:{}, e.az?{az:true}:{}))};
  LS.set('mpt_day', dayState);
}
function saveDay(){ LS.set('mpt_day', dayState); }
// Reconstruye el plan de hoy inmediatamente (tras crear/pausar/borrar momentos) para que
// el patrón estándar rellene los huecos al instante, sin dejar la agenda vacía
function rebuildToday(){
  // limpia el caché de TODOS los días futuros: así los cambios en momentos propios
  // (crear, pausar, borrar, apagar el patrón o el azar) se propagan a toda la agenda
  LS.set('mpt_plans', {});
  dayState=null;
  ensureDayPlan();
}

function currentSlotIndex(){
  const nm=nowMins(); let idx=-1;
  dayState.plan.forEach((s,i)=>{ if(s.time<=nm) idx=i; });
  return idx===-1?0:idx;
}

function getPlanFor(dstr){
  if(dstr===todayStr()){ ensureDayPlan(); return dayState.plan.map(s=>Object.assign({time:s.time, pid:s.pid, ev:s.ev}, s.az?{az:true}:{})); }
  const plans=LS.get('mpt_plans', {});
  if(plans[dstr]) return plans[dstr];
  const plan=buildDayEntries(dstr);
  Object.keys(plans).forEach(k=>{ if(k<todayStr()) delete plans[k]; }); // limpia días pasados
  plans[dstr]=plan;
  LS.set('mpt_plans', plans);
  return plan;
}
