/* Moment · Prácticas al azar
   El segundo modo de recibir prácticas: un número de ellas, al azar, dentro de
   una franja horaria. Se combina con el patrón y con los momentos propios.

   cfg.azar = {on, ini, fin, min, max, excl}
     ini, fin  minutos desde medianoche. Si fin es anterior a ini, la franja pasa
               la medianoche (22:00 → 02:00 del día siguiente).
     min, max  cuántas prácticas al día: cada día se sortea un número entre los
               dos. Iguales = siempre las mismas.
     excl      categorías que NO se proponen. Vacío = todas.

   Cada día se sortea cuántas, a qué horas y cuáles:
     · horas: de 5 en 5 minutos dentro de la franja, con al menos 15 minutos
       entre una y otra (30 si hay sitio) y sin caer encima de una propuesta del
       patrón o de un momento propio;
     · prácticas: de las categorías elegidas, nunca las pausadas ni las que ya
       salen ese día.
   Como el resto del plan, cada día se calcula una vez y se guarda (getPlanFor):
   la Agenda, los avisos y el calendario dicen siempre lo mismo.

   Las piezas de interfaz sirven a la bienvenida (ctx 'ob', aún sin guardar) y
   a Ajustes (ctx 'cfg').

   Script clásico: comparte el ámbito global con los demás módulos de js/. */

const AZ_PASO = 5;        // las horas van de 5 en 5 minutos, como el reloj
const AZ_SEP_MIN = 15;    // separación mínima entre dos prácticas al azar
const AZ_SEP_MAX = 30;    // …y la que se busca cuando sobra sitio
const AZ_TOPE = 24;       // como mucho, 24 al día, igual que el patrón

function azarActivo(){ return !!(cfg && cfg.azar && cfg.azar.on); }
function azarCfg(){ if(!cfg.azar) cfg.azar=azarPorDefecto(); return cfg.azar; }

// La franja en minutos, con el final pasado la medianoche si hace falta
function azarFranja(a){
  const cruza = a.fin < a.ini;
  const fin = cruza ? a.fin+1440 : a.fin;
  return {ini:a.ini, fin, len:fin-a.ini, cruza};
}
// Cuántas caben como mucho dejando 15 minutos entre una y otra
function azarTope(a){ return Math.max(1, Math.min(AZ_TOPE, Math.floor(azarFranja(a).len/AZ_SEP_MIN)+1)); }
// Mínimo y máximo siempre con sentido: 1 ≤ min ≤ max ≤ lo que cabe
function azarAjustar(a){
  a.max = Math.max(1, Math.min(azarTope(a), Math.round(Number(a.max)) || 1));
  a.min = Math.max(1, Math.min(a.max, Math.round(Number(a.min)) || 1));
}
function azarSinCategorias(a){
  const ex=new Set(a.excl||[]);
  return catPairs().every(cp=>ex.has(cp.id));
}

/* ---- El sorteo de cada día ---- */
function azEntre(a, b){ return a + Math.floor(Math.random()*(b-a+1)); }

/* n horas al azar en la franja, separadas al menos «sep» pasos de 5 minutos.
   Si se quitan los huecos obligatorios entre una y otra, las n posiciones son n
   números distintos cualesquiera de un rango más corto: se sortean esos y se
   vuelven a abrir los huecos. Así todas las combinaciones válidas son igual de
   probables, sin tener que probar y descartar. */
