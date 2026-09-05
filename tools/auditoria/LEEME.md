# Herramientas de auditoría

Se ejecutan con Node desde la raíz del proyecto. No forman parte de la app:
no se compilan ni se envían al móvil.

    node tools/auditoria/analisis-bateria.js   # consumo: temporizadores, red, avisos
    node tools/auditoria/analisis-codigo.js    # código muerto, i18n, duplicación
    node tools/auditoria/pruebas.js            # batería de pruebas (necesita jsdom)
    node tools/auditoria/escaner-legal.js      # vocabulario con riesgo legal

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
