# Moment — documentación técnica

> Guía completa del proyecto para cualquier persona que vaya a continuar el
> desarrollo. Describe qué hace la app, cómo está construida, por qué se tomaron
> las decisiones que se tomaron y qué hay que respetar al tocarla.
>
> Versión documentada: **3.77** · 139 pruebas · 52 archivos
>
> La app se llama **Moment**. «Momento para ti» sigue siendo el nombre de la
> **función** con la que cada persona crea sus propios momentos: son cosas distintas.

---

## 0. Autoría y encuadre

**Moment** es una herramienta de **Jordi Beold**, y forma parte de **El Novè Camí**.
No es un producto independiente: es un instrumento que facilita ese camino, la
práctica cotidiana convertida en algo que cabe en el día.

Esto tiene consecuencias prácticas para quien desarrolle:

- El contenido —las prácticas, las citas, los textos del Noveno Camino— **no es
  intercambiable**. Responde a un cuerpo de conocimiento propio, no a una
  colección genérica de ejercicios de bienestar.
- Las decisiones de producto se toman desde ahí: la app no busca crecer ni
  monetizar, sino acompañar. Por eso es gratuita, sin cuentas y sin rastreo.
- El código es abierto (AGPL v3); el contenido mantiene sus derechos reservados
  por su autor.

Responsable y contacto: **jordibeold@jordibeold.com**

## 1. Qué es

Aplicación Android de bienestar y exploración personal. A lo largo del día propone
prácticas breves —de menos de tres minutos— mediante avisos del sistema. La persona
las hace, las marca, las pospone o las ignora.

**Tres principios que condicionan todo el diseño técnico:**

1. **Todo vive en el dispositivo.** Sin cuentas, sin servidores, sin telemetría,
   sin rastreo. Nada sale del móvil salvo que la persona lo envíe explícitamente.
2. **Sin afirmaciones sanitarias.** Ni la app ni ninguna práctica diagnostica,
   previene ni trata condición alguna. Esto no es preferencia estética: es un
   requisito legal (ver §10).
3. **Cada práctica se hace en solitario**, sin materiales y sin guía externa.

---

## 2. Arquitectura

Aplicación web de un solo archivo envuelta en **Capacitor 6** para Android.
No hay framework, ni compilador, ni paso de construcción para el código web:
`index.html` se ejecuta tal cual.

```
moment/
├── www/                        ← la aplicación
│   ├── index.html              lógica e interfaz
│   ├── i18n.js                 diccionario de idiomas (ES/EN)
│   ├── contenido.js            aviso legal, textos del Noveno Camino, citas, plantilla
│   ├── estilos.css             hojas de estilo
│   ├── practices.js            biblioteca de prácticas (datos)
│   ├── sw.js                   service worker (versión web/PWA)
│   ├── manifest.webmanifest
│   ├── icon-192.png · icon-512.png
│   └── noveno-es.png · noveno-en.png
├── tools/
│   ├── prepare-android.js      inyecta el código nativo tras generar el proyecto
│   ├── set-version.js          fija versionName/versionCode
│   ├── setup-signing.js        configura la firma del release
│   └── auditoria/              analizadores y batería de pruebas
├── .github/workflows/
│   ├── build-apk.yml           compila y publica el APK como Release
│   ├── build-release.yml       genera el AAB para Google Play
│   └── limpiar-artefactos.yml  libera almacenamiento de GitHub
├── capacitor.config.json
└── package.json
```

**Datos separados de la lógica.** `i18n.js`, `contenido.js` y `estilos.css` contienen
solo constantes y estilos, y se cargan antes que el código. Editar un texto legal o
añadir una cita no obliga a bucear en la lógica. **Si se añade otro archivo a `www/`,
hay que incluirlo en la lista `FILES` de `sw.js`** o la versión web dejará de
funcionar sin conexión.

**Por qué index.html sigue siendo un solo archivo.** El proyecto lo mantiene una persona sin formación
técnica formal, con ayuda puntual. Un archivo editable y desplegable sin compilar
reduce drásticamente la barrera de entrada. El coste (un archivo grande) se
compensa con las herramientas de auditoría del §11.

---

## 2 bis. Identidad de la aplicación

