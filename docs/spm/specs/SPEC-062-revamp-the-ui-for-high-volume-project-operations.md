+++
doc_kind = "spec"
id = "SPEC-062"
title = "Revamp the UI for high-volume project operations"
summary = "Implement a compact accessible workspace with reusable components, spreadsheet-style tables, persistent detail drawers, and compressed navigation."
status = "active"
task_ids = ["TASK-125", "TASK-126", "TASK-127", "TASK-128", "TASK-129", "TASK-130", "TASK-131", "TASK-135"]
tags = ["ui", "ux", "accessibility", "performance"]
updated_at = "2026-11-15T20:18:45.780Z"
+++

# Revamp de UI de Spec Embryo: mesa de operaciones compacta

Estado: plan técnico y de diseño revisado; implementación autorizada por el usuario el 2026-11-15. Decisión de alcance confirmada por el usuario: inspección en volumen (filtros, selección, copia) y conservar respuestas a preguntas de specs; sin edición de celdas ni mutaciones masivas. Autor de análisis, diseño y decisiones: Astra High. Implementación en curso: Sol 6.1 High, con revisión técnica y UX independiente de Astra High. Fecha: 2026-11-15.

## Overview

Convertir el dashboard local en una superficie de lectura, comparación e inspección de alto volumen: navegación lateral pequeña, tablas por defecto para Tasks y Specs, detalle lateral que conserva el contexto y timeline compacto. Mantener SvelteKit, la identidad editorial y los servicios deterministas compartidos. La densidad viene de reducir ornamentación y repetición, no de bajar el texto hasta hacerlo difícil de leer.

La referencia a Excel se concreta en encabezados estables, columnas alineadas, ordenamiento, filtros, navegación por celdas, selección de filas y copia TSV. No supone crear un editor de hojas de cálculo.

Artefacto visual: [concepto estático SVG](assets/SPEC-062-ui-concept.svg) y [preview PNG](assets/SPEC-062-ui-concept.png). Es diseño propuesto con datos ilustrativos, no screenshot del producto implementado.

## Context y auditoría del baseline de planificación

Inspección del working tree actual, no sólo de HEAD. `bun run spm status`, `spec list`, `task list`: 60 specs y 122 tareas terminadas; ninguna slice activa. Hay cambios preexistentes, incluidas memorias y servicios: preservarlos y no incluirlos accidentalmente en commits del revamp. Este documento no afirma haber medido el rendimiento ni haber ejecutado auditoría visual en navegador.

| Superficie actual | Evidencia de código | Consecuencia | Decisión |
|---|---|---|---|
| Shell | `web/src/routes/+layout.svelte`: rail 15.75rem (252 px a 16 px), marca/descripción, foco global y cuatro signal cards | Ocupa espacio y repite información de Overview en todas las rutas | Rail 56/184 px; barra contextual 44 px; foco completo y métricas en Overview |
| Tasks | `web/src/routes/tasks/+page.svelte` (341 líneas): sólo Kanban de cinco lanes | Comparación vertical y búsquedas de muchos registros costosas | Tabla default, Kanban alternativo conservado |
| Specs | `web/src/routes/specs/+page.svelte` (416 líneas): cards con progreso/chips | Mucho alto por entidad, mala comparación entre specs | Tabla default con progreso numérico y bloqueos |
| Timeline | `web/src/routes/timeline/+page.svelte` (1093 líneas), selección `selected_task` y agrupación por spec | Ya tiene la dirección densa adecuada, pero una página concentra composición, interacción y estilos | Extraer toolbar, grid, ruler, grupos y panel; preservar semántica determinista |
| Detalles | Specs 675 líneas, Tasks 431; `src/services/details.ts` ya entrega datos estructurados | Navegar full-page pierde contexto visual; componentes repiten metadatos y bloques | Extraer contenido compartido y montarlo en drawer o ruta completa |
| Filtros | `AnalysisFilters.svelte`: intro, fields, footer; forma nueva URL únicamente con FormData | Demasiado alto; futuros params de drawer/sort podrían perderse | Toolbar de una línea, chips y helper único de serialización que preserve params compatibles |
| Carga | `+layout.server.ts` invoca `buildDashboardData` para cualquier vista | Toda ruta recibe Tasks, análisis, board, timeline, AGENTS y arrays repetidos; detalle hace otra carga | Layout pequeño, consultas por ruta y contexto compartido por request |
| Coste de servicios | `dashboard.ts` busca cada task vinculada con `.find`, deriva grafo y timeline; timeline recursivo | Posible coste creciente y límite de pila en cadenas grandes; no se puede resolver sólo con CSS | Medir fixtures; mapas por ID y planificación iterativa sólo donde el perfil lo justifique |
| Estado | Filtros analíticos incluyen archivadas implícitamente; Kanban las excluye siempre | El mismo filtro tiene efecto de archivo diferente entre vistas | Hacer alcance visible y explícito preservando URLs antiguas |
| Estilo | `app.css`: fondos transparentes, blur, gradientes, sombras, grandes radios y fuente display serif | Interferencia visual y difícil validar contraste final por composición | Superficies sólidas, bordes finos y acento verde; serif sólo marca/título editorial |
| Reuso | 7 componentes: controles, filtros, documento y Mermaid; sin tabla/drawer/shell compartidos | Cada ruta reinventa estilos y estados | Sistema pequeño de componentes con contratos concretos |
| Escritura | `specs/[specId]/+page.server.ts`: `answerOpenQuestions` → repositorio → evaluación | La UI no es completamente read-only hoy | Preservar exactamente esa excepción; no añadir edición general |
| Calidad | Tests de dashboard, detalles, acciones, tema y helpers; no se encontró suite browser configurada en package scripts | Buena base de dominio, falta evidencia de interacción y visual | Añadir pruebas browser de flujos reales y accesibilidad |

