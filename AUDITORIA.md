# Auditoría de seguridad y código · Moment 3.87

Revisión del 27 de octubre de 2026, sobre la versión 3.86. Cubre la app (APK y
web), la publicación en Netlify, la compilación en GitHub y la firma.

## Resumen

Moment **no tiene servidor**: ni cuentas, ni base de datos, ni nada que atacar a
distancia. Su superficie de ataque real es otra:

1. **Lo que entra en el móvil desde fuera**: una copia de seguridad, un archivo de
   prácticas o un idioma que alguien te pasa. Era el punto más débil.
2. **La compilación**: lo que se descarga para construir el APK y la clave con la
   que se firma.
3. **La web**: cómo la sirve Netlify.

Se han corregido **14 problemas** (4 de riesgo alto). Quedan **9 propuestas** que
necesitan una decisión o una acción tuya.

---

## Corregido en la 3.87

| # | Problema | Riesgo | Arreglo |
|---|---|---|---|
| 1 | Una copia de seguridad manipulada podía colar código en 5 pantallas (Agenda, Biblioteca, práctica, Ajustes y el formulario). Bastaba con enviarla por mensaje: la app ofrece importar lo que encuentra en Descargas. | Alto | `saneado.js`: de una copia solo entran las claves conocidas, cada una revisada (tipos, tamaños, identificadores). Lo ya guardado se revisa también al arrancar. |
| 2 | Los enlaces de las prácticas iban tal cual: un enlace `javascript:` ejecutaba código al tocarlo, y uno con comillas rompía el HTML. | Alto | `enlaceSeguro()`: solo `http` y `https`, normalizados y escapados. `www.…` sin protocolo se completa. |
| 3 | Las contraseñas de la clave de firma estaban escritas en el repositorio público. Si el archivo de la clave se filtrara, nada impediría firmar una app falsa. | Alto | Se leen de los secretos de GitHub. **Falta cambiarlas** (propuesta 1). |
| 4 | Ningún mecanismo impedía que código colado enviara datos a internet. | Alto | Política de contenido en `index.html`: la app no puede pedir nada a ningún servidor (`connect-src 'self'`), ni cargar imágenes, marcos u objetos de fuera. Es la garantía técnica de «tus datos no salen de tu móvil». |
| 5 | Títulos de prácticas sin escapar en Ajustes → Estadísticas. | Medio | Escapados. |
| 6 | El nombre de una categoría propia, metido en un botón, podía romper el código del botón. | Medio | `jsAttr()`. |
| 7 | Los idiomas guardados no se volvían a revisar al arrancar; la bandera, los textos fijos y las categorías de un idioma no se revisaban nunca. | Medio | Revisión completa al importar y al arrancar; la bandera se escapa. |
| 8 | La compilación instalaba «la última versión 6.x» de cada dependencia: una versión nueva y manipulada habría entrado sola en el APK firmado. | Medio | `package-lock.json` con la huella de cada paquete y `npm ci`. |
| 9 | Las acciones de GitHub se usaban por etiqueta (`@v5`), que su dueño puede mover. | Medio | Fijadas a un commit concreto. |
| 10 | Se publicaba el APK sin pasar ninguna prueba. | Medio | `npm test` antes de compilar: si algo falla, no se publica nada. |
| 11 | La web no enviaba cabeceras de seguridad (otra web podía meterla en un marco, etc.). | Medio | `netlify.toml` con política de contenido, `frame-ancestors 'none'`, `nosniff`, `no-referrer`, HSTS. |
| 12 | El secreto de la clave estaba disponible en todos los pasos de la compilación. | Bajo | Solo en el paso de firma. `build-release` pasa a permisos de solo lectura. |
| 13 | Un archivo enorme al importar podía colgar la app. | Bajo | Límite de 15 MB. |
| 14 | En Android, un nombre de archivo con `../` podía escribir fuera de su carpeta. | Bajo | Se queda solo con el nombre. |

**Cómo se ha comprobado.** `tools/auditoria/pruebas-seguridad.js` monta la peor
copia posible (código en títulos, enlaces `javascript:`, identificadores con
código, un idioma con HTML) y revisa cada pantalla. Pasada a la 3.86, falla en 5
pantallas; en la 3.87 pasa entera (31 comprobaciones).

### Fallos encontrados en la revisión de la 3.86 (ya corregidos allí)

- El formulario de «Momento para ti» fallaba en silencio en cualquier aviso (y al
  crear un ejercicio con solo un enlace): una variable tapaba la función de textos.
- Al editar un momento no se guardaban los días de la semana ni el límite de veces.
- Ninguna traducción completa podía importarse: se rechazaba el `<b>` de la propia app.
- La lista de archivos encontrados en Descargas fallaba al pintarse.

---

## Refactor