| Dato | Valor | Se puede cambiar |
|---|---|---|
| Nombre visible | **Moment** | Sí (`capacitor.config.json` → `appName`, `manifest.webmanifest`, `app_title`) |
| Subtítulo de portada | Momento para ti | Sí (clave `app_sub`) |
| Identificador | `com.novecami.moment` | **No, una vez publicada en Google Play** |
| Paquete Java | `com.novecami.moment` | Se deriva del identificador; `prepare-android.js` lo usa en sus rutas |

> El identificador es la identidad de la app para Android y para Google Play.
> Cambiarlo crea **una aplicación distinta**: la anterior no se actualiza, sino que
> conviven las dos, y se pierden instalaciones, valoraciones e historial. Si se
> cambia antes de publicar, quien tenga el APK antiguo debe exportar su copia de
> seguridad, desinstalar e instalar la nueva.
>
> Si se toca el identificador, hay que actualizar **también** las rutas del paquete
> Java en `tools/prepare-android.js` (secciones 3 y 4): Capacitor genera la carpeta
> `android/app/src/main/java/<ruta del identificador>/` y el script escribe ahí.

## 3. Modelo de datos

Todo se guarda en `localStorage` mediante el ayudante `LS` (`get`/`set`/`remove`,
con JSON y captura de errores). Claves:

| Clave | Contenido |
|---|---|
| `mpt_cfg` | Configuración: `startH`, `startM`, `freq`, `span`, `favPerDay`, `visDia`, `catsPref`, `soloEventos`, `constIni/Med/Fin` |
| `mpt_day` | Plan del día en curso: `{date, used, plan[]}` |
| `mpt_plans` | Caché de planes de días futuros |
| `mpt_events` | Momentos propios creados por la persona |
| `mpt_evpaused` | Momentos propios en pausa |
| `mpt_favs` · `mpt_paused` | Prácticas favoritas y pausadas |
| `mpt_userlib` | Prácticas creadas por la persona |
| `mpt_stats` · `mpt_donelog` | Estadísticas de uso e historial |
| `mpt_lang` | Idioma elegido (`es` / `en`) |
| `mpt_accept` | Aceptación de responsabilidad (sin ella la app se bloquea) |
| `mpt_alarm` · `mpt_notifOn` | Modo alarma y avisos activados |
| `mpt_install` · `mpt_ver` · `mpt_update` | Fechas de instalación y versión |
| `mpt_lastProg` · `mpt_statsRemind` · `mpt_guiaVista` | Control interno |

Una entrada del plan del día:

```js
{ time: 600,          // minutos desde medianoche
  pid: 'p042',        // id de práctica
  ev: 'e17849…',      // id del momento propio, si lo es
  done: false,
  snoozes: 0,
  snoozeUntil: null,
  muted: false }
```

---

## 4. La biblioteca (`practices.js`)

Tres piezas, separadas a propósito para poder añadir idiomas sin tocar los datos:

```js
CATEGORIAS = [{id:'armonizacion', es:'Armonización', en:'Harmonization'}, …]
PRACTICAS  = [{id:'p001', cat:'armonizacion', link:'…'}, …]   // sin texto
TEXTOS     = { es:{p001:{t:'título', x:'texto'}, …}, en:{…} }
```

**La categoría es un código**, no un texto traducido. Así el filtrado, las
categorías preferidas y las estadísticas no dependen del idioma. La etiqueta
visible sale de `CATEGORIAS`.

**Los textos se indexan por identificador**, no por posición. Antes eran dos
listas paralelas que debían ir en el mismo orden: con tres idiomas eso se rompe.

`construirPracticas(lang, respaldo)` arma la lista de un idioma y **rellena con el
idioma de respaldo lo que falte**, de modo que una traducción incompleta nunca deja
huecos. De ahí salen `PRACTICES_ES` y `PRACTICES_EN`, que conservan la forma
anterior (`id`, `cat`, `catLabel`, `title`, `text`, `link`) para que el resto del
código no cambie.

Estado actual: **209 prácticas** en 8 categorías. 62 con vídeo enlazado.

Dos constantes gobiernan comportamientos especiales:

- `VIS_ID` — la práctica que entra con «una visualización cada día».
- `ESPECIALES` — prácticas para una hora fija; Ajustes ofrece crear un momento propio con cada una.

