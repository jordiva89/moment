#!/usr/bin/env node
/* Validador de traducciones de Moment.
 *
 *   node tools/validar-idioma.js <archivo.json> [código]
 *
 * Comprueba que una traducción aportada es completa, segura y legalmente
 * aceptable ANTES de que llegue a la app. Se ejecuta solo en GitHub al recibir
 * una propuesta, y también a mano.
 *
 * Devuelve código de salida 1 si hay errores. Los avisos no bloquean.
 *
 * IMPORTANTE: esto es la primera de las tres capas. Las otras dos —revisión
 * asistida por IA con retrotraducción, y revisión humana— no las sustituye.
 */
const fs = require('fs'), path = require('path');
const W = path.join(__dirname, '..', 'www') + path.sep;

const errores = [], avisos = [];
const err = m => errores.push(m);
const avi = m => avisos.push(m);

// ---------- referencia: español, que es el original ----------
const idx = fs.readFileSync(W+'i18n.js','utf8');
function bloqueIdioma(txt, marca){
  const ini = txt.indexOf(marca); if (ini<0) return '';
  let prof = 0;
  for (let k=ini; k<txt.length; k++){
    if (txt[k]==='{') prof++;
    else if (txt[k]==='}'){ prof--; if (prof===0) return txt.slice(ini,k); }
  }
  return txt.slice(ini);
}
// Las claves pueden ir varias en la misma línea (a:'x', b:'y'), así que no basta
// con buscar por comienzo de línea.
const bloqES = bloqueIdioma(idx,'  es:{');
const clavesES = new Set([...bloqES.matchAll(/\n\s{4}(\w+)\s*:/g)].map(m=>m[1]));
const [PRACTICAS, TEXTOS] = eval(fs.readFileSync(W+'practices.js','utf8') + ';[PRACTICAS, TEXTOS]');
const idsPractica = new Set(PRACTICAS.map(p=>p.id));

/* ---------- textos que NO se traducen ----------
   Sostienen la protección legal o hacen falta antes de elegir idioma.
   Si una propuesta los incluye, se avisa: deben traducirse profesionalmente. */
const NO_TRADUCIBLES = /^(s\d|chk|nota|btn|bloqueo|bloqueoT|titulo)$/;
const BLOQUES_LEGALES = ['acept', 'legal', 'priv', 'cond'];

/* ---------- vocabulario prohibido, por idioma ----------
   Es la defensa legal de la app: sin afirmaciones sanitarias ni promesas de
   eficacia. Una traducción bienintencionada puede reintroducirlas sin querer. */
const PROHIBIDO = {
  es: /\b(cur(a|ar|ación)|sana(r|ción)|terapia|terapéutic|tratamiento|diagnóstic|enfermedad|síntoma|receta|dosis)\b/i,
  en: /\b(cure|cures|heal|heals|healing|therapy|therapeutic|diagnos|disease|symptom|prescription|dosage)\b/i,
  fr: /\b(guéri(r|son)|thérapie|thérapeutique|traitement|traiter|diagnostic|maladie|symptôme)\b/i,
  pt: /\b(cur(a|ar)|sarar|terapia|terapêutic|tratamento|tratar|diagnóstic|doença|sintoma)\b/i,
  de: /\b(heil(en|ung)|Therapie|therapeutisch|Behandlung|behandeln|Diagnose|Krankheit|Symptom)\b/i,
  it: /\b(guari(re|gione)|terapia|terapeutic|trattamento|trattare|diagnos|malattia|sintomo)\b/i,
  ar: /(علاج|يشفي|شفاء|تشخيص|مرض|عرض مرضي)/,
  zh: /(治疗|治愈|疗法|诊断|疾病|症状)/,
};
/* Palabras que en algunos contextos son inocentes: «tratar» como dar trato,
   «treat» igual. Se avisan para que las revise una persona, pero no bloquean. */
