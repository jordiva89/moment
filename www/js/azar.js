/* Moment · Prácticas al azar
   El segundo modo de recibir prácticas: un número de ellas, al azar, dentro de
   una franja horaria. Se combina con el patrón y con los momentos propios.

   cfg.azar = {on, ini, fin, min, max, sep, excl}
     ini, fin  minutos desde medianoche. Si fin es anterior a ini, la franja pasa
               la medianoche (22:00 → 02:00 del día siguiente).
     min, max  cuántas prácticas al día: cada día se sortea un número entre los
               dos. Iguales = siempre las mismas.
     sep       minutos que pasan como mínimo entre una propuesta y otra (13 de
               partida; lo elige la persona, de 1 a 240).
     excl      categorías que NO se proponen. Vacío = todas.

   Cada día se sortea cuántas, a qué horas y cuáles:
     · horas: a cualquier minuto de la franja (13:00 o 13:41), con al menos «sep»
       minutos entre una y otra y, si se puede, también respecto a las propuestas
       del patrón y a los momentos propios;
     · prácticas: de las categorías elegidas, nunca las pausadas ni las que ya
       salen ese día.
   Como el resto del plan, cada día se calcula una vez y se guarda (getPlanFor):
   la Agenda, los avisos y el calendario dicen siempre lo mismo.

   Las piezas de interfaz sirven a la bienvenida (ctx 'ob', aún sin guardar) y
   a Ajustes (ctx 'cfg').

   Script clásico: comparte el ámbito global con los demás módulos de js/. */

const AZ_SEP_MIN = 1;     // la separación se elige entre 1 minuto…
const AZ_SEP_MAX = 240;   // …y 4 horas (AZ_SEP_DEF, 13, está en configuracion.js)
const AZ_TOPE = 24;       // como mucho, 24 al día, igual que el patrón

function azarActivo(){ return !!(cfg && cfg.azar && cfg.azar.on); }
function azarCfg(){ if(!cfg.azar) cfg.azar=azarPorDefecto(); return cfg.azar; }

// La franja en minutos, con el final pasado la medianoche si hace falta
function azarFranja(a){
  const cruza = a.fin < a.ini;
  const fin = cruza ? a.fin+1440 : a.fin;
  return {ini:a.ini, fin, len:fin-a.ini, cruza};
}
// Minutos que pasan como mínimo entre una propuesta y otra
function azarSep(a){ return Math.max(AZ_SEP_MIN, Math.min(AZ_SEP_MAX, Math.round(Number(a && a.sep)) || AZ_SEP_DEF)); }
// Cuántas caben como mucho dejando esa separación entre una y otra
function azarTope(a){ return Math.max(1, Math.min(AZ_TOPE, Math.floor(azarFranja(a).len/azarSep(a))+1)); }
// Separación, mínimo y máximo siempre con sentido: 1 ≤ min ≤ max ≤ lo que cabe
function azarAjustar(a){
  a.sep = azarSep(a);
  a.max = Math.max(1, Math.min(azarTope(a), Math.round(Number(a.max)) || 1));
  a.min = Math.max(1, Math.min(a.max, Math.round(Number(a.min)) || 1));
}
function azarSinCategorias(a){
  const ex=new Set(a.excl||[]);
  return catPairs().every(cp=>ex.has(cp.id));
}

/* ---- El sorteo de cada día ---- */
function azEntre(a, b){ return a + Math.floor(Math.random()*(b-a+1)); }

/* n horas al azar en la franja, a cualquier minuto y con al menos «sep» minutos
   entre una y otra.
   Si se quitan los huecos obligatorios entre una y otra, las n posiciones son n
   números distintos cualesquiera de un rango más corto: se sortean esos y se
   vuelven a abrir los huecos. Así todas las combinaciones válidas son igual de
   probables, sin tener que probar y descartar. */
