+++
doc_kind = "spec"
id = "SPEC-061"
title = "Adapt SpM to native agent harnesses"
summary = "Implement deterministic native-harness interoperability: bounded context/processes, explicit diagnostics/hooks, native output and guarded execution receipts."
status = "done"
task_ids = ["TASK-123", "TASK-124", "TASK-132", "TASK-133", "TASK-134"]
tags = ["agents", "interoperability", "context"]
updated_at = "2026-11-15T20:44:06.117Z"
+++

# Adaptar SpM a los harnesses nativos de agentes

## Estado de implementación

P0 y P1 completados mediante TASK-123, TASK-124 y TASK-132–134, con implementación Sol 6.1 High y revisión independiente Astra High. El usuario autorizó su implementación el 2026-11-15. El análisis usa el working tree del 15 de noviembre de 2026, incluidos los cambios existentes de SPEC-055–060. No considera esos cambios como funcionalidades pendientes por el hecho de no estar en el último commit. El estado done cubre P0/P1. P2 queda diferido, no activado, y mantiene sus condiciones de evidencia.

## Problema y decisión de producto

SpM ya ofrece memoria determinista, contexto compacto, portfolio, perfiles/importación, recuperación, hooks de repositorio y contratos JSON. Su oportunidad es asegurar que cualquier agente obtenga contexto correcto y actual, y deje evidencia durable verificable. El hueco principal está entre esos servicios y los harnesses, no en construir otro gestor de agentes.

Decisión recomendada: **harness nativo para ejecutar; SpM para intención, memoria y evidencia del proyecto**. El camino principal será que el agente invoque la CLI de SpM. Los wrappers Codex/Claude seguirán siendo opcionales y explícitos. P0 corrige contratos y defectos actuales; P1 mejora adopción y adaptación; P2 sólo se activa con evidencia de necesidad.

## Evidencia del baseline anterior a la implementación

| Área | Ya existe | Brecha comprobada |
| --- | --- | --- |
| Recuperación | `resume --since`, `resume-window.ts`, handoffs, contexto determinista | `runResumeCommand` calcula la ventana pero llama al backend sin ella; llega al resultado exterior, no al prompt del agente. `--since` admite revisiones Git, no resuelve fechas ni IDs de handoff. |
| Backends | `deterministic`, `prompt`, `codex`, `claude`, launch-plan compartido y tokens de archivos | `subprocess.ts` reutiliza cuatro rutas fijas por backend, hereda stdout incluso con `--json`, espera `exit` sin un contrato de cancelación/timeout y conserva artefactos sin política explícita. |
| Contratos | `schema_version: 1.0` en status, doctor y agent | `resume` y PromptBundle no usan ese versionado; el resultado de un proceso no representa una verificación del trabajo. |
| Contexto | `mustReadNow`, `supporting`, `offloaded`, `nextInspect`, perfiles y ranking | `prompt.ts` pone el context pack cambiante dentro del prefijo supuestamente estable y vuelve a serializar el contexto completo al final; compactar el pack no limita el prompt total. |
| Hooks | Planes deterministas para commit/merge/CI/release | `installHookConfig` guarda eventos en `.specpm/hooks.json`; `buildHookPlan` describe acciones. No equivale a registrar hooks SessionStart/compaction en un harness. |
| Adopción | `agent brief`, `agent snippet`, doctor, AGENTS acotado | No hay diagnóstico específico de compatibilidad/versiones/carga de instrucciones de cada harness. |

Archivos base: `src/commands/resume.ts`, `src/services/resume-window.ts`, `src/backends/{base,prompt,subprocess}.ts`, `src/services/{contracts,context-pack,hooks,agent-workflow,adoption}.ts`.

## Qué cambió fuera del repo

Consulta: **2026-11-15**. Una capacidad documentada hoy no demuestra que se publicara después del último commit de 2026-05-20.

