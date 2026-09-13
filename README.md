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
- MVP de auscultación implementado: rondas, puntos de control, lecturas, umbrales, histórico, fotos y exportación CSV/XLSX. El recorrido de operador con foto offline requiere todavía una repetición física válida.
- Último backend funcional verificado en Render durante F5: commit `6a1b19f`; la comprobación pública más reciente del servicio (13-09-2026) devolvió `eb88db9`, anterior a los hardenings locales posteriores. El endpoint público de salud responde y las rutas protegidas responden `401` sin sesión; la rama contiene mejoras locales aún no desplegadas.
- Aislamiento multi-tenant auditado por familia de endpoint; RLS activo en las 24 tablas del proyecto. El rol `supervisor` consulta por membresía `read` y no escribe.
- La autorización de escritura falla cerrada en móvil y backend: una sesión `topografo` necesita `projectAccess[projectId] = "write"`; el mapa ausente no habilita controles ni mutaciones.
- Release Android `versionCode=5` preparada localmente como AAB y APK firmadas con `CN=TopoField Android Release`; la v4 es la última instalada históricamente en el Galaxy y ADB debe volver a detectar el dispositivo para instalar v5 y repetir el E2E.
- **F5 continúa abierta:** faltan la repetición offline en Galaxy, validación de exportación con datos reales, observación de campo y conversaciones con profesionales.

## Verificación local

```bash
npm run build --workspace apps/backend
npm run test  --workspace apps/backend
npx tsc --noEmit --project apps/mobile/tsconfig.json
npm run test  --workspace apps/mobile -- --runInBand
npx expo export --platform android
npm run docs:check      # coherencia de la documentación
```

`npm run verify:pre-apk:local` encadena las comprobaciones locales previas a
generar una APK y no necesita credenciales. `npm run verify:pre-apk` añade el
chequeo remoto autenticado de membresías; si no hay una contraseña QA en el
entorno, debe fallar cerrado y no sustituirse por una contraseña inventada.

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