function azarHoras(n, a){
  const f=azarFranja(a), L=f.len, sep=azarSep(a);
  n=Math.min(n, azarTope(a));
  if(n<=0) return [];
  const pos=Array.from({length:L-(n-1)*(sep-1)+1}, (_,i)=>i);
  for(let i=0;i<n;i++){ const j=i+Math.floor(Math.random()*(pos.length-i)); [pos[i],pos[j]]=[pos[j],pos[i]]; }
  return pos.slice(0,n).sort((x,y)=>x-y).map((p,i)=>f.ini+p+i*(sep-1));
}
// ¿Cae «h» a menos de «sep» minutos de alguna hora ya ocupada? Se compara la hora
// del día, porque el patrón y el azar pueden pasar de la medianoche.
function azChoca(h, ocupadas, sep){
  const m=((h%1440)+1440)%1440;
  return ocupadas.some(o=>{ const d=Math.abs(m-(((o%1440)+1440)%1440)); return Math.min(d, 1440-d) < sep; });
}
// Minutos de la franja que no caen a menos de «sep» de ninguna hora ocupada
function azarLibres(a, ocupadas, sep){
  const f=azarFranja(a), out=[];
  for(let m=f.ini; m<=f.fin; m++) if(!azChoca(m, ocupadas, sep)) out.push(m);
  return out;
}
// n minutos al azar de «libres», separados al menos «sep» entre sí. Va cogiendo en
// orden aleatorio los que caben; puede quedarse corto aunque hubiera una forma de
// colocarlos todos, por eso quien lo usa lo intenta varias veces.
function azarVoraz(libres, n, sep){
  const orden=libres.slice(); shuffle(orden);
  const elegidas=[];
  for(const m of orden){
    if(elegidas.length>=n) break;
    if(elegidas.every(e=>Math.abs(e-m)>=sep)) elegidas.push(m);
  }
  return elegidas.sort((x,y)=>x-y);
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
  const n=azEntre(a.min, a.max), sep=azarSep(a);
  const ocupadas=entradas.map(e=>e.time);
  // Entre ellas, la separación está garantizada. Respecto al patrón y a los momentos
  // propios se prueban varios sorteos y vale el primero sin choques. En un día muy
  // lleno puede no salir así: entonces se eligen solo entre los minutos libres; y si
  // ni así caben, se queda el sorteo con menos choques (la Agenda admite dos a la vez).
  let horas=[], choques=Infinity;
  for(let k=0;k<40 && choques>0;k++){
    const hs=azarHoras(n, a), c=hs.filter(h=>azChoca(h, ocupadas, sep)).length;
    if(c<choques){ horas=hs; choques=c; }
  }
  if(choques>0){
    const libres=azarLibres(a, ocupadas, sep);
    for(let k=0;k<10;k++){
      const hs=azarVoraz(libres, horas.length, sep);
      if(hs.length===horas.length){ horas=hs; break; }
    }
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
  return txt.replace('{a}', A).replace('{b}', B) + ' ' + t('az_sum_sep').replace('{s}', a.sep);
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
// Separación mínima: con los botones de uno en uno o escribiendo el número
function azSepFijar(ctx, v){
  const a=azObj(ctx);
  a.sep=Math.max(AZ_SEP_MIN, Math.min(AZ_SEP_MAX, parseInt(v,10) || AZ_SEP_DEF));
  azarAjustar(a);                     // con más separación caben menos
  azRefrescar(ctx);
}
function azSep(ctx, d){ azSepFijar(ctx, azarSep(azObj(ctx))+d); }
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
  const sep=azarSep(a);
  return fila('min', t('az_min')) + fila('max', t('az_max'))
    + `<div class="contador">
        <span>${t('az_sep')}</span>
        <button type="button" class="stp" ${sep<=AZ_SEP_MIN?'disabled':''} onclick="azSep('${ctx}',-1)">−</button>
        <input type="number" class="numsep" inputmode="numeric" min="${AZ_SEP_MIN}" max="${AZ_SEP_MAX}" value="${sep}"
          aria-label="${t('az_sep')}" onchange="azSepFijar('${ctx}', this.value)">
        <button type="button" class="stp" ${sep>=AZ_SEP_MAX?'disabled':''} onclick="azSep('${ctx}',1)">+</button>
      </div>
      <p class="muted" style="font-size:.82rem;margin:0">${t('az_sep_txt')}</p>`
    + (tope<AZ_TOPE ? `<p class="muted" style="font-size:.82rem;margin:4px 0 0">${t('az_cap').replace('{n}', tope).replace('{s}', sep)}</p>` : '');
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
