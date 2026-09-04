#!/usr/bin/env node
/* Genera los archivos de idioma en JSON a partir de i18n.js y practices.js.
 *
 *   node tools/exportar-idiomas.js
 *
 * Produce:
 *   idiomas/indice.json   qué idiomas hay, con su estado
 *   idiomas/es.json       interfaz + textos de las prácticas
 *   idiomas/en.json
 *
 * Estos archivos son la plantilla que se entrega a quien vaya a traducir, y el
 * formato que la app cargará. Se generan, no se editan a mano: el original sigue
 * siendo i18n.js hasta que la app cargue los JSON directamente.
 */
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..');
const W = path.join(RAIZ, 'www') + path.sep;
const DEST = path.join(RAIZ, 'idiomas');

const idx = fs.readFileSync(W + 'i18n.js', 'utf8');
function bloqueIdioma(txt, marca){
  const ini = txt.indexOf(marca); if (ini < 0) return '';
  let prof = 0;
  for (let k = ini; k < txt.length; k++){
    if (txt[k] === '{') prof++;
    else if (txt[k] === '}'){ prof--; if (prof === 0) return txt.slice(ini, k); }
  }
  return txt.slice(ini);
}
// se evalúa el diccionario tal cual: es código propio, no de terceros
const I18N = eval(idx + ';I18N');
const [PRACTICAS, TEXTOS, CATEGORIAS] = eval(
  fs.readFileSync(W + 'practices.js', 'utf8') + ';[PRACTICAS, TEXTOS, CATEGORIAS]');

/* Claves que NO traduce la comunidad: sostienen la protección legal o hacen
   falta antes de haber elegido idioma. Se marcan aparte para que quien traduzca
   sepa que no debe tocarlas. */
const NO_TRADUCIBLE = /^(acept|legal|priv_|cond_|ob_lang|pr_titular|pr_accept)/;

fs.mkdirSync(DEST, { recursive: true });
const hechos = [];

Object.keys(I18N).forEach(codigo => {
  const ui = {}, fijos = {};
  Object.entries(I18N[codigo]).forEach(([k, v]) => {
    (NO_TRADUCIBLE.test(k) ? fijos : ui)[k] = v;
  });

  const practicas = {};
  const t = TEXTOS[codigo] || {};
  PRACTICAS.forEach(p => { if (t[p.id]) practicas[p.id] = { t: t[p.id].t, x: t[p.id].x }; });

  const categorias = {};
  CATEGORIAS.forEach(c => { if (c[codigo]) categorias[c.id] = c[codigo]; });

  const doc = {
    codigo,
    nombre: codigo === 'es' ? 'Español' : codigo === 'en' ? 'English' : codigo,
    esquema: 1,
    autor: 'Jordi Beold',
    licencia: 'AGPL-3.0',
    revisado: true,
    // los que no traduce la comunidad viajan aparte, para que se vea claro
    fijos,
    categorias,
    interfaz: ui,
    practicas,
  };
  const ruta = path.join(DEST, codigo + '.json');
  fs.writeFileSync(ruta, JSON.stringify(doc, null, 1));
  hechos.push({
    codigo, nombre: doc.nombre,
    interfaz: Object.keys(ui).length,
    fijos: Object.keys(fijos).length,
    practicas: Object.keys(practicas).length,
    kb: Math.round(fs.statSync(ruta).size / 1024),
  });
});

// índice: lo que la app consultará para saber qué hay disponible
const indice = {
  esquema: 1,
  actualizado: new Date().toISOString().slice(0, 10),
  totalPracticas: PRACTICAS.length,
  idiomas: hechos.map(h => ({
    codigo: h.codigo,
    nombre: h.nombre,
    incluido: true,                       // va dentro de la app
    revisado: true,
    completo: h.practicas === PRACTICAS.length,
    practicas: h.practicas,
    rtl: ['ar','he','fa','ur'].includes(h.codigo),
  })),
};
fs.writeFileSync(path.join(DEST, 'indice.json'), JSON.stringify(indice, null, 1));

console.log('Idiomas generados en idiomas/');
hechos.forEach(h => console.log('  ' + h.codigo + '  ' + String(h.nombre).padEnd(8) +
  ' interfaz ' + h.interfaz + ' · fijos ' + h.fijos +
  ' · prácticas ' + h.practicas + '/' + PRACTICAS.length + '  (' + h.kb + ' KB)'));
console.log('  indice.json con ' + indice.idiomas.length + ' idiomas');