const AMBIGUO = {
  es: /\b(tratar|trato|tratas|trataría\w*)\b/i,
  en: /\b(treat|treats|treated|treating|treatment)\b/i,
};
const PROMESA = {
  es: /\b(reduce|elimina|combate|previene|cura|mejora|fortalece|regula)\b[^.\n]{0,60}\b(estrés|ansiedad|dolor|insomnio|tensión|inmun|salud|depres)\b/i,
  en: /\b(reduces?|eliminates?|fights?|prevents?|cures?|improves?|strengthens?|regulates?)\b[^.\n]{0,60}\b(stress|anxiety|pain|insomnia|tension|immune|health|depress)\b/i,
};

// ---------- lectura del archivo propuesto ----------
const ruta = process.argv[2];
if (!ruta){ console.error('Uso: node tools/validar-idioma.js <archivo.json> [código]'); process.exit(2); }
let datos;
try {
  const crudo = fs.readFileSync(ruta, 'utf8');
  if (/^\s*(const|let|var|function|import|=>)/m.test(crudo))
    err('El archivo contiene código. Una traducción debe ser JSON puro: el código de terceros nunca se ejecuta.');
  datos = JSON.parse(crudo);
} catch(e){
  console.error('No se pudo leer como JSON: ' + e.message);
  process.exit(1);
}
const codigo = process.argv[3] || datos.codigo || path.basename(ruta).replace(/\..*$/,'');

// ---------- 1. cabecera ----------
['codigo','nombre','esquema','autor','licencia'].forEach(k=>{
  if (!datos[k]) err('Falta el campo obligatorio de cabecera: ' + k);
});
const ESQUEMA = 1;
if (datos.esquema && datos.esquema !== ESQUEMA)
  err('Esquema ' + datos.esquema + ': esta versión de la app espera ' + ESQUEMA + '.');
if (datos.licencia && !/AGPL/i.test(datos.licencia))
  err('La cesión debe ser bajo AGPL v3. Encontrado: ' + datos.licencia);

// ---------- 2. interfaz: claves completas ----------
const ui = datos.interfaz || {};
const faltan = [...clavesES].filter(k=>!(k in ui));
const sobran = Object.keys(ui).filter(k=>!clavesES.has(k));
if (faltan.length) avi('Faltan ' + faltan.length + ' claves de interfaz (se mostrarán en el idioma de respaldo): ' + faltan.slice(0,6).join(', ') + (faltan.length>6?'…':''));
if (sobran.length) avi('Hay ' + sobran.length + ' clave(s) que la app no usa y se ignorarán: ' + sobran.slice(0,4).join(', '));

// bloques que no debe traducir la comunidad
const legalesEnviados = Object.keys(ui).filter(k=>BLOQUES_LEGALES.some(b=>k.toLowerCase().startsWith(b)) || NO_TRADUCIBLES.test(k));
if (legalesEnviados.length)
  avi('Incluye textos legales o de arranque (' + legalesEnviados.slice(0,4).join(', ') + '). Esos NO los traduce la comunidad: se traducen profesionalmente o se dejan en inglés.');

// ---------- 3. marcadores intactos ----------
const marcadores = t => (String(t).match(/\{[a-z]\}|\[[^\]]{2,20}\]/gi) || []).sort();
const esRef = {};
[...bloqES.matchAll(/(?:\n\s{4}|,\s)(\w+)\s*:\s*'((?:[^'\\]|\\.)*)'/g)].forEach(m=>esRef[m[1]]=m[2]);
Object.entries(ui).forEach(([k,v])=>{
  const a = marcadores(esRef[k]||''), b = marcadores(v);
  if (a.length && a.join('|') !== b.join('|'))
    err('Marcadores alterados en «'+k+'»: el original tiene '+(a.join(' ')||'ninguno')+' y la traducción '+(b.join(' ')||'ninguno')+'. La app mostraría texto roto.');
});

// ---------- 4. sin HTML ----------
/* La app usa <b>, <i> y <br> en algunos textos propios: son inofensivas y se
   admiten. Cualquier otra etiqueta, o un atributo, sí es motivo de rechazo:
   por ahí se colarían enlaces, imágenes o código. */
