# Auditoría técnica para la base v2

Fecha de referencia: 2026-07-27
Commit de partida: `11e2a5481ecabf1b0426af3610da53f827bb4126`

## Objetivo

Convertir la instancia actual de Iguadata en una base limpia, verificable y reutilizable sin alterar de golpe su identidad editorial ni su funcionamiento público.

La secuencia acordada es:

1. Estabilizar y medir.
2. Limpiar la arquitectura sin cambios visuales.
3. Optimizar carga y procesamiento.
4. Revisar las interfaces una a una.
5. Extraer la configuración municipal y documentar la creación de nuevas instancias.

## Línea base verificada

- Build de `assets/app.js` y páginas estáticas reproducible.
- 14 pruebas de regresión superadas.
- Árbol de trabajo limpio al iniciar la rama.
- `src/app.jsx`: 5.448 líneas y 344.023 bytes.
- `assets/app.js`: 294.508 bytes; aproximadamente 49 KiB comprimidos.
- `styles.css`: 7.324 líneas y 199.647 bytes; aproximadamente 28 KiB comprimidos.
- Datos JSON públicos: aproximadamente 10,8 MiB sin comprimir.

### Complejidad frontend

- 99 estados React.
- 37 efectos.
- 32 cálculos memorizados.
- 10 llamadas `fetch`.
- 7.002 contratos procesados en el navegador para construir slugs, estadísticas e índices derivados.

### Carga de datos

La portada consulta primero `resum.json`, pero después carga siempre el snapshot completo de contratos y empresas. Al quedar libre el hilo, también descarga los tres análisis.

Transferencia aproximada comprimida:

| Recurso | Tamaño |
| --- | ---: |
| `contractes.json` | 579 KiB |
| `empreses.json` | 60 KiB |
| Análisis combinados | 232 KiB |
| `persones.json` | 121 KiB |
| `carrecs.json` | 137 KiB |

La prioridad no es reducir unos pocos kilobytes del bundle, sino evitar descarga, parseo y cálculo cuando una ruta no necesita esos datos.

## Hallazgos priorizados

### P0 — Fundamentos

1. `App` concentra navegación, carga de datos, estado, transformación, SEO dinámico y renderizado.
2. El frontend todavía concentra la mayoría de sus responsabilidades en `app.jsx`.
3. Faltan más extracciones funcionales sobre el nuevo build multifichero.
4. No existe un contrato de esquema versionado para los JSON.
5. La configuración de fuente, organismos, dominio, analítica y municipio está distribuida entre Python, JavaScript y JSX.
6. El frontend reconstruye datos que el pipeline podría entregar preparados.

### P1 — Mantenibilidad y rendimiento

1. `styles.css` contiene 130 usos de `!important` y varias capas de overrides históricos.
2. No hay pruebas automatizadas del comportamiento del frontend, rutas o accesibilidad.
3. Los scripts Python no comparten una interfaz CLI homogénea.
4. Los umbrales analíticos y calendarios electorales están definidos como constantes internas.
5. La portada inicia trabajo pesado que no necesita para mostrar sus métricas.
6. Los metadatos SEO y el dominio canónico están acoplados a Igualada.

### P2 — Revisión visual

1. Revisar jerarquía y densidad de los listados.
2. Unificar filtros, paginación, estados vacíos y errores.
3. Simplificar fichas de contrato, empresa y persona.
4. Revisar la lectura y comparación de alertas.
5. Validar navegación móvil y accesibilidad de cada interfaz.

Los cambios visuales se ejecutarán por componente y se detendrán para revisión en navegador antes de extender el patrón.

## Orden de ejecución

1. Versionado automático de recursos. Completado.
2. Definir el sistema de módulos y el build frontend. Primera fase completada.
3. Extraer navegación y cliente de datos fuera de `App`. Completado.
4. Evitar la carga completa de contratos en la portada. Completado.
5. Introducir configuración única del proyecto y municipio. Primera fase completada.
6. Definir y validar esquemas de datos. Contrato frontend v1 completado.
7. Consolidar CSS y primitives visuales. Completado.
8. Rediseñar interfaces por flujo.
9. Documentar la creación de una segunda instancia.

## Avances realizados

### Build y caché

- `build-pages.js` calcula huellas SHA-256 de `bootstrap.js`, `styles.css` y `app.js`.
- Las páginas generadas dejan de depender de una versión escrita manualmente.

### Primera modularización

- `src/app.sources.json` declara las fuentes que componen el bundle.
- `build-app.js` valida el manifiesto, limita las fuentes a `src/` y compila su contenido en orden.
- La carga y preparación de contratos y empresas se ha extraído a `src/data/contracts.js`.
- La suite incorpora una prueba de integridad del manifiesto.

### Navegación y carga bajo demanda

