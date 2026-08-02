<!-- doc-status
estado: vivo
verificado: 2026-08-02
-->

# Mantenimiento de la documentación

## Problema que esto resuelve

Entre junio y agosto de 2026 la documentación de TopoField creció hasta ~5.300 líneas repartidas en 22 archivos en la raíz del repo, sin ninguna marca de qué seguía siendo cierto. El coste real no fue el desorden estético, fueron tres cosas concretas:

1. **Dos numeraciones de fases simultáneas.** `PLAN.md` numeraba 1-8 por eje de producto y `MEMORIA.md` §8 numeraba 0-7 por eje técnico. "Fase 3" significaba dos trabajos distintos. Se citaban indistintamente en conversaciones y commits.
2. **Documentos que afirmaban estados ya superados.** `README.md` seguía diciendo que había que integrar una rama fusionada hacía días; `PLAN.md` daba por pendiente un despliegue ya hecho; un informe de Fase 0 atribuía a un proyecto Supabase tablas que estaban en otro.
3. **Informes puntuales acumulados en la raíz** con el mismo peso visual que los documentos vivos, así que había que abrir seis archivos para saber en qué punto estaba el proyecto.

El resultado práctico fue repetir conversaciones ya cerradas. Este documento y el chequeo automático existen para que eso no vuelva a pasar por culpa de la documentación.

## Modelo: dos estados, sin término medio

Todo `.md` en la raíz o en `docs/` es **vivo** o **archivado**, declarado en una cabecera al principio del archivo:

```markdown
<!-- doc-status
estado: vivo
verificado: 2026-08-02
-->
```

```markdown
<!-- doc-status
estado: archivado
congelado: 2026-08-02
superado-por: ROADMAP.md
-->
```

**Vivo** significa que alguien se hace responsable de que su contenido sea cierto hoy. `verificado:` es la fecha en que alguien lo leyó entero y lo confirmó — no la fecha del último retoque cosmético.

**Archivado** significa historial: se conserva como evidencia de lo que se hizo y se decidió, no se actualiza nunca más, y no se cita como estado actual. Vive en `docs/archive/`. `superado-por:` indica qué documento vivo ocupa su lugar.

No hay estado intermedio a propósito. "Medio actualizado" es exactamente lo que causó el problema.

## Jerarquía de autoridad

Cuando dos documentos vivos se contradicen, manda el de arriba:

1. `ROADMAP.md` — en qué fase estamos, qué viene después, decisiones de rumbo. **Único documento autorizado a llevar `rol: roadmap`.**
2. `MEMORIA.md` — por qué se decidió cada cosa, qué está verificado y con qué evidencia, bitácora cronológica.
3. `AGENTS.md` — reglas de trabajo para cualquier agente.
4. El resto de documentos vivos, cada uno en su dominio (producto, UX, piloto, runbooks).

El chequeo automático falla si aparece un segundo `rol: roadmap`, porque eso es literalmente el problema (1) reapareciendo.

## Chequeo automático

```bash
npm run docs:check           # errores rompen, avisos informan
npm run docs:check -- --strict   # los avisos también rompen
```

Comprueba siete invariantes: cabecera presente, estado válido, un solo roadmap, documentos vivos con fecha de verificación no rancia (>90 días avisa), archivados con `congelado` y un `superado-por` que exista, enlaces relativos que resuelvan, y documentos vivos que no se apoyen en material archivado como si fuera estado actual.

No juzga el contenido — no puede saber si una frase es verdad. Detecta las señales mecánicas que en este repo han precedido siempre a la deriva.

## Cuándo se ejecuta

- **Al cerrar cualquier sesión que haya tocado documentación** (regla 12 de `AGENTS.md`). Obligatorio, y en verde.
- **Los días 1 y 15 de cada mes**, por tarea programada, como revisión de deriva. Cada quince días es suficiente: más frecuente se vuelve ruido que se ignora, que es como muere este tipo de proceso.
- Antes de generar una release o de dar acceso a alguien nuevo al repo.

## Rutina de la revisión quincenal

Unos diez minutos, no más:

1. `npm run docs:check` y resolver lo que salga.
2. Abrir `ROADMAP.md`: ¿la fase abierta sigue siendo la correcta? ¿Alguna cerrada cambió de estado sin que se anotara?
3. Revisar los avisos de documentos rancios: releer, actualizar `verificado:` si sigue siendo cierto, o archivar si ya no lo es.
4. Si algún informe puntual quedó en la raíz, moverlo a `docs/archive/` con su cabecera.
5. Anotar en `MEMORIA.md` §12 solo si hubo un cambio real de estado. Una revisión sin hallazgos no necesita línea de bitácora.

## Reglas al escribir documentación nueva

- **Un informe puntual nace archivado.** Los E2E, auditorías fechadas e inventarios se escriben directamente en `docs/archive/` o se mueven ahí en cuanto se han leído. Su conclusión, si cambia el rumbo, se resume en `ROADMAP.md` o `MEMORIA.md`; el informe queda como evidencia.
- **No se crea un documento nuevo para actualizar un estado.** Si `ROADMAP.md` está desactualizado, se corrige `ROADMAP.md`. Añadir `ROADMAP_V2.md` o `ESTADO_ACTUAL.md` reintroduce el problema.
- **Corregir, no acumular banners.** Un aviso de corrección al principio de un documento vivo es una solución temporal aceptable durante una sesión; si el documento necesita dos, es que debe reescribirse o archivarse.
- **Fechar toda afirmación de estado.** "El backend está desplegado" envejece mal; "Render publica `e7e2902` (31-07-2026)" se puede verificar o refutar.
