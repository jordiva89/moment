/* Analizador de consumo para "Momento para ti".
   Busca los patrones que de verdad gastan batería en una app Capacitor:
   temporizadores que no se apagan, trabajo en segundo plano, escrituras en disco
   repetidas, llamadas nativas costosas y escuchas sin retirar.
   Cada hallazgo se clasifica: GRAVE (gasta seguro) · AVISO (puede gastar) · OK. */
const fs = require('fs');
const s = fs.readFileSync('/home/claude/momento-para-ti/index.html','utf8');
const js = s.match(/<script>([\s\S]*)<\/script>/g).pop().replace(/<\/?script>/g,'');
const L = js.split('\n');
const out = [];
const add = (n, msg, det) => out.push({n, msg, det});

// ---- 1. Temporizadores periódicos: cada uno debe poder apagarse ----
const intervalos = [];
L.forEach((l,i)=>{ const m=l.match(/setInterval\(([^,]*),\s*(\d+)/); if(m) intervalos.push({ln:i+1, ms:+m[2], txt:l.trim()}); });
intervalos.forEach(iv=>{
  const seg = iv.ms/1000;
  const porDia = Math.round(86400/seg);
  if (iv.ms < 15000) add('GRAVE', `Temporizador cada ${seg}s (${porDia} ejecuciones/día)`, 'línea '+iv.ln);
  else if (iv.ms < 60000) add('AVISO', `Temporizador cada ${seg}s (${porDia}/día si la app queda abierta)`, 'línea '+iv.ln);
  else add('OK', `Temporizador cada ${seg}s`, 'línea '+iv.ln);
});
const guardados = (js.match(/clearInterval\(/g)||[]).length;
if (intervalos.length > guardados) add('GRAVE','Hay más setInterval que clearInterval: algún temporizador nunca se apaga','');

// ---- 2. ¿Se detiene todo al pasar a segundo plano? ----
const paraEnFondo = /visibilitychange[\s\S]{0,400}stopWatch\(\)/.test(js) || /document\.hidden[\s\S]{0,200}stopWatch\(\)/.test(js);
const paraEnPausa = /appStateChange[\s\S]{0,300}stopWatch\(\)/.test(js);
add(paraEnFondo?'OK':'GRAVE', 'Detiene los temporizadores al ocultarse la app', paraEnFondo?'':'no se encontró stopWatch en visibilitychange');
add(paraEnPausa?'OK':'AVISO', 'Detiene los temporizadores al pausar la app (nativo)', paraEnPausa?'':'no se encontró stopWatch en appStateChange');

// ---- 3. Escrituras en disco dentro de temporizadores ----
intervalos.concat([{ln:0}]).forEach(()=>{});
// Solo cuentan los temporizadores PERIÓDICOS: un setTimeout de una sola vez
// escribe una vez, no es consumo repetido.
let dentro = 0;
L.forEach((l,i)=>{
  if(!/setInterval\(/.test(l)) return;
  let prof=0, fin=i;
  for(let k=i;k<Math.min(L.length,i+60);k++){
    prof += (L[k].match(/\{/g)||[]).length - (L[k].match(/\}/g)||[]).length;
    if(k>i && prof<=0){ fin=k; break; }
  }
  const esc = (L.slice(i,fin+1).join('\n').match(/LS\.set\(/g)||[]).length;
  if (esc) { dentro += esc; add('GRAVE', `Escritura en disco en cada vuelta de un temporizador (${esc})`, 'js '+(i+1)); }
});
if (!dentro) add('OK','Ninguna escritura en disco dentro de temporizadores periódicos','');

// ---- 4. Escuchas que no se retiran ----
const añadidas = (js.match(/addEventListener\(/g)||[]).length;
const quitadas = (js.match(/removeEventListener\(/g)||[]).length;
add(añadidas>quitadas+6?'AVISO':'OK', `Escuchas añadidas ${añadidas} / retiradas ${quitadas}`,
    añadidas>quitadas+6?'revisar si alguna se añade repetidamente en cada render':'');
// escuchas dentro de funciones de render = fuga acumulativa.
// Se comprueba la profundidad de llaves: una escucha en el nivel superior del
// archivo se registra UNA vez y no es un problema, aunque siga a un render().
function dentroDeFuncion(idx){
  let prof=0, dentro=false, fn=null;
  for(let i=0;i<=idx;i++){
    const l=L[i];
    const m=l.match(/^(?:async )?function (\w+)/);
    if(m && prof===0){ dentro=true; fn=m[1]; }
    prof += (l.match(/\{/g)||[]).length - (l.match(/\}/g)||[]).length;
    if(prof<=0){ prof=0; dentro=false; fn=null; }
  }
  return dentro ? fn : null;
}
const renderConListener = L.map((l,i)=>({l,i})).filter(o=>/addEventListener\(/.test(o.l))
  .map(o=>({...o, fn:dentroDeFuncion(o.i)}))
  .filter(o=>o.fn && /^render|^open|^show/.test(o.fn));
add(renderConListener.length?'GRAVE':'OK', 'Escuchas registradas dentro de funciones de render',
    renderConListener.length?(renderConListener.map(o=>o.fn+' (js '+(o.i+1)+')').join(', ')):'');

// ---- 5. Llamadas nativas costosas: deben estar agrupadas ----
const resched = (js.match(/nativeReschedule\(\)/g)||[]).length;
const puerta = /function pedirReprogramacion\(/.test(js);
add(puerta?'OK':'AVISO', 'Reprogramación de avisos agrupada (debounce)', puerta?'':'cada acción reprograma el sistema entera');
const directas = L.map((l,i)=>({l,i})).filter(o=>/(?<!function )nativeReschedule\(\)/.test(o.l) && !/pedirReprogramacion|reschedTimer|catch/.test(o.l));
add(directas.length<=2?'OK':'AVISO', `Llamadas directas a nativeReschedule: ${directas.length}`,
    directas.length>2?('líneas '+directas.map(o=>o.i+1).join(', ')):'');

// ---- 6. Animaciones y repintados continuos ----
const raf = (js.match(/requestAnimationFrame\(/g)||[]).length;
const rafBucle = /requestAnimationFrame\([\s\S]{0,200}requestAnimationFrame\(/.test(js) &&
                 !/requestAnimationFrame\(\(\)=>requestAnimationFrame\(\w+\)\)/.test(js);
add(rafBucle?'GRAVE':'OK', `requestAnimationFrame: ${raf} usos`, rafBucle?'parece un bucle de animación continuo':'solo reposicionamiento puntual');
const animCSS = (s.match(/animation:\s*[^;]*infinite/g)||[]).length;
add(animCSS?'AVISO':'OK', `Animaciones CSS infinitas: ${animCSS}`, animCSS?'repintan sin parar mientras se ven':'');

// ---- 7. Trabajo pesado en cada repintado ----
['ensureDayPlan','pickPractices','buildDayEntries','eventOccurrences'].forEach(f=>{
  const enRender = L.map((l,i)=>({l,i})).filter(o=>new RegExp('\\b'+f+'\\(').test(o.l))
    .map(o=>({...o, fn:dentroDeFuncion(o.i)}))
    .filter(o=>o.fn && /^render/.test(o.fn));
  if (!enRender.length) return;
  // ¿tiene guarda de salida rápida? entonces no recalcula en cada repintado
  const def = L.findIndex(l=>new RegExp('^(?:async )?function '+f+'\\(').test(l));
  const guarda = def>=0 && /return;/.test(L.slice(def+1, def+4).join('\n'));
  add(guarda?'OK':'AVISO', `${f}() se llama desde renders`,
      guarda?'tiene salida rápida: no recalcula si nada cambió':enRender.map(o=>o.fn).join(', '));
});

// ---- 8. Cachés: evitar recalcular la biblioteca ----
['_allCache','_byIdCache'].forEach(c=>{
  add(new RegExp(c).test(js)?'OK':'AVISO', `Caché ${c} presente`, '');
});

// ---- 9. Red y sensores (no debería haber nada) ----
const descargaEntera = /await fetch\([^)]*\)[\s\S]{0,120}\.blob\(\)/.test(js) &&
  !/method:'HEAD'/.test(js);
add(descargaEntera?'GRAVE':'OK', 'Descargas completas de archivos grandes',
    descargaEntera?'algún fetch trae el cuerpo entero solo para comprobarlo':'las comprobaciones usan HEAD o Range');
const fetchEnArranque = /^\s*if\(IS_NATIVE\) check\w*\(\);/m.test(js);
add(fetchEnArranque?'AVISO':'OK','Peticiones lanzadas en cada arranque', fetchEnArranque?'revisar si pueden esperar a que se necesiten':'');
[['fetch(','peticiones de red'],['XMLHttpRequest','peticiones de red'],['navigator.geolocation','ubicación'],
 ['DeviceMotion','acelerómetro'],['getUserMedia','cámara o micro'],['navigator.bluetooth','bluetooth'],
 ['wakeLock','bloqueo de pantalla']].forEach(([k,d])=>{
  const n=(js.match(new RegExp(k.replace(/[()]/g,'\\$&'),'g'))||[]).length;
  if(n) add('AVISO', `Uso de ${d}: ${n}`, k);
});

// ---- 10. Avisos programados por adelantado ----
const dias = (js.match(/DAYS_AHEAD\s*=\s*(\d+)/)||[])[1];
add(dias && +dias<=5?'OK':'AVISO', `Avisos programados por adelantado: ${dias} días`,
    dias && +dias>5 ? 'muchas alarmas en cola encarecen cada reprogramación':'');

// ---- informe ----
const orden={GRAVE:0, AVISO:1, OK:2};
out.sort((a,b)=>orden[a.n]-orden[b.n]);
const cuenta={GRAVE:0,AVISO:0,OK:0};
out.forEach(o=>cuenta[o.n]++);
console.log('===== ANÁLISIS DE CONSUMO =====\n');
out.forEach(o=>console.log(`[${o.n.padEnd(5)}] ${o.msg}${o.det?'  → '+o.det:''}`));
console.log(`\nResumen: ${cuenta.GRAVE} graves · ${cuenta.AVISO} avisos · ${cuenta.OK} correctos`);
process.exit(cuenta.GRAVE ? 1 : 0);
