<!-- doc-status
estado: vivo
verificado: 2026-09-13
-->

# AGENTS.md — TopoField

Consulta y sigue como fuente principal, **en este orden**:

1. `ROADMAP.md` — **única fuente de verdad sobre en qué fase está el proyecto y qué viene después.** Si otro documento lo contradice en fases, prioridades o siguiente paso, manda `ROADMAP.md`.
2. `MEMORIA.md` — el porqué de cada decisión, estado verificado por sección y bitácora cronológica.
3. `C:\Users\guill\Documents\Aplicacion_Movil\AGENTS.md` y `C:\Users\guill\Documents\Aplicacion_Movil\MEMORY.md` — reglas y memoria del espacio de trabajo.
4. `PRODUCT_STRATEGY.md`, `UX_RESEARCH_PLAN.md`, `LAUNCH_PLAN.md`, `PILOT_READINESS_CHECKLIST.md`, `docs/field/TOPOFIELD_OPERATIONAL_REACTIVATION_2026-09-12.md` — producto, validación, piloto y alcance operativo actual.

**Nota sobre numeración de fases (02-08-2026):** hasta esa fecha convivían dos numeraciones distintas y se citaban indistintamente, así que "Fase 3" significaba dos trabajos diferentes según el documento. Se unificó en un solo eje `F0`–`F9` en `ROADMAP.md`, con tabla de equivalencias con los nombres antiguos. `PLAN.md` quedó archivado en `docs/archive/`. **No reintroducir una segunda numeración**: el chequeo `npm run docs:check` falla si aparece un segundo documento declarando `rol: roadmap`.

**Documentos archivados:** `docs/archive/` contiene historial congelado (informes E2E, inventarios de fase, auditorías fechadas, planes superados). Se leen como evidencia, no se actualizan, y no se citan como estado actual.

## Modelo De Roles Vigente

El contrato actual reconoce cuatro roles globales:

- `admin`: administra el producto y tiene acceso global según las rutas protegidas.
- `topografo`: ejecuta y registra trabajo únicamente en obras con membresía activa y permiso efectivo `write`.
- `supervisor`: consulta únicamente obras con membresía activa; no puede escribir aunque su membresía indique `write` y no usa `Mi jornada` como operador.
- `visitante`: conserva el acceso público o permitido de solo lectura y queda fuera de las rutas de auscultación protegidas.

El rol global no sustituye el scope de obra: el backend debe derivar el `projectId` del recurso y comprobar la membresía efectiva antes de autorizar. La app móvil aplica la misma restricción como primera barrera, pero la autorización definitiva siempre pertenece al backend.

Nota técnica:
- Expo ha cambiado entre versiones, así que antes de aplicar cambios sensibles de framework conviene revisar la documentación oficial de la versión exacta usada en el proyecto.

Referencia oficial:
- https://docs.expo.dev/

## Reglas permanentes para cualquier agente (Claude Code, Codex, Cowork o workers) — 2026-09-13

Erick autoriza trabajo local coordinado en este repo. Estas reglas sustituyen el modelo histórico de un solo escritor por rama cuando el trabajo se organiza como misión multiagente con propiedad exclusiva de archivos:

1. **Paralelismo por propiedad exclusiva.** Varios agentes/workers pueden escribir simultáneamente en la misma rama de trabajo solo cuando el prime les asigna áreas o rutas de archivos que no se solapan. Dos agentes no pueden modificar el mismo archivo al mismo tiempo. Si aparece un solapamiento necesario, el worker deja ese archivo al prime o espera una reasignación explícita.
2. **El prime coordina contratos compartidos e integración.** `shared/`, contratos que afectan a backend y móvil, documentación viva de estado y cualquier archivo transversal quedan bajo coordinación del prime salvo delegación expresa. El prime revisa los diffs de todos los workers, resuelve incompatibilidades semánticas y ejecuta la batería integrada antes de aceptar el resultado.
3. **Nunca commitear directamente en `main`.** Rama de trabajo por tarea o por fase.
4. ~~**Fase 0 es de solo lectura.**~~ **Obsoleta desde el 26-07-2026** (Fase 0 cerrada). Se conserva el número para no renumerar las demás reglas, que se citan por su número en la bitácora.
5. **Los commits nunca llevan a Claude ni a ningún agente como coautor.** No incluir trailers `Co-Authored-By` de ningún tipo. Instrucción explícita y permanente de Erick, aplica a todos sus proyectos.
6. **Operaciones remotas o sensibles requieren autorización explícita en el momento.** Esto incluye aplicar migraciones reales, tocar Supabase/Auth/RLS/Storage, Render, GitHub remoto, usar credenciales reales, generar gastos, publicar artefactos, destruir datos o ejecutar operaciones irreversibles. La autonomía multiagente de esta sección es local y no amplía esas autorizaciones.
7. **No repetir un build EAS cloud sin necesidad** — cuota limitada y ya se agotó una vez (ver `LOCAL_ANDROID_BUILD_RUNBOOK.md`). Preferir el build local por Gradle/adb ya documentado en Windows.
8. Antes de actuar, leer `MEMORIA.md` completo — no confiar en un resumen previo si contradice lo verificado allí.
9. **Antes de cualquier migración que borre o transforme filas existentes (DROP, UPDATE masivo, migración de datos entre tablas):** generar un respaldo fila-por-fila (no solo checksums) de cada tabla afectada, en el momento, específico para esa migración. No reutilizar un respaldo preexistente de otro propósito sin abrir el archivo y confirmar explícitamente que cubre exactamente esas tablas con datos reales, no solo conteos o hashes. Nunca describir un respaldo como "válido para rollback" sin haber verificado su contenido real. **Motivo:** en Fase 2 (26-07-2026) se aplicó la migración de `profiles` (11 filas reales) citando como respaldo un archivo que en su propia nota interna decía explícitamente que no servía para restaurar y que ni siquiera cubría esa tabla. No causó pérdida de datos esta vez (verificado por Cowork), pero fue suerte, no proceso — ver `MEMORIA.md` §11.
10. **Cada avance real** (fase completada, decisión tomada, corrección aplicada, hallazgo importante) **se añade a `MEMORIA.md` §12** (Bitácora de avances) con una frase corta que dé idea y contexto. En una misión multiagente, el prime es propietario de esa documentación para evitar escrituras concurrentes; los workers reportan la evidencia y el prime la integra.
11. **Ninguna afirmación de "✅ hecho/confirmado/completado" se acepta sin el output literal del comando que lo prueba**, pegado tal cual (no parafraseado, no resumido). En particular: `git status --short` completo (no "N archivos, todos ok"); para tests, el resumen real de la corrida (`X passed, Y failed`), no "tests corriendo"; para instalaciones, el comando que localiza el binario en su ubicación real (en workspaces npm, la raíz, no cada paquete). **Motivo:** tres afirmaciones falsas de "hecho" en la misma sesión de Fase 2 (26-07-2026): un respaldo que no servía para rollback, un test runner marcado instalado sin estarlo, y un "git status limpio" cuando en realidad había 63 archivos modificados y solo 11 en stage. Cowork verificó las tres veces con el comando real antes de aceptar — ver `MEMORIA.md` §11 y §12.
12. **Antes de cerrar una sesión que haya tocado documentación, ejecutar `npm run docs:check`** y dejarlo en verde. Si falla, arreglar la causa (cabecera `doc-status` ausente, enlace roto, roadmap duplicado, documento vivo rancio) en lugar de ignorarla. **Motivo:** durante semanas convivieron dos numeraciones de fases contradictorias y varios documentos afirmaban estados ya superados, lo que obligó a repetir conversaciones ya cerradas. Ver `docs/DOC_MAINTENANCE.md`.
13. **Al cerrar una fase, actualizar `ROADMAP.md`** (estado en la tabla + `verificado:` en la cabecera) y añadir la línea correspondiente a `MEMORIA.md` §12. No crear un documento de fase nuevo en la raíz: los informes puntuales se archivan en `docs/archive/` en cuanto se han leído.
14. **Autonomía local por bloque:** en una rama de trabajo, el agente puede
    implementar código, pruebas y documentación del alcance ya aprobado sin
    pedir confirmación repetida. Mantiene autorización explícita de Erick para
    aplicar migraciones, cambiar Supabase Auth/RLS, publicar en GitHub/Render,
    usar credenciales reales, generar gastos o ejecutar operaciones
    destructivas. Si una decisión de producto o un procedimiento de equipo no
    está confirmado, se documenta como pendiente y se continúa con trabajo
    local que no lo presuponga.
15. **Workers locales:** un worker puede implementar, ejecutar tests locales de su área y crear un commit local identificable dentro de la propiedad de archivos asignada. Debe reportar archivos cambiados, tests/comandos con output verificable, riesgos y hash del commit. No puede ampliar por su cuenta su propiedad a archivos de otro worker o del prime.
16. **Registro de misión, no cerrojo global:** `MEMORIA.md` §9 registra la misión y las propiedades de archivos activas. Una fila abierta de otro worker no bloquea por sí sola la rama si las propiedades son disjuntas. Sí bloquea escribir un archivo ya asignado a otro agente.
17. **Criterio de "hecho" multiagente:** ningún informe de worker se acepta por autoridad. El prime debe inspeccionar el diff/commit, contrastar los hallazgos contra el repositorio y ejecutar los checks integrados del alcance. Una afirmación que dependa de un servicio, dispositivo o migración no ejecutados se etiqueta `PENDIENTE`/`UNKNOWN`, aunque los tests locales estén verdes.