function azarHoras(n, a){
  const f=azarFranja(a), L=Math.floor(f.len/AZ_PASO);
  n=Math.min(n, azarTope(a));
  if(n<=0) return [];
  // Separación: hasta 30 minutos, pero sin gastar más de la mitad de la franja en
  // huecos obligatorios. Si no, en una franja justa todas las horas quedarían fijas
  // (9:00, 9:30, 10:00…) y dejarían de ser al azar.
  const sep = n>1 ? Math.max(AZ_SEP_MIN/AZ_PASO, Math.min(AZ_SEP_MAX/AZ_PASO, Math.floor(L/(2*(n-1))))) : 1;
  const pos=Array.from({length:L-(n-1)*(sep-1)+1}, (_,i)=>i);
  for(let i=0;i<n;i++){ const j=i+Math.floor(Math.random()*(pos.length-i)); [pos[i],pos[j]]=[pos[j],pos[i]]; }
  return pos.slice(0,n).sort((x,y)=>x-y).map((p,i)=>f.ini+(p+i*(sep-1))*AZ_PASO);
}
// ¿Cae «h» a menos de 5 minutos de alguna hora ya ocupada? Se compara la hora del
// día, porque el patrón y el azar pueden pasar de la medianoche.
function azChoca(h, ocupadas){
  const m=((h%1440)+1440)%1440;
  return ocupadas.some(o=>{ const d=Math.abs(m-(((o%1440)+1440)%1440)); return Math.min(d, 1440-d) < AZ_PASO; });
}
function azarPracticas(n, usados, a){
  const ex=new Set(a.excl||[]);
  const pool=ALL().filter(p=>!usados.has(p.id) && !paused.includes(p.id) && !ex.has(p.cat)).map(p=>p.id);
  shuffle(pool);
  return pool.slice(0, n);
}
/* Las prácticas al azar de un día. «entradas» son las que ya tiene (patrón y
   momentos propios): sus horas no se pisan y sus prácticas no se repiten. */
function azarEntradas(entradas){
  if(!azarActivo()) return [];
  const a=Object.assign({}, cfg.azar); azarAjustar(a);
  if(azarSinCategorias(a)) return [];
  const n=azEntre(a.min, a.max);
  const ocupadas=entradas.map(e=>e.time);
  let horas=[];
  // casi siempre vale el primer sorteo; si en un día muy lleno no se encuentra
  // hueco, se aceptan las horas aunque coincidan (la Agenda admite dos a la vez)
  for(let k=0;k<20;k++){
    horas=azarHoras(n, a);
    if(!horas.some(h=>azChoca(h, ocupadas))) break;
  }
  const ids=azarPracticas(horas.length, new Set(entradas.map(e=>e.pid)), a);
  // si no hay prácticas para todas las horas, las que se quedan son también al azar
  shuffle(horas);
  return ids.map((pid,i)=>({time:horas[i], pid}));
}

/* ---- Textos ---- */
function durTxt(min){ const h=Math.floor(min/60), m=min%60; return h&&m ? h+' h '+m+' min' : h ? h+' h' : m+' min'; }
function azarFranjaTxt(a){
  const f=azarFranja(a);
  if(!f.len) return t('az_win_zero').replace('{a}', fmtT(a.ini));
  return t('az_win_sum').replace('{d}', durTxt(f.len)).replace('{a}', fmtT(a.ini))
    .replace('{b}', fmtT(a.fin)+(f.cruza?' '+t('pt_sum_next'):''));
}
function azarResumen(a0){
  const a=Object.assign({}, a0); azarAjustar(a);
  const f=azarFranja(a), A=fmtT(a.ini), B=fmtT(a.fin)+(f.cruza?' '+t('pt_sum_next'):'');
  if(!f.len) return t('az_sum_zero').replace('{a}', A);
  const txt = a.min!==a.max ? t('az_sum_range').replace('{min}', a.min).replace('{max}', a.max)
            : a.min===1 ? t('az_sum_one') : t('az_sum_fixed').replace('{n}', a.min);
  return txt.replace('{a}', A).replace('{b}', B);
}