Versiones declaradas: Svelte 5.55.1, SvelteKit 2.55.0, Vite 8.0.3, TypeScript 6.0.2, Lucide. La documentación web actual de SvelteKit ya describe APIs distintas: la implementación debe usar los tipos instalados, donde `pushState` y `replaceState` existen y no aparece `goto({ shallow: true })`. No actualizar framework como parte del revamp.

## Goals

- Inspeccionar una tarea/spec sin abandonar la lista ni perder filtros, scroll, selección o orden.
- Comparar 16 filas completas como mínimo a 1440×900 y 12 a 1280×720 con densidad compacta, drawer cerrado y una fila de filtros; verificar en navegador.
- Trabajar con 10 000 tareas y 2 000 specs mediante consultas acotadas; no descargar todos los cuerpos ni montar todo el dataset.
- Reutilizar primitivas visuales, tabla, detalle y estados en todas las rutas.
- Cumplir criterios concretos de teclado, contraste y reflow; mantener claro/oscuro/sistema.
- Conservar semántica de estados, dependencias, review, archivo, progreso y timeline.

## Non-Goals

- Edición de celdas, pegado de datos, fórmulas, drag-and-drop que cambie estados, creación/eliminación/archivo masivo.
- Rectángulos de selección de celdas, agrupación arbitraria tipo pivot, dashboards personalizables o constructor de consultas.
- Multi-repo/portfolio UI, login, colaboración remota, sincronización cloud o motor de IA.
- Reescribir en React, Tailwind o shadcn; incorporar un grid comercial pesado; actualizar stack.
- Cambiar la política de review/done, interpretar unidades relativas como fechas o esfuerzo real.

## Constraints e invariantes

1. `src/` mantiene la lógica de dominio; `web/` representa datos tipados, no parsea Markdown/frontmatter ni deduce estados efectivos por separado.
2. Leer/cambiar orden/filtros/selección/densidad no escribe memoria del repo. Preferencias exclusivamente UI se guardan localmente con versión y validación.
3. Toda escritura sigue pasando por `answerSpecOpenQuestions` y la evaluación compartida. Nunca se deriva una edición a partir de una selección de tabla.
4. Las rutas actuales `/`, `/tasks`, `/tasks/[taskId]`, `/specs`, `/specs/[specId]`, `/timeline` siguen funcionando desde URL directa.
5. El conjunto filtrado y su orden estable son deterministas para una misma revisión del repo y un `now` explícito cuando el filtro es temporal.
6. Conservar `spm ui` desde dev y paquete npm instalado globalmente; no asumir CWD=repo del paquete. Nuevos assets necesarios se incluyen en `package.json#files`.
7. SSR básico permanece útil sin JS: filtros GET, paginación, detalle full-page y formulario canónico funcionan. La grilla avanzada y el drawer son mejoras con JS.

## Actores y recorridos principales

- Persona revisando muchas tareas: abre Tasks, filtra review/blocked, ordena prioridad, recorre con teclado, abre drawer, consulta dependencia y vuelve al contexto previo.
- Persona planificando: cruza Tasks y Specs con filtro de spec, revisa progreso y usa timeline para relaciones; las unidades relativas se etiquetan siempre.
- Persona respondiendo una decisión: abre spec, sección Preguntas, escribe respuestas, guarda, recibe resultado y evaluación determinista; el borrador no se pierde al fallar.
- Agente de ejecución: implementa fases y prueba criterios, no toma nuevas decisiones de UX o arquitectura unilateralmente. Si emerge una decisión no cubierta, vuelve a Astra.

## Proposed Approach: identidad visual

Nombre de dirección: «mesa de operaciones editorial». Mineral oscuro o papel frío, tipografía precisa, verde para progreso y selección, azul para foco, ámbar/rojo para estados que requieren atención. Marca editorial pequeña; datos alineados y áreas de trabajo rectangulares.

- Usar la familia actual `Avenir Next`, con fallbacks existentes; no introducir descarga de fuentes. Cuerpo/datos 13 px / line-height 20; controles 13/18; metadatos 12/18; título vista 20/26; lectura de documento 15/24. IDs y números tabulares con pila monoespaciada local (`SFMono-Regular`, Consolas, monospace). Fuente serif existente sólo para marca y título Overview. No basar anchos en una fuente propietaria disponible sólo en macOS.
- Escala espacial 4, 8, 12, 16, 24. Bordes 1 px. Radios 4 controles, 6 overlays, 0 celdas. Sin sombras en filas/cards; una sombra sólo para overlays flotantes.
- Fila compacta 32 px, cómoda 40 px; en touch controles 44 px. Alturas en rem con mínimos para que aumentos de texto/zoom no corten contenido; las cifras son referencia a fuente raíz 16 px. A 200% permitir modo cómodo y reflow.
- Nav colapsada 56 px, expandida 184 px, iconos 18 px con target ≥32×32, tooltip y accessible name. Indicador activo por línea y fondo, además de color. Preferencia persistida; colapsada por defecto en workspace de datos.
- Barra global 44 px: proyecto, ruta/breadcrumb, estado local y refrescar. Toolbar vista 44 px: título+conteo, Table/Board si aplica, búsqueda, filtros, columnas, densidad. Segunda línea de chips sólo si hay filtros activos; no textos largos explicativos en cabecera.
- Animaciones de 100–150 ms para drawer/menus, ninguna entrada escalonada en miles de filas; `prefers-reduced-motion` elimina transición de movimiento.

### Tokens y contraste calculado

Superficies opacas para que el contraste no dependa de la escena. Tabla/drawer usan `surface`; canvas queda detrás. Nombres semánticos únicos, y aliases temporales para migrar tokens antiguos sin dos temas divergentes.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| canvas | #101518 | #F2F5F2 | Fondo general |
| surface | #151B1E | #FFFFFF | Tabla/drawer |
| surface-raised | #1C2528 | #EAF0EB | Cabeceras/hover |
| text | #E6EBE8 | #18251D | Datos principales |
| text-muted | #A9B5AF | #526158 | Metadatos legibles |
| accent | #75D6A1 | #16633B | Links/señal verde |
| selection-bg | #203F32 | #E3F1E8 | Fila seleccionada |
| focus | #8AB4FF | #245FA8 | Anillo 2 px con offset 2 |
| border-subtle | #2D3833 | #D9E1DB | Separación decorativa de filas |
| border-control | #75867C | #728178 | Controles que dependen del contorno |
| warning | #EBC27C | #795014 | Review/alerta con texto |
| danger | #FF9898 | #A52834 | Bloqueo/error con texto |