**Añadir un idioma** = añadir un bloque a `TEXTOS` con las mismas claves y una
etiqueta por categoría en `CATEGORIAS`. No hay que reordenar nada.

> Los ids siguen siendo posicionales al **generar** el archivo: si se elimina una
> práctica hay que renumerar y revisar `VIS_ID` y `ESPECIALES`.

## 5. El motor del día

Cómo se construye el plan (`buildDayEntries`):

1. `slotTimes()` calcula las franjas horarias desde `startH:startM`, cada `freq`
   horas, durante `span` horas. **Se incluyen la primera y la última**, así que
   hay una franja más que horas configuradas.
2. `eventOccurrences(fecha)` obtiene los momentos propios de ese día, incluidos
   los **arrastres**: una repetición que pasa de medianoche cae al día siguiente
   (`eventTimes` devuelve minutos crudos que pueden superar 1439).
3. Si `cfg.soloEventos` está activo, el día lo forman **únicamente** los momentos
   propios. Si no hay ninguno, el día queda vacío: es lo que se ha pedido.
4. `pickPractices()` elige el resto evitando repetir, respetando pausas y
   reservando el cupo de favoritas (`favPerDay`).
5. Cadena de colocación:
   `placeVisualization(placeCategoryPrefs(placeConstellations(elegidas)))`
6. Las horas marcadas como exclusivas por un momento propio (`ev.excl`) pierden
   su propuesta del patrón. **Esa decisión se guarda en el momento, no en el día**,
   así que se respeta también mañana.

`franjasConstelacion(n)` es la única definición de qué franjas se reservan a
constelaciones; la usan tanto la visualización como las categorías preferidas.

---

## 6. Notificaciones

Dos caminos según el entorno:

**Nativo (APK).** Se programan en Android con `@capacitor/local-notifications`.
`DAYS_AHEAD = 4` días por adelantado; `RECARGA_DIAS = 4` dispara una recarga
silenciosa si la app no se abre. Dos canales:

- `momento` — avisos normales.
- `momento_despertador` — modo alarma: suena aunque el móvil esté en silencio.
  Lo crea `MainActivity` al arrancar y `renombrarCanal` lo ajusta al idioma
  elegido **dentro de la app** (no el del sistema).

Cada aviso lleva tres acciones: **Hecha**, **Posponer** y **Abrir**. La primera
marca la práctica sin necesidad de navegar por la app.

**Web (PWA).** El service worker las lanza. `armPrecise()` pone un temporizador
exacto para el próximo momento y un pulso de 60 s recoge lo que se quede atrás.

> **Regla de oro del consumo:** toda reprogramación pasa por
> `pedirReprogramacion()`, que agrupa las peticiones cercanas en una sola.
> Cancelar y volver a programar decenas de avisos es la operación más cara que
> hace la app. **Nunca llamar a `nativeReschedule()` directamente.**

---

## 7. Consumo de batería

Decisiones tomadas expresamente y que **no conviene revertir sin medir**:

- **Sin temporizadores periódicos en nativo.** `armMedianoche()` despierta una
  sola vez al día para rehacer el plan. Antes había un intervalo de 60 s: 1440
  despertares diarios para detectar un cambio que ocurre una vez al día.
- **Reprogramación agrupada** (§6).
- **Nada se comprueba en el arranque** que pueda esperar. La verificación del APK
  incrustado usa `HEAD` (antes descargaba 10 MB enteros en cada apertura).
- **Los temporizadores se detienen** al pasar a segundo plano (`stopWatch()` en
  `visibilitychange` y `appStateChange`).
- **La exención de batería se presenta como último recurso**, no como paso
  recomendado: es lo que más consumo añade, porque saca la app del modo de reposo.

Verificación: `node tools/auditoria/analisis-bateria.js` (devuelve código 1 si
encuentra algo grave, se puede enganchar a la compilación).

---

## 8. Capa nativa

`tools/prepare-android.js` se ejecuta **después** de `npx cap add android` e
inyecta el código Java. Se ejecuta en cada compilación, así que el proyecto
Android es desechable y reproducible.

Qué hace, por secciones:

