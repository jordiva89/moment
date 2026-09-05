# Traducir Moment

Gracias por querer traducir Moment. Esta guía explica cómo hacerlo, qué no se
traduce y qué pasa después de enviarlo.

---

## Antes de empezar

Moment es una aplicación de **bienestar y exploración personal**. No diagnostica,
no previene y no trata ninguna enfermedad. Esa frontera no es una preferencia de
estilo: es lo que permite que la app exista sin ser un producto sanitario.

**Una traducción puede romperla sin querer.** Si un texto que dice «acompaña la
calma» se traduce como «alivia la ansiedad», la app pasa a hacer una afirmación
sanitaria. Por eso hay una validación automática y una revisión humana antes de
aceptar nada.

---

## Qué se traduce

Un idioma es **un archivo**: `idiomas/<código>.json`. Dentro hay tres bloques que
sí se traducen:

| Bloque | Qué es |
|---|---|
| `interfaz` | Botones, títulos, avisos, ajustes |
| `categorias` | El nombre visible de cada categoría |
| `practicas` | Título y texto de cada práctica, por identificador |

## Qué NO se traduce

El bloque **`fijos`** se deja tal cual. Son textos que sostienen la protección
legal o que hacen falta antes de haber elegido idioma:

- La pantalla de elección de idioma.
- La aceptación de responsabilidad y las contraindicaciones.
- El titular del servicio y los enlaces legales.

Si un idioma no tiene esos textos traducidos profesionalmente, la app los muestra
en inglés. **Es lo correcto: preferimos un texto legal en un idioma que no es el
tuyo antes que uno mal traducido.**

Tampoco se traducen los nombres propios: **Moment**, **El Novè Camí** y
**«Momento para ti»** (que es el nombre de la función con la que cada persona crea
sus propios momentos, no el de la app).

---

## Cómo hacerlo

1. Copia `idiomas/en.json` (o `es.json`) y renómbralo con el código de tu idioma:
   `ar.json`, `zh.json`, `de.json`…
2. Cambia `codigo`, `nombre`, `autor` y pon `revisado: false`. Puedes añadir
   `bandera` con el emoji de tu bandera; si no, la app usa la que corresponde al
   código de idioma.
3. Traduce los bloques `interfaz`, `categorias` y `practicas`. **No borres claves
   ni cambies los identificadores.**
4. Deja `fijos` sin tocar.
5. Comprueba tu archivo antes de enviarlo:

```bash
node tools/validar-idioma.js idiomas/ar.json ar
```

También puedes probarlo en el móvil sin esperar a nadie: pasa el archivo al
teléfono y añádelo desde **Ajustes → Idiomas → Añadir un idioma desde un
archivo**. La app lo revisa y te dice qué falla. Si lo dejas en la carpeta de
Descargas, el botón «Buscar archivos de Moment» lo encuentra solo.

### Reglas que la validación comprueba

- **Los marcadores se conservan.** Si el original dice `Han pasado {d} días`, la
  traducción debe llevar `{d}`. Si se pierde, la app muestra texto roto.
- **Nada de HTML** más allá de `<b>`, `<i>` y `<br>`. Ni enlaces, ni imágenes, ni
  código.
- **Sin vocabulario sanitario**: curar, sanar, terapia, tratamiento, diagnóstico,
  enfermedad, síntoma. Ni promesas del tipo «reduce el estrés» o «mejora el sueño».
- **No inventes prácticas.** Solo se traducen las que existen.

### Un detalle que te ahorrará trabajo

Si traduces las claves `fmt_title`, `fmt_cat`, `fmt_text` y `fmt_link`, la
**plantilla de prácticas** pasa a generarse en tu idioma —con `Titre:` en vez de
`Título:`, por ejemplo— y la app sabe leerla igual. No hay que tocar nada más.

**No pasa nada si la traducción está incompleta.** Lo que falte se mostrará en
español o en inglés, según elija cada persona. Es preferible medio idioma bien
traducido que uno entero a medias.

---

## Qué pasa después

Tu propuesta pasa por **dos filtros**, y el segundo es el que decide:

1. **Validación automática.** Se ejecuta sola en GitHub al enviar la propuesta.
   Comprueba lo verificable: claves, marcadores, HTML, vocabulario prohibido.
2. **Revisión humana.** La última palabra es de Jordi Beold. Si el idioma no lo
   lee, buscará a alguien de confianza que lo hable. **No se usan traducciones
   automáticas para revisar traducciones.**

Además, antes de publicar un idioma se revisa **a mano en el móvil** cómo quedan
los botones y las cajas: algunos idiomas ocupan hasta un 30% más y los textos
apretados se desbordan.

---

## Licencia

Al enviar una traducción **aceptas cederla bajo AGPL v3**, la misma licencia del
proyecto. Sin esa cesión no puede incorporarse.

A cambio, **tu nombre aparecerá en la app** como responsable de la traducción.

---

## Idiomas de derecha a izquierda

Si traduces al árabe, hebreo, persa o urdu, indícalo en la propuesta. La app ya
está preparada para invertir la interfaz, pero conviene revisarla contigo antes de
publicar.

---

¿Dudas? Escribe a **jordibeold@jordibeold.com**.