Cálculo WCAG sRGB realizado sobre pares sólidos, ratios aproximados mostrados a 2 decimales: text/surface 14.42 oscuro y 15.89 claro; muted/surface 8.21 y 6.54; accent/surface 9.85 y 7.29; focus/surface 8.33 y 6.41; text/selection-bg 9.58 y 13.63; border-control/surface 4.52 y 4.10; danger/surface 8.45 y 7.11; warning/surface 10.39 y 7.07. Esto valida esos pares, no certifica toda la UI. Medir además todos los estados hover/selected/disabled, chips, código y Mermaid después de renderizar.

Texto normal ≥4.5:1 según [WCAG contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); adoptar ≥7:1 para texto principal como objetivo interno, y ≥3:1 para indicadores/control/foco contra adyacencias. `border-subtle` puede ser decorativo y no sirve como única identificación de un input. Cada estado usa icono y etiqueta; `done` y `cancelled` no se fusionan en el texto de la tabla aunque compartan lane histórica del board.

## Detailed Specification

### 1. Arquitectura de información

Mantener cuatro destinos principales: Overview, Tasks, Specs, Timeline. Evitar añadir settings, portfolios o secciones sin contenido actual.

- Overview: foco y siguientes acciones arriba, conteos compactos en una sola banda, listas de bloqueos/review, salud AGENTS, estado git y último handoff. Máximo dos columnas de contenido en desktop. No replicar cabecera de overview en todas las rutas.
- Tasks: tabla por defecto; pestaña Board mantiene Kanban. Presets visibles `Todo sin archivar`, `En curso`, `Review`, `Bloqueadas`, `Todas`, `Archivadas`; el default no debe ocultar tareas terminadas no archivadas. Evitar que un repo sin trabajo activo parezca sin datos.
- Specs: tabla con ID/título fijos, estado, avance `done/total`, bloqueadas, review, número de tareas. Owner/updated/tags sólo si se agregan al DTO desde campos canónicos, nunca scrapeando el cuerpo. No mezclar avance filtrado con avance global: default progreso global; si el usuario selecciona una ventana, etiqueta explícita «avance del subconjunto» donde corresponda.
- Timeline: mismo filtro compacto, árbol por spec y timeline con una sola altura por fila; unidades relativas, no fechas. Selección de trazado conserva `selected_task` y significado actual de relaciones directas/transitivas. Detalle lateral adicional no reemplaza ese estado de trazado.
- Ajustes UI (tema/densidad/rail/columnas) en popover del footer del rail. No nueva página Settings.

### 2. Layout y responsive

- ≥1200 CSS px y ancho de contenido suficiente: drawer docked derecha, sin backdrop, tabla y drawer con scroll independiente. Inicial 440 px, límites 360–640 px; mantener ≥560 px para la región tabla. Si la combinación no cabe, usar overlay en vez de comprimir columnas hasta quedar inútiles.
- 768–1199 o workspace estrecho: rail 56, drawer modal overlay de `min(520 px, viewport − 32 px)`, con backdrop; tabla sigue detrás sin cambiar scroll.
- <768: rail reemplazado por navegación compacta en header; drawer full-screen modal, título y cierre siempre visibles. Tabla conserva ID/título/estado como columnas iniciales y scroll horizontal localizado; filtros en sheet accesible. Nunca scroll horizontal de todo el documento.
- El ancho del drawer cambia con handle accesible (`separator`, orientación vertical, flechas ±16 px, Home/End límites), y menú de anchos alternativo; no sólo arrastrar.
- En zoom/reflow, usar el ancho CSS disponible para pasar a modal. No forzar un dock que corte texto. Documento y metadatos se reacomodan; la tabla puede conservar su scroll bidimensional por la naturaleza de los datos.

### 3. Tabla: contrato de datos y columnas

Crear consulta compartida `WorkspaceListQuery` en `src/services/` como unión discriminada por `kind`, con `q`, `sort`, `page`, `pageSize`. Para `kind=task`: `specIds`, `statuses` del estado efectivo, `priority`, `scope=unarchived|all|archived` y ventana temporal donde el dominio ya la soporta. Para `kind=spec`: `specIds`, `statuses` del estado canónico de spec (incluye archived), y `taskScope`/ventana sólo para el subconjunto de tareas usado por métricas analíticas; no filtrar specs por `archivedAt`, campo inexistente. Default `taskScope=all` mantiene progreso global; filtros de progreso muestran etiqueta de subconjunto. Rechazar/normalizar fuera del contrato los campos exclusivos del otro kind. La tabla de tareas muestra effectiveStatus y expone rawStatus en detalle; nunca trata un todo bloqueado como listo. `q` busca por ID/título/resumen mediante comparación determinista normalizada; no hacer búsqueda semántica/modelo. Filtros de misma faceta OR, facetas distintas AND. Orden total con ID como último desempate; valores vacíos siempre al final. Máximo dos claves ordenables.

Respuesta `ListResult<Row>`: `rows`, `totalMatching`, `totalInScope`, `page`, `pageSize`, `normalizedQuery`, `revision`, `generatedAt`; bodies ausentes. `revision` identifica el snapshot usado para evitar mezclar selección/datos viejos, no un reloj aleatorio. Reutilizar carga canónica y derivaciones existentes. Si el repo cambia durante lectura, documentar consistencia best effort de filesystem; no prometer snapshot transaccional inexistente.

