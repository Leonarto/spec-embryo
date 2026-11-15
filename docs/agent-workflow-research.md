# Investigación acotada: paradigmas útiles para SPEC-061/062

Fecha de consulta: 2026-11-15. Investigación Astra High; producto, skills y AGENTS no modificados. Estado: recomendaciones de trabajo y borradores, no nueva spec aprobada. Skills consultadas: spm-self-hosting y openai-docs. El helper oficial de manual Codex falló por DNS; se consultaron páginas oficiales mediante web.

## Decisión recomendada

Adoptar ahora tres hábitos: contexto por referencias, cambios con responsabilidad clara y revisión con evidencia del resultado. Mantener el reparto autorizado Sol 6.1 High implementando y Astra revisando/decidiendo; registrar roles y capacidades necesarias, sin convertir nombres de modelos en jerarquía universal. No añadir un scheduler, ranking automático ni grafo de código a SpM.

SPEC-061 ya cubre gran parte del problema de contexto y evidencia. SPEC-062 ya define componentes por responsabilidad, servicios compartidos y pruebas de interacción. El valor inmediato está en ejecutar bien esos contratos y conservar evidencia, no en ampliar ambos scopes con otro paradigma.

## Evidencia local

- `bun run spm status`, `spec list`, `task list`: root AGENTS 1198/1200 tokens; cadena máxima 2159/2200. No ampliar root para esta propuesta.
- `src/services/context-pack.ts` y AGENTS de services ya incluyen mustReadNow/supporting/offloaded/nextInspect; reutilizarlos.
- `src/services/memory-evals.ts` ya tiene retrieval, pack, consolidation e injection. Atención: la suite llamada `injection` comprueba inyección de contexto seleccionado, NO defensa ante prompt injection. No reportarla como prueba de seguridad.
- `skills/spec-reviewer/SKILL.md` revisa especificaciones. Una futura skill para revisión de implementación tendría un alcance distinto; no duplicar ese flujo.
- SPEC-061 limita SpM a memoria, intención y evidencia; el harness posee ejecución/modelos/subagentes. SPEC-062 mantiene dominio compartido y propone componentes concretos, sin tabla/framework universal.
- Nexus ya posee impacto/relaciones de código. SpM posee enlaces specs/tareas/memoria. Una lista de fuentes revisadas en un handoff no requiere un nuevo grafo persistente.

## Fuentes primarias y qué permiten concluir

