# Moment

**Momento para ti** · Pequeñas prácticas para grandes cambios

Aplicación Android de bienestar y exploración personal. A lo largo del día propone
prácticas breves —de menos de tres minutos— mediante avisos del sistema.

Todo vive en el dispositivo: sin cuentas, sin servidores, sin rastreo. Nada sale
del móvil salvo que la persona lo envíe.

---

## Cómo obtener el APK

No hace falta instalar nada en el ordenador ni usar la terminal. GitHub compila
la aplicación en sus propios servidores.

1. Pestaña **Actions** → **Construir APK** → botón **Run workflow**.
2. Esperar unos tres minutos a que aparezca el tic verde.
3. Ir a **Releases**: el archivo `moment-vX.XX.apk` está ahí.

El enlace de la última versión no cambia nunca:
`releases/tag/apk-ultimo`

> Al cambiar archivos de `www/` la compilación arranca sola. Al cambiar
> workflows, herramientas o documentación, no: hay que lanzarla a mano.

## Para publicar en Google Play

**Actions** → **Release para Google Play y web** → **Run workflow**. Genera el AAB
firmado y el APK de release.

La clave de firma **no está en el repositorio**: vive en el secreto
`ANDROID_KEYSTORE_B64` (Settings → Secrets and variables → Actions), que GitHub
guarda cifrado y no muestra a nadie. Sin ese secreto, la compilación de release
falla con un aviso claro; la compilación normal del APK de pruebas funciona igual.

> Si esa clave se pierde, **no se pueden publicar actualizaciones** de la app en
> Google Play: habría que publicarla como una aplicación nueva. Conviene guardar
> una copia fuera de GitHub.

## Licencia

Código publicado bajo **GPL v3**: cualquiera puede usarlo, estudiarlo y modificarlo,
pero las versiones derivadas deben seguir siendo libres y con el código abierto.
Esto protege la promesa de la aplicación: que nadie pueda tomarla, añadirle rastreo
y cerrarla.

Los textos de las prácticas y los contenidos de El Novè Camí no son código y
mantienen sus derechos reservados por su autor.

## Estructura

```
www/                      la aplicación (HTML + CSS + JS, sin compilar)
  index.html              interfaz, lógica y textos en dos idiomas
  practices.js            biblioteca de 209 prácticas (ES/EN)
  sw.js                   service worker de la versión web
tools/
  prepare-android.js      inyecta el código nativo tras generar el proyecto
  set-version.js          versionName y versionCode
  setup-signing.js        firma del release
  auditoria/              pruebas y analizadores (no se compilan)
.github/workflows/        compilación, release y limpieza de artefactos
DOCUMENTACION-TECNICA.md  guía completa del proyecto
```

## Traducir la app

Un idioma es un archivo: `idiomas/<código>.json`. Ver **`TRADUCIR.md`** antes de
empezar: hay textos legales que la comunidad no traduce y una validación
automática que se ejecuta al proponer.

```bash
node tools/exportar-idiomas.js                    # regenera idiomas/ desde el código
node tools/validar-idioma.js idiomas/ar.json ar   # valida una traducción
```

## Antes de tocar el código

Leer **`DOCUMENTACION-TECNICA.md`**, en particular las diez reglas del apartado 13.
Tres son críticas:

- Nunca texto literal en la interfaz: siempre `t('clave')`, en ambos idiomas.
- Nunca afirmaciones sanitarias ni promesas de eficacia (hay un motivo legal).
- Nunca `nativeReschedule()` directo: usar `pedirReprogramacion()`.

Y pasar la batería de pruebas antes y después de cada cambio:

```bash
npm install jsdom
node tools/auditoria/pruebas.js            # 66 comprobaciones
node tools/auditoria/analisis-bateria.js   # consumo
node tools/auditoria/analisis-codigo.js    # código muerto e idiomas
node tools/auditoria/escaner-legal.js      # vocabulario con riesgo legal
```

## Aviso

Moment es una aplicación de bienestar y exploración personal. Ni la aplicación ni
ninguna de sus prácticas sirve para diagnosticar, prevenir ni tratar enfermedad o
condición alguna. No sustituye a los profesionales de la salud.

---

Una iniciativa de **El Novè Camí** · Jordi Beold · jordibeold@jordibeold.com
