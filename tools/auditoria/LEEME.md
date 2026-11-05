# Herramientas de auditoría

Se ejecutan con Node desde la raíz del proyecto. No forman parte de la app:
no se compilan ni se envían al móvil.

Lo más cómodo: `npm test` (todas las pruebas) y `npm run auditoria` (análisis).
Una a una:

    node tools/auditoria/pruebas.js            # la app en modo APK (necesita jsdom: npm install)
    node tools/auditoria/pruebas-web.js        # la versión web: calendario y lo que no aplica
    node tools/auditoria/pruebas-seguridad.js  # archivos manipulados: nada debe colarse
    node tools/auditoria/carga.js              # carga real, cada script como archivo aparte
    node tools/auditoria/instantaneas.js --guardar antes.json   # antes de refactorizar…
    node tools/auditoria/instantaneas.js --comparar antes.json  # …y después: pantallas idénticas
    node tools/auditoria/analisis-bateria.js   # consumo: temporizadores, red, avisos
    node tools/auditoria/analisis-codigo.js    # código muerto, i18n, duplicación
    node tools/auditoria/escaner-legal.js      # vocabulario con riesgo legal

Las pruebas devuelven código de salida 1 si algo falla: la compilación del APK en
GitHub las ejecuta antes de construir y, si fallan, no publica nada.
`entorno.js` reúne lo común: qué scripts carga index.html, en qué orden, y dónde
está jsdom (antes cada herramienta lo buscaba por su cuenta, a veces en rutas fijas).

`analisis-bateria.js` devuelve código de salida 1 si encuentra algo GRAVE,
para poder engancharlo a la compilación si algún día interesa.

Qué vigila el análisis de consumo:
- temporizadores periódicos y si se apagan al pasar la app a segundo plano
- escrituras en disco dentro de temporizadores
- escuchas de eventos registradas en funciones de dibujo (fuga acumulativa)
- llamadas nativas costosas sin agrupar
- animaciones continuas y trabajo pesado en cada repintado
- descargas completas de archivos y peticiones en el arranque
- número de días de avisos programados por adelantado