- La resolución de rutas, URLs y títulos se ha extraído a `src/core/runtime.js`.
- El estado y los efectos de datos se han encapsulado en `src/data/use-iguadata-data.js`.
- La portada carga únicamente `resum.json`; contratos, empresas, personas, cargos, análisis e investigaciones se solicitan cuando la ruta los necesita.
- `src/app.jsx` queda en 5.028 líneas después de esta fase, frente a las 5.448 iniciales.
- Smoke test correcto en portada, listados y fichas de contrato y empresa, personas, análisis e investigación, sin errores de consola.

### Entorno local y configuración de instancia

- `dev.cmd` utiliza un servidor estático propio con fallback SPA y permite recargar fichas dinámicas directamente.
- El servidor bloquea el acceso a carpetas internas como `.git`, `.github`, `.dev`, `src`, `scripts` y `config`.
- El servidor puede exponerse temporalmente en la red local con `--host 0.0.0.0`; al servir HTML elimina solo en desarrollo la directiva que fuerza HTTPS para que los recursos carguen también desde un móvil físico.
- `config/project.json` centraliza marca, municipio, administración, dominio, contacto, repositorio, red social y analítica.
- El build frontend incrusta esta configuración; el generador SEO utiliza la misma fuente para títulos, descripciones, canonical y Open Graph.
- Queda pendiente extraer del JSX los textos editoriales y legales específicos de Igualada.

### Contrato de datos del frontend

- `schemas/frontend-data.v1.schema.json` documenta las estructuras mínimas de los diez datasets públicos consumidos por la aplicación.
- `scripts/validate-frontend-data.js` valida tipos, propiedades obligatorias, rangos básicos y referencias internas como el recuento de alertas y contratos por empresa.
- El workflow semanal ejecuta esta validación después de regenerar los JSON y antes de preparar el commit.
- Los cambios incompatibles en la estructura deberán crear una nueva versión del esquema, no modificar silenciosamente las expectativas de la v1.

### Primera consolidación de primitives

- `src/ui/primitives.jsx` centraliza la paginación, los estados vacíos de búsqueda, el icono de búsqueda y las acciones comunes de filtros.
- Las diez paginaciones comparten ya una única estructura y conservan las clases CSS existentes, sin cambio visual intencionado.
- Los siete buscadores comparten también una única estructura; sus textos y etiquetas accesibles siguen definidos por cada vista.
- Diecisiete anchos de grupos de filtros y trece alturas de select han pasado de estilos inline a tres clases CSS comunes, conservando los mismos valores.
- `src/app.jsx` queda en 4.790 líneas; la nueva capa de primitives ocupa 131 líneas.
- La suite verifica que las primitives forman parte del manifiesto y que las estructuras y estilos inline consolidados no vuelven a duplicarse dentro de `app.jsx`.
- La primera revisión visual de buscadores, filtros, paginación y estados vacíos ha sido validada en escritorio y móvil.
- El primer bloque de cascada móvil ha eliminado reglas duplicadas y catorce `!important` innecesarios; `styles.css` pasa de 130 a 116 sin alterar las medidas calculadas de los controles.
- El segundo bloque móvil consolida modales y elimina 109 líneas de declaraciones previas que quedaban anuladas por la misma cascada; `styles.css` pasa de 116 a 115 usos de `!important`, sin modificar los valores finales.
- El tercer bloque elimina el antiguo drawer de navegación móvil, ya sustituido por el índice desplegable actual; `styles.css` pasa de 115 a 112 usos de `!important`.
- El cierre de fase elimina 354 líneas del antiguo header, sus variantes oscuras y la navegación móvil genérica sin consumidores; el dock vigente concentra ahora su comportamiento responsive y `styles.css` pasa de 112 a 97 usos de `!important`.
- Los `!important` restantes están acotados a adaptaciones responsive de interfaces concretas. Su revisión continuará dentro del rediseño de cada flujo para no alterar componentes todavía no migrados.

### Mejora de interfaces por flujo