1. Permisos en el manifiesto: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`,
   `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`.
2. Iconos en todas las densidades.
3. `MainActivity` — crea el canal de alarma con sonido de tipo alarma.
4. `AjustesPlugin` — plugin propio con estos métodos:
   `renombrarCanal`, `abrirPantalla`, `abrirBateria`, `abrirAutoarranque`,
   `estadoBateria`, `compartirArchivo`, `guardarDescarga`, `infoDispositivo`.
5. Pantalla de inicio: fondo del color de la portada (`#2B241C`) y **sin icono**,
   para que se perciba una sola pantalla de arranque.

> La plantilla de Capacitor usa `Theme.SplashScreen`, que **ignora**
> `android:background` y usa sus propios atributos sin prefijo
> (`windowSplashScreenBackground`, `windowSplashScreenAnimatedIcon`). Este detalle
> costó varias iteraciones: si el splash vuelve a salir blanco, es aquí.

---

## 9. Interfaz

Cuatro pestañas: **Agenda** (`home`), **Biblioteca** (`lib`),
**El Noveno Camino** (`fav`) y **Ajustes** (`set`).

Piezas transversales:

- `secAjustes(id, título, cuerpo)` — armazón de las secciones plegables de Ajustes.
- `boxHead(...)` — cabecera común de las cajas plegables del resto de pestañas.
- `verCaja(selector)` — al plegar o desplegar, sube la caja a la parte alta de la
  pantalla. **Descuenta la altura de la cabecera pegajosa** y desactiva el anclaje
  de scroll del navegador (`overflow-anchor:none`); sin eso, el navegador deshacía
  el desplazamiento.
- `caraReloj(fase, valor, tamaño, callback)` — esfera táctil para elegir horas y
  minutos. Se usa en la bienvenida, en Ajustes y en los momentos propios.
- `esc(texto)` — **obligatorio** para cualquier contenido creado por la persona
  antes de insertarlo en HTML (títulos, categorías, nombres de momentos).

### Dónde vive cada ajuste

- **Tu patrón de práctica**: hora de inicio, frecuencia, horas al día, favoritas,
  constelaciones, visualización diaria, categorías preferidas, momentos propios y
  Especiales. Es decir: cómo se organiza el día.
- **Datos y privacidad**: idioma principal (con banderas, `banderaIdioma()`),
  idioma de respaldo, importar un idioma, copia de seguridad, archivos
  encontrados en el móvil, incidencias técnicas, versión y restablecer.

Hasta la v3.74 los ajustes de idioma estaban repartidos entre las dos secciones y
el selector de idioma aparecía duplicado. Si se añade un ajuste nuevo, decidir a
cuál de las dos pertenece: **el patrón trata del día; datos y privacidad, de la
información y el dispositivo.**

### Texto justificado y botones centrados

Desde la v3.77, los textos de la app y de la biblioteca van **justificados** con
partición de palabras (`hyphens:auto`); sin ella, el justificado deja huecos
enormes en pantallas estrechas. Títulos y etiquetas no se justifican.

Los botones van **centrados**. El contenedor se marca con la clase **`.cbtn`**, que
lleva `text-align:center !important` porque la regla de justificado tiene más
peso. **Al añadir un botón dentro de un párrafo o una fila, poner `.cbtn` en el
contenedor.** No se usa `:has()`: no todos los motores lo soportan.

### Internacionalización

Diccionario `I18N = {es, en}` con **264 claves**. Regla estricta:

```js
t('clave')            // ✅ siempre
getLang()==='en'?…:…  // ❌ nunca en texto de interfaz
'Texto en español'    // ❌ nunca literal
```

Verificación: `node tools/auditoria/analisis-codigo.js` detecta claves huérfanas,
desajustes entre idiomas y textos fijos.

---

## 9 bis. Funcionalidades y piezas transversales

Además del motor del día y las notificaciones, conviene conocer estas piezas:

**Momentos propios.** `openEventForm(editId, presetPid)` crea o edita un momento.
Repetición dentro del día en dos modos: `int` (n veces cada x horas) y `list`
(horas concretas). `eventTimes()` devuelve minutos crudos que pueden pasar de 1439
—esas repeticiones caen al día siguiente— y `evChocaPatron()` detecta si pisa el
patrón; la decisión se guarda en `ev.excl`.