- Codex publicó disponibilidad general de hooks el **2026-05-14**: precede al último commit. La documentación actual permite integrar contexto en el ciclo de sesión y exige confianza para hooks no administrados. Esto justifica integrarse, pero no presentar hooks como una novedad de los últimos meses. [Changelog de OpenAI](https://learn.chatgpt.com/docs/changelog), [hooks](https://learn.chatgpt.com/docs/hooks).
- Claude Code **2.1.277, 2026-09-18**, agregó lectura nativa de AGENTS.md. La carga depende de versión, plugin y presencia de CLAUDE.md/CLAUDE.local.md; no se debe crear una copia universal ni asumir que todas las sesiones leen ambos. [Changelog de Anthropic](https://code.claude.com/docs/en/changelog#2-1-277), [reglas actuales de memoria](https://code.claude.com/docs/en/memory#agents-md).
- Actualmente Codex ofrece JSONL, respuesta final con esquema y resume por sesión; Claude ofrece JSON/stream-json, esquema y resume por ID. Son mecanismos propios de cada herramienta, no un protocolo idéntico. La fecha de introducción de cada mecanismo no se estableció en este análisis. [Codex no interactivo](https://learn.chatgpt.com/docs/non-interactive-mode), [Claude programático](https://code.claude.com/docs/en/headless).
- Codex App Server documenta threads, turnos e interrupción. Es una opción para clientes con control interactivo, no una dependencia necesaria para servir memoria desde una CLI. [App Server](https://learn.chatgpt.com/docs/app-server).

La conclusión estratégica es una inferencia de estas capacidades y del código local: cuanto más resuelve el harness, más valor aporta SpM al reducir ambigüedad y conservar decisiones portables. No hace falta perseguir cada modelo, tamaño de contexto o nueva superficie del proveedor.

## Responsabilidades e invariantes

| Responsable | Posee |
| --- | --- |
| SpM | Specs, tareas, dependencias, current, handoffs, memoria de proyecto, selección determinista de contexto, procedencia y validación de sus contratos. |
| Harness | Conversación y compactación internas, ejecución de herramientas, aprobación/sandbox, modelos, subagentes, worktrees, continuidad de su propia sesión. |
| Adaptador | Traducción explícita entre formato nativo y contrato SpM; detección de capacidad; asociación opcional a ID nativo. |
| Humano/agente autorizado | Decisiones de producto, cambios de estado y revisión del resultado mediante servicios/comandos existentes. |

- SpM no declara `done` por exit code 0, evento Stop ni respuesta que diga que terminó. El gate `review` permanece.
- Una referencia a sesión es opaca y específica de proveedor/superficie; no es memoria portable ni permite reanudarla desde otro proveedor.
- La memoria automática del harness puede contener preferencias; no sobrescribe specs, tareas ni current.
- Lectura normal, preview y prompt-return no lanzan otro agente, no requieren credenciales y no mutan memoria.
- No registrar hooks ni editar configuración de usuario como efecto secundario de status/resume/doctor.
- Los resultados y textos externos son datos. No se convierten en instrucciones de mayor autoridad ni reemplazan AGENTS.

## P0: corregir la base y el contrato de lectura

### P0.1 Ventana de recuperación compartida

Añadir `interruption_window?` al contexto compartido antes de `backend.run`. Conservar el campo exterior actual por compatibilidad. Incluir la ventana en bundle JSON, texto completo, preview y cola variable; excluirla del prefijo estable. Los archivos de bundle/text/tail reflejan esa ventana; el archivo prefix no la contiene. Sin `--since`, el campo sigue ausente.

Resolver `--since` como una única revisión Git de commit, sin interpretación como opción ni sintaxis de rango. Resolverla a SHA antes del diff. Una revisión inválida o Git no disponible genera `available:false` para lectura/preview, con razón explícita; con `--spawn`, abortar antes de escribir artefactos o lanzar el proceso. Fechas y IDs de handoff quedan fuera hasta una ampliación explícita.

La ventana representa cambios **committed** desde la revisión hasta HEAD. Los cambios staged/unstaged/untracked actuales siguen en `changed_items`; no afirmar que el diff entre commits incluye el working tree. Casos Git sin commits y revisión que ya es HEAD tienen resultados distintos: unavailable y ventana vacía válida, respectivamente.

### P0.2 Contrato mínimo portable

Extender el resultado existente de `resume --json` de forma aditiva, reutilizando el versionado y tests de SPEC-059. No crear un segundo protocolo global de versiones.

| Campo nuevo o consolidado | Semántica |
| --- | --- |
| `schema_version` | Versión del contrato de salida SpM. Mantener `resume` e `interruption_window` existentes. |
| `context_snapshot` | SHA HEAD o null, branch o null, indicador dirty, huella del contexto seleccionado y referencias de origen con hash de contenido. No afirmar snapshot atómico del filesystem. |
| `context_pack` | Reutiliza perfiles, mustReadNow/supporting/offloaded/nextInspect; ninguna estructura paralela de retrieval. |
| `interruption_window?` | La misma instancia lógica que recibe el backend, con revisión solicitada, SHA resuelto y disponibilidad explícita. |
| `warnings` | Lista determinista de datos ausentes, truncamiento y capacidades no verificadas. |

El identificador del snapshot es SHA-256 de una serialización JSON canónica del contexto seleccionado: claves de objetos ordenadas recursivamente, arrays en su orden determinista de dominio y bytes UTF-8. Incluye contenido relevante no committed, pero excluye generatedAt, hora de render, run IDs, rutas temporales y otros metadatos de ejecución. Los hashes proceden de los mismos bytes leídos para construir el contexto, no de una segunda lectura que pudiera observar cambios posteriores. HEAD igual con dirty distinto no debe parecer contexto idéntico. Las referencias Git no disponibles son null, no cadenas inventadas. Cambios fuera del contexto seleccionado no prometen invalidar esa huella. La lectura sigue siendo útil fuera de Git.

Retener los campos legacy de PromptBundle. Para texto humano y prompt ensamblado, renderizar cada bloque sólo una vez; conservar aliases de tokens existentes. Aislar instrucciones de formato realmente estables del contexto dinámico completo, incluidos focus, specs, tareas y ventana. No prometer hit de caché del proveedor sólo por separar prefix/tail. Los tests comparan igualdad del prefijo al variar exclusivamente datos dinámicos.

Añadir `--max-context-bytes` al render de resume: 32768 bytes UTF-8 por defecto, entero entre 4096 y 1048576; fuera de rango es error de uso. Es límite del texto completo entregado al agente, incluido prefix/tail, no estimación exacta de tokens. El mínimo reserva espacio para identidad y advertencias; no es promesa de incluir todos los resúmenes. Al excederlo, conservar primero identidad/foco/estado bloqueado, después referencias útiles y omisiones con ruta de expansión. Resumir campos de texto por prefijos UTF-8 válidos, añadir aviso de truncamiento y offload; si las referencias mismas exceden el presupuesto, conservar las primeras según orden determinista y el comando de consulta de detalle con contador de omitidas. Nunca generar JSON inválido. Mantener una variante JSON de datos completa en `resume --json`; el límite se aplica a sus campos de prompt renderizado, no al tamaño total del documento de datos. No se modifica el límite del proveedor ni se confunde límite en bytes con tokens.

### P0.3 Robustez del wrapper existente

- Cada spawn reserva un directorio propio bajo `.specpm/tmp/` con ID aleatorio, crea los cuatro artefactos y no comparte rutas con otro proceso. Preview no reserva ni escribe; sus rutas se señalan como plantillas.
- `--json --spawn` produce exactamente un documento JSON de SpM por stdout. Capturar stdout del hijo por pipes: conservar como máximo los primeros 1048576 bytes, sin partir caracteres UTF-8, continuar drenando el resto para evitar bloqueo y marcar `stdout_truncated` junto con bytes recibidos. Entregar esa salida como dato en `invocation.output`, nunca concatenada al contrato. stderr queda diagnóstico. Sin `--json`, mantener experiencia interactiva actual.
- Incorporar `--timeout-ms` opcional (entero positivo; ausencia significa sin timeout); valor inválido es error de uso. Usar reloj monotónico desde spawn exitoso y no reiniciarlo por actividad. Estado terminal de invocación: `completed`, `failed`, `cancelled`, `timed_out` o `unknown`; `completed` sólo confirma proceso exitoso. Recoger exit code y signal. Resolver al cerrar streams, no anticipadamente en `exit`.
- SIGINT/SIGTERM se reenvían al proceso/grupo controlado; esperar 2000 ms de gracia, después terminar forzosamente, con un máximo de 1000 ms adicional para observar el cierre. Garantía de cierre del grupo en macOS y Linux, con fixtures de hijo y nieto; no cubre procesos que se desligan voluntariamente del grupo. Windows conserva spawn con cancelación best-effort del hijo directo: si no se confirma el cierre del árbol, estado `unknown` y advertencia explícita, sin afirmar cancelación completa. Timeout usa la misma secuencia iniciada con SIGTERM. Una terminación externa no capturable (SIGKILL, crash de runtime o sistema) puede impedir emitir resultado y no se promete un envelope en ese caso.
- Para todo resultado controlable de `resume --json`, incluidos error de spawn, revisión inválida y cancelación, el dispatcher emite exactamente un envelope JSON versionado; ningún catch sustituye ese envelope por texto en stdout. Conservar `resume` y añadir `invocation` con estado, exit_code, signal, output y error tipado cuando corresponda. Exit de SpM: 0 lectura/preview/completed; 2 uso inválido o precondición que impide spawn; 1 fallo de proceso o estado unknown; 124 timeout; 130 cancelación por SIGINT; 143 cancelación por SIGTERM. El exit original del hijo queda en el dato `invocation.exit_code`, aunque SpM lo normalice. Error de creación/escritura de artefactos es failed/1 y nunca inicia el hijo.
- Limpiar artefactos propios tras cerrar el hijo; retención sólo mediante opción explícita de diagnóstico. No borrar directorios ajenos ni activos. Un crash puede dejar residuos; su limpieza posterior usa edad y propiedad verificadas, nunca glob indiscriminado.
- Mantener `--spawn` opt-in y comandos/args configurados por el usuario; no añadir bypass de permisos, instalación ni retries del agente. P0 no interpreta eventos específicos de proveedor.

## P1: adopción y adaptadores pequeños

Depende de contrato P0 probado; no bloquea una entrega útil de P0.

1. **Diagnóstico de harness.** Extender `agent brief`/doctor con integración elegida, versión detectada de forma acotada, capacidades comprobadas/no verificadas y conflictos de instrucciones. Ausencia del CLI no falla doctor del proyecto. Una versión desconocida conserva prompt-return y no recibe flags nuevos automáticamente.
2. **Instrucciones compartidas.** Mantener AGENTS como fuente del repo. Recomendar import desde CLAUDE.md sólo cuando sea necesario y mostrar diff antes de cualquier instalación solicitada. No eliminar archivos de usuario ni duplicar el mismo texto vía hook y AGENTS. Documentar condiciones de lectura; detección estática no equivale a confirmar carga efectiva del harness.
3. **Hooks de contexto opt-in.** Presets por proveedor para arranque/reanudación y recuperación tras compactación, limitados a lectura de contexto mediante SpM. Reutilizar hooks/services existentes sin confundir eventos Git con eventos de sesión. Registrar en formato nativo validado; preservar entradas ajenas y aplicar de forma idempotente. Los fallos de contexto muestran advertencia y mantienen comandos manuales; no bloquean trabajo ni arrancan un agente recursivo. La confianza/permisos los decide el harness.
4. **Adaptadores estructurados opt-in.** Parser Codex JSONL y parser Claude json/stream-json separados, probados con fixtures versionados. Normalizar sólo estado terminal, referencia nativa y resultado final; ignorar campos desconocidos sin declararlos éxito. Registrar ID exacto recibido, no elegir “última sesión” implícitamente. Un ID de otro proveedor/repo se rechaza antes de ejecutar; ID no disponible obliga a nuevo contexto portable, sin fingir continuidad.
5. **Evidencia de cierre.** Producir una propuesta de handoff con refs de spec/tarea, cambios y verificaciones observadas, asociable al snapshot inicial. Aplicar mediante workflow existente y comprobación de cambios desde esa base. No copiar transcripciones, razonamiento privado o credenciales; no inventar tests aprobados a partir de exit 0 del agente.

Los detalles de flags, referencias nativas y eventos se concretaron y revisaron en el contrato P1 incorporado abajo. No convertir esta integración en un sistema de ejecución completo.

## P2 y antiobjetivos

Considerar MCP de sólo lectura si pilotos muestran fricción real al invocar CLI desde un harness sin shell. Considerar App Server/Agent SDK sólo si aparece un caso confirmado de control interactivo que la CLI no resuelve. Considerar escritura con control de revisión sólo cuando se defina su caso de usuario y conflictos.

Fuera de alcance: scheduler propio, agente autónomo permanente, despacho multiagente de SpM, tablero de chats/transcripciones, sincronización de memoria automática entre proveedores, vector DB/embeddings sin problema medido, credenciales/cloud propios, soporte de proveedores inferido por marca, integración de todas las APIs del harness y ejecución desde el dashboard de SPEC-062.

## Fases, dependencias y gates

| Fase | Entrega | Dependencia y gate |
| --- | --- | --- |
| 0 | Revisar baseline dirty y separar checkpoint de SPEC-055–060 | No reescribir cambios ajenos; revisión real de baseline antes de implementar. |
| 1 | P0.1 + versión/snapshot y ensamblado P0.2 | Tests del contrato existente y escenarios Git; revisar y corregir; commit del slice antes de continuar. |
| 2 | Aislamiento/proceso P0.3 | Fixtures de subprocess y pruebas concurrentes/cancelación, sin llamadas pagadas; review y commit. |
| 3 | Diagnóstico + instrucciones + un preset de contexto por harness | Definir slice P1 y matriz de versiones probadas; smoke manual en cada CLI realmente instalado. |
| 4 | Adaptadores estructurados/evidencia, si pilotos los necesitan | Fixtures oficiales/versionadas + semántica de conflictos definida; no requisito para usar CLI nativa. |
| 5 | Evaluar P2 | Dos proyectos piloto, evidencia concreta de limitación de P1; nueva decisión de alcance. |

Actualizar docs de contrato/arquitectura, skills de adopción y AGENTS locales al implementar. Correr `bun run check:agents`, checks existentes relevantes y cobertura. Política del repo: al menos 80% global. Medición global previa a los fixes finales de TASK-134: 309 pruebas, 90.89% funciones y 91.65% líneas; recheck independiente afectado: 26 pruebas y 269 expectativas.

## Criterios de aceptación P0

- [x] Fixture con dos commits y dirty local: todos los backends reciben la misma ventana válida; bundle/text/tail la contienen; prefix no; changed_items conserva los cambios locales aparte.
- [x] Sin `--since`, no aparece ventana; revisión inválida produce unavailable en lectura y no genera spawn ni archivos; HEAD produce ventana vacía válida.
- [x] JSON legacy de resume mantiene sus claves; incorpora schema_version; stdout se parsea una sola vez incluso con un hijo que imprime texto arbitrario, falla, excede 1 MiB o recibe cancelación; cada escenario devuelve su exit code definido.
- [x] Dos spawns simultáneos del mismo backend leen sus propios prompts sin contaminación; preview no escribe.
- [x] Error de lanzamiento, exit no cero, signal, timeout y cancelación tienen resultados distintos comprobados; ninguna ruta marca tareas done.
- [x] Prompt dinámico no cambia stable-prefix; texto ensamblado respeta 32768 bytes por defecto y un límite válido de 4096 bytes en fixtures grandes; valores inválidos fallan con exit 2. El texto no repite el contexto completo; toda omisión produce referencias recuperables o comando de expansión y advertencia.
- [x] Snapshot cambia cuando cambia contenido seleccionado sin commit; mismas fuentes en dos invocaciones con reloj/run ID distinto producen la misma huella; falta de Git no impide prompt-return.
- [x] Artefactos se limpian al finalizar normalmente y no se eliminan los de otra ejecución; fallos preservan diagnóstico sin filtrar variables de entorno completas.
- [x] Tests de contratos existentes pasan, revisión sin findings bloqueantes y actualización de documentación/AGENTS completadas antes de cerrar el slice.

## Cierre del alcance autorizado

P0 y P1 están implementados, revisados y documentados. Los detalles de evidencia y correcciones viven en TASK-123, TASK-124 y TASK-132–134. Los probes explícitos se comprobaron con Codex 0.169.0-alpha.11.1 y Claude 2.1.309 instalados; hooks y ejecución nativa se verificaron con fixtures aislados/sintéticos. No se instalaron hooks reales, no se hicieron llamadas pagadas y no se certifica compatibilidad universal. La suite y la cobertura global final se volverán a registrar al cerrar la integración del UI.

P2 (MCP/App Server/SDK u otro transporte) no se activa por este cierre. Requiere pilotos y una limitación demostrada de P1, seguida de una decisión de alcance independiente. La investigación adicional de skills y routing conserva sus pilotos propuestos; no instala un scheduler ni una política universal de modelos.

## Revisión de planificación

La planificación fue aprobada por Astra High antes de codificar. H1 (límites/contexto/procesos), H2 (envelopes/códigos) y H3 (fingerprint) quedaron resueltos. El contrato P1 posterior se revisó antes de ejecutar sus tres tareas; la aprobación de cada implementación y sus correcciones es independiente de esa aprobación inicial del plan.

# Contrato de ejecución P1 — revisión independiente aprobada

# SPEC-061 P1: diseño ejecutable acotado

Fecha: 2026-11-15. Autor de decisiones: Astra High. Ejecutor: Sol 6.1 High. Este contrato concretó P1 bajo la autorización de implementar ambos planes y se incorporó tras revisión a esta spec. P0 completó revisión, correcciones y commit antes de iniciar P1.

## Decisiones y alcance

1. El camino principal sigue siendo CLI nativa → SpM. Diagnóstico de harness se solicita explícitamente; doctor normal no ejecuta herramientas nuevas.
2. Instalar presets sólo dentro del repo con preview/apply; jamás editar configuración personal, habilitar permisos ni declarar confianza por el usuario. El propio trabajo de implementación prueba installs en fixtures, no instala hooks reales sin encargo específico.
3. Hooks entregan referencias y metadatos deterministas pequeños, no cuerpos/foco/títulos arbitrarios de documentos como instrucciones de mayor autoridad.
4. Adaptadores estructurados normalizan salida; no eligen modelos, despachan subagentes ni modifican flags de permisos. Evidencia persistente es opt-in, mínima y específica de ejecución.
5. Completar P1 en tres slices: diagnóstico/adopción; hooks; salida estructurada/recibos/handoff. P2 continúa condicionado a pilotos con una limitación demostrada; este diseño no incorpora MCP ni App Server.

## Mejoras de investigación aplicables ahora

Aplicar brief por slice (objetivo, refs, invariantes, ownership, pruebas/cierre), revisión de una versión identificable y evidencia con comando/fixture/resultado real. Trazar productor → consumidores → tests antes de extraer responsabilidades. Reutilizar mustReadNow/supporting/offloaded/nextInspect. Mantener handlers finos y crear abstracciones por dos usos reales o responsabilidad compleja única, no por reducir líneas.

No instalar las dos skills propuestas todavía; no routing automático, métricas de complejidad como gate único, nuevo grafo persistente ni ampliación de root AGENTS. `memory-evals` injection mide inclusión de contexto y no acredita defensa ante prompt injection.

## Slice P1-A: diagnóstico e instrucciones

### Superficie

- `spm doctor --harness codex|claude [--json]` y `spm agent brief --harness codex|claude [--json]` agregan la misma proyección `harness`; sin flag conservan comportamiento y shape actuales salvo campos opcionales ausentes.
- `spm agent snippet --harness codex|claude` entrega guía acotada, sin procesos ni escrituras. Usa servicios de adopción, no copia nueva de políticas.
- No detectar proveedor automáticamente por variables de entorno o por marcas en textos. Flag es selección para la consulta, no configuración persistente.

### Diagnóstico

Servicio puro separado de probes inyectables. Resolver ejecutable de PATH; registrar path canónico y versión cruda/parseada. Sólo comandos allowlisted: `--version`, `--help` y, para Codex, `exec --help` y `exec resume --help` si se necesita comprobar flags. Sin shell, stdin ignorado, timeout total de 2000 ms por proceso, máximo 64 KiB combinado stdout/stderr drenado, sin red ni modelos. La ausencia/timeout/error/semver no parseable no falla doctor del proyecto.

Contrato: provider, executable nullable, version nullable, probeStatus (`available|missing|timeout|error|not-requested`), capabilities con estados `observed|documented|unsupported|unverified`, instructionFiles existentes (paths, no contenido), warnings y suggestedCommands. `observed` sólo prueba lo observado: flag anunciado por help no certifica funcionamiento del modelo ni carga efectiva de instrucciones. Versiones prerelease/desconocidas quedan unverified para compatibilidad nativa aunque sus flags puedan aparecer como observed. No tabla abierta del tipo versión >= X garantiza todo.

Población inicial: fixture doc-profile `2026-11-15`, CLI local Codex `0.169.0-alpha.11.1` y Claude `2.1.309` como evidencia de probes, no compatibilidad universal. Un smoke con version/help sirve para diagnóstico; no lanzar sesiones pagadas para probar.

Inspeccionar exclusivamente raíz del repo: AGENTS.md, CLAUDE.md, CLAUDE.local.md, .claude/CLAUDE.md, .claude/settings.json, .codex/hooks.json y .codex/config.toml. No recorrer home ni transcripciones. Reconocer imports `@AGENTS.md` y bloques SpM existentes; reportar posible duplicación/sombreado, nunca afirmar que el harness efectivamente cargó un archivo. Para Claude, documentación actual permite AGENTS bajo condiciones de configuración/archivos; si no es verificable, sugerir revisión manual y el snippet, sin crear CLAUDE.md. La guía no reemplaza AGENTS raíz ni instala bridges automáticamente.

AC: normal doctor ejecuta cero probes; provider missing no cambia health del proyecto; procesos colgados terminan; args de usuario nunca se convierten en shell; JSON legacy intacto; guía breve no repite el workflow completo.

## Slice P1-B: presets de contexto

### Superficie y formatos

- `spm hooks plan --harness codex|claude [--json]`: preview de un preset, archivos destino y diff; no muta.
- `spm hooks install --harness codex|claude --apply [--json]`: aplica exclusivamente plan repo-local bajo lock. Sin `--apply` devuelve el mismo preview. Flags `--event`/`--events` de hooks Git son incompatibles con `--harness`; el flujo Git existente conserva su contrato.
- `spm hooks remove --harness codex|claude [--apply] [--json]`: preview/remoción sólo de entries SpM reconocidas exactas; modificaciones ajenas producen conflicto y no se borran.
- `spm agent hook-context --harness codex|claude`: handler read-only de stdin JSON nativo. No acepta backend/spawn/modelo; no llama a otro agente.

Codex destino `.codex/hooks.json`; Claude `.claude/settings.json`. Un entry SessionStart con matcher `^(startup|resume|compact)$`, command `spm agent hook-context --harness <provider>`, timeout 5 segundos. Comando constante sin interpolar paths ni stdin. Añadir resolución explícita, porque index.ts actualmente usa cwd sin búsqueda ascendente: comenzar en realpath del cwd del proceso, buscar el marker `.specpm/config.toml` más cercano en ancestros y parar en el primer límite Git (`.git` directorio o archivo) o filesystem root. En un límite Git sin marker, repo no gestionado: no saltar al proyecto padre. Validar marker dentro del root y no usar cwd de stdin. Windows conserva preset command simple si PATH contiene spm; no usa quoting POSIX adicional. Si CLI no está disponible, preview sigue siendo útil y avisa; instalación no afirma que el hook vaya a ejecutarse.

La instalación reconoce entradas equivalentes por firma exacta (evento, matcher y command), pero propiedad requiere manifest en `.specpm/harness-hooks.json` con version, provider, target y hash canónico del entry COMPLETO. Sin manifest no se presume ownership: una entry idéntica preexistente sólo permite proponer adopción en preview y registrarla mediante apply explícito; no reemplazarla ni eliminarla. Remove requiere manifest y hash completo vigente idéntico, incluyendo timeout/otros campos; cualquier cambio externo produce conflicto. No añadir campos custom desconocidos al schema del proveedor. JSON inválido o forma hooks incompatible falla antes de escribir. Preservar todas las claves y handlers ajenos, orden relativo y valores; serialización formato JSON consistente, diff explícito. Operación idempotente bajo lock compartido y atomic rename; cada archivo es atómico, no prometer transacción multiarchivo. Si falla manifest después del archivo nativo, informar instalación parcial recuperable: el rerun propone adopción exacta, no duplica ni elimina. Symlinks de targets que resuelven fuera del repo se rechazan. Hooks inline Codex o otros handlers similares se diagnostican como posible duplicación; no borrar ni fusionar automáticamente configuración fuera del target.

### Handler seguro y acotado

Stdin máximo 64 KiB UTF-8; aceptar sólo object con hook_event_name=SessionStart y source allowlisted. Ignorar campos desconocidos; no leer transcript_path, no usar cwd de stdin como autoridad para acceder a otro repo. Event/source desconocido, JSON inválido o repo no gestionado: devolver envelope nativo sin contexto, warning corto y exit 0, nunca bloqueando la sesión. Leer input tiene deadline 1000 ms y la ejecución total deadline 4000 ms desde entrada al handler (incluye stdin). El proceso padre controla reloj/resultado y carga contexto en un subprocess interno read-only terminable, invocado sin shell con el mismo ejecutable/entrypoint del paquete y una opción worker privada validada. El worker no vuelve a crear workers. Al deadline el padre termina el worker/grupo y emite fallback; no usar Promise.race sobre loadProjectContext en el mismo hilo, pues contiene spawnSync de Git. Ningún stream del worker va directo al stdout final. Windows informa diagnóstico si no puede garantizar terminar descendientes; siempre acaba el handler principal. No instalar PostCompact además de SessionStart compact para no duplicar contexto.

Salida nativa con hookSpecificOutput.hookEventName y additionalContext; nunca continue:false, decision:block ni permisos. additionalContext máximo 8192 bytes UTF-8. Contiene instrucciones estáticas del producto para consultar `spm resume --backend prompt --json`, IDs/paths canónicos de refs seleccionadas, snapshot hash si disponible, conteos/estados y aviso de omisiones. No incluye cuerpos, resúmenes, títulos, focus ni output de comandos arbitrarios; rutas escapadas como datos JSON y lista claramente delimitada. Limitar refs determinísticamente y conservar comando de expansión. No sustituye AGENTS ni dice que los documentos tengan autoridad superior. Errores se anuncian con warning acotado, sin stack/env; exit 0 también para errores recuperables del hook. CLI manual equivalente sigue disponible.

AC: startup/resume/compact producen una inyección; otras fuentes no; bytes e input limitados; lectura/preview cero escrituras; install twice no diff; configuración ajena intacta; archivos inválidos/externos no se alteran; remove sólo propia firma; timeout no bloquea harness; fixture desde subcarpeta resuelve mismo repo; no cuerpo de documento ni secreto de transcript aparece en salida.

## Slice P1-C: salida nativa, referencia de sesión y evidencia

### Adaptación opt-in

`spm resume --backend codex|claude --protocol codex-jsonl|claude-json|claude-stream-json [--spawn] [--json]` selecciona parser, no añade flags al comando configurado. Validar pareja provider/protocol. Preview muestra la selección y requisitos de args; config sigue siendo del usuario. Guía ofrece ejemplos de args nativos verificados (Codex exec --json; Claude -p --output-format json o stream-json --verbose), nunca flags que eludan permisos. Sin protocol se mantiene wrapper genérico de P0. Parseo captura pipes aun sin --json y renderiza sólo resultado normalizado; no recrear stream interactivo.

Parsers puros separados, fixtures versionados con source URL/fecha/version cuando se conoce. Inputs de 1 MiB cap P0; para JSONL procesar incrementalmente mientras se drena stdout para conservar terminal aunque stdout retenido se trunque. Decoder UTF-8 incremental conserva bytes multibyte entre chunks; invalid UTF-8 marca parse incompleto. Línea individual máximo 256 KiB; descartar oversized line hasta su newline y marcar parse incompleto, nunca éxito inferido. Warnings máximo 32 entradas de 256 bytes, luego contador omitidas. Estado conservado acotado a línea parcial, últimos ID/terminal/texto y warnings, no array de eventos. Final message máximo 64 KiB UTF-8, marcada truncada; truncar texto válido no vuelve incompleto el parse. No conservar reasoning/tool transcript. Claude JSON monolítico >1 MiB no se parsea como resultado completo: unknown con truncamiento explícito. Campos/eventos desconocidos válidos se ignoran. JSON malformado, línea oversized, parcial al EOF, UTF-8 inválido, IDs contradictorios o terminal incompatible dejan un indicador fatal sticky; un success posterior jamás lo borra. Un stream completo sin terminal es unknown. Probar terminal después de >1 MiB, splits multibyte y garbage después de success.

Normalizado `native_result`: provider, protocol, session_id nullable, terminal (`completed|failed|unknown`), final_text nullable, final_text_truncated, warnings. Invocation P0 conserva su estado de proceso por separado. Codex: thread.started aporta thread_id; turn.completed es terminal completado; turn.failed/error relevante declara fallo; último agent_message completado del turno aporta texto. Claude: result success/no is_error aporta completado; result is_error/error subtype declara fallo; session_id tomado de los records acordes. IDs contradictorios, múltiples terminales incompatibles o fallo de parse nunca se convierten en completed. Si proceso falla/timeout/cancel, el resultado combinado nunca se informa exitoso aunque exista terminal previo; la evidencia conserva ambos estados sin confundirlos. Ningún completed marca tareas done.

### Persistencia mínima y reanudación

`--record` crea recibo opt-in en `.specpm/runs/<random-id>.json` después del cierre, exclusive create, modo 0600 cuando plataforma lo permita. Sin flag no se guarda historial de ejecución. No almacenar stdout/stderr, final_text, transcript ni env: sólo version, runId, provider/protocol, canonical repo root, session_id, snapshot inicial/final, guard final descrito abajo, invocation/native terminal, timestamps, changed file refs observadas y warnings. El snapshot final se captura tras cierre/cleanup de artifacts P0, no se presenta como el inicial. `verification` inicia []: exit del agente no es prueba de tests. Ownership de recibo/ID evita sobreescritura; no GC automático en P1. Documentar retención local y borrado manual seguro. No mutar .gitignore desde --record: sugerir exclusión local como recomendación visible. Excluir del guard sólo el path exacto del recibo propio, identificado antes del spawn, para que escribirlo no invalide su propio handoff. No ocultar todos los archivos .specpm ni cambios ajenos. No comparar directamente el fingerprint P0 al aplicar: su changed_items puede incluir el recibo nuevo.

Guard final independiente del snapshot público P0: HEAD/null, conjunto exacto de changed paths (normalizado, sin recibo propio), hashes de bytes de fuentes managed seleccionadas y de todo archivo código/dato changed al inicio O al final. Path borrado conserva sentinel missing; symlink usa lstat/readlink sin seguir fuera del repo. Lectura stream para hashing, sólo hash/path almacenados. Al apply repetir el mismo conjunto y comprobar además nuevos changed paths; así una segunda edición de un archivo ya dirty invalida el guard aunque Git status siga igual. Fallo/permisos, repo cambiando durante observación o límite de 10000 paths/1 MiB de receipt producen guard incomplete: se conserva resultado de invocación y preview útil, pero apply no se habilita. No prometer snapshot atómico ni detección de cambios fuera de archivos observados y sets Git.

`--session-ref <receipt-id>` carga sólo ID UUID generado por SpM dentro de `.specpm/runs`, exige schema exacto válido, tamaño ≤1 MiB, provider/protocol/root exactos y session_id no vacío; paths libres y `latest` fuera. Verificar realpath de runs bajo root y rechazar directorio/archivo symlink. Session ID se pasa como argv literal, no shell. Inserta `{session_id}` sólo en args configurados que incluyan ese token: sin token, abortar antes de spawn en lugar de fingir resume. No copiar prompts de recibo, siempre construir contexto actual. Repo movido/otro worktree/otro provider requiere nueva sesión, mensaje explicativo; no remap automático. Nunca scrapea la carpeta privada del harness para encontrar sesiones.

### Propuesta de handoff

`spm handoff --from-run <receipt-id> [--apply] [--json]` por defecto produce borrador determinista con snapshot base/final, refs, estados de invocación, cambios observados y verificaciones observadas vacías cuando no existen. No copiar respuesta del modelo ni afirmar que terminó la tarea. Para writes requiere --apply y servicio/repositorio existente; la forma handoff actual sin --from-run mantiene su comportamiento. Antes de aplicar recalcular guard final bajo lock de escritura del repositorio: si cambió o es incomplete, devolver conflicto y borrador, sin forzar. Revisión/done no se modifica nunca. No agregar ejecución automática de tests para rellenar verification ni aceptar claims del stream como pruebas; un humano/agente puede añadir comprobaciones explícitamente mediante nota del workflow existente.

Todos los nuevos caminos --json retornan un solo envelope versionado también ante error controlable, mediante catch central antes de imprimir. Errores de argumentos/precondición exit 2, I/O exit 1, resultado exitoso exit 0; el hook siempre fallback nativo + exit 0 en fallos recuperables. Si falla guard/snapshot final/record después del child, preservar invocation/native_result y agregar evidence_error; nunca perder el resultado del proceso ni reemplazarlo por excepción sin envelope. --record solicitado y fallido hace exit 1 sin fingir recibo guardado. No prometer resultado tras SIGKILL/crash externo.

AC: fixtures de éxito/error/terminal faltante/id conflictivo/malformed/oversized/Unicode pasan; eventos desconocidos no fallan por sí solos pero no prueban éxito; error proceso domina éxito aparente; --record no contiene transcript/env/output; receipt se rechaza con root/provider distinto; session token obligatorio; ningún write con preview; handoff stale no escribe y apply usa capa canónica; tests con fake child, sin llamadas a modelos.

## Precisiones de la segunda revisión independiente

- El guard obtiene paths Git exactos con salida delimitada por NUL y untracked files expandidos (`git status --porcelain=v1 -z --untracked-files=all` o equivalente probado). No reutilizar sin expansión `git status --short`, que puede representar `.specpm/runs/` como una sola carpeta: impediría excluir únicamente el recibo propio. Parsear renames y nombres Unicode/espacios/newlines sin splitting por líneas. Verificar containment real de padres antes de acceder a archivos de guard, manifest y targets; validar sólo el symlink final no basta.
- Los nuevos envelopes no sustituyen los exit codes P0 de invocación. Una invocación failed/unknown/timed_out/cancelled conserva su código P0 incluso si además falla evidence. Si el proceso completed, un protocolo opt-in failed/unknown o un error de evidencia solicitado devuelve 1; completed con protocolo válido y persistencia solicitada exitosa devuelve 0. Argumentos/precondiciones previos al spawn conservan 2. Guard incomplete sin error de captura se informa explícito y nunca habilita handoff apply.
- En JSONL, EOF sin newline final se procesa si los bytes pendientes forman un JSON completo válido. Sólo un fragmento incompleto/inválido al EOF activa fatal; no rechazar un stream correcto por faltar el último salto de línea. El límite por línea y UTF-8 incremental siguen aplicando.
- Session ID es dato opaco acotado (máximo 512 bytes UTF-8), no vacío, sin caracteres de control/whitespace y sin prefijo `-`; rechazar el recibo antes de spawn si incumple. Pasarlo por argv evita shell injection pero por sí solo no evita interpretarlo como opción del CLI. No inferir identidad de sesión ni obtenerla de carpetas privadas del harness.

## Revisión del diseño y gates

Autorrevisión spec-reviewer y revisión independiente Astra (paradigm_research): se cerraron diagnóstico con side effects implícitos (probes sólo explícitos), autoridad de hook (refs/IDs, no documento), duplicación postcompact (un event), identidad root/sesión (receipt exacto), fidelidad de evidencia (observed vs reported), cleanup peligroso (sin GC), coexistencia de hooks Git (ramas separadas), resolución ascendente nueva/bounded, deadline fuera del hilo spawnSync, guard de código ya dirty, recibo sin auto-invalidación, errores con JSON único, parser sticky/acotado y ownership por manifest+hash completo. Root/Astra debe verificar este delta antes de entregarlo al ejecutor; no hay preguntas nuevas de producto fuera del alcance ya autorizado.

Cada slice termina revisión de diff congelado, tests focalizados, contratos legacy y check:agents; commit antes del siguiente. Cambios a comandos/services/backends y docs locales requieren mantenimiento AGENTS con skill correspondiente. Mantener root sin crecer. P1-B no debe instalarse en este repo real como efecto de las pruebas. P1-C usa fixtures sintéticos documentados y smoke version/help de los CLIs instalados; no afirmar compatibilidad de ejecución real no probada.

## Fuentes oficiales verificadas

- [Codex hooks](https://learn.chatgpt.com/docs/hooks): ubicación repo-local, SessionStart compact y formato additionalContext; esta salida llega como contexto developer, razón de limitarla a instrucciones estáticas y referencias.
- [Claude hooks](https://code.claude.com/docs/en/hooks): SessionStart startup/resume/compact y envelope de additionalContext.
- [Codex no interactivo](https://learn.chatgpt.com/docs/non-interactive-mode): JSONL y eventos thread/turn/item.
- [Claude programático](https://code.claude.com/docs/en/headless): json/stream-json, result y session ID.
- [Claude memoria](https://code.claude.com/docs/en/memory#agents-md): condiciones de AGENTS y coexistencia con CLAUDE; inspección estática no acredita carga efectiva.

Las APIs descritas por proveedor son evidencia documental; límites, contratos CLI SpM y políticas de almacenamiento de este documento son decisiones locales de diseño.


## Aclaraciones contractuales de P1-C durante implementación

Decisiones aprobadas por Astra High, incorporadas a TASK-134:

- Con `--protocol`, `invocation.output` queda vacío y una advertencia fija explica la omisión; sólo `native_result.final_text` expone texto del modelo. Se conservan conteos de bytes, truncamiento y estado del proceso. El modo genérico P0 no cambia.
- Un session ID presente inválido (vacío, más de 512 bytes UTF-8, espacios, categorías Unicode Cc/Cf o prefijo `-`) produce ID null, warning sin eco del valor y estado de protocolo unknown fatal persistente. Un ID opcional ausente no es fatal. Cargar un recibo inválido falla con usage2 antes de ejecutar.
- La comparación bajo lock sólo excluye el owner.json exacto del lease actual verificado por token y PID, sin seguir un symlink. No excluye archivos tracked, preobservados en guards ni otros archivos del directorio. Revalida el lease antes del write; el callback de storage recibe un lease readonly de forma aditiva y compatible.
- Invocation unknown sin cierre confirmado del árbol produce guard incompleto con `tree-closure-unverified`. Receipt y preview conservan observaciones; apply devuelve usage2 sin escrituras aunque los hashes coincidan más tarde. No hay force ni promoción retrospectiva de ese recibo.
- Si los bytes capturados de una fuente administrada con symlink no pueden verificarse como archivo regular en el guard, éste queda incompleto con `managed-source-bytes-unverified`, sin seguir otro target implícitamente. Un guard de code symlink certifica los bytes del enlace, no los del target no observado.