- La fase 8 preserva el lenguaje visual aprobado y empieza por fricciones funcionales del buscador de contratos.
- La búsqueda, los filtros, el orden y la página se reflejan en la URL, por lo que una consulta puede compartirse y recuperarse con el historial del navegador.
- La paginación compartida adopta la misma línea editorial que el resumen de resultados: contador a la izquierda y `Anterior`/`Següent` como acciones de texto a la derecha, sin contornos ni superficies adicionales.
- Al abrir una ficha y volver, el listado conserva su estado y restaura la posición de lectura mediante el sistema de scroll existente.
- El control de filtros identifica los paneles que despliega, el recuento de resultados anuncia sus cambios y la paginación compartida expone nombres accesibles sin alterar su presentación.
- En la ficha de contrato, la empresa adjudicataria y su recuento pasan a ser enlaces reales; el botón de retorno expone un nombre accesible y `Compartir` despliega acciones separadas para copiar el enlace o descargar la imagen.
- La composición de la ficha separa el contenido principal, la información administrativa y las acciones. El hero agrupa importe, título y adjudicataria; los metadatos ocupan una segunda card y `Compartir` queda fuera de ambas al final.
- La ficha recupera la jerarquía de título de los listados con `Detall de contracte`; la barra final presenta `Tornar` y `Compartir` con el mismo lenguaje visual e icono situado antes del texto.
- En móvil, la ficha conserva la separación de superficies de escritorio —hero navy, card administrativa clara y acciones independientes—, oculta el título de página redundante y usa como referencia las escalas, proporciones y espaciados de la versión oficial. `Tornar` y `Compartir` adaptan su ancho al texto como en escritorio; las dos opciones secundarias se muestran como píldoras apiladas y alineadas bajo `Compartir`, con la misma escala tipográfica. El cierre antes del footer replica el aire entre navegación y hero.
- La ficha individual de empresa adopta la misma jerarquía: `Detall d'empresa`, hero navy con importe, nombre y volumen de contratos en mayúsculas, card de clasificación con el período comprendido entre el primer y el último año con contratos y card independiente de `Càrrecs actius` solo cuando existen cargos. `Tornar` queda al final del listado. En móvil oculta el título de página, apila el detalle de cada cargo bajo el nombre y elimina las pills del listado de contratos.
- `Històric de contractes` pasa a una card clara y estática, separada de la card de cargos y con el mismo tratamiento tipográfico de etiqueta; los importes anuales comparten tipografía con los nombres de cargos y la comparación deja de modificar los filtros.
- El cercador de personas adopta la misma jerarquía editorial que contratos y empresas: nombre e importe como cabecera, empresa principal y número de empresas como metadatos, y relaciones mercantiles dentro de un acordeón accesible. En móvil conserva esta jerarquía, presenta las relaciones en dos columnas y diferencia el desplegable mediante una superficie gris. Los controles de filtros, el recuento dinámico y los enlaces de paneles cerrados incorporan el comportamiento accesible correspondiente.
- El armazón de análisis separa la búsqueda, el orden y la página de fraccionamiento, concentración y electoralismo para evitar que el estado de una vista afecte a otra. La URL conserva el tipo de análisis, el modo histórico o temporal de concentración, la búsqueda, el orden y la página; el historial del navegador restaura este contexto y las páginas solicitadas se ajustan al rango disponible. Las pestañas y los paneles de ordenación quedan relacionados semánticamente, los cambios de resultados se anuncian y los vacíos permiten restablecer la consulta. El filtrado por riesgo se elimina para simplificar la exploración; el riesgo permanece visible y disponible como criterio de orden.
- Los listados de fraccionamiento, concentración por sectores, concentración temporal y electoralismo comparten el patrón común de cards: título e importe en cabecera, divisor, metadatos a la izquierda y píldoras a la derecha. Todas las vistas utilizan el nivel y la puntuación de riesgo calculados por sus generadores; en concentración sectorial, la cuota se presenta aparte como `Quota de mercat` y no se confunde con la puntuación. Concentración temporal sitúa el período inmediatamente después de la empresa. Electoralismo reserva una columna estable para el período y aire adicional antes de las píldoras. En móvil los metadatos ocupan todo el ancho, los textos largos se limitan a tres líneas y un segundo divisor precede a las píldoras. La visualización-resumen de concentración se elimina completamente.
- Los paneles de filtros se cierran al cambiar de tipo de análisis o de modo de concentración. En electoralismo, el período sigue al objeto dentro del bloque izquierdo de metadatos en vez de quedar desplazado hacia las píldoras.
- La concentración histórica incorpora mínimos editoriales de riesgo ligados a la cuota económica: desde el 50 % la puntuación no puede quedar por debajo de 85, y desde el 25 % no puede quedar por debajo de 65. Los demás factores pueden elevar esos mínimos. La concentración temporal mantiene su modelo multifactorial propio y su umbral de publicación de 65, sin aplicar estos mínimos sectoriales.
- Tras eliminar el filtro por riesgo, el selector único de ordenación ocupa todo el ancho del panel en análisis. En fichas de empresa sin histórico anual, el buscador de contratos conserva el mismo espacio respecto a la card de cargos mediante una relación estructural entre ambos bloques.

## Criterios de salida

- Build reproducible sin versiones manuales ni edición de artefactos generados.
- `App` limitado a composición y coordinación.
- Configuración municipal fuera del código común.
- Pipeline ejecutable mediante configuración y argumentos coherentes.
- Esquemas JSON versionados y validados en CI.
- Portada operativa sin cargar el dataset completo.
- Pruebas de rutas, datos, accesibilidad básica y algoritmos.
- Sistema visual consolidado y sin overrides innecesarios.
- Nueva instancia municipal creable sin modificar el núcleo.