**Límite de repeticiones (`ev.veces`).** Un momento puede apagarse solo tras un
número de repeticiones: probar una práctica 7, 13, 21 o 30 veces, o las que se
quiera. `eventsFor()` calcula en qué vuelta va según la frecuencia y descarta el
momento cuando `vuelta >= ev.veces`. **La unidad la marca la frecuencia**: en un
momento diario son días; en uno semanal, semanas; en uno mensual, meses. Con
`ev.veces` a 0 o ausente se repite indefinidamente, que es el comportamiento por
defecto y el de todos los momentos creados antes de la v3.75.

**Prácticas propias e importación.** La persona puede crear prácticas
(`mpt_userlib`) y también importarlas desde un documento Word o un archivo de
texto. `importarDatosTexto()` reconoce además el formato JSON de las copias de
seguridad, y `esEjemploPlantilla()` descarta los ejemplos de la plantilla.

**Los prefijos del lector se derivan de los idiomas cargados.** `prefijosCampos()`
los construye a partir de las claves `fmt_title`, `fmt_cat`, `fmt_text` y
`fmt_link` de **todos** los idiomas presentes, incluidos los importados; `esCampo()`
compara sin acentos ni mayúsculas. Así, una plantilla rellenada en francés
(`Titre:`, `Catégorie:`) se lee sin tocar el código.

> **Invariante:** la plantilla se **genera** con esas mismas claves y el lector las
> **consume**. Mientras sea así no pueden desincronizarse. Si algún día se cambia
> el texto de un prefijo, hay que cambiarlo en la clave de idioma, nunca en el
> lector. `olvidarPrefijos()` recalcula la lista al importar un idioma nuevo.
>
> Antes los prefijos estaban escritos a mano y solo cubrían español e inglés: una
> plantilla en otro idioma daba «no se encontraron prácticas».


**Copias de seguridad.** `exportarDatos()` guarda el archivo directamente en la
carpeta Descargas (`guardarDescarga`), y luego ofrece enviarlo a otro sitio con
`compartirBytes()`. La bienvenida incluye un paso para cargar una copia antes de
configurar nada.

**Diagnóstico.** `datosDispositivo()` obtiene modelo, versión de Android, pantalla,
estado del canal de alarma, exención de batería y modo No molestar mediante el
método nativo `infoDispositivo`, con respaldo desde el navegador si no está
disponible. `bloqueDiagnostico()` construye un bloque **visible** que se añade al
correo de sugerencias, para que la persona pueda leerlo y borrarlo si quiere.

**Notificaciones accionables.** `nativeDoneFromNotif()` marca la práctica como
hecha desde el propio aviso, sin abrir la app. En la web, el service worker
manda `done-practice` y `doneByPid()` hace lo mismo.

**Idioma del canal.** `sincronizarCanal()` renombra el canal de alarma de Android
con el idioma elegido **dentro de la app**, con reintentos: al arrancar, el plugin
puede no estar listo o el canal aún no existir.

**Categorías preferidas y especiales.** `setCatPref()` marca una categoría
(crea `cfg.catsPref` si falta, cosa que ocurría en instalaciones nuevas y era un
fallo real). `especialesLista()` resuelve la constante `ESPECIALES` a prácticas.

**Botón atrás.** `atrasApp()` es la definición única: cierra el pop-up si lo hay,
si no retrocede en la pila de vistas. La usan la ruta nativa y `popstate`.

**Aceptación legal.** `aceptado()`, `renderAceptacion('ob'|'bloqueo')` y
`desactivarAceptacion()`. Sin aceptación, el arranque muestra solo el aviso.

## 10. Marco legal (leer antes de tocar textos)

La app se publica bajo el nombre artístico **Jordi Beold**
(jordibeold@jordibeold.com). El proyecto pretende constituirse como asociación y,
más adelante, como la Fundación del Noveno Camino.

**Pantalla de aceptación.** Aparece tras elegir idioma y bloquea la app entera
hasta que se acepta. Se puede desactivar desde Ajustes, y entonces **todo queda
bloqueado salvo el propio aviso**. Contiene: qué es y qué no es, consulta previa
si hay tratamiento, doce contraindicaciones, recomendaciones de uso, tratamiento
de datos y asunción de responsabilidad.

**Vocabulario prohibido en prácticas y en la interfaz:**

- Términos clínicos: sanar, sanación, terapia, tratamiento, curar, síntoma,
  diagnóstico, enfermedad, chakra (sustituido por «contenedor de energía» y
  «sistema de energía»).
