+++
doc_kind = "spec"
id = "SPEC-061"
title = "Adapt SpM to native agent harnesses"
summary = "Evaluate and plan deterministic interoperability with current Codex and Claude harnesses, preserving native orchestration and durable project memory."
status = "proposed"
task_ids = []
tags = ["agents", "interoperability", "context"]
updated_at = "2026-11-15T18:12:44.819Z"
+++

# Adaptar SpM a los harnesses nativos de agentes

## Estado de la propuesta

Propuesta estratégica y técnica; no autoriza implementación. El análisis usa el working tree del 15 de noviembre de 2026, incluidos los cambios existentes de SPEC-055–060. No considera esos cambios como funcionalidades pendientes por el hecho de no estar en el último commit. Las decisiones de producto se mantienen propuestas hasta la revisión y selección del siguiente slice.

## Problema y decisión de producto

SpM ya ofrece memoria determinista, contexto compacto, portfolio, perfiles/importación, recuperación, hooks de repositorio y contratos JSON. Su oportunidad es asegurar que cualquier agente obtenga contexto correcto y actual, y deje evidencia durable verificable. El hueco principal está entre esos servicios y los harnesses, no en construir otro gestor de agentes.

Decisión recomendada: **harness nativo para ejecutar; SpM para intención, memoria y evidencia del proyecto**. El camino principal será que el agente invoque la CLI de SpM. Los wrappers Codex/Claude seguirán siendo opcionales y explícitos. P0 corrige contratos y defectos actuales; P1 mejora adopción y adaptación; P2 sólo se activa con evidencia de necesidad.

## Evidencia del estado actual

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

Los detalles de flags nuevos, persistencia de referencias nativas y normalización de eventos requieren un slice propuesto aparte antes de codificar P1. No ampliar silenciosamente esta propuesta para convertirla en un sistema de ejecución completo.

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

Actualizar docs de contrato/arquitectura, skills de adopción y AGENTS locales al implementar. Correr `bun run check:agents`, checks existentes relevantes y cobertura. Política del repo: al menos 80% global; esta propuesta no afirma haber medido ni alcanzado esa cifra.

## Criterios de aceptación P0

- [ ] Fixture con dos commits y dirty local: todos los backends reciben la misma ventana válida; bundle/text/tail la contienen; prefix no; changed_items conserva los cambios locales aparte.
- [ ] Sin `--since`, no aparece ventana; revisión inválida produce unavailable en lectura y no genera spawn ni archivos; HEAD produce ventana vacía válida.
- [ ] JSON legacy de resume mantiene sus claves; incorpora schema_version; stdout se parsea una sola vez incluso con un hijo que imprime texto arbitrario, falla, excede 1 MiB o recibe cancelación; cada escenario devuelve su exit code definido.
- [ ] Dos spawns simultáneos del mismo backend leen sus propios prompts sin contaminación; preview no escribe.
- [ ] Error de lanzamiento, exit no cero, signal, timeout y cancelación tienen resultados distintos comprobados; ninguna ruta marca tareas done.
- [ ] Prompt dinámico no cambia stable-prefix; texto ensamblado respeta 32768 bytes por defecto y un límite válido de 4096 bytes en fixtures grandes; valores inválidos fallan con exit 2. El texto no repite el contexto completo; toda omisión produce referencias recuperables o comando de expansión y advertencia.
- [ ] Snapshot cambia cuando cambia contenido seleccionado sin commit; mismas fuentes en dos invocaciones con reloj/run ID distinto producen la misma huella; falta de Git no impide prompt-return.
- [ ] Artefactos se limpian al finalizar normalmente y no se eliminan los de otra ejecución; fallos preservan diagnóstico sin filtrar variables de entorno completas.
- [ ] Tests de contratos existentes pasan, revisión sin findings bloqueantes y actualización de documentación/AGENTS completadas antes de cerrar el slice.

## Decisiones pendientes antes de implementación

Dirección recomendada: aceptar P0 como próximo slice del área de agentes y mantener P1/P2 fuera del compromiso inicial. Los límites y política de proceso de P0 quedan definidos arriba como decisiones técnicas recomendadas para implementación. No hay estimación de calendario ni promesa de compatibilidad universal.

## Revisión de planificación

Revisión independiente con Astra High: **APPROVED como plan**. Se resolvieron H1 (límites de contexto/stdout, timeout, gracia y plataformas), H2 (envelope JSON de fallos y códigos de salida) y H3 (fingerprint determinista independiente del reloj y de IDs de ejecución). P0 tiene decisiones suficientes para preparar su implementación; P1/P2 requieren slices posteriores. La spec permanece `proposed`: esta revisión no implementa ni verifica el producto.
