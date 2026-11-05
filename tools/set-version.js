// Ajusta la versión del proyecto Android para Google Play:
// - versionName: se toma de APP_VERSION en www/js/base.js (ej. "3.27")
// - versionCode: número entero SIEMPRE creciente que exige Play en cada subida.
//   Lo pasa el workflow desde el número de ejecución de GitHub Actions,
//   así cada compilación tiene un código mayor que la anterior sin hacer nada a mano.
const fs = require('fs');
// APP_VERSION vive en www/js/base.js (antes, dentro de index.html)
const html = ['www/js/base.js', 'www/index.html'].filter(f => fs.existsSync(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
const m = html.match(/APP_VERSION = '([^']+)'/);
const versionName = m ? m[1] : '1.0';
const versionCode = parseInt(process.env.VERSION_CODE || '1', 10);
const gp = 'android/app/build.gradle';
let g = fs.readFileSync(gp, 'utf8');
g = g.replace(/versionCode\s+\d+/, 'versionCode ' + versionCode);
g = g.replace(/versionName\s+"[^"]*"/, 'versionName "' + versionName + '"');
fs.writeFileSync(gp, g);
console.log('Versión para Play: ' + versionName + ' (versionCode ' + versionCode + ')');