- **Promesas de eficacia**: «reduce el estrés», «mejora la oxigenación»,
  «fortalece el sistema inmunitario». Esto es lo más delicado: el RD 1907/1996
  prohíbe atribuir propiedades preventivas o curativas a servicios sin
  autorización sanitaria.

**Ese vocabulario sí debe conservarse** dentro de la pantalla de aceptación y en
las contraindicaciones de prácticas concretas: ahí protege en lugar de exponer.

Verificación: `node tools/auditoria/escaner-legal.js`, que distingue las zonas
protectoras de las expuestas.

---

## 10 bis. Registro de incidencias

Las operaciones que pueden fallar sin ser críticas (plugins nativos, avisos,
almacenamiento) van envueltas en `try/catch`. Antes fallaban en silencio: el canal
de alarma estuvo roto veinte versiones sin que nadie lo supiera. Ahora:

- `anota(donde, error)` guarda la incidencia en `mpt_log` (las 40 últimas, sin
  repetir la misma una y otra vez: las cuenta).
- `intentar(donde, fn, porDefecto)` envuelve una operación y anota si falla.
- Los errores no capturados y las promesas rechazadas se anotan solos.
- Se ven en **Ajustes → Incidencias técnicas** y viajan en el correo de diagnóstico.

Al añadir un `try/catch` nuevo, **anotar en él** en vez de dejarlo vacío.

## 10 ter. Migraciones de la configuración

`cfg.v` guarda la versión del esquema. Para añadir un ajuste nuevo: subir
`CFG_VERSION` y añadir una entrada a `MIGRACIONES` con ese número. Se aplican en
orden y solo las que falten. **No añadir comprobaciones sueltas** del tipo
`if(cfg.x===undefined)`.

## 11. Herramientas de auditoría

En `tools/auditoria/`. No forman parte de la app: no se compilan ni se envían.

```bash
node tools/auditoria/pruebas.js            # batería de pruebas (necesita jsdom)
node tools/auditoria/analisis-bateria.js   # consumo: temporizadores, red, avisos
node tools/auditoria/analisis-codigo.js    # código muerto, i18n, duplicación
node tools/auditoria/escaner-legal.js      # vocabulario con riesgo legal
node tools/exportar-idiomas.js            # regenera idiomas/ desde el código
node tools/validar-idioma.js idiomas/ar.json ar   # valida una traducción
```

**La batería de pruebas es la red de seguridad del proyecto.** Levanta la app
completa en jsdom con Capacitor simulado y comprueba el motor del día, los
momentos propios, las notificaciones, el escapado de contenido, la aceptación
legal y las traducciones. Ejecutarla antes y después de cualquier cambio.

---

## 12. Compilación y publicación

Todo ocurre en GitHub Actions; no hace falta entorno local.

**`build-apk.yml`** — se dispara al cambiar `www/` o a mano. Genera el proyecto
Android, compila **en modo release y firmado** (`assembleRelease`) dos veces —la
segunda incluye el propio APK dentro de la app para poder compartirla— y
**publica el resultado como Release** con la etiqueta fija `apk-ultimo`.

> Se compila en release, no en depuración: un APK con `debuggable="true"` puede
> ser rechazado por algunos móviles y no es lo que debe distribuirse.

> El APK se publica como Release, no como artefacto, porque los artefactos
> consumen una cuota de 500 MB que se agota tras unas decenas de compilaciones.
> El paso previo de limpieza borra los antiguos automáticamente.

**`build-release.yml`** — manual. Genera el AAB firmado para Google Play y el APK
de release. La firma viene de `keystore.b64` y los secretos del repositorio.

**Al publicar una versión nueva:** subir `APP_VERSION` en `index.html` **y** la
constante `CACHE` en `sw.js` (si no se sube la caché, los navegadores sirven la
versión antigua).

---

## 13. Reglas para quien continúe

1. **Pasar la batería de pruebas** antes y después de cada cambio.
2. **Nunca texto literal en la interfaz**: siempre `t('clave')`, en ambos idiomas.
3. **Nunca afirmaciones sanitarias ni promesas de eficacia** (§10).
4. **Nunca `nativeReschedule()` directo**: usar `pedirReprogramacion()`.
5. **Escapar siempre** el contenido creado por la persona con `esc()`.
6. **No introducir temporizadores periódicos** sin justificarlo y sin apagarlos
   en segundo plano.
