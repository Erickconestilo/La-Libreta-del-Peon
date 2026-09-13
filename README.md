<!-- doc-status
estado: vivo
verificado: 2026-09-13
-->

# La Libreta del Peón (TopoField)

Aplicación móvil de campo para equipos pequeños de topografía y auscultación de infraestructuras. Stack: Expo/React Native, backend Node/Express, PostgreSQL/Supabase, Supabase Storage y tipos compartidos en `shared/types.ts`.

## Por dónde empezar

| Pregunta | Documento |
|---|---|
| ¿En qué fase estamos y qué toca ahora? | [ROADMAP.md](./ROADMAP.md) |
| ¿Por qué se decidió esto así? ¿Qué está verificado? | [MEMORIA.md](./MEMORIA.md) |
| ¿Qué reglas sigue un agente que trabaje aquí? | [AGENTS.md](./AGENTS.md) |
| ¿Para quién es el producto y qué queda fuera? | [PRODUCT_STRATEGY.md](./PRODUCT_STRATEGY.md) |
| ¿Cómo se valida que sirve en campo? | [UX_RESEARCH_PLAN.md](./UX_RESEARCH_PLAN.md) |
| ¿Cómo se pilota? | [LAUNCH_PLAN.md](./LAUNCH_PLAN.md), [PILOT_READINESS_CHECKLIST.md](./PILOT_READINESS_CHECKLIST.md) |
| ¿Cómo se compila una APK sin gastar cuota EAS? | [LOCAL_ANDROID_BUILD_RUNBOOK.md](./LOCAL_ANDROID_BUILD_RUNBOOK.md) |
| ¿Cómo se mantiene la documentación al día? | [docs/DOC_MAINTENANCE.md](./docs/DOC_MAINTENANCE.md) |
| Historial congelado (informes E2E, inventarios, auditorías fechadas) | `docs/archive/` |

## Estado actual (13-09-2026)

Resumen; el detalle por fase está en [ROADMAP.md](./ROADMAP.md).

- Motor offline ampliado localmente: outbox SQLite, caché separada por sesión, recuperación tras reinicio, borradores de lectura y sincronización idempotente por `client_request_id`.
- MVP de auscultación implementado: rondas, puntos de control, lecturas, umbrales, histórico, fotos y exportación CSV/XLSX. El recorrido físico v7 de operador con lectura y foto offline, reinicio, reconexión y unicidad está verificado una vez; siguen pendientes cierre definitivo con umbral autorizado, comparación estructurada de archivos y observación real.
- Último backend funcional verificado en Render durante F5: commit `df224f9`; `/health` responde `200` y las rutas protegidas responden `401` sin sesión. La exportación autenticada CSV/XLSX se verificó desde el Galaxy con `200`; las mejoras locales de memoria visual siguen sin desplegar mientras la migración 027 no se aplique.
- Aislamiento multi-tenant auditado por familia de endpoint; RLS activo en las 24 tablas del proyecto. El rol `supervisor` consulta por membresía `read` y no escribe.
- La autorización de escritura falla cerrada en móvil y backend: una sesión `topografo` necesita `projectAccess[projectId] = "write"`; el mapa ausente no habilita controles ni mutaciones.
- Release Android `versionCode=7` instalada en el Galaxy como APK arm64 y firmada con `CN=TopoField Android Release`; la AAB/APK están preparadas localmente y el runbook conserva el fallback de Gradle sin `clean`.
- **F5 continúa abierta:** faltan cierre definitivo con umbral autorizado, validación de exportación con datos reales, observación de campo y conversaciones con profesionales.

## Verificación local

```bash
npm run build --workspace apps/backend
npm run test  --workspace apps/backend
npx tsc --noEmit --project apps/mobile/tsconfig.json
npm run test  --workspace apps/mobile -- --runInBand
npm run test:tooling
npm run verify:local
npm run verify:local:pre-apk  # incluye export Android y valida artefactos
npx expo export --platform android
npm run docs:check      # coherencia de la documentación
```

`npm run verify:pre-apk:local` encadena las comprobaciones locales previas a
generar una APK y no necesita credenciales. `npm run verify:pre-apk` añade el
chequeo remoto autenticado de membresías; si no hay una contraseña QA en el
entorno, debe fallar cerrado y no sustituirse por una contraseña inventada.
`npm run test:tooling` cubre la citación de comandos Windows usada por ese
preflight, incluidas rutas con espacios y metacaracteres.
`npm run verify:local` encadena la batería local completa sin Galaxy ni
credenciales remotas; `npm run verify:local:pre-apk` añade el preflight de
Expo y exige una salida con `metadata.json` y assets.

`npm run verify:remote:public` comprueba solo el contrato público de Render:
salud `200` y `401 UNAUTHORIZED` en rondas y `Mi jornada` sin bearer. No usa
credenciales ni modifica el servicio.

Backend público configurado en móvil: `https://la-libreta-del-peon-1.onrender.com/api/v1`.

## Funcionalidad implementada

- Flujo `Obras → Estacionamientos`, con caché local de la lista de obras para arranque en frío sin red.
- Detalle de estación con foto principal, memoria visual, notas y datos técnicos colapsados.
- Croquis operativo de prismas por estación usando ángulo/distancia, no coordenada absoluta.
- Guías Leica offline renderizadas dentro del APK.
- Subida de fotos a Supabase Storage para obras, estaciones, memoria visual, prismas y adjuntos de lectura.
- Auscultación: rondas de monitorización, puntos de control con umbrales vigentes, captura de lectura offline, histórico por punto y catálogo de códigos por obra.
- Memoria de montaje: visitas append-only con fotos, posición relativa opcional, caché SQLite por sesión y sincronización mediante outbox.
- Perfil con diagnóstico del outbox: operaciones en error con motivo, intentos y reintento manual.
- Roles `admin`, `topografo`, `supervisor` y `visitante`, con alcance por obra vía `project_memberships`.

## Limitaciones conocidas

- **Distribución:** la APK firmada localmente no puede instalarse encima de una instalación EAS anterior (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`). Hay que desinstalar la anterior o reutilizar su keystore. El keystore local debe respaldarse fuera del repo antes de distribuir nada.
- **Cobertura de tests:** unitaria y centrada en control de acceso, scope entre obras, rutas de foto y validación de payloads. No sustituye QA funcional en dispositivo.
- **Nadie externo ha usado la app todavía.** Es la limitación más importante del proyecto ahora mismo y el motivo de que F5 sea la fase abierta.
- **Deuda técnica aceptada conscientemente:** las lecturas escalares se guardan en un campo genérico; los procedimientos por pares, perfiles inclinométricos y protocolos específicos de fabricante esperan confirmación real antes de modelarse.
