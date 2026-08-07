<!-- doc-status
estado: vivo
verificado: 2026-08-02
-->

# AGENTS.md — TopoField

Consulta y sigue como fuente principal, **en este orden**:

1. `ROADMAP.md` — **única fuente de verdad sobre en qué fase está el proyecto y qué viene después.** Si otro documento lo contradice en fases, prioridades o siguiente paso, manda `ROADMAP.md`.
2. `MEMORIA.md` — el porqué de cada decisión, estado verificado por sección y bitácora cronológica.
3. `C:\Users\guill\Documents\Aplicacion_Movil\AGENTS.md` y `C:\Users\guill\Documents\Aplicacion_Movil\MEMORY.md` — reglas y memoria del espacio de trabajo.
4. `PRODUCT_STRATEGY.md`, `UX_RESEARCH_PLAN.md`, `LAUNCH_PLAN.md`, `PILOT_READINESS_CHECKLIST.md` — producto, validación y piloto.

**Nota sobre numeración de fases (02-08-2026):** hasta esa fecha convivían dos numeraciones distintas y se citaban indistintamente, así que "Fase 3" significaba dos trabajos diferentes según el documento. Se unificó en un solo eje `F0`–`F9` en `ROADMAP.md`, con tabla de equivalencias con los nombres antiguos. `PLAN.md` quedó archivado en `docs/archive/`. **No reintroducir una segunda numeración**: el chequeo `npm run docs:check` falla si aparece un segundo documento declarando `rol: roadmap`.

**Documentos archivados:** `docs/archive/` contiene historial congelado (informes E2E, inventarios de fase, auditorías fechadas, planes superados). Se leen como evidencia, no se actualizan, y no se citan como estado actual.

Nota técnica:
- Expo ha cambiado entre versiones, así que antes de aplicar cambios sensibles de framework conviene revisar la documentación oficial de la versión exacta usada en el proyecto.

Referencia oficial:
- https://docs.expo.dev/

## Reglas permanentes para cualquier agente (Claude Code, Codex o Cowork) — 2026-07-26

Erick autorizó a los tres a trabajar en este repo (Codex sumado el 26-07-2026, por cuota disponible de tokens). Los tres deben seguir esto sin excepción:

1. **Un solo agente escribiendo en una rama a la vez** (enmienda 4, ver `MEMORIA.md` §1). Antes de empezar a modificar archivos o hacer commits, anotar en `MEMORIA.md` §9 (Registro de sesiones) qué agente, qué rama y qué tarea. Al terminar, marcarlo como cerrado. Si ya hay una entrada abierta de otro agente sobre la misma área, no escribir — avisar a Erick.
2. **Reparto por área, no por turno estricto:** Codex trabaja el track móvil (builds, pruebas por cable/dispositivo, `apps/mobile`); Claude Code trabaja el track backend/dominio (migraciones, ADR, `apps/backend`, `shared/`); Cowork hace auditoría y mantiene este archivo y `MEMORIA.md`. Si una tarea cruza ambas áreas, un solo agente la hace completa, no se reparte a mitad. **Matiz (actualizado 02-08-2026):** la versión anterior decía "Cowork no escribe código". En la práctica Erick ha autorizado a Cowork a tocar backend varias veces cuando Claude Code no estaba disponible o cuando él lo pidió directamente (28-07, 02-08). La regla real es: **Cowork puede escribir código si Erick lo autoriza explícitamente en el momento**, y esa excepción se anota como tal en la fila de `MEMORIA.md` §9. Lo que no cambia: un solo agente por rama, y verificación con output real antes de decir "hecho".
3. **Nunca commitear directamente en `main`.** Rama de trabajo por tarea o por fase.
4. ~~**Fase 0 es de solo lectura.**~~ **Obsoleta desde el 26-07-2026** (Fase 0 cerrada). Se conserva el número para no renumerar las demás reglas, que se citan por su número en la bitácora.
5. **Los commits nunca llevan a Claude ni a ningún agente como coautor.** No incluir trailers `Co-Authored-By` de ningún tipo. Instrucción explícita y permanente de Erick, aplica a todos sus proyectos.
6. **No aplicar migraciones ni tocar Supabase/producción sin autorización explícita en el momento**, aunque el agente tenga las credenciales.
7. **No repetir un build EAS cloud sin necesidad** — cuota limitada y ya se agotó una vez (ver `LOCAL_ANDROID_BUILD_RUNBOOK.md`). Preferir el build local por Gradle/adb ya documentado en Windows.
8. Antes de actuar, leer `MEMORIA.md` completo — no confiar en un resumen previo si contradice lo verificado allí.
9. **Antes de cualquier migración que borre o transforme filas existentes (DROP, UPDATE masivo, migración de datos entre tablas):** generar un respaldo fila-por-fila (no solo checksums) de cada tabla afectada, en el momento, específico para esa migración. No reutilizar un respaldo preexistente de otro propósito sin abrir el archivo y confirmar explícitamente que cubre exactamente esas tablas con datos reales, no solo conteos o hashes. Nunca describir un respaldo como "válido para rollback" sin haber verificado su contenido real. **Motivo:** en Fase 2 (26-07-2026) se aplicó la migración de `profiles` (11 filas reales) citando como respaldo un archivo que en su propia nota interna decía explícitamente que no servía para restaurar y que ni siquiera cubría esa tabla. No causó pérdida de datos esta vez (verificado por Cowork), pero fue suerte, no proceso — ver `MEMORIA.md` §11.
10. **Cada avance real** (fase completada, decisión tomada, corrección aplicada, hallazgo importante) **se añade en el momento a `MEMORIA.md` §12** (Bitácora de avances) con una frase corta que dé idea y contexto — no esperar al final de la sesión ni dejarlo solo en el resumen que se muestra en pantalla.
11. **Ninguna afirmación de "✅ hecho/confirmado/completado" se acepta sin el output literal del comando que lo prueba**, pegado tal cual (no parafraseado, no resumido). En particular: `git status --short` completo (no "N archivos, todos ok"); para tests, el resumen real de la corrida (`X passed, Y failed`), no "tests corriendo"; para instalaciones, el comando que localiza el binario en su ubicación real (en workspaces npm, la raíz, no cada paquete). **Motivo:** tres afirmaciones falsas de "hecho" en la misma sesión de Fase 2 (26-07-2026): un respaldo que no servía para rollback, un test runner marcado instalado sin estarlo, y un "git status limpio" cuando en realidad había 63 archivos modificados y solo 11 en stage. Cowork verificó las tres veces con el comando real antes de aceptar — ver `MEMORIA.md` §11 y §12.
12. **Antes de cerrar una sesión que haya tocado documentación, ejecutar `npm run docs:check`** y dejarlo en verde. Si falla, arreglar la causa (cabecera `doc-status` ausente, enlace roto, roadmap duplicado, documento vivo rancio) en lugar de ignorarla. **Motivo:** durante semanas convivieron dos numeraciones de fases contradictorias y varios documentos afirmaban estados ya superados, lo que obligó a repetir conversaciones ya cerradas. Ver `docs/DOC_MAINTENANCE.md`.
13. **Al cerrar una fase, actualizar `ROADMAP.md`** (estado en la tabla + `verificado:` en la cabecera) y añadir la línea correspondiente a `MEMORIA.md` §12. No crear un documento de fase nuevo en la raíz: los informes puntuales se archivan en `docs/archive/` en cuanto se han leído.