7. **Subir `APP_VERSION` y `CACHE`** en cada entrega.
8. **Los ids de práctica son posicionales**: al borrar, renumerar todo y revisar
   `VIS_ID` y `ESPECIALES`.
9. **Botones de verdad, no texto pulsable.** Para acciones secundarias, usar
   `<button class="tbtn">`; nunca un `<span onclick>`. Si un `<div>` debe ser
   pulsable, darle `role="button"`, `tabindex="0"` y `onkeydown`.
10. **No cambiar el identificador** (`com.novecami.moment`) una vez publicada la app.
11. **Nada de servidores ni cuentas.** Si algún día se añade contenido remoto,
   habrá que actualizar antes la pantalla de aceptación.

---

## 14. Idiomas y aportaciones de la comunidad

La app lleva dentro **español e inglés**. Otros idiomas se descargan desde la web
y se **importan a mano**; siempre con revisión previa de Jordi Beold.

> **Decidido: la app NO descarga idiomas por su cuenta ni desde la web.** Se
> importan desde un archivo, a mano o mediante la búsqueda en Descargas. Así la
> promesa de «sin cuentas, sin servidores y sin rastreo» se mantiene intacta y no
> hay que matizar el aviso legal.

### 14.1 Textos que la comunidad NUNCA traduce

Se traducen profesionalmente o se muestran en inglés. Viajan en el bloque `fijos`
de cada archivo de idioma, separados del resto para que se vea claro.

| Bloque | Por qué |
|---|---|
| Pantalla de aceptación (`ACEPT_*`) | Es la defensa legal |
| Contraindicaciones dentro de prácticas | Un matiz mal traducido puede causar daño |
| Privacidad y titularidad | Responsable, contacto, forma jurídica |
| Pantalla de elección de idioma | Debe entenderse sin haber elegido idioma |
| Nombres propios | «Moment», «El Novè Camí», «Momento para ti» (la función) |

### 14.2 Estructura de datos

`practices.js` separa estructura de textos (ver §4). Los archivos de idioma en
`idiomas/` los genera `tools/exportar-idiomas.js`; **no se editan a mano**:

```
idiomas/indice.json   qué idiomas hay, completitud, sentido de lectura
idiomas/es.json       fijos + categorias + interfaz + practicas
idiomas/en.json
```

Dos reglas que no se negocian:

1. **Las categorías son códigos** (`armonizacion`), no texto traducido.
2. **Todo lo que venga de fuera es JSON, nunca JavaScript.** JSON se lee como
   datos; un archivo de terceros jamás debe ejecutarse.

### 14.3 Cómo funciona en la app

| Pieza | Qué hace |
|---|---|
| `idiomasPropios` (`mpt_idiomas`) | Idiomas importados, guardados en el móvil |
| `revisarIdioma(d)` | Valida antes de aceptar: esquema, código, sin HTML, no pisa es/en |
| `activarIdioma(d)` | Lo incorpora a `I18N`, `TEXTOS`, `CATEGORIAS` y `CREDITOS` |
| `tipoDeArchivo(texto, nombre)` | Reconoce si es copia, idioma o prácticas |
| `importarArchivo(file)` | **Punto único**: mira el contenido y encamina solo |
| `buscarArchivosMoment()` | Busca en Descargas archivos de Moment y los ofrece |
| `langRespaldo()` / `avisarRespaldo()` | Idioma con el que se rellena lo no traducido |
| `creditoIdioma()` | Nombre de quien tradujo, visible en Ajustes |

**Al importar no hace falta acertar con el botón**: cualquier archivo de Moment
entra por `importarArchivo()` y se encamina según su contenido.

`buscarArchivosMoment()` usa el método nativo `listarArchivosMoment`, que **solo
lee la carpeta Descargas**, solo archivos cuyo nombre encaja, hasta 3 MB y un
máximo de veinte. No rastrea el teléfono ni necesita permiso de almacenamiento.

### 14.4 Validación de una aportación: tres capas