Tabla Tasks, default: selección 36, ID 108, título 320 flexible, estado 120, prioridad 64, specs 140, bloqueos 84. Columnas opcionales dependencias, downstream, fechas canónicas. No inventar responsables, estimaciones o fechas. Mostrar `—` para dato ausente.

Tabla Specs: selección 36, ID 100, título 360 flexible, estado 112, avance 100, tareas 72, bloqueadas 84, review 72. Resumen en drawer, no como segundo párrafo por fila.

- Header sticky y selección+ID congelados; título también fijo cuando hay ancho suficiente. Cuando las columnas fijas consumirían >45% del viewport tabla, congelar sólo selección+ID, sin ocultar columnas silenciosamente.
- Reordenar columnas desde menú con controles arriba/abajo; resize por handle y por ancho numérico/teclado; min/max por descriptor. No exigir drag.
- Orden por click en header; Shift+click añade segunda clave; menú accesible equivalente. Anunciar orden con `aria-sort` y texto de prioridad de clave.
- Headers y datos usan anchuras idénticas, números alineados a derecha y `tabular-nums`. Titles una línea + elipsis; texto completo al foco/tooltip accesible o drawer, sin depender exclusivamente de hover.
- Paginación server-side de 100 por defecto, opciones 50/100/200. Resultado exacto, controles primera/anterior/siguiente/última y etiqueta `101–200 de 4 230`. No scroll infinito que esconda dónde se está.
- Con máximo 200 por página no virtualizar Tasks/Specs inicialmente: DOM acotado y lectura/selección más robustas. Virtualizar sólo surfaces que excedan 500 filas montadas (timeline con expansión), usando ventana y overscan 8; jamás decidir que 10 000 filas son baratas porque existen 122 hoy.

### 4. Foco, selección y teclado

Separar tres estados: celda enfocada, conjunto de filas seleccionadas y entidad inspeccionada. Tener foco no abre drawer ni selecciona 40 entidades al navegar.

- Grid interactivo con un único tab stop y roving tabindex. Flechas mueven celda; Home/End extremos de fila; Ctrl+Home/End extremos de la página cargada; PageUp/Down una ventana visible. Tab sale del grid hacia el siguiente control; no atrapar. Publicar ayuda breve «Navegación dentro de esta página».
- Enter sobre celda de identidad abre drawer de su fila y enfoca su encabezado. En botones/checkbox se activa el control, no también la fila. Links genuinos preservan Cmd/Ctrl-click y abrir en nueva pestaña hacia ruta canónica.
- Click en celda selecciona foco; click en título/acción Inspeccionar abre drawer. Checkbox y Space en celda de selección alternan fila; Shift+click/Shift+Space amplía rango dentro de página y orden actuales.
- Select all del header = página actual, no resultados enteros; estado indeterminado cuando corresponde. Multi-selección se limpia al cambiar página, sort o filtro, con anuncio breve. No selección fantasma de filas invisibles.
- Barra contextual: «12 seleccionadas», Copiar filas TSV, Copiar IDs, Limpiar. No controles de editar/archivar. `Ctrl/Cmd+C` copia celda enfocada si no hay selección de filas; con selección explícita copia filas seleccionadas con columnas visibles y orden actual. El browser conserva copia de texto cuando se selecciona texto en drawer o hay input activo.
- Copia incluye header para filas, sin HTML; tabs/nuevas líneas dentro de un valor se normalizan a espacios. Celdas que comienzan con `=`, `+`, `-` o `@` se prefijan con apóstrofo para pegar en hojas de cálculo como texto; avisar en ayuda de copia. Clipboard rechazado: ofrecer bloque de texto seleccionable, no aparentar éxito.
- `Escape` cierra primero popover; luego drawer si está activo; nunca borra selección de forma inesperada. `F6` recorre regiones toolbar, tabla, drawer; no reemplaza la navegación Tab estándar.

