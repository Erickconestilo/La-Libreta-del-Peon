# AGENTS.md — TopoField

Consulta y sigue como fuente principal:

- `C:\Users\guill\Documents\Aplicacion_Movil\topofield\MEMORIA.md` — estado verificado de decisiones del rework (empezar por aquí; tiene fecha de verificación por sección).
- `C:\Users\guill\Documents\Aplicacion_Movil\AGENTS.md`
- `C:\Users\guill\Documents\Aplicacion_Movil\MEMORY.md`
- `C:\Users\guill\Documents\Aplicacion_Movil\topofield\PLAN.md` — plan de producto/UX; desactualizado respecto al estado real de Supabase, ver `MEMORIA.md` §3. **Ojo: usa una numeración de fases distinta e independiente de `MEMORIA.md` §8** (PLAN.md Fase 1-8 = producto/UX/piloto; MEMORIA.md Fase 0-7 = datos/backend/dominio). Son dos ejes distintos, no la misma fase con dos nombres — no asumir que "Fase 3" en un documento es "Fase 3" en el otro.

Nota técnica:
- Expo ha cambiado entre versiones, así que antes de aplicar cambios sensibles de framework conviene revisar la documentación oficial de la versión exacta usada en el proyecto.

Referencia oficial:
- https://docs.expo.dev/

## Reglas permanentes para cualquier agente (Claude Code, Codex o Cowork) — 2026-07-26

Erick autorizó a los tres a trabajar en este repo (Codex sumado el 26-07-2026, por cuota disponible de tokens). Los tres deben seguir esto sin excepción:

1. **Un solo agente escribiendo en una rama a la vez** (enmienda 4, ver `MEMORIA.md` §1). Antes de empezar a modificar archivos o hacer commits, anotar en `MEMORIA.md` §9 (Registro de sesiones) qué agente, qué rama y qué tarea. Al terminar, marcarlo como cerrado. Si ya hay una entrada abierta de otro agente sobre la misma área, no escribir — avisar a Erick.
2. **Reparto por área, no por turno estricto:** Codex trabaja el track móvil (builds, pruebas por cable/dispositivo, `apps/mobile`); Claude Code trabaja el track backend/dominio (migraciones, ADR, `apps/backend`, `shared/`); Cowork no escribe código, hace auditoría y mantiene este archivo y `MEMORIA.md`. Si una tarea cruza ambas áreas, un solo agente la hace completa, no se reparte a mitad.
3. **Nunca commitear directamente en `main`.** Rama de trabajo por tarea o por fase.
4. **Fase 0 es de solo lectura.** No crear commits durante la Fase 0 (inventario de migraciones/tablas de `MEMORIA.md` §3). Los commits empiezan en Fase 1.
5. **Los commits nunca llevan a Claude ni a ningún agente como coautor.** No incluir trailers `Co-Authored-By` de ningún tipo. Instrucción explícita y permanente de Erick, aplica a todos sus proyectos.
6. **No aplicar migraciones ni tocar Supabase/producción sin autorización explícita en el momento**, aunque el agente tenga las credenciales.
7. **No repetir un build EAS cloud sin necesidad** — cuota limitada y ya se agotó una vez (ver `LOCAL_ANDROID_BUILD_RUNBOOK.md`). Preferir el build local por Gradle/adb ya documentado en Windows.
8. Antes de actuar, leer `MEMORIA.md` completo — no confiar en un resumen previo si contradice lo verificado allí.
9. **Antes de cualquier migración que borre o transforme filas existentes (DROP, UPDATE masivo, migración de datos entre tablas):** generar un respaldo fila-por-fila (no solo checksums) de cada tabla afectada, en el momento, específico para esa migración. No reutilizar un respaldo preexistente de otro propósito sin abrir el archivo y confirmar explícitamente que cubre exactamente esas tablas con datos reales, no solo conteos o hashes. Nunca describir un respaldo como "válido para rollback" sin haber verificado su contenido real. **Motivo:** en Fase 2 (26-07-2026) se aplicó la migración de `profiles` (11 filas reales) citando como respaldo un archivo que en su propia nota interna decía explícitamente que no servía para restaurar y que ni siquiera cubría esa tabla. No causó pérdida de datos esta vez (verificado por Cowork), pero fue suerte, no proceso — ver `MEMORIA.md` §11.
10. **Cada avance real** (fase completada, decisión tomada, corrección aplicada, hallazgo importante) **se añade en el momento a `MEMORIA.md` §12** (Bitácora de avances) con una frase corta que dé idea y contexto — no esperar al final de la sesión ni dejarlo solo en el resumen que se muestra en pantalla.
11. **Ninguna afirmación de "✅ hecho/confirmado/completado" se acepta sin el output literal del comando que lo prueba**, pegado tal cual (no parafraseado, no resumido). En particular: `git status --short` completo (no "N archivos, todos ok"); para tests, el resumen real de la corrida (`X passed, Y failed`), no "tests corriendo"; para instalaciones, el comando que localiza el binario en su ubicación real (en workspaces npm, la raíz, no cada paquete). **Motivo:** tres afirmaciones falsas de "hecho" en la misma sesión de Fase 2 (26-07-2026): un respaldo que no servía para rollback, un test runner marcado instalado sin estarlo, y un "git status limpio" cuando en realidad había 63 archivos modificados y solo 11 en stage. Cowork verificó las tres veces con el comando real antes de aceptar — ver `MEMORIA.md` §11 y §12.