1. **Automática.** `tools/validar-idioma.js`, ejecutada sola por
   `.github/workflows/validar-idioma.yml` cuando una propuesta toca `idiomas/`.
   Comprueba cabecera y cesión AGPL, claves completas, marcadores intactos
   (`{n}`, `{d}`, `[tu nombre]`), HTML peligroso, prácticas inexistentes y
   **vocabulario con riesgo legal** por idioma. Devuelve código 1 si falla.
2. **Revisión humana obligatoria** de Jordi Beold. Es la que decide.

> **Decidido: no habrá retrotraducción automática.** Las traducciones se revisan
> manualmente. Si algún día llega un idioma que no se pueda leer, se resolverá
> con una persona de confianza que lo hable, no con una herramienta automática.

### 14.5 Condiciones de aceptación

- **Cesión bajo AGPL v3**, con casilla obligatoria en la plantilla de propuesta
  (`.github/pull_request_template.md`). Sin ella no se incorpora.
- **Reconocimiento**: el nombre se añade a `CREDITOS` en `i18n.js` y aparece en
  Ajustes.
- **Revisión manual en el móvil** de cómo quedan botones y cajas antes de
  publicar. El alemán y el árabe ocupan hasta un 30% más que el español. Esta
  revisión es obligatoria y no la sustituye ninguna herramienta.
- La guía para quien traduce está en **`TRADUCIR.md`**.

### 14.6 Preparado para alfabetos no latinos

- **Tipografías**: la fuente del sistema va primero. Forzar una fuente latina
  hacía que en chino o árabe salieran cuadrados vacíos.
- **Derecha a izquierda**: `aplicarIdiomaDocumento()` fija `lang` y `dir`; el CSS
  tiene las reglas `[dir="rtl"]`. **Usar `margin-inline`, no `margin-left`**, o la
  inversión no funcionará.
- **Interlineado** ajustado para árabe, hebreo, chino, japonés y coreano.

### 14.7 Estado

| Paso | Estado |
|---|---|
| Categorías como códigos y textos por identificador | Hecho (3.65) |
| Archivos de idioma, índice y relleno con respaldo | Hecho (3.66) |
| Bloque legal separado como no traducible | Hecho |
| Validador y ejecución automática en GitHub | Hecho |
| Reconocimiento de traductores | Hecho (3.67) |
| Importación manual y reconocimiento del tipo de archivo | Hecho (3.68) |
| Detección de archivos en el móvil | Hecho (3.69) |
| Retrotraducción asistida | **Descartada:** la revisión es manual |
| Descarga automática desde la web | **Descartado a propósito** |

## 14 bis. Al cambiar el identificador: desinstalar antes

**Si se cambia `appId`, hay que DESINSTALAR la versión anterior antes de instalar
la nueva.** Si no, Android puede rechazar la instalación con «el paquete parece no
válido», aunque el APK sea perfectamente correcto.

Esto costó varias horas de diagnóstico. Se comprobó, sobre el APK descargado, que
todo estaba bien: firma v1 con sus digests coherentes, firma v2 verificada
matemáticamente, `resources.arsc` sin comprimir y alineado, dex íntegros, sin
`testOnly`, manifiesto correcto. El archivo no tenía ningún defecto: el bloqueo
venía del dispositivo, por el rastro de la instalación anterior.

**Antes de desinstalar, exportar la copia de seguridad** desde Ajustes: al cambiar
el identificador la app nueva empieza vacía.

Comprobaciones útiles si algún día vuelve a fallar una instalación:

```bash
unzip -l app.apk | grep -E 'CERT|resources.arsc'   # firma v1 y recursos
python3 -c "d=open('app.apk','rb').read(); print(b'APK Sig Block 42' in d)"
```

Y en el manifiesto: `minSdkVersion` (Android 14 exige 23 o más), `testOnly`
(impide instalar) y `debuggable`.

## 15. Pendientes conocidos

- `build-release.yml` publica como artefacto, no como Release: si da error de
  cuota, aplicarle el mismo cambio que a `build-apk.yml`.
- Los títulos de seis constelaciones y de «Miedos» difieren de los vídeos
  enlazados, por la desmedicalización del vocabulario.
- Sin pruebas en dispositivo real: la batería es jsdom, no Android.
- `listarArchivosMoment` (nativo) no se ha podido probar aquí: **verificar en el
  móvil** que encuentra los archivos de Descargas.
- El APK se compila en modo **release** y firmado: no lleva marca de depuración.