- **La lógica sale de `index.html`** (4.200 líneas) a **19 módulos** en `www/js/`,
  uno por área. Se movió el código **sin cambiar una línea**: un analizador
  comprobó que los 434 bloques son idénticos, y las 14 pantallas principales se
  pintan exactamente igual antes y después, en modo APK y web.
- **Herramientas reparadas.** El análisis de consumo leía una ruta fija de otro
  ordenador y no llegaba a ejecutarse en ningún otro sitio. El escáner legal no
  reconocía nunca las zonas del aviso legal: ahora separa las 30 apariciones que
  protegen (y deben quedarse) de las 17 a revisar. Las 17 son inocentes: «diagnóstico»
  técnico del móvil, «treat a friend», una contraindicación en una respiración.
- **Pruebas nuevas:** `pruebas-web.js` (18), `pruebas-seguridad.js` (31), `carga.js`
  (carga real con archivos separados) e `instantaneas.js` (para refactorizar con red).
- **`npm test`** las ejecuta todas; **`npm run auditoria`**, los análisis.

---

## Propuestas pendientes

### 1. Cambiar las contraseñas de la clave de firma · alto · 15 minutos

La clave no cambia, solo su contraseña: los móviles siguen aceptando las
actualizaciones. En el Mac, en la carpeta donde tengas la clave:

```bash
# si solo tienes keystore.b64 (en macOS antiguos, -D en vez de -d):
base64 -d -i keystore.b64 -o momento-release.keystore
keytool -storepasswd -keystore momento-release.keystore      # actual: momento2026
keytool -keypasswd -alias momento -keystore momento-release.keystore
base64 -i momento-release.keystore -o keystore.b64
```

Si `keytool` dice que no admite `-keypasswd`, tu almacén usa una sola contraseña
para todo: basta con el primer cambio. Después, en GitHub → Settings → Secrets and
variables → Actions: sustituye `ANDROID_KEYSTORE_B64` por el contenido nuevo de
`keystore.b64` y crea `ANDROID_KEYSTORE_PASSWORD` y `ANDROID_KEY_PASSWORD` (la
misma, si es una sola). La compilación dejará de mostrar el aviso.

### 2. Copia automática de Android · decisión

Android guarda por defecto los datos de las apps en la cuenta de Google de la
persona, para restaurarlos al cambiar de móvil. Es su propia cuenta, pero choca con
la frase «nada sale de tu dispositivo». Desactivarlo (`allowBackup="false"`) cumple
la promesa al pie de la letra; a cambio, al cambiar de móvil habría que usar la
copia manual.

### 3. La web en Safari puede olvidar los datos · decisión

Safari puede borrar lo guardado por una web con la que no se interactúa en 7 días
(no afecta a las añadidas a la pantalla de inicio). Con un calendario de 84 días, alguien puede volver a
renovar y encontrarse sin su configuración. Propuesta: en la web, recomendar
añadirla a la pantalla de inicio y ofrecer la copia de seguridad junto a la descarga.

### 4. Adjuntos en la copia de seguridad · mejora

Hoy los audios, imágenes y vídeos no viajan en la copia. Se pueden incluir cuando
sumen poco, avisando del tamaño.

### 5. Acciones fuera del HTML · mejora grande

Los botones llevan su acción escrita (`onclick`), y eso obliga a permitir
`'unsafe-inline'` en la política de contenido. En el APK no hay alternativa
(Capacitor inyecta su puente así), pero la web podría ser más estricta.

### 6. Revisión periódica de dependencias · mantenimiento

Con las versiones ya fijadas, conviene revisarlas cada pocos meses (o activar
Dependabot para que proponga las actualizaciones).

### 7. Comprobación de tipos · calidad

Añadir `// @ts-check` y comentarios JSDoc en los módulos más delicados (`saneado.js`,
`plan.js`, `avisos.js`) detecta errores sin cambiar nada de cómo se ejecuta la app.

### 8. Partir los módulos grandes · calidad

`avisos.js` y `vistas.js` rondan las 40 KB. Se pueden dividir más adelante con el
mismo método (código idéntico, pantallas idénticas).

### 9. Pruebas en las propuestas de la comunidad · calidad

Las pruebas corren al compilar; también podrían correr en cada propuesta (pull
request), como ya hace la validación de idiomas.

---

## Sobre Supabase

Moment no lo usa. Si algún día tuviera cuentas, lo esencial sería: seguridad por
filas (RLS) activada en **todas** las tablas y con políticas probadas, nunca la clave
`service_role` en la app, funciones con `security definer` revisadas una a una, y
región europea.

## Comprobarlo

```bash
npm ci          # instala las versiones fijadas
npm test        # 181 + 18 + 31 pruebas y la carga real
npm run auditoria
```