1. **OpenAI, Build skills**, documentación viva, sin fecha de publicación visible; consultada 2026-11-15. La carga progresiva empieza por nombre/descripción y carga SKILL.md al usar la skill. Esto apoya instrucciones cortas con referencias específicas. No demuestra que muchas skills mejoren resultados ni que el agente siempre escoja la correcta. [Fuente](https://learn.chatgpt.com/docs/build-skills).
2. **OpenAI, Subagents**, documentación viva, consultada 2026-11-15. Permite roles/modelos/esfuerzos por agente y recomienda especialización acotada; los permisos siguen heredándose. La disponibilidad real de esta sesión y la elección del usuario gobiernan el trabajo. La documentación no constituye una evaluación comparativa universal Astra/Sol/Luna. [Fuente](https://learn.chatgpt.com/docs/agent-configuration/subagents).
3. **Anthropic, Effective context engineering for AI agents**, 2025-09-29. Describe referencias ligeras y recuperación cuando hacen falta, con coste de exploración y posible estrategia híbrida. Es guía de ingeniería del proveedor, no ensayo controlado de SpM. [Fuente](https://www.anthropic.com/research/effective-context-engineering-for-ai-agents).
4. **Anthropic, Building effective agents**, 2024-12-19. Propone empezar simple, separar tareas cuando existe una descomposición útil y considerar coste/latencia. La página avisa que sus herramientas han cambiado desde 2024: usar los principios, no copiar APIs históricas. [Fuente](https://www.anthropic.com/research/building-effective-agents).
5. **Google Engineering Practices, What to look for in a code review**, documentación viva, consultada 2026-11-15. Evalúa diseño, comportamiento, complejidad, concurrencia y utilidad de tests; advierte sobre generalización prematura. Apoya legibilidad y límites claros, no minimizar líneas. [Fuente](https://google.github.io/eng-practices/review/reviewer/looking-for.html).
6. **Google Engineering Practices, Small CLs**, documentación viva, consultada 2026-11-15. Define cambios pequeños como unidades autocontenidas con tests y contexto suficiente. Los números de líneas son orientación, no límite universal. [Fuente](https://google.github.io/eng-practices/review/developer/small-cls.html).
7. **Anthropic, Demystifying evals for AI agents**, 2026-01-09. Distingue transcript, trial y estado final; combina verificadores de código, humanos y modelos. Recomienda comenzar con casos reales y ampliar gradualmente. Un agente diciendo “terminé” no prueba el resultado. [Fuente](https://www.anthropic.com/research/demystifying-evals-for-ai-agents).
8. **OpenAI, Evaluation best practices**, documentación viva, consultada 2026-11-15. Recomienda casos típicos, extremos y adversariales; advierte que más agentes agregan incertidumbre y deben justificarse mediante evals. [Fuente](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
9. **Ong et al., RouteLLM**, primera versión 2024-06-26, v4 2025-02-23. Evalúa routing con datos de preferencias y coste/calidad. Sus resultados muestran posibilidad en los benchmarks estudiados; no validan routing de tareas largas de este repo ni permiten trasladar porcentajes de ahorro a modelos actuales. [Paper](https://arxiv.org/abs/2406.18665).
10. **Liu et al., Lost in the Middle**, primera versión 2023-07-06, v3 2023-11-20. Encontró sensibilidad a posición en QA multidocumento y recuperación clave-valor con modelos estudiados. Motiva medir recuperación; no prueba que todos los modelos actuales sufran igual ni permite fijar un contexto óptimo universal. [Paper](https://arxiv.org/abs/2307.03172).
11. **Zimmermann et al., Mining Version Histories to Guide Software Changes**, ICSE 2004. La minería de cambios históricos detecta asociaciones que el análisis estático puede omitir, incluidas relaciones con documentación. El propio paper distingue asociación de implicación necesaria. No demuestra causalidad ni precisión actual en este repo. [Paper alojado por el autor](https://thomas-zimmermann.com/publications/files/zimmermann-icse-2004.pdf).

## Adoptar / diferir / rechazar

| Decisión | Acción concreta | Razón y límite |
|---|---|---|
| Adoptar ahora | Brief por slice: objetivo, refs canónicas, 3–5 invariantes, archivos propios, pruebas y criterio de cierre | Inferencia local: reduce ambigüedad entre implementadores sin cambiar producto |
| Adoptar ahora | Expandir contexto por referencias existentes; omisiones con ruta de consulta | Ya es contrato SPEC-061; medir bytes completos, no sólo el pack |
| Adoptar ahora | Mantener transformaciones puras y handlers/adapters finos | Coincide con capas del repo; no extraer helper por cada línea repetida |
| Adoptar ahora | Antes de abstracción: señalar usos actuales o responsabilidad compleja única | Evita framework anticipado; preserva componentes accesibles aunque requieran más código |
| Adoptar ahora | Revisión independiente sobre diff identificable y evidencia verificable | Encontrar fallos observables, cerrar findings y repetir sólo pruebas afectadas |
| Adoptar ahora | Mapa temporal: cambio → productor → consumidores → tests/docs | Nexus para grafo si está disponible; imports/rg como fallback; ningún índice nuevo |
| Diferir a piloto | Dos skills pequeñas propuestas abajo | Probar activación y utilidad antes de instalarlas de forma permanente |
| Diferir a nueva spec | Contrato persistente de evidencia de ejecución/review | SPEC-061 P1 ya contempla evidencia; resolver ubicación/retención/invalidación allí |
| Diferir a evidencia | Reglas de co-cambio histórico, selección automática de modelo | Historia escasa o commits masivos generan ruido; no duplicar Nexus ni orchestration del harness |
| Rechazar | “Menos líneas siempre”, microhelpers obligatorios, complexity score como único gate | Puede ocultar ramas, romper claridad y penalizar tests o accesibilidad |
| Rechazar | Modelo distinto siempre significa revisión independiente o mejor | Independencia exige scope/evidencia/criterios; modelos distintos pueden compartir errores |
| Rechazar | Done por exit 0, consenso de agentes o resumen convincente | No prueba invariantes ni estado final |
| Rechazar | Pegar políticas/skills completas en root AGENTS, cada prompt y cada handoff | Duplica autoridad, consume presupuesto y produce drift |

## Aplicación inmediata a los implementadores

**SPEC-061:** seguir la cadena lectura → contexto → selección → render → wrapper. Revisar que la huella provenga de la misma lectura, no un reread; que prefix no contenga dinámica; que el límite abarque todo el texto; que Unicode no se corte mal; que JSON stdout sea exactamente un documento; que streams cierren antes del resultado; que cada invocación posea sus artefactos; que lectura/preview no escriban ni lancen procesos. Son riesgos del contrato existente, no alcance nuevo.

**SPEC-062:** seguir fuente canónica → DTO de ruta → tabla/drawer → URL/foco. Mantener query normalization compartida; probar stable sort, archive semantics y paginación; verificar A→B con respuesta tardía A, Back/Forward, cierre de drawer y restauración de foco. Compartir detalle panel/página sin segundo parser. No introducir cache global ni abstracción universal de tabla para anticipar requisitos.

Cada agente entrega archivos propios, decisiones, pruebas realmente corridas, fallos/pendientes y riesgos residuales. El integrador revisa puntos compartidos y compatibilidad; ningún agente presume que la suite de otro cubre su cambio.

## Contrato mínimo de routing, revisión y evidencia

Esto es un formato de trabajo en el chat/handoff, NO un schema nuevo de producto.

**Routing:** `{slice, role, scope, dependencies, requiredCapabilities, selectedModel, effort, reason, escalationTrigger}`. Los valores de modelo se registran exactamente como los autorizó el usuario; nunca inventar soporte. En esta ejecución: Sol 6.1 High implementa, Astra High evalúa decisiones/revisa. Routing automático queda fuera.

**Scope:** lista explícita de archivos/áreas propios y puntos compartidos. Si surge cambio incompatible en archivo de otro agente, comunicar y serializar esa edición. Los agentes no necesitan otra copia entera del repo en contexto.

**Escalación:** contrato ambiguo, nueva dependencia, nueva mutación/persistencia, fallo reproducible sin diagnóstico después de dos intentos razonados, o incumplimiento de presupuesto. Reportar evidencia y la decisión necesaria; no repetir herramientas sin hipótesis ni cambiar modelo silenciosamente.

**Review:** `{base, target, changedFiles, invariants, findings, verification, residualRisks, verdict}`. Identificar commit/patch o huellas de archivos cuando el working tree sigue mutable. Findings incluyen disparador, esperado/observado, ubicación y consecuencia. Priorizar corrupción/contrato/proceso/foco según slice. No forzar hallazgos ni porcentaje de aprobación.

**Evidencia:** para cada comprobación, comando, entorno/fixture, exit code y resultado observado; adjuntar ruta breve de log/screenshot si aporta. Diferenciar passed, failed y not-run con razón. Una revisión se invalida para archivos modificados después; actualizar evidencia afectada. No guardar transcripciones completas, secretos ni razonamiento privado. Commit después de fixes y gate real antes del siguiente slice, según política del repo.

## Dos borradores de skills opcionales

Son borradores para un piloto, no instalados. Si se adoptan, aplicar skill-creator y AGENTS maintainer; reemplazar referencias redundantes en vez de agregar texto a root.

### `spm-change-slice`

**Description:** Use when implementing a bounded SpM code change across multiple layers or handing an implementation slice to another authorized agent. Skip single-line fixes with clear scope.

1. Usar self-hosting y recuperar tarea/spec; leer AGENTS local.
2. Escribir objetivo y restricciones; enumerar productores, consumidores, tests y docs afectados usando Nexus cuando exista o imports/búsqueda acotada.
3. Definir ownership de archivos y dependencias. Delegar sólo si el usuario/política vigente lo autoriza, mediante harness nativo; SpM no despacha agentes.
4. Implementar una unidad observable. Preferir flujo claro, nombres explícitos y dominio compartido. Crear abstracción por usos actuales o responsabilidad aislable; no por reducir líneas.
5. Verificar comportamiento y límites; entregar diff/ref, comandos ejecutados y pendientes. La tarea llega a review, no a done por autoevaluación.

**Salida:** breve slice brief + registro de evidencia en workflow existente. Sin nuevo estado paralelo, permisos, política de modelos ni rediseño de arquitectura.

### `spm-implementation-review`

**Description:** Use to review a completed SpM implementation slice against its approved spec and observable behavior. Skip spec drafting; that belongs to spec-reviewer.

1. Identificar base/target y leer spec, AGENTS local, diff y pruebas relevantes.
2. Trazar entrada→transformación→salida y consumidores. Comprobar primero invariantes con mayor impacto; revisar casos negativos/concurrencia cuando apliquen.
3. Buscar complejidad innecesaria y duplicación de dominio; no imponer preferencias estilísticas sin efecto concreto.
4. Validar evidencia del autor y ejecutar comprobaciones independientes útiles. Pruebas que reflejan implementación sin distinguir fallo/éxito no bastan.
5. Emitir findings accionables o declarar sin findings; separar problemas bloqueantes de mejoras opcionales y verificaciones no disponibles.
6. Tras fixes, revisar diff nuevo y evidencia afectada. No marcar done con findings abiertos. No necesita otro modelo para funcionar; independencia proviene de la revisión y del artefacto observado.

**Salida:** verdict + findings + verification + residual risks, vinculados a una versión exacta del cambio.

## Pruebas y evals medibles

**Producto, ahora:** ampliar suites ya exigidas por SPEC-061/062. Criterios binarios para JSON único, límites bytes, provenance, prefix estable, ausencia de writes en preview, cancelación y casos Git. Para web, casos de URL/foco/orden/race además de screenshots; no sustituir teclado por screenshot. Medir cobertura con ámbito explícito y meta ≥80% existente. No agregar thresholds inventados que compitan con los de SPEC-062.

**Contexto, piloto pequeño:** 12 escenarios fijados desde fallos reales: tarea/spec correctas, refs ausentes, dirty relevante/irrelevante, títulos enormes, Unicode, cambios externos, repos sin Git, contexto fuera de presupuesto, varios scopes con IDs repetidos, resumen insuficiente y cambio adversarial en documento. Medir inclusión de invariantes requeridos, refs válidas, recuperabilidad de omisiones, bytes finales y reproducibilidad. Gates deterministas: todos los fixtures pasan; cero hashes inventados, cero omisiones silenciosas y cero mutaciones de lectura. No afirmar defensa de prompt injection por la suite `injection` actual.

**Workflow/modelo, después:** piloto comparativo sobre 12 tareas pequeñas congeladas, dos ejecuciones por condición, misma base/herramientas/tests/permiso. Comparar baseline sin nuevas skills contra skills propuestas; variar routing sólo en experimento separado autorizado. Registrar éxito funcional, findings críticos escapados, iteraciones de corrección, tiempo, tokens/coste cuando sean observables, tamaño del contexto. Juez de código primero, revisión humana/ciega para claridad/UX; modelo juez sólo apoyo. Es muestra exploratoria, no significancia ni ranking universal. Adoptar si no aparecen regresiones funcionales y mejora una métrica útil sin empeorar materialmente las otras; publicar resultados por tarea, no sólo media.

## Despliegue acotado

1. Hoy: usar brief/evidencia/review anteriores en SPEC-061/062; no cambiar producto por esta investigación.
2. Cerrar slices existentes con review, fixes, checks y commit. Guardar sólo decisiones durables necesarias en memoria SpM mediante workflow del integrador.
3. Si el piloto de skills aporta, instalar una o ambas con triggers precisos; actualizar índice/AGENTS pertinente sin exceder presupuestos y correr check:agents. Si self-hosting puede absorber una referencia corta sin duplicación, preferirlo a nueva política raíz.
4. Para persistencia de evidencia, diagnóstico de capacidad o routing asistido, abrir slice/spec separado con spec-writer y spec-reviewer. No introducirlo incidentalmente dentro de P0.
5. Revisar utilidad tras varios slices reales; eliminar instrucciones que no cambien resultados. Fijar baseline antes de prometer ahorro de tokens/coste.

Pendientes deliberados: no evaluación de rendimiento comparativo Astra/Sol; no benchmark local de las skills; no auditoría exhaustiva Nexus ni implementación de co-cambio; no verificación del comportamiento de cada versión instalada de Codex/Claude. Las fuentes describen patrones, y las recomendaciones para este repo son inferencias técnicas explícitas.

## Decisión técnica incidental enviada al implementador

Para provenance de SPEC-061 P0, WeakMap mínimo es aceptable evitando campos enumerable nuevos en BaseDocument, condicionado a obtener hashes desde documentos canónicos antes de clones/proyecciones. Resolver refs con scope+path; ausencia de provenance implica warning y valor ausente/null, jamás reread o hash del parsed object. No trasladar hash a un clone cuyo contenido cambió. Leer Buffer una vez, hashearlo y decodificar esa misma lectura para parse; re-encode de string puede perder identidad de bytes UTF-8 inválidos. Tests: cargas distintas del mismo path, clone sin provenance, mutación externa posterior y JSON legacy intacto. GitSnapshot.head opcional con full SHA de `rev-parse --verify HEAD`; conservar lastCommit humano, null exterior sin Git; no prometer atomicidad entre Git y archivos.

## Observaciones de los slices revisados

Durante esta ejecución del 2026-11-15, la revisión independiente de cambios congelados produjo casos reproducibles para futuras evals. Son observaciones de implementación y revisión, no un benchmark comparativo de modelos o skills; no hubo grupo de control ni medición que atribuya los hallazgos al modelo elegido. Las dos skills anteriores siguen como pilotos propuestos, sin instalar.

| Slice | Fallo observado | Caso de regresión y resultado |
|---|---|---|
| TASK-125 | Abortar requests de datos durante `invalidateAll()` provocaba navegación completa, en vez de conservar datos y anunciar error. | Retirar la acción incompleta del shell y trasladar refresh controlado a TASK-126. El retiro quedó verificado; preservación de foco/scroll/datos ante fallo sigue siendo gate de 126. |
| TASK-124 | Un padre terminaba con exit 0 mientras un nieto del mismo grupo, sin pipes heredados, seguía vivo; cleanup eliminaba el prompt y su lectura tardía fallaba con ENOENT. | Comprobar el grupo al cierre normal: unknown, artifacts retenidos y lectura tardía exitosa. No matar trabajo de fondo para simular cierre. |
| TASK-132 | Abrir CLAUDE.md antes de comprobar su tipo bloqueaba la inspección si era un FIFO sin escritor. | Rechazo previo de no-regulares, apertura no bloqueante donde se soporta y validación del descriptor. La revisión verificó también sustitución del archivo por FIFO/symlink entre comprobación y apertura. |
| TASK-126, servicios | El round-trip de una consulta admitida perdía `option_pageSize=100` y cambiaba requestKey. | Serializar el tamaño admitido; reproducción independiente conserva 100 y la identidad normalizada. |
| TASK-126, servicios | Comparar fechas como strings invertía el orden cronológico con offsets distintos. | Comparar instantes; fechas inválidas/vacías al final. Fixtures de Tasks y Specs verifican ascendente/descendente. |

Después de esos casos, las revisiones cerraron otros dos grupos de regresiones:

- **TASK-126, UI:** un refresh actualizaba filas pero conservaba títulos/conteos antiguos en el catálogo; Clear dejaba filtros pendientes si el valor aplicado no cambiaba. El fix preserva borradores durante refresh y los reinicia al limpiar. Dieciséis regresiones focalizadas y la reproducción independiente de los dos fallos pasaron antes del commit `0893166`.
- **TASK-134:** IDs opacos con secuencias `$` cambiaban al sustituir argumentos, UTF-8 inválido en recibos devolvía una categoría de error incorrecta y enums coaccionados aceptaban arrays. La revisión exigió sustitución literal, clasificación de entrada inválida y tipos estrictos. Los repros independientes pasaron; el recheck afectado contó 26 pruebas y 269 expectativas. Los 33 archivos finales coincidieron con sus hashes antes del commit `d164e75`.

Estos casos se añaden como candidatos de eval observable. No prueban que una skill o un modelo haya causado una mejora de productividad, y no activan por sí solos la instalación de las skills propuestas.

Para la equivalencia del índice de TASK-126 se usó además el código real del commit base `1b1d47a` como oráculo: 300 grafos y 10 738 resúmenes coincidieron. Esto evita comparar dos rutas de la implementación nueva y confundir ese acuerdo con compatibilidad histórica. Los hashes de archivos delimitan qué versión fue revisada; cambios posteriores requieren revisar el delta.

Estos casos favorecen evals de resultados observables y fallos concretos: proceso que sigue vivo, archivo que aún puede leerse, navegación real, identidad que sobrevive a serialización y orden temporal correcto. No prueban una mejora global de productividad ni ahorro de coste. La aprobación parcial de servicios de TASK-126 tampoco acredita frontend o rendimiento filesystem/HTTP; su medición de payload fue en memoria.