El patrón grid requiere administración real de foco; no basta añadir `role=grid`. Implementación y tests siguen [WAI APG Grid](https://www.w3.org/WAI/ARIA/apg/patterns/grid/). Fallback SSR/no-JS usa tabla semántica convencional. Dar opción «tabla simple» paginada para lectura con tecnologías de apoyo: mismas columnas/consulta y links de detalle, sin navegación por celdas. En lista virtualizada, usar índices y conteo total consistentes, nunca reciclar nodo enfocado sin moverlo de forma deliberada.

### 5. Drawer: estructura, estados y navegación

`EntityInspector` es un único panel (no apilar drawers anidados). Header sticky: tipo/ID, título en máximo 3 líneas, estado, anterior/siguiente del conjunto visible, abrir página, copiar link, cerrar. Metadata compacta en pares etiqueta/valor; debajo secciones Resumen, Relaciones, Documento y, en Specs, Preguntas/Decisiones. Los tabs tienen navegación de teclado; mantener un único documento largo con anchors si los tests de tabs aumentan complejidad sin valor.

Estados: cerrado → loading → ready | not-found | error. Carga nueva mantiene el shell y skeleton de tamaño estable; nunca muestra cuerpo de A bajo el título de B. Respuesta atrasada de A se descarta por identity/request token. Retry vuelve a pedir sólo ese detalle. ID inexistente deja la lista operable y permite cerrar; full-page devuelve not-found coherente.

Contrato URL propuesto: `/tasks?scope=unarchived&sort=priority.asc&inspect=task:TASK-123&section=relations`; equivalente en Specs y Timeline. `inspect` admite task/spec; `section` validada por tipo. El drawer se reconstruye al abrir enlace directo o recargar; no depende exclusivamente de `page.state`.

- Abrir desde lista crea entrada de historial. Back cierra y recupera scroll/celda; Forward reabre. Cierre por botón elimina `inspect` y `section` conservando la query actual completa. Sólo usa Back si la app puede verificar que la entrada inmediatamente previa es exactamente la misma ruta/query actual sin inspector; en cualquier otro caso usa replace de la URL actual. Así abrir → filtrar con drawer → cerrar conserva el nuevo filtro; Back puede volver a la entrada anterior de filtro según el historial normal y reabrir su inspector, sin que el botón cerrar retroceda filtros. En URL directa también usa replace, nunca envía al usuario a un sitio externo. Test obligatorio: abrir → cambiar filtro → cerrar → Back/Forward, comprobando query y entidad en cada entrada.
- Anterior/siguiente y salto entre relaciones reemplazan la entidad en la entrada actual, evitando 50 entradas al recorrer filas. Mantener un breadcrumb local de relaciones con botón volver al item anterior; esa mini-historia no pretende sobrevivir recarga. Links de nueva pestaña siempre canónicos.
- Cambiar filtro/orden conserva inspector aunque su entidad ya no pertenezca al resultado; etiqueta «Fuera del filtro actual», navegación siguiente/anterior deshabilitada hasta que vuelva a pertenecer. Scroll de tabla se reinicia al primer resultado, foco vuelve a toolbar, no se oculta drawer arbitrariamente.
- `selected_task` timeline sigue siendo trazado de dependencias. `inspect` es inspección: abrir spec desde ese drawer no cambia trazado. Clear tracing no cierra inspector; Close inspector no borra trazado.
- Estado compartible va en URL; selección/foco/scroll y breadcrumb local en estado de sesión/ruta; tema, densidad, rail, anchos/visibilidad columnas y ancho drawer en localStorage versionado y validado. No guardar borradores sensibles automáticamente en localStorage. URLs y storage con valores inválidos se normalizan a defaults, con pruebas.
- Primera implementación: navegación normal SvelteKit `goto`/links y cargas delgadas, mantener componentes keyed sólo por identidad necesaria y `noScroll` apropiado. No hacer shallow-routing obligatorio. Si se usa más tarde para latencia, el contrato URL, reconstrucción SSR y los tipos de la versión instalada siguen siendo el gate. [Documentación SvelteKit](https://svelte.dev/docs/kit/shallow-routing) explica el comportamiento general, pero su API actual no es el contrato de 2.55.0.

Desktop docked: `<aside aria-labelledby>` no modal, sin trap ni fondo inert; el usuario puede volver a tabla. Modo móvil/overlay: diálogo modal con `aria-modal`, fondo inert, focus trap y retorno al opener (o header tabla si el opener desapareció). Al cerrar siempre restaurar foco a celda por ID; si esa fila dejó de existir, header/primer resultado válido, nunca `body` sin explicación.

### 6. Preguntas de spec: excepción de escritura

Extraer `SpecQuestions` sin replicar lógica del repositorio. Form action canónica `/specs/[id]?/answerOpenQuestions`; respuesta y errores reutilizan el esquema actual. En drawer con JS, enviar a esa acción con enhancement/fetch compatible y actualizar resultado sin abandonar el contexto; sin JS ir al detalle canónico. No crear segundo endpoint de mutación ni escribir desde el cliente.

Borrador limpio → editado → guardando → éxito o error. Guardando: botón disabled y estado anunciado, doble submit bloqueado. Un refresh manual, por foco o por invalidación nunca reemplaza respuestas locales si el formulario está editado: refresca metadatos separadamente, compara preguntas base y marca conflicto si cambiaron. Tras conflicto, conservar borrador y permitir revisar antes de reenviar. Error: conservar respuestas y mostrar error asociado; éxito: reemplazar datos por resultado recargado, preservar evaluación y contar guardadas. Mientras hay borrador, cerrar, cambiar entidad o navegar requiere guardar/descartar/seguir editando; esa confirmación protege texto del usuario, no es permiso para lecturas. En recarga/cierre navegador usar mecanismo de dirty-form compatible cuando esté disponible; no prometer recuperación tras cierre abrupto.

Si archivo cambió fuera de UI antes de guardar, no sobreescribir preguntas o respuestas silenciosamente. En fase de acción, verificar las preguntas aún abiertas y sólo admitir pares vigentes; discrepancia produce conflicto recuperable con borrador intacto. Si servicio actual ya cubre ese caso, conservarlo; si no, añadir guard compartido y prueba antes de habilitar formulario en drawer. No ampliar esa tarea a editor general.

### 7. Filtros, archivo y compatibilidad

Helper único `parse/serialize/normalizeViewQuery` con allowlist por ruta. Al cambiar vistas, conservar `spec` si es válido; no arrastrar ciegamente `selected_task`, `inspect`, páginas o sort incompatible. Búsqueda debounced 150 ms con reemplazo de entrada de historial; Apply de facetas crea navegación intencional. Limpiar filtros conserva densidad/columnas y cierre del drawer es independiente.

`window=7d|30d|90d` mantiene el significado de timestamp de ciclo de vida ya implementado (completado/cancelado); no llamarlo «actualización reciente». Si se quiere updatedAt, sería nuevo filtro y nueva decisión.

URLs antiguas sin alcance explícito (`taskScope` en Specs, `scope` en Timeline): conservar comportamiento de legacy analítico cuando `spec/window` está presente en Specs/Timeline (incluía tareas archivadas) y mostrar chip «Incluye archivo · enlace anterior». Nuevas interacciones escriben el alcance explícito apropiado al kind. En Specs el estado archived selecciona specs archivadas y es independiente de taskScope de sus métricas. Tasks/Board nunca admite archivadas mientras se mantiene board operativo; para verlas pasar a tabla y scope=archived/all. Tests fijan ambos caminos. No cambiar la función existente `buildDashboardData` globalmente con defaults que rompan CLI/tests anteriores; crear consulta explícita nueva y delegar en mismas derivaciones.

### 8. Contratos de componentes y límites

Estructura propuesta: `lib/components/ui/`, `workspace/`, `data-table/`, `detail/`, `timeline/`; crear AGENTS local por subsystem que crezca antes de acumular archivos. Evitar un framework abstracto: cada componente nace de ≥2 usos o de un bloque complejo con responsabilidad única.

| Componente/helper | Contrato principal | Posee | No posee |
|---|---|---|---|
| WorkspaceShell / NavRail | project, nav, activeRoute, railMode, children | Layout, breakpoints, navegación accesible | Métricas/grafo/doc parsing |
| ViewToolbar / FilterBar | title, counts, controls, normalizedQuery, onQueryChange | Composición y chips | Semántica de archive/status |
| Button/IconButton/Badge/Tooltip | variantes finitas, label obligatorio en icon-only | Tokens, foco, targets | Lógica de entidad |
| Popover/ChoiceList | open, options, selected, onChange | Escape/outside click/focus/anchoring | Fetch o consultas globales |
| DataTable<Row> | rows, columns, rowKey, sort, selection, focusedCell, callbacks | Render y eventos grid | Fetch, Markdown, estados efectivos |
| ColumnDef<Row> | key, label, accessor, textValue, cell snippet, min/max, sortable, align | Contrato tipado por columna | Inferencia mágica desde objeto |
| TablePager / SelectionBar | counts, page, pageSize, selectionCount, actions | Navegación y copia visible | Selección remota ilimitada |
| EntityInspector | entityRef, state, mode, width, close/openFull | Panel, foco y resize | Construcción de SpecDetailData |
| TaskDetail/SpecDetail | DTO detalle, presentation=panel|page | Contenido común | Lectura de filesystem |
| MetadataList / RelationList | pares tipados o entity refs | Listas compactas comunes | Grafo nuevo |
| DocumentBody / MermaidBlock | bloques ya parseados / source | Render actual adaptado a tokens | Parser alternativo |
| SpecQuestions | preguntas, action result, submit callback | Form y borrador local | File writes directos |
| TimelineGrid/Ruler/GroupRow | grupos/rango/selection del servicio | Escala, virtual window, foco | Derivación de esfuerzo |
| QueryState / Preferences / Clipboard helpers | datos puros + adapters de browser | Normalización UI y persistencia | Lógica de dominio |
| EmptyState / ErrorState / LoadingState | reason, retry/reset, accessible label | Estado consistente | Ocultar errores de carga |

No añadir TanStack por anticipación. Con paginación y ≤2 sorts/columnas definidas, helpers puros + Svelte cubren scope. Si durante ejecución surge necesidad de dependencia para virtualización, Astra revisa evidencia de accesibilidad, tamaño, licencia y compatibilidad antes de adoptarla; no decisión libre de Sol.

### 9. Datos, frescura y rendimiento

Separar `buildDashboardData` como facade compatible de nuevas proyecciones de workspace. Un loader server crea contexto canónico y task index una vez por request y los pasa a funciones puras; no guardarlos en singleton global que mezcle proyectos. Shell recibe proyecto/git/fecha y contadores mínimos cuando haga falta; Overview pide salud AGENTS y señales; Tasks pide sólo lista; detalle pide sólo entidad. Query de drawer no obliga a derivar timeline, salvo la ruta timeline.

No introducir cache global persistente en primera fase. Refresh manual y refetch al recuperar foco (debounce, sólo si transcurrieron >5 s) mantienen frescura; conservar estado y mostrar `Actualizado HH:mm:ss`. Si refetch falla, mantener último resultado con aviso «Datos anteriores» y Retry. Requests concurrentes se cancelan o se descartan por sequence. Al guardar preguntas invalidar detalle/spec row correspondiente y resumen afectado; no remount total. La revisión de perf puede recomendar cache por proyecto/revisión, pero debe especificar invalidación de archivos externos antes de incorporarla.

Budget objetivo, no medición actual: fixtures reproducibles (182 docs actual-like; 10 000 tareas + 2 000 specs; 30 000 enlaces; cadena de 10 000; ciclos y referencias ausentes). Medir en hardware/OS/browser fijados en reporte, SSD local, cinco warmups y 20 muestras, mediana y p95; cold separado. No confundir TTFB del filesystem con coste de render.

| Métrica | Gate propuesto |
|---|---|
| Payload de ruta Tasks/Specs | ≤250 KiB JSON sin comprimir por página de 100, excluye cuerpos; sin arrays de vistas ajenas |
| Carga lista warm p95, fixture 10k/2k | ≤800 ms en máquina baseline registrada |
| Carga lista cold p95 | ≤2.5 s en esa baseline; estado cargando visible si >150 ms |
| Procesar click/tecla en grid | p95 ≤50 ms, ninguna tarea main-thread >100 ms durante scroll sostenido |
| Mostrar detalle warm | p95 ≤300 ms desde click hasta contenido, skeleton ≤100 ms si espera |
| Filtro local/control | feedback inmediato ≤100 ms; resultado server p95 ≤1 s más debounce 150 ms |
| DOM de tabla | ≤200 filas de datos montadas; timeline virtual ≤80 filas en viewport de referencia |
| JS inicial Tasks | delta gzip del revamp ≤60 KiB frente a baseline; Mermaid fuera de chunk de lista |
| Estabilidad visual | cambios de datos/abrir inspector no desplazan toolbar ni fila enfocada fuera de viewport sin intención |
| Leak smoke | 100 abrir/cerrar/cambiar entidades no acumulan listeners ni crecimiento retenido >10 MiB tras GC en harness |

Si el filesystem/grafo incumple el presupuesto, fase de volumen no pasa: optimizar shared services con perfiles y tests antes de ampliar dataset. UI virtualizada no compensa leer/serializar toda la memoria varias veces.

Timeline: escalar ruler con ticks adaptativos, no `Array.from(totalUnits)` si las unidades crecen; posicionar barras sin miles de elementos por fila. Ventana vertical por IDs estables, grupos colapsables y cálculo compartido; recordar grupo/scroll. No virtualización horizontal hasta evidencia, pero limitar ticks visibles y mantener header/filas sincronizados. En modo simple accesible ofrecer lista paginada de tareas con start/end/unidades y relaciones textuales.

### 10. Estados y fallos

- Repo vacío: explicar ausencia de specs/tasks y mostrar comandos `spm` correspondientes ya existentes/copiar, no botón de creación falsa.
- Sin coincidencias: conteo cero, chips visibles, acción Limpiar filtros; distinguir de «sin tareas activas, 122 completadas».
- Carga inicial: skeleton tabla a altura estable; refresco: conservar filas con `aria-busy` y estado sutil, no parpadeo.
- Error inicial: mensaje accionable y Retry; detalles técnicos en disclosure, sin stack largo en producto.
- Archivo eliminado: drawer not-found y lista refrescable; registro deja selección sólo después de refresh anunciado.
- Cambio externo: al refresh, conservar ID enfocado si existe; si no, escoger siguiente fila visible y anunciar eliminación. Revisar selección por IDs válidos.
- Filtros inválidos: normalizar sin crash; no concatenar IDs no validados como rutas/paths. Scope y tipo permitidos por enum.
- Título/resumen enormes, sin specs, multi-spec, unicode, links rotos, dependencia circular/ausente, completed sin fecha: casos de fixtures; no overflow fuera de celda, no ocultar diagnóstico.
- Estado/selección no sólo color; empty/error/loading nunca simulados con fila de datos que cambie conteos.

## Fases de implementación y dependencias

Cada fase termina en review real, arreglos, comprobaciones y commit del slice antes de empezar el siguiente. Preservar dirty ajeno: inventario y diff explícitos; no `git add .`. Sol 6.1 High ejecuta; Astra decide los cambios de alcance y revisa diseño/arquitectura.

| Fase | Entrega concreta | Depende de | Gate |
|---|---|---|---|
| P0: cerrar spec/baseline | Decisiones usuario resueltas, fixtures, medidas actuales, screenshots reales de 6 rutas, matriz de invariantes | Nada | Spec review sin findings abiertos de scope/contrato; no producto todavía |
| P1: tokens y shell | Tokens sólidos, primitivas mínimas, rail compacto, toolbar, Overview compacta, tema sin flash | P0 | Checks Svelte + screenshots light/dark/system, 1280/1440/768/390, teclado y contraste |
| P2: consultas compartidas | DTOs listas, query normalizer, cargas thin por ruta, request context reuse, compat legacy archivo | P0; integrar shell P1 | Tests servicio/status/archive/filter/sort/paging; contratos existentes sin regresión; payload budget |
| P3: tabla Tasks | DataTable, paginación, keyboard, columns, selección/copia, Board alternativo | P1+P2 | Flujo browser completo 0/1/200/10k; clipboard; foco/scroll; sin writes al interactuar |
| P4: drawer y detalles | Contenido detalle compartido, rutas canónicas, query inspect, history, responsive, error states | P3 | Back/Forward/direct URL, cancel/race, no focus trap desktop, trap modal, 404; formulario aún canónico si guard no listo |
| P5: Specs y preguntas | Tabla Specs, progreso fiel, formulario preguntas en drawer con dirty guard/conflicto | P4 | Tests acción y no duplicar escritura; borrador en error; evaluación preservada; filtros compatibles |
| P6: timeline y volumen | Extraer timeline, ticks acotados, ventana si >500 filas, drawer integrado, diagnóstico grafo | P4+P2; validar P5 | Relaciones/directas/transitivas sin regresión; cadena grande no stack overflow; presupuesto perf |
| P7: cierre | QA completa, AGENTS/doc/handoff, smoke paquete global, artefactos comparativos | P1–P6 | Todos AC; review resuelta; cobertura y check:agents |

El estado de cada fase se registra en las tareas enlazadas; esta tabla define dependencias y gates, no certifica su finalización. No asignar duraciones sin baseline/estimación de ejecución. El usuario autorizó el trabajo paralelo con los roles de modelos indicados; los gates de dependencias y revisión siguen vigentes.

## Tests y verificación

- Mantener Bun tests dominio actuales; añadir pruebas de query normalizer/serialize/roundtrip, scope legacy, sort estable, límites de página, statuses efectivos, filtros OR/AND, archivo, `now` fijo, revisión/refresh, copia TSV y preferencias corruptas.
- Browser tests de componentes y rutas con fixtures aislados: navegación teclado real, abrir/cerrar drawer, límites resize, fuera de filtros, row ID borrado, búsqueda rápida A→B que responde fuera de orden, back/forward y recarga de inspect, nueva pestaña canónica, overlays, dark/light, responsive.
- Integración de preguntas: POST vacío/error/éxito/doble submit/conflicto; archivo real sólo en temp fixture; comprobar mutación exacta y evaluación, nunca en memoria personal del repo.
- A11y: axe sin violaciones serious/critical en rutas y estados; además teclado manual, VoiceOver+Safari y NVDA+Firefox cuando exista entorno, grid simple fallback, zoom 200%, reduced motion, high contrast. Si un entorno no está disponible, registrarlo como pendiente; axe no sustituye lector de pantalla.
- Visual: screenshots deterministas de Tasks con drawer cerrado/abierto; Specs+preguntas; Timeline trazado; Overview; temas; 0/1/muchos, títulos largos. Review a 1280×720, 1440×900, 1920×1080 y 390×844.
- Seguridad funcional de render: no introducir HTML directo para summaries; mantener tratamiento de Markdown/Mermaid y fallback de código existente; probar contenidos no confiables ya soportados sin crear parser nuevo.
- Ejecutar `bun test`, `bun test --coverage`, `bun run web:check`, `bun run --cwd web build`, `bun run check:agents`, suite browser nueva y smoke `spm ui` desde proyecto externo/paquete preparado. Cobertura objetivo ≥80% global; no declarar cumplido sin reporte que explicite ámbito y archivos excluidos. No esconder Svelte de un total sólo porque Bun no lo instrumente: complementar cobertura de flujos UI con matriz de AC.

## Acceptance Criteria

AC01. Tasks y Specs abren tabla; Tasks puede alternar a board sin perder filtros compatibles; ninguna operación de lectura cambia archivos del repo.
AC02. Rail colapsado 56 y expandido 184 a root 16; la preferencia persiste; rutas detalle activan su sección padre con `aria-current`.
AC03. ≥16 filas completas a 1440×900 y ≥12 a 1280×720 bajo condiciones Goals; texto principal ≥13 px y targets interactivos ≥24×24, touch 44 objetivo.
AC04. Todos los tokens foreground/background utilizados satisfacen contraste especificado en ambos temas con auditoría de estados, no sólo los pares de esta tabla.
AC05. Query sort/filter/page se reconstruye desde URL y devuelve los mismos IDs/orden para el mismo fixture/now; defaults y valores inválidos están cubiertos.
AC06. Selección es por IDs, distingue foco/inspector, select-all acotado a página; copiar produce exactamente columnas/orden visibles y neutraliza fórmulas.
AC07. Drawer abre desde Tasks/Specs/Timeline, recarga/link directo reconstruyen contexto, Back/Forward funcionan, cierre no abandona app en entrada directa, sin scroll/foco perdidos.
AC08. Desktop permite interacción tabla y drawer; overlay/mobile encierra foco, close/restauración correctos; resize disponible sin arrastre.
AC09. Respuestas tardías no muestran entidad incorrecta; not-found/error/retry y eliminación externa mantienen vista operable.
AC10. Todos los detalles existentes (dependencias, docs, Mermaid, decisiones, handoffs, señales estado) siguen accesibles en drawer o página completa.
AC11. `answerOpenQuestions` continúa siendo única mutación, usa servicio compartido y conserva borrador ante error/conflicto y refresh manual/por foco; ninguna otra celda aparenta ser editable.
AC12. Timeline conserva estados derivados y archivo, trazado linkeable y unidades relativas; IDs renderizados y conteos coinciden con servicio anterior en fixtures equivalentes.
AC13. Matriz rendimiento cumple budgets en baseline registrada para 10k/2k; las listas no serializan otros datasets ni cuerpos. Fallar budget bloquea P7, no se maquilla con skeleton.
AC14. Pruebas relevantes pasan, cobertura reportada ≥80% objetivo global o déficit explícito bloqueante acordado; sin violaciones a11y serious/critical; revisión manual registrada.
AC15. `spm ui` sigue funcionando desde workspace y paquete global; AGENTS/documentación reflejan layout y contratos; `check:agents` pasa.

## Decisiones de producto y diseño

Decisión de alcance confirmada por el usuario: inspección en volumen, filtros, selección y copia; conservar respuestas a preguntas de specs. Fuera de alcance: edición de celdas y mutación masiva. Selección rectangular no forma parte de esta propuesta.

Astra define los siguientes defaults de diseño, abiertos a feedback visual del usuario sin exigir otra ronda de aprobación para terminar el plan:

1. Tasks y Specs abren tabla; Tasks conserva Kanban alternativo.
2. Drawer docked cuando cabe, rail colapsado por defecto, fila compacta 32 px y opción cómoda 40 px.
3. Dirección mineral/verde con claro, oscuro y sistema, reflejada en el SVG propuesto.

No quedan preguntas de alcance bloqueantes. El usuario autorizó implementar el plan y la spec está active: P1/shell y P2/consultas compartidas están aprobados y committed (TASK-125/126); tablas, drawer, preguntas, timeline y verificación final siguen en curso o pendientes. Astra toma las decisiones técnicas y Sol implementa, elevando las decisiones nuevas.

## Mantenimiento de instrucciones al ejecutar

Actualizar `web/AGENTS.md`, `web/src/AGENTS.md`, `web/src/lib/AGENTS.md` y locales de subsistemas creados; actualizar `src/services/AGENTS.md` sólo si cambia el mapa de servicios/contratos. Usar `skills/agents-md-maintainer/SKILL.md`. Especificar diferencia drawer no modal/modal, URL inspect vs selected_task, grid read-only, acción de preguntas y DTOs compartidos. Actualizar managed spec/tasks/current/handoff mediante flujo spm. Este artefacto de planificación no cambia archivos de producto.

## Revisión de planificación

Revisión independiente realizada por Astra. Hallazgos resueltos: U1 separa scope de tareas y estado de specs, progreso global/subconjunto y estados raw/effective; U2 define cierre del inspector conservando query actual y verifica historial tras filtrar; U3 registra alcance confirmado por usuario y defaults de diseño sin exigir otra aprobación. U4 añade conservación del borrador de preguntas ante refresh y conflicto. La revisión final de planificación quedó aprobada tras estas correcciones.

Baseline verificada por el revisor: `bun run web:check` PASS, 0 errores/0 warnings; `bun run check:agents` PASS (17 archivos en esa comprobación). No se ejecutó cobertura ni benchmark de volumen: ≥80% y presupuestos de rendimiento son objetivos de implementación, no resultados obtenidos. No se implementó producto ni prototipo funcional en esta planificación.


## Ajuste de secuencia durante implementación (Astra, 2026-11-15)

La revisión de TASK-125 reprodujo navegación completa ante un fallo de `invalidateAll`. La acción nueva de refrescar se retira de P1 y se implementa en P2/TASK-126 sobre DTOs compartidos, con conservación de datos/scroll/foco y aviso de reintento ante error. P1 no acredita refresh in-place; no cambia el objetivo final del revamp.


## Secuencia paralela aprobada por Astra

Después de los commits revisados de TASK-127 y TASK-135, TASK-128 integra el inspector. Sus decisiones detalladas de transporte, historial, foco, modalidad y respuestas tardías están en la tarea. Tras el commit de TASK-128, TASK-129 (Specs/preguntas) y TASK-130 (Timeline/grafo) pueden implementarse en paralelo con ownership disjunto descrito en TASK-130. TASK-129 conserva el contrato público del inspector al añadir el guard de preguntas; TASK-130 sólo lo consume. La aprobación final de TASK-130 exige comprobar la integración con TASK-129 terminado. TASK-131 depende de ambos y mantiene todos los gates de aceptación. La dependencia técnica 130→128 habilita trabajo paralelo; no elimina esa comprobación final combinada.
