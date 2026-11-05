// Utilidades comunes de las herramientas de auditoría y pruebas.
//
// Antes cada herramienta leía index.html por su cuenta, algunas desde rutas fijas
// del ordenador donde se escribieron, y daban por hecho que todo el código estaba
// dentro de index.html. Aquí se resuelve en un solo sitio: qué scripts carga la
// app, en qué orden, y dónde está jsdom.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const WWW = path.join(RAIZ, 'www');
// Archivos de datos (textos, biblioteca): no son lógica de la app
const DATOS = ['i18n.js', 'contenido.js', 'practices.js'];

function leer(rel){ return fs.readFileSync(path.join(WWW, rel), 'utf8'); }
function indexHtml(){ return leer('index.html'); }

// Scripts que carga index.html, en su orden
function scripts(){
  return [...indexHtml().matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
}
// Código de la propia app (sin los archivos de datos), en orden de carga,
// más cualquier script que siga escrito dentro de index.html
function codigoApp(){
  const ext = scripts().filter(f => !DATOS.includes(f)).map(f => '// ==== ' + f + '\n' + leer(f));
  const inline = [...indexHtml().matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  return ext.concat(inline).join('\n');
}
// Todo: el HTML, los datos y la lógica (para búsquedas de textos)
function todo(){
  return [indexHtml()].concat(scripts().map(leer)).join('\n');
}
// index.html con los scripts y estilos dentro, para ejecutarlo en jsdom
function htmlConScripts(){
  return indexHtml()
    .replace(/<script src="([^"]+)"><\/script>/g, (m, f) => '<script>' + leer(f) + '</script>')
    .replace('<link rel="stylesheet" href="estilos.css">', () => '<style>' + leer('estilos.css') + '</style>');
}
// jsdom: el del proyecto (npm install) o, si no, el de la instalación antigua
function rutaJsdom(){
  for (const r of [path.join(RAIZ, 'node_modules', 'jsdom'), '/home/claude/momento-para-ti/node_modules/jsdom']){
    try { return require.resolve(r); } catch(e) {}
  }
  console.error('Falta jsdom: ejecuta «npm install» en la raíz del proyecto.');
  process.exit(2);
}

module.exports = { RAIZ, WWW, DATOS, leer, indexHtml, scripts, codigoApp, todo, htmlConScripts, rutaJsdom };