/* ---- Interfaz compartida por la bienvenida ('ob') y Ajustes ('cfg') ---- */
function azObj(ctx){
  if(ctx==='ob'){ if(!ob.azar) ob.azar=azarPorDefecto(); return ob.azar; }
  return azarCfg();
}
function azRefrescar(ctx){ if(ctx==='ob') renderOnboarding(ob._paso); else applyCfg(); }
function azToggle(on){ azarCfg().on=!!on; applyCfg(); }
function azHora(ctx, cual, e){
  const a=azObj(ctx);
  abrirReloj(a[cual], m=>{ a[cual]=m; azarAjustar(a); azRefrescar(ctx); }, faseDe(e));
}
function azPaso(ctx, cual, d){
  const a=azObj(ctx), tope=azarTope(a);
  if(cual==='min'){ a.min=Math.max(1, Math.min(tope, a.min+d)); if(a.max<a.min) a.max=a.min; }
  else { a.max=Math.max(1, Math.min(tope, a.max+d)); if(a.min>a.max) a.min=a.max; }
  azRefrescar(ctx);
}
function azCat(ctx, id, on){
  const a=azObj(ctx), ex=new Set(a.excl||[]);
  if(on) ex.delete(id); else ex.add(id);
  a.excl=[...ex];
  azRefrescar(ctx);
}
function azFranjaHTML(ctx){
  const a=azObj(ctx);
  const boton=cual=>`<button type="button" class="btn ghost" style="width:100%;font-size:1.15rem;font-weight:700" onclick="azHora('${ctx}','${cual}',event)">🕐 ${horaPartes(a[cual])}</button>`;
  return `<div class="row" style="align-items:flex-end;margin-top:6px">
      <div style="flex:1;min-width:130px"><label class="fld" style="margin:0 0 4px">${t('az_from')}</label>${boton('ini')}</div>
      <div style="flex:1;min-width:130px"><label class="fld" style="margin:0 0 4px">${t('az_to')}</label>${boton('fin')}</div>
    </div>
    <p class="muted" style="margin:6px 0 0;text-align:center">${azarFranjaTxt(a)}</p>`;
}
function azCuantasHTML(ctx){
  const a=azObj(ctx), tope=azarTope(a);
  const fila=(cual, etiqueta)=>`<div class="contador">
      <span>${etiqueta}</span>
      <button type="button" class="stp" ${a[cual]<=1?'disabled':''} onclick="azPaso('${ctx}','${cual}',-1)">−</button>
      <b>${a[cual]}</b>
      <button type="button" class="stp" ${a[cual]>=tope?'disabled':''} onclick="azPaso('${ctx}','${cual}',1)">+</button>
    </div>`;
  return fila('min', t('az_min')) + fila('max', t('az_max'))
    + (tope<AZ_TOPE ? `<p class="muted" style="font-size:.82rem;margin:4px 0 0">${t('az_cap').replace('{n}', tope)}</p>` : '');
}
function azResumenHTML(ctx){
  return `<p class="muted" id="az_sum_${ctx}" style="margin:10px 0 0;text-align:center"><b>${esc(azarResumen(azObj(ctx)))}</b></p>`;
}
function azCatsHTML(ctx){
  const a=azObj(ctx), ex=new Set(a.excl||[]);
  return catPairs().map(cp=>`<label class="chkrow" style="margin:0 0 6px">
      <input type="checkbox" ${ex.has(cp.id)?'':'checked'} onchange="azCat('${ctx}', ${jsAttr(cp.id)}, this.checked)"> ${cp.propia?esc(cp.id):esc(catLabel(cp.id))}
    </label>`).join('')
    + (azarSinCategorias(a) ? `<p class="muted" style="color:#B3402A;margin:4px 0 0">${t('az_cat_none')}</p>` : '');
}
// El bloque completo de Ajustes, cuando el modo está activo
function azBloqueAjustes(){
  return `<div class="subcaja">
      <label class="fld" style="margin-top:0">${t('az_win_label')}</label>
      ${azFranjaHTML('cfg')}
      <label class="fld">${t('az_n_label')}</label>
      ${azCuantasHTML('cfg')}
      ${azResumenHTML('cfg')}
      <label class="fld">${t('az_cat_label')}</label>
      <p class="muted" style="margin:0 0 8px;font-size:.85rem">${t('az_cat_txt')}</p>
      ${azCatsHTML('cfg')}
    </div>`;
}
