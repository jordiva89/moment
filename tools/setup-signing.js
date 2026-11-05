// Configura la firma fija del APK: decodifica el keystore y ajusta build.gradle
const fs = require('fs');
// 1. Reconstruir el keystore desde base64.
//    La clave de firma NO debe estar en el repositorio si este es público: quien la
//    tuviera podría publicar actualizaciones falsas de la app. Se lee del secreto
//    ANDROID_KEYSTORE_B64 y, solo si no existe, del archivo local (repos privados).
const b64 = process.env.ANDROID_KEYSTORE_B64
  || (fs.existsSync('keystore.b64') ? fs.readFileSync('keystore.b64','utf8') : '');
if (!b64.trim()) {
  console.error('Falta la clave de firma. Añade el secreto ANDROID_KEYSTORE_B64 en');
  console.error('Settings > Secrets and variables > Actions, con el contenido de keystore.b64.');
  process.exit(1);
}
fs.writeFileSync('android/app/momento-release.keystore', Buffer.from(b64, 'base64'));
// 2. Inyectar signingConfig en build.gradle (bloque android { ... })
const gp = 'android/app/build.gradle';
let g = fs.readFileSync(gp, 'utf8');
// 3. Contraseñas: desde los secretos ANDROID_KEYSTORE_PASSWORD y ANDROID_KEY_PASSWORD.
//    Las de siempre estaban escritas aquí, en un repositorio público: si el archivo
//    de la clave se filtrara algún día, nada impediría usarlo. Mientras no se
//    cambien (ver AUDITORIA.md) se usan las antiguas y se avisa en el registro.
const ANTIGUA = 'momento2026';
const passAlmacen = process.env.ANDROID_KEYSTORE_PASSWORD || ANTIGUA;
const passClave = process.env.ANDROID_KEY_PASSWORD || passAlmacen;
if (passAlmacen === ANTIGUA) console.warn('AVISO: la clave de firma usa la contraseña antigua, que es pública. Conviene cambiarla (AUDITORIA.md, punto de la firma).');
// Gradle lee las contraseñas como texto entre comillas simples: se escapan
const gq = x => String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
if (!g.includes('MOMENTO_SIGNING')) {
  const signing = `
    // MOMENTO_SIGNING: firma fija para conservar datos entre versiones
    signingConfigs {
        momento {
            storeFile file('momento-release.keystore')
            storePassword '${gq(passAlmacen)}'
            keyAlias 'momento'
            keyPassword '${gq(passClave)}'
        }
    }`;
  // añadir signingConfigs justo tras la apertura de android {
  g = g.replace(/android\s*\{/, 'android {' + signing);
  // aplicar la firma al tipo debug (APK directo) y al tipo release (AAB para Google Play y APK web)
  g = g.replace(/buildTypes\s*\{/, "buildTypes {\n        debug { signingConfig signingConfigs.momento }");
  g = g.replace(/release\s*\{/, "release {\n            signingConfig signingConfigs.momento");
  fs.writeFileSync(gp, g);
  console.log('Firma fija aplicada a build.gradle');
} else {
  console.log('build.gradle ya tenía la firma');
}