const ETIQUETAS_OK = /^<\/?(b|i|br|strong|em)(\s+style="[^"<>]*")?\s*\/?>$/i;
const PELIGROSO = /\bon\w+\s*=|javascript:|<script|<iframe|<img|<a\s|href\s*=|src\s*=/i;
const conHTML = [];
const revisarHTML = (donde, v) => {
  const txt = String(v);
  if (PELIGROSO.test(txt)){ conHTML.push(donde + ' → contenido peligroso'); return; }
  const malas = (txt.match(/<[^>]+>/g) || []).filter(e=>!ETIQUETAS_OK.test(e));
  if (malas.length) conHTML.push(donde + ' → ' + malas[0]);
};
Object.entries(ui).forEach(([k,v])=>revisarHTML('interfaz.'+k, v));
Object.entries(datos.practicas||{}).forEach(([id,o])=>{ revisarHTML(id+'.título', o.t); revisarHTML(id+'.texto', o.x); });
if (conHTML.length) err('Contiene HTML en ' + conHTML.length + ' textos (' + conHTML.slice(0,3).join(', ') + '). No se admite: podría alterar la interfaz.');

// ---------- 5. prácticas ----------
const pr = datos.practicas || {};
const idsFaltan = [...idsPractica].filter(id=>!(id in pr));
const idsSobran = Object.keys(pr).filter(id=>!idsPractica.has(id));
if (idsSobran.length) err('Hay ' + idsSobran.length + ' prácticas que no existen en la biblioteca: ' + idsSobran.slice(0,4).join(', '));
Object.entries(pr).forEach(([id,o])=>{
  if (!o || !o.t || !o.x) err('La práctica ' + id + ' está incompleta (faltan título o texto).');
});

// ---------- 6. vocabulario con riesgo legal ----------
const reProh = PROHIBIDO[codigo], rePro = PROMESA[codigo], reAmb = AMBIGUO[codigo];
if (!reProh) avi('No hay lista de vocabulario prohibido para «'+codigo+'». La revisión legal automática NO se ha podido aplicar: hará falta revisión humana con retrotraducción.');
else {
  const marcados = [];
  const revisar = (donde, v) => {
    const s = String(v||'');
    if (reProh.test(s)) marcados.push([donde, (s.match(reProh)||[])[0]]);
    else if (rePro && rePro.test(s)) marcados.push([donde, 'promesa de eficacia']);
    else if (reAmb && reAmb.test(s)) avi('Palabra ambigua en ' + donde + ': «' + (s.match(reAmb)||[])[0] + '». Suele ser inocente (dar trato), pero conviene mirarla.');
  };
  Object.entries(ui).forEach(([k,v])=>{ if(!legalesEnviados.includes(k)) revisar('interfaz.'+k, v); });
  Object.entries(pr).forEach(([id,o])=>{ revisar(id+'.título', o&&o.t); revisar(id+'.texto', o&&o.x); });
  marcados.forEach(([d,p])=>err('Vocabulario con riesgo legal en ' + d + ': «' + p + '». La app no puede afirmar que diagnostica, previene o trata nada.'));
}

// ---------- informe ----------
const totalUI = clavesES.size, hechasUI = totalUI - faltan.length;
const totalPr = idsPractica.size, hechasPr = totalPr - idsFaltan.length;
const pct = n => Math.round(n*100);
console.log('\n=== Validación de «' + codigo + '» ' + (datos.nombre?('· '+datos.nombre):'') + ' ===');
console.log('  Interfaz:  ' + hechasUI + '/' + totalUI + '  (' + pct(hechasUI/totalUI) + '%)');
console.log('  Prácticas: ' + hechasPr + '/' + totalPr + '  (' + pct(hechasPr/totalPr) + '%)');
if (datos.autor) console.log('  Traducción de: ' + datos.autor);
console.log('');
avisos.forEach(a=>console.log('  AVISO  ' + a));
errores.forEach(e=>console.log('  ERROR  ' + e));
console.log('');
if (errores.length){
  console.log('>>> NO ACEPTABLE: ' + errores.length + ' error(es). Hay que corregirlos antes de revisar.');
  process.exit(1);
}
console.log('>>> Pasa la validación automática (' + avisos.length + ' aviso(s)).');
console.log('    Faltan las otras dos capas: retrotraducción asistida y revisión humana.');
process.exit(0);
